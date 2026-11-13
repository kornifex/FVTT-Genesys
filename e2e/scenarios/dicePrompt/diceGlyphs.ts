import type { DicePromptContext } from './shared.ts';



export async function diceGlyphsPart(ctx: DicePromptContext) {
	const { e2e, gm, journal } = ctx;
	let fonts: Record<string, boolean> = {};
	await e2e.step('#488 A1 GM rolls 6d6 to the chat and opens a journal page with @dice, @check and @pool links', async () => {
		fonts = await gm.evaluate((doc) => window.dicePromptE2E.glyphFonts(doc), journal);
	});
	e2e.expect("#488 A1 a core d6's result keeps Foundry's font, the Genesys dice of the links draw in Genesys Symbols", fonts, {
		coreDie: false,
		diceLink: true,
		checkLink: true,
		poolLink: true,
	});
	const inline = await gm.evaluate((doc) => window.dicePromptE2E.inlineGlyphs(doc), journal);
	e2e.log("#488 C1 each glyph's centre above the middle of the text's capitals", inline);
	e2e.expect(
		"#488 C1 the glyphs of the @dice, @sym, @check and @pool links are centred on the text's capitals (±1px)",
		Object.fromEntries(Object.entries(inline).map(([name, { px }]) => [name, Math.abs(px) <= 1])),
		{ '@dice A': true, '@sym sa': true, '@check D': true, '@pool P': true },
	);
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await e2e.step('R end');
}
