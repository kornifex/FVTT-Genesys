import type { DicePromptContext } from './shared.ts';

export async function poolLinksPart(ctx: DicePromptContext) {
	const { e2e, gm, journal } = ctx;
	e2e.expect(
		'#115 I1 a pool link with a glyph in the wrong case stays as written, the others show their icons',
		await gm.evaluate((doc) => window.dicePromptE2E.pools(doc), journal),
		[
			{ text: 'P1 @pool[p]', icons: '' },
			{ text: 'P2 @pool[T]', icons: '' },
			{ text: 'P3 @pool[Pp]', icons: '' },
			{ text: 'P4 PAA', icons: 'P+ A+ A^' },
			{ text: 'P5 PAA', icons: 'P+ A+ A^' },
			{ text: 'P6 a', icons: 'a+' },
		],
	);
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
}
