import type { DicePromptContext } from './shared.ts';



export async function modificationColumnsPart(ctx: DicePromptContext) {
	const { e2e, gm, seekerCheck } = ctx;
	await gm.evaluate(() =>
		window.e2e
			.actor('Seeker')
			.items.getName('E2E Quick Draw')
			.effects.contents[0].update({ name: 'E2E Fate, a Pool Modification Named Long Enough to Wrap' }),
	);
	await seekerCheck(gm);
	await gm.evaluate(() => window.dicePromptE2E.promptAdd(['A+', 'S+']));
	if (!(await gm.evaluate(() => window.dicePromptE2E.poolModificationsBox())).unfolded) {
		await gm.evaluate(() => window.dicePromptE2E.togglePoolModifications());
	}
	const layout = () => gm.evaluate(() => window.dicePromptE2E.poolModificationsLayout());
	const unfoldedLayout = await layout();
	await gm.evaluate(() => window.dicePromptE2E.togglePoolModifications());
	const foldedLayout = await layout();
	await gm.evaluate(() => window.dicePromptE2E.togglePoolModifications());
	e2e.log('#513 the Pool Modifications as laid out, unfolded then folded', { unfolded: unfoldedLayout, folded: foldedLayout });
	// A tenth of a px apart, as the layout rounds them, or half a px for a box centred on another.
	const near = (a: number, b: number, slack = 0.1) => Math.abs(a - b) <= slack;
	const { titleText, caret, rows: layoutRows } = unfoldedLayout;
	e2e.expect(
		"#513 A1 the title's text starts on the table's left edge, the caret alone in the margin before it",
		{ textOnEdge: near(titleText, 0), caretInMargin: caret.right <= titleText },
		{ textOnEdge: true, caretInMargin: true },
	);
	e2e.expect(
		"#513 A2 folding the section moves neither the caret's axis nor the title's text",
		{ axis: near(foldedLayout.caret.axis, caret.axis), text: near(foldedLayout.titleText, titleText) },
		{ axis: true, text: true },
	);
	e2e.expect(
		"#513 A3 every row's label starts on one edge, after the checkboxes' column, and a wrapped label goes on under its own text",
		{
			edges: new Set(layoutRows.map(({ label }) => label)).size,
			afterCheckboxes: layoutRows.every(({ label }) => label > 0),
			wrapped: layoutRows.filter(({ lineStarts }) => lineStarts.length > 1).length,
			underItsText: layoutRows.every(({ lineStarts }) => lineStarts.every((start) => near(start, 0))),
		},
		{ edges: 1, afterCheckboxes: true, wrapped: 1, underItsText: true },
	);
	e2e.expect(
		"#513 A4 the checkboxes and the modifications sit on their label's first line, with no top offset",
		{
			checkboxes: layoutRows.every(({ checkbox }) => checkbox === null || near(checkbox, 0, 0.5)),
			// By the ink their fonts draw, within a px, not by their boxes: Genesys Symbols draws a glyph high in its box (§#535).
			modifications: layoutRows.every(({ ink }) => ink === null || near(ink, 0, 1)),
			offsets: layoutRows.flatMap(({ offsets }) => offsets),
		},
		{ checkboxes: true, modifications: true, offsets: [] },
	);
	// §#535: the Difficulty row, first, against the one-line rows of the effects, between it and Manual Changes.
	const [difficultyRow, ...otherRows] = layoutRows;
	const oneLineEffects = otherRows.slice(0, -1).filter(({ lineStarts }) => lineStarts.length === 1);
	e2e.expect(
		"#535 A1 the Difficulty dice are centred on their label's capitals, and the Difficulty row is as tall as a one-line effect's",
		{
			centred: difficultyRow.ink !== null && near(difficultyRow.ink, 0, 1),
			effects: oneLineEffects.length > 0,
			asTall: oneLineEffects.every(({ height }) => near(height, difficultyRow.height)),
		},
		{ centred: true, effects: true, asTall: true },
	);
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	await e2e.step('T end');
}
