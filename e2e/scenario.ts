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
	/** Runs `setUpCombat` as the GM, then clears every client's recorded events. */
	setUpCombat(setup: CombatSetup): Promise<void>;
	/**
	 * Runs an action, waits for the clients to receive its updates, then logs and returns each connected client's
	 * combat state with the turn events and notifications since the previous step; its errors are logged too. Without an
	 * action, logs the current state.
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
};

// Long enough for an update to reach every client and for the turn to be restored after it.
const SETTLE_MS = 2500;

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
		onStep,
	}: { browser: Browser; url: string; version: number; gmUser: string; playerUser: string; onStep: (step: Step) => void },
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
		const gm = await join(browser, url, gmUser);
		clients.push(gm);
		await gm.evaluate(async (name) => {
			if (!game.users.getName(name)) await User.create({ name, role: CONST.USER_ROLES.PLAYER });
		}, playerUser);
		log('env', await gm.evaluate(() => ({ foundry: game.version as string, system: game.system.version as string })));

		let player: Client | undefined;
		const resetAll = () => Promise.all(connected().map((client) => client.evaluate(() => window.e2e.reset())));
		const loggedErrors = new Map<Client, number>();

		await scenario({
			version,
			gm,
			playerUser,
			async player() {
				if (!player) {
					player = await join(browser, url, playerUser);
					clients.push(player);
				}
				return player;
			},
			async setUpCombat(setup) {
				await gm.evaluate((setup) => window.e2e.setUpCombat(setup), setup);
				await sleep(SETTLE_MS);
				await resetAll();
			},
			async step(name, action) {
				if (action) {
					await action();
					await sleep(SETTLE_MS);
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

async function join(browser: Browser, url: string, user: string): Promise<Client> {
	const errors: string[] = [];

	const ready = async (page: Page) => {
		await page.waitForFunction(() => typeof game !== 'undefined' && game.ready === true, null, { timeout: 120_000 });
		// The system and the tracker finish rendering after the ready hook.
		await sleep(3000);
		await page.evaluate(installHelpers);
	};
	const open = async () => {
		const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
		const page = await context.newPage();
		page.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text().slice(0, 300));
		});
		page.on('pageerror', (error) => errors.push(`${error.name}: ${error.message}`.slice(0, 300)));

		await page.goto(`${url}/join`, { waitUntil: 'domcontentloaded' });
		await page.selectOption('select[name=userid]', { label: user }, { timeout: 60_000 });
		await page.click('button[name=join]');
		await ready(page);
		return page;
	};

	const client: Client = {
		user,
		page: await open(),
		errors,
		evaluate: ((fn: Parameters<Page['evaluate']>[0], arg: unknown) => client.page.evaluate(fn, arg)) as Page['evaluate'],
		combatState: () => client.page.evaluate(() => window.e2e.combatState()),
		async reload() {
			await client.page.reload({ waitUntil: 'domcontentloaded' });
			await ready(client.page);
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
