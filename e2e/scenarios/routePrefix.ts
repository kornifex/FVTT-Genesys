/** @file #90: a Foundry served under a route prefix, as behind a reverse proxy, still loads the chance worker of the Dice Prompt. */
import type { ScenarioContext } from '../scenario.ts';

// The prefix changes the launch, which the other scenarios share.
export const isolated = true;
export const routePrefix = 'e2e';

/**
 * The chance to succeed the Dice Prompt shows, `spinner` while it is computed, or null when it shows none.
 */
type Chance = string | null;

declare global {
	interface Window {
		routePrefixE2E: {
			/** Adds a die by its dice box button (`A+` adds an Ability die), or none, and waits for the chance shown to change. */
			chanceAfter(key: string | null): Promise<Chance>;
		};
	}
}

/**
 * Installs `window.routePrefixE2E`. Playwright sends this function's source to the page, so it uses nothing from this
 * module.
 */
function installRoutePrefixHelpers() {
	const { waitFor, settle, text, apps, htmlOf, poolModification } = window.e2e;
	const chance = (root: HTMLElement): Chance => {
		const shown = root.querySelector('.chance-to-succeed');
		if (!shown) return null;
		return shown.querySelector('.fa-spinner') ? 'spinner' : text(shown.querySelector('span'));
	};

	window.routePrefixE2E = {
		async chanceAfter(key) {
			const root = await waitFor('a Dice Prompt', () => {
				const open = apps('app-dice-prompt');
				const root = open.length === 1 ? htmlOf(open[0]) : undefined;
				return root?.querySelector('.preview') ? root : undefined;
			});
			await settle();
			const before = key ? chance(root) : 'spinner';
			if (key) {
				const button = [...root.querySelectorAll<HTMLElement>('.dice-box a')].find(
					(candidate) => poolModification(candidate) === key,
				);
				if (!button) throw new Error(`No dice box button ${key}`);
				button.click();
			}
			// The worker answers out of the page's activity that settling sees: wait for the chance itself, and give up
			// after a while, which the step then shows as the chance it last read.
			try {
				await waitFor('the chance to succeed', () => {
					const shown = chance(root);
					return shown !== before && shown !== 'spinner' ? shown : undefined;
				});
			} catch {
				// Timed out: the chance shown is the step's result.
			}
			return chance(root);
		},
	};
}

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	// The world is a copy of its own: its settings need no restoring.
	await gm.evaluate(async () => {
		await game.settings.set('genesys', 'defaultDifficulty', 'DD');
		await game.settings.set('genesys', 'dicePoolChanceToSucceedByPermutation', true);
	});
	await gm.reload();
	await gm.evaluate(installRoutePrefixHelpers);
	await e2e.step('set up');

	const served = await gm.evaluate(() => ({ path: location.pathname, route: foundry.utils.getRoute('game') as string }));
	await gm.evaluate(() => ui.chat.processMessage('/gendr'));
	const chances = {
		DD: await gm.evaluate(() => window.routePrefixE2E.chanceAfter(null)),
		'+A': await gm.evaluate(() => window.routePrefixE2E.chanceAfter('A+')),
	};
	e2e.expect(
		'#90 A1 under the route prefix /e2e/, the Dice Prompt shows the chance to succeed of its pool',
		{ served, chances },
		{ served: { path: '/e2e/game', route: '/e2e/game' }, chances: { DD: '0.00%', '+A': '23.44%' } },
	);

	await e2e.step('end', () =>
		gm.evaluate(() => Promise.all(window.e2e.apps('app-dice-prompt').map((app: { close(): Promise<void> }) => app.close()))),
	);
}
