/** @file What a scenario file gets: clients joined as Foundry users, and a step log. */
import type { Browser, Page } from 'playwright-core';
import { setTimeout as sleep } from 'node:timers/promises';

import { type CombatSetup, type CombatState, installHelpers } from './page.ts';
import type { Step } from './steps.ts';

/**
 * A browser joined to the world as one user.
 */
type Client = {
	user: string;
	page: Page;
	/** The console errors and uncaught exceptions of the page. */
	errors: string[];
	/** Runs a function in the page, where `window.e2e` holds the helpers of `page.ts`. */
	evaluate: Page['evaluate'];
	combatState(): Promise<CombatState | null>;
	/** Reloads the page, as a client that joins late, and installs the helpers again. */
	reload(): Promise<void>;
};

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
	 * Runs an action, waits for the clients to receive its updates, then logs each client's combat state with the turn
	 * events, notifications and errors since the previous step. Without an action, logs the current state.
	 */
	step(name: string, action?: () => Promise<unknown>): Promise<void>;
	/** Logs any other value. */
	log(name: string, value: unknown): void;
};

/**
 * A scenario file's export.
 */
export type Scenario = (e2e: ScenarioContext) => Promise<void>;

// Long enough for an update to reach every client and for the turn to be restored after it.
const SETTLE_MS = 2500;

/**
 * Runs a scenario against a launched world and returns its step log; a failure ends the log with a `FATAL` step.
 */
export async function runScenario(
	scenario: Scenario,
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
	const log = (name: string, value: unknown) => {
		// A comparison matches the steps of two runs by name.
		if (steps.some((step) => step.name === name)) throw new Error(`Step "${name}" is logged twice: give each step its own name.`);
		const step = { name, value };
		steps.push(step);
		onStep(step);
	};
	const clients: Client[] = [];

	try {
		const gm = await join(browser, url, gmUser);
		clients.push(gm);
		await gm.evaluate(async (name) => {
			if (!game.users.getName(name)) await User.create({ name, role: CONST.USER_ROLES.PLAYER });
		}, playerUser);
		log('env', await gm.evaluate(() => ({ foundry: game.version as string, system: game.system.version as string })));

		let player: Client | undefined;
		const resetAll = () => Promise.all(clients.map((client) => client.evaluate(() => window.e2e.reset())));
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
				const value: Record<string, unknown> = {};
				for (const client of clients) {
					value[client.user] = await client.combatState();
					const errors = client.errors.slice(loggedErrors.get(client) ?? 0);
					loggedErrors.set(client, client.errors.length);
					if (errors.length) value[`${client.user} errors`] = errors;
				}
				log(name, value);
				await resetAll();
			},
			log,
		});
	} catch (error) {
		log('FATAL', error instanceof Error ? error.stack ?? error.message : String(error));
	} finally {
		await Promise.all(clients.map((client) => client.page.context().close()));
	}
	return steps;
}

async function join(browser: Browser, url: string, user: string): Promise<Client> {
	const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
	const page = await context.newPage();
	const errors: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text().slice(0, 300));
	});
	page.on('pageerror', (error) => errors.push(`${error.name}: ${error.message}`.slice(0, 300)));

	const ready = async () => {
		await page.waitForFunction(() => typeof game !== 'undefined' && game.ready === true, null, { timeout: 120_000 });
		// The system and the tracker finish rendering after the ready hook.
		await sleep(3000);
		await page.evaluate(installHelpers);
	};

	await page.goto(`${url}/join`, { waitUntil: 'domcontentloaded' });
	await page.selectOption('select[name=userid]', { label: user }, { timeout: 60_000 });
	await page.click('button[name=join]');
	await ready();

	return {
		user,
		page,
		errors,
		evaluate: page.evaluate.bind(page),
		combatState: () => page.evaluate(() => window.e2e.combatState()),
		async reload() {
			await page.reload({ waitUntil: 'domcontentloaded' });
			await ready();
		},
	};
}
