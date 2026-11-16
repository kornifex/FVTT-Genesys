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
	const layout = await gm.evaluate(() => window.dicePromptE2E.poolModificationsLayout());
	e2e.log('#513 the sections of choices as laid out', layout);
	// A tenth of a px apart, as the layout rounds them, or half a px for a box centred on another.
	const near = (a: number, b: number, slack = 0.1) => Math.abs(a - b) <= slack;
	const { titles, sections, buttons, rows: layoutRows } = layout;
	e2e.expect(
		"#887 A1 the sections' titles start on one edge, and every row of every section has its label and the column of what it adds on shared edges",
		{
			titles: titles.every((title) => near(title, 0)),
			sections: [...new Set(sections.map(({ section }) => section))],
			labels: new Set(sections.map(({ label }) => label)).size,
			columns: new Set(sections.map(({ column }) => column)).size,
		},
		{ titles: true, sections: ['pool-modifications', 'story-points'], labels: 1, columns: 1 },
	);
	// The Difficulty's first die, then the first die or modification of every other row: the glyphs' own side bearings
	// set their ink a px apart.
	const [difficultyInk, ...inks] = sections.map(({ ink }) => ink);
	const others = inks.flatMap((ink) => (ink === null ? [] : [ink])).sort((a, b) => a - b);
	const median = others[Math.floor(others.length / 2)];
	e2e.expect(
		"#887 A2 the ink of the Difficulty's first die starts where the other rows' first die or modification starts, within a px and a half",
		{ rows: others.length > 2, onEdge: difficultyInk !== null && near(difficultyInk, median, 1.5) },
		{ rows: true, onEdge: true },
	);
	// Each section's rows, as the lines above and below each of them.
	const lines: Record<string, [boolean, boolean][]> = {};
	for (const { section, above, below } of sections) (lines[section] ??= []).push([above, below]);
	e2e.expect(
		'#887 A3 a dotted line parts two rows of a section, and none runs above its first row or below its last',
		lines,
		Object.fromEntries(Object.entries(lines).map(([section, rows]) => [section, rows.map((_, index) => [index > 0, false])])),
	);
	e2e.expect(
		"#887 A4 the footer's Roll and Cancel buttons are as tall as each other, in one font",
		{
			count: buttons.length,
			heights: new Set(buttons.map(({ height }) => height)).size,
			fonts: new Set(buttons.map(({ font }) => font)).size,
		},
		{ count: 2, heights: 1, fonts: 1 },
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
