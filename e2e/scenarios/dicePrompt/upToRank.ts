import type { DicePromptContext } from './shared.ts';

export async function upToRankPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, roll, toggle, setSetting, characteristicRoll } = ctx;
	// A character of Intellect 1, whose Intellect check rolls one Ability die, with three talents of rank 3 and their Pool
	// Modification: Surge upgrades the ability, Steady adds a Boost once per rank, Focus an Advantage once.
	const talent = (name: string, scalesWithRank: string, value: string) => ({
		name: `E2E ${name}`,
		type: 'talent',
		system: { ranked: 'yes', rank: 3, scalesWithRank },
		effects: [
			{ name: `E2E ${name}`, system: { changes: [{ key: 'genesys.pool.check.self.', value, type: 'genesys.poolModification' }] } },
		],
	});
	await gm.evaluate(
		async (items) => {
			await Actor.createDocuments([{ name: 'E2E Quick', type: 'character', system: { characteristics: { intellect: 1 } }, items }]);
			await window.e2e.settle();
		},
		[talent('Surge', 'yes', '^'), talent('Steady', 'yes', 'B'), talent('Focus', 'no', 'a')],
	);
	const quick = { actor: 'Quick' };
	const surge = { actor: 'Quick', item: 'Surge' };
	const intellectCheck = () => opened(gm, characteristicRoll(3, quick));
	const surgeRow = 'From Self: E2E Surge';
	// The count of Surge's row, stepped by its − or +, and the open prompt as it then shows. A prompt without the count, as
	// before #928, shows unchanged: the steps' expectations fail, rather than the scenario stop.
	const stepSurge = (direction: 1 | -1) =>
		gm.evaluate(
			async ({ name, direction }) => {
				const { apps, htmlOf, counterNamed, clickCounter, settle } = window.e2e;
				// The steps call it once intellectCheck opened the prompt, which shows: htmlOf finds its element.
				const counter = counterNamed(htmlOf(apps('app-dice-prompt')[0])!, name);
				if (counter?.querySelector(direction === 1 ? 'button.increase' : 'button.decrease')) {
					clickCounter(counter, direction);
					await settle();
				}
				return window.dicePromptE2E.waitForPrompt();
			},
			{ name: 'E2E Surge: Times Applied', direction },
		);
	const surgeCounter = () =>
		gm.evaluate((name) => {
			const { apps, htmlOf, counterNamed, counterState } = window.e2e;
			// As stepSurge, it reads the prompt intellectCheck opened, which shows.
			return counterState(counterNamed(htmlOf(apps('app-dice-prompt')[0])!, name));
		}, 'E2E Surge: Times Applied');

	e2e.expect(
		'#928 U1 the talent sheet offers Up to rank beside Yes and No for how its effects scale with its rank',
		await gm.evaluate((doc) => window.dicePromptE2E.texts({ doc, selector: 'select[name="system.scalesWithRank"] option' }), surge),
		['Yes', 'No', 'Up to rank'],
	);
	await e2e.step('#928 U1 GM sets Surge to Up to rank from its sheet', async () => {
		await gm.evaluate(
			(doc) => window.dicePromptE2E.change({ doc, path: 'select[name="system.scalesWithRank"]', value: 'upTo' }),
			surge,
		);
		await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	});
	e2e.expect(
		'#928 U1 Surge is saved as Up to rank',
		await gm.evaluate(() => window.e2e.actor('Quick').items.getName('E2E Surge').system.scalesWithRank),
		'upTo',
	);

	const opening = await intellectCheck();
	e2e.expect(
		"#928 U2 Surge's row has a count at 0 of up to its rank, 3, and its upgrade once, where Steady and Focus keep their checkbox",
		{ rows: opening.modifications, pool: opening.pool, counter: await surgeCounter() },
		{
			rows: [
				{ name: surgeRow, count: 0, max: 3, mods: 'A^' },
				{ name: 'From Self: E2E Steady', enabled: false, mods: 'B+ B+ B+' },
				{ name: 'From Self: E2E Focus', enabled: false, mods: 'a+' },
			],
			pool: 'A|DD',
			counter: {
				shown: '0',
				spinButton: { name: 'E2E Surge: Times Applied', now: '0', min: '0', max: '3', text: null, typed: true },
				buttons: ['Increase'],
			},
		},
	);

	const pools = [];
	for (let count = 1; count <= 3; count++) pools.push((await stepSurge(1)).pool);
	e2e.expect(
		'#928 U3 each step of the count upgrades the pool once more, an upgrade without an Ability die left adding one (CRB p. 22), and the count stops at the rank',
		{ pools, buttons: (await surgeCounter())?.buttons },
		{ pools: ['P|DD', 'PA|DD', 'PP|DD'], buttons: ['Decrease'] },
	);

	await stepSurge(-1);
	const withSteady = await toggle('Steady');
	e2e.expect("#928 U4 Surge at 2 and Steady checked add up: two upgrades, and Steady's three Boosts", withSteady.pool, 'PABBB|DD');
	const rolled = await roll();
	e2e.expect('#928 U4 the check rolls the pool the prompt showed', rolled.formula, '1dp + 1da + 2di + 3db');

	await setSetting('dicePoolAutoApplyModifications', true);
	const autoApplied = await intellectCheck();
	await setSetting('dicePoolAutoApplyModifications', false);
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	e2e.expect(
		"#928 U5 with auto-apply on, Surge's count still starts at 0, while Steady and Focus start checked",
		{ rows: autoApplied.modifications, pool: autoApplied.pool },
		{
			rows: [
				{ name: surgeRow, count: 0, max: 3, mods: 'A^' },
				{ name: 'From Self: E2E Steady', enabled: true, mods: 'B+ B+ B+' },
				{ name: 'From Self: E2E Focus', enabled: true, mods: 'a+' },
			],
			pool: 'ABBBa|DD',
		},
	);

	// The rules a count can break: its name, its spin button's attributes, and the size of its − and +. The contrast over
	// the window's background image is left to the accessibility scenario, which reviews it on every prompt. A prompt
	// without the count, as before #928, has no row to check.
	await intellectCheck();
	const countRow = '.app-dice-prompt .pool-modifications-effects:has(.modification-count)';
	const hasCount = await gm.evaluate((selector) => document.querySelector(selector) !== null, countRow);
	e2e.expect(
		"#928 U6 axe-core finds Surge's count named, its spin button's attributes valid, and its − and + large enough",
		hasCount
			? await gm.axe(countRow, [
					'aria-input-field-name',
					'label',
					'button-name',
					'aria-allowed-attr',
					'aria-required-attr',
					'aria-valid-attr-value',
					'target-size',
				])
			: null,
		{},
	);
	// A checkbox's row names it from its text, which is no label: a label would pass a click on its text to the source's
	// button.
	e2e.expect(
		"#928 U6 axe-core finds Steady's checkbox named after its row",
		await gm.axe('.app-dice-prompt .pool-modifications-effects:has(> input[type="checkbox"])', ['label']),
		{},
	);
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	await e2e.step('upToRank end');
}
