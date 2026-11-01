/** @file What a scenario file gets: clients joined as Foundry users, and a step log. */
import type { Browser, Page } from 'playwright-core';
import { setTimeout as sleep } from 'node:timers/promises';

import { type CombatSetup, type CombatState, type FixedDie, installHelpers } from './page.ts';
import { assertionStep, fatalStep, type Step } from './steps.ts';

/**
 * A browser joined to the world as one user.
 */
export type Client = {
	user: string;
	page: Page;
	/** The console errors and uncaught exceptions of the page. */
	errors: string[];
	/** Runs a function in the page, where `window.e2e` holds the helpers of `page.ts`. */
	evaluate: Page['evaluate'];
	combatState(): Promise<CombatState | null>;
	/** Reloads the page, as a client that joins late, and installs the helpers again. */
	reload(): Promise<void>;
	/** False once the client {@link leave}s: steps skip it until it {@link join}s again. */
	connected: boolean;
	/** Closes the page, so that the user is no longer connected to the game (a GM who leaves). */
	leave(): Promise<void>;
	/** Joins the game again in a new page, after {@link leave}. */
	join(): Promise<void>;
	/** Closes the page at the end of the scenario. */
	close(): Promise<void>;
	/** Makes the next dice rolled in this page land on the given faces, until the end of the step. */
	fixDice(dice: FixedDie[]): Promise<void>;
};

/**
 * The combat state each connected client logged at a step, by user name.
 */
export type StepStates = Record<string, CombatState | null>;

export type ScenarioContext = {
	/** The Foundry generation the scenario runs on. */
	version: number;
	gm: Client;
	/** The player user's name, created by the GM when the world lacks it. */
	playerUser: string;
	/** Joins as the player user, once. */
	player(): Promise<Client>;
	/**
	 * Joins as a second GM, once: the user {@link ASSISTANT}, whom the GM creates, or gives the Assistant role, when the
	 * world lacks it.
	 */
	assistantGM(): Promise<Client>;
	/** Runs `setUpCombat` as the GM, then clears every client's recorded events. */
	setUpCombat(setup: CombatSetup): Promise<void>;
	/** Waits until every connected client has done nothing for a while: the updates of what came before have reached them. */
	settle(): Promise<void>;
	/**
	 * Runs an action, waits for the clients to settle, then logs and returns each connected client's combat state with the
	 * turn events and notifications since the previous step; its errors are logged too. Without an action, logs the
	 * current state.
	 */
	step(name: string, action?: () => Promise<unknown>): Promise<StepStates>;
	/** Logs any other value. */
	log(name: string, value: unknown): void;
	/**
	 * Logs both values as a step; when they differ (deep equality), the step fails and the scenario goes on. A failed
	 * step makes the run exit with 1, unless it ran on the build compared against.
	 */
	expect(name: string, actual: unknown, expected: unknown): void;
};

/**
 * What a scenario file exports.
 */
export type ScenarioModule = {
	run: (e2e: ScenarioContext) => Promise<void>;
	/** Runs the scenario on its own fresh world and Foundry launch, instead of after the other scenarios on a shared one. */
	isolated?: boolean;
	/**
	 * Joins the clients with Foundry's canvas, which tokens, their HUD and targets need. Without it, the clients join in
	 * no-canvas mode: headless Chromium draws the canvas without a GPU, which takes most of the run's CPU.
	 */
	needsCanvas?: boolean;
	/**
	 * Serves the world under this path (`e2e` serves it at `/e2e/`), as a Foundry behind a reverse proxy is. Only an
	 * isolated scenario takes one, since it changes the launch.
	 */
	routePrefix?: string;
};

/**
 * The Assistant GM user, a second GM whose operations the Gamemaster's election is tested against. Its id is lower than
 * any random one (Foundry compares ids by code point), so that only the role can elect the Gamemaster over it.
 */
const ASSISTANT = { name: 'E2E Assistant GM', id: '0000E2EAssistant' };

// A client has settled once it has gone this long without a hook, a socket message, a request awaiting its answer or a
// running CSS transition (window.e2e.idleFor). Each update an action causes reaches the clients and calls hooks, and the updates their hooks make in turn (the GM
// restoring the turn) follow within a few ms, so a pause this long means the action's work is over.
const QUIET_MS = 300;
// A client still busy after this long is left to its work, with an error in its log, and the step goes on.
const SETTLE_TIMEOUT_MS = 15_000;

/**
 * Runs a scenario against a launched world and returns its step log; an error ends the log with a `FATAL` step.
 */
export async function runScenario(
	scenario: ScenarioModule['run'],
	{
		browser,
		url,
		version,
		gmUser,
		playerUser,
		needsCanvas,
		onStep,
	}: {
		browser: Browser;
		url: string;
		version: number;
		gmUser: string;
		playerUser: string;
		needsCanvas: boolean;
		onStep: (step: Step) => void;
	},
): Promise<Step[]> {
	const steps: Step[] = [];
	const push = (step: Step) => {
		// A comparison matches the steps of two runs by name.
		if (steps.some(({ name }) => name === step.name)) {
			throw new Error(`Step "${step.name}" is logged twice: give each step its own name.`);
		}
		steps.push(step);
		onStep(step);
	};
	const log = (name: string, value: unknown) => push({ name, value });
	const clients: Client[] = [];
	const connected = () => clients.filter((client) => client.connected);

	try {
		const gm = await join(browser, url, gmUser, needsCanvas);
		clients.push(gm);
		await gm.evaluate(async (name) => {
			if (!game.users.getName(name)) await User.create({ name, role: CONST.USER_ROLES.PLAYER });
		}, playerUser);
		log('env', await gm.evaluate(() => ({ foundry: game.version as string, system: game.system.version as string })));

		let player: Client | undefined;
		let assistant: Client | undefined;
		const resetAll = () => Promise.all(connected().map((client) => client.evaluate(() => window.e2e.reset())));
		const loggedErrors = new Map<Client, number>();

		await scenario({
			version,
			gm,
			playerUser,
			async player() {
				if (!player) {
					player = await join(browser, url, playerUser, needsCanvas);
					clients.push(player);
				}
				return player;
			},
			async assistantGM() {
				if (!assistant) {
					await gm.evaluate(async ({ name, id }) => {
						const named = game.users.getName(name);
						// User names are unique: a namesake of another id would stop the creation.
						if (named && named.id !== id) await named.delete();
						const user = game.users.get(id);
						if (!user) await User.create({ _id: id, name, role: CONST.USER_ROLES.ASSISTANT }, { keepId: true });
						else if (user.role !== CONST.USER_ROLES.ASSISTANT) await user.update({ role: CONST.USER_ROLES.ASSISTANT });
					}, ASSISTANT);
					assistant = await join(browser, url, ASSISTANT.name, needsCanvas);
					clients.push(assistant);
				}
				return assistant;
			},
			async setUpCombat(setup) {
				await gm.evaluate((setup) => window.e2e.setUpCombat(setup), setup);
				await settle(connected());
				await resetAll();
			},
			settle: () => settle(connected()),
			async step(name, action) {
				if (action) {
					await action();
					await settle(connected());
				}
				const states: StepStates = {};
				const value: Record<string, unknown> = {};
				for (const client of connected()) {
					states[client.user] = value[client.user] = await client.combatState();
					const errors = client.errors.slice(loggedErrors.get(client) ?? 0);
					loggedErrors.set(client, client.errors.length);
					if (errors.length) value[`${client.user} errors`] = errors;
				}
				log(name, value);
				await resetAll();
				return states;
			},
			log,
			expect: (name, actual, expected) => push(assertionStep(name, actual, expected)),
		});
	} catch (error) {
		push(fatalStep(error));
	} finally {
		await Promise.all(connected().map((client) => client.close()));
	}
	return steps;
}

/**
 * Waits until the clients have all done nothing for {@link QUIET_MS} at once, counted from the call.
 */
async function settle(clients: Client[]) {
	const start = Date.now();
	for (;;) {
		const idle = await Promise.all(clients.map((client) => client.evaluate(() => window.e2e.idleFor())));
		if (Math.min(Date.now() - start, ...idle) >= QUIET_MS) return;
		if (Date.now() - start > SETTLE_TIMEOUT_MS) {
			// Logged as the client's error, so that the step after it shows it, in the run and its step log.
			for (const [index, client] of clients.entries()) {
				if (idle[index] < QUIET_MS) client.errors.push(`e2e: still busy after ${SETTLE_TIMEOUT_MS} ms`);
			}
			return;
		}
		await sleep(50);
	}
}

async function join(browser: Browser, url: string, user: string, withCanvas: boolean): Promise<Client> {
	const errors: string[] = [];

	// The errors before `since` came from an earlier page load.
	const ready = async (page: Page, since: number) => {
		await page.waitForFunction(() => typeof game !== 'undefined' && game.ready === true, null, { timeout: 120_000 });
		// A system whose module throws as it loads (a global the Foundry version removed) leaves the game ready without
		// it: its init hook registered no setting. Its scenarios would fail later on a missing setting or class.
		const systemLoaded = await page.evaluate(() =>
			[...(game.settings.settings as Map<string, unknown>).keys()].some((key) => key.startsWith(`${game.system.id}.`)),
		);
		if (!systemLoaded) throw new Error(`The system did not load for ${user}: ${errors[since] ?? 'no error in the page'}`);
		await page.evaluate(installHelpers);
		// The system and the tracker finish rendering after the ready hook.
		await page.evaluate(() => window.e2e.settle());
	};
	const open = async () => {
		const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
		// Client settings, read from the browser's storage as the game starts. The lowest frame rate Foundry offers is
		// plenty for a client nobody watches.
		await context.addInitScript(
			(withCanvas) => localStorage.setItem(withCanvas ? 'core.maxFPS' : 'core.noCanvas', withCanvas ? '10' : 'true'),
			withCanvas,
		);
		const page = await context.newPage();
		page.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text().slice(0, 300));
		});
		page.on('pageerror', (error) => errors.push(`${error.name}: ${error.message}`.slice(0, 300)));

		const since = errors.length;
		await page.goto(`${url}/join`, { waitUntil: 'domcontentloaded' });
		// v13: the join form names its user select userid; v14 names it userId.
		await page.selectOption('select[name=userid i]', { label: user }, { timeout: 60_000 });
		await page.click('button[name=join]');
		await ready(page, since);
		return page;
	};

	const client: Client = {
		user,
		page: await open(),
		errors,
		evaluate: ((fn: Parameters<Page['evaluate']>[0], arg: unknown) => client.page.evaluate(fn, arg)) as Page['evaluate'],
		combatState: () => client.page.evaluate(() => window.e2e.combatState()),
		async reload() {
			const since = errors.length;
			await client.page.reload({ waitUntil: 'domcontentloaded' });
			await ready(client.page, since);
		},
		connected: true,
		async leave() {
			client.connected = false;
			await client.close();
		},
		close: () => client.page.context().close(),
		async join() {
			if (client.connected) throw new Error(`${user} is already connected.`);
			client.page = await open();
			client.connected = true;
		},
		fixDice: (dice) => client.page.evaluate((dice) => window.e2e.fixDice(dice), dice),
	};
	return client;
}
