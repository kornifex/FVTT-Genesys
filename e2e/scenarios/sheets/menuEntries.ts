import { inLightTheme, type SheetsContext } from './shared.ts';

export async function menuEntriesPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	const measure = () =>
		gm.evaluate(async () => {
			await window.sheetsE2E.open('Hero');
			try {
				await window.sheetsE2E.clickTab('Hero', 'inventory');
				return await window.sheetsE2E.menuColumns('Hero', '.tab-inventory .inventory-item', 'E2E Sword');
			} finally {
				await window.sheetsE2E.close('Hero');
			}
		});
	const columns: Record<string, Awaited<ReturnType<typeof measure>>> = {};
	await e2e.step("#897 A1 GM opens a character's weapon menu in their inventory, in the dark theme, then the light one", async () => {
		columns.dark = await measure();
		columns.light = await inLightTheme(gm, measure);
	});
	// Foundry's `button` rule centres a button's content, which an entry's labels of different lengths would show.
	// Two entries at least, so that a column can tell.
	const shape = ({ entries, ...aligned }: (typeof columns)[string]) => ({ entries: entries > 1, ...aligned });
	const leftAligned = { entries: true, iconsAtStart: true, labelsInOneColumn: true };
	e2e.expect(
		"#897 A1 a menu's entries start on the left: each icon at its entry's start, the labels in one column after them",
		{ dark: shape(columns.dark), light: shape(columns.light) },
		{ dark: leftAligned, light: leftAligned },
	);
}
