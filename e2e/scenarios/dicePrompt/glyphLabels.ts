import type { GlyphName } from '../../accessibility.ts';
import type { DicePromptContext } from './shared.ts';



export async function glyphLabelsPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, roll, skillRoll, journal } = ctx;
	const read = (names: GlyphName[]) => names.map(({ text, name }) => [text, name]);
	const tooltipsRead = (names: GlyphName[]) => names.every(({ name, tooltip }) => tooltip === name);

	// Ada's Cool check, A|DD, with a Proficiency die and a Success added by hand.
	await opened(gm, skillRoll('Cool'));
	await gm.evaluate(() => window.dicePromptE2E.promptAdd(['P+', 's+']));
	const pool = await gm.glyphNames('.app-dice-prompt .preview .positive > *, .app-dice-prompt .preview .negative > *');
	e2e.expect(
		"#582 A1 the Dice Prompt's pool names each die's and symbol's button by its removal in words, in its tooltip too",
		[read(pool), tooltipsRead(pool)],
		[
			[
				['P', 'Remove 1 Proficiency die'],
				['A', 'Remove 1 Ability die'],
				['s', 'Remove 1 Success'],
				['D', 'Remove 1 Difficulty die'],
				['D', 'Remove 1 Difficulty die'],
			],
			true,
		],
	);
	const diceBox = await gm.glyphNames('.app-dice-prompt .dice-box button');
	const manualChanges = await gm.glyphNames('.app-dice-prompt .pool-modifications-manual button');
	// The glyphs inside a named button give no words of their own, whose tooltip would cover the button's.
	const wordedGlyphs = await gm.evaluate(
		() =>
			document.querySelectorAll(
				['.preview', '.dice-box', '.pool-modifications-manual']
					.map((area) => `.app-dice-prompt ${area} button :is([role], [aria-label], [data-tooltip])`)
					.join(', '),
			).length,
	);
	e2e.expect(
		"#582 A2 the Dice Prompt's dice box names each button by its Pool Modification as an operation, and a manual change's by its cancellation, in their tooltips too",
		{
			diceBox: read(diceBox),
			manualChanges: read(manualChanges),
			tooltips: tooltipsRead([...diceBox, ...manualChanges]),
			wordedGlyphs,
		},
		{
			diceBox: [
				['A', 'Add 1 Ability die'],
				['P', 'Add 1 Proficiency die'],
				['B', 'Add 1 Boost die'],
				['A', 'Upgrade 1 Ability die'],
				['P', 'Downgrade 1 Proficiency die'],
				['D', 'Add 1 Difficulty die'],
				['C', 'Add 1 Challenge die'],
				['S', 'Add 1 Setback die'],
				['D', 'Upgrade 1 Difficulty die'],
				['C', 'Downgrade 1 Challenge die'],
				['a', 'Add 1 Advantage'],
				['s', 'Add 1 Success'],
				['t', 'Add 1 Triumph'],
				['h', 'Add 1 Threat'],
				['f', 'Add 1 Failure'],
				['d', 'Add 1 Despair'],
			],
			manualChanges: [
				['P', 'Cancel: Add 1 Proficiency die'],
				['s', 'Cancel: Add 1 Success'],
			],
			tooltips: true,
			wordedGlyphs: 0,
		},
	);

	// 1dp+1da+2di and a Success: the Proficiency die lands on a Triumph, the Ability die on a blank face, the Difficulty
	// dice on a Failure and a Threat, then a Threat.
	await gm.fixDice([
		{ face: 12, faces: 12 },
		{ face: 1, faces: 8 },
		{ face: 8, faces: 8 },
		{ face: 4, faces: 8 },
	]);
	const { id } = await roll();
	const sidebar = await gm.evaluate((id) => window.dicePromptE2E.showMessage(id), id);
	const card = (selector: string) => gm.glyphNames(`[data-e2e="glyph-message"] ${selector}`);
	const results = await card('.net-results');
	const dice = await card('.dice > *');
	const summary = await card('.summary-table .symbol');
	e2e.expect(
		"#582 A3 a check's chat card reads its results, each die's result and its extra symbols in words, in their tooltips too, and leaves the summary's symbols to the label beside them",
		{ results: read(results), dice: read(dice), summary: read(summary), tooltips: tooltipsRead([...results, ...dice]) },
		{
			results: [['h h t', '2 Threat, 1 Triumph']],
			dice: [
				['P t', 'Proficiency Die: 1 Triumph'],
				['A', 'Ability Die: Blank face'],
				['D fh', 'Difficulty Die: 1 Failure, 1 Threat'],
				['D h', 'Difficulty Die: 1 Threat'],
				['s', '1 Success'],
			],
			summary: [
				['s', null],
				['h', null],
				['t', null],
			],
			tooltips: true,
		},
	);

	// A roll of Genesys dice sent from the chat: a Triumph, then a blank face.
	await gm.fixDice([
		{ face: 12, faces: 12 },
		{ face: 1, faces: 6 },
	]);
	const rolled = await gm.evaluate(() => window.dicePromptE2E.rollToChat('1dp+1ds'));
	await gm.evaluate((id) => window.dicePromptE2E.showMessage(id), rolled);
	const faces = await gm.glyphNames('[data-e2e="glyph-message"] .dice-tooltip li.roll > *');
	e2e.expect(
		"#582 A4 a roll's tooltip reads the face of each Genesys die in words, in its tooltip too",
		[read(faces), tooltipsRead(faces)],
		[
			[
				['t', '1 Triumph'],
				['', 'Blank face'],
			],
			true,
		],
	);
	await gm.evaluate((state) => window.dicePromptE2E.restoreSidebar(state), sidebar);

	// Ada's sheet, open from the check, holds a check link in its notes, on a tab it doesn't show.
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await gm.evaluate((doc) => window.dicePromptE2E.pools(doc), journal);
	// The journal's first check link, `@check[Athletics,3]`: chat messages of other parts hold check links too.
	await gm.evaluate(() => {
		const link = window.e2e.htmlOf(game.journal.getName('E2E Links').sheet)!.querySelector('a[data-skill-check] > span')!;
		(link as HTMLElement).dataset.e2e = 'glyph-check';
	});
	const links = await gm.glyphNames('[data-e2e="glyph-check"], p.e2e-glyphs .font-genesys-symbols');
	e2e.expect(
		'#582 A5 the @dice, @sym, @check and @pool links read in words, in their tooltips too, the digits of a @sym left out',
		[read(links), tooltipsRead(links)],
		[
			[
				['DDD', '3 Difficulty dice'],
				['PPB', '2 Proficiency dice, 1 Boost die'],
				['ss1', '2 Successes'],
				['23', null],
				['AsA', 'Add 1 Ability die, Remove 1 Success, Upgrade 1 Ability die'],
			],
			true,
		],
	);
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await e2e.step('U end');
}
