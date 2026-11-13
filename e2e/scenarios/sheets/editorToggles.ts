import type { ToggleIcon, SheetsContext } from './shared.ts';



export async function editorTogglesPart(ctx: SheetsContext) {
	const { e2e, gm, page } = ctx;
	const toggleIcons = async (fields: { sheet: string; tab: string; field: string }[], label: string) => {
		const icons: Record<string, ToggleIcon> = {};
		for (const [index, { sheet, tab, field }] of fields.entries()) {
			const mark = `toggle-${label}-${index}`;
			await gm.evaluate(
				async ({ sheet, tab, field, mark }) => {
					await window.sheetsE2E.open(sheet);
					await window.sheetsE2E.clickTab(sheet, tab);
					await window.sheetsE2E.markEditor(sheet, field, mark);
				},
				{ sheet, tab, field, mark },
			);
			await page().hover(`[data-e2e="${mark}"]`);
			icons[`${sheet} ${field}`] = await gm.evaluate(({ sheet, field }) => window.sheetsE2E.toggleIcon(sheet, field), {
				sheet,
				field,
			});
			await page().mouse.move(0, 0);
			await gm.evaluate(() => window.sheetsE2E.closeAll());
		}
		return icons;
	};
	const toggleFields = [
		{ sheet: 'Nemesis', tab: 'stats', field: 'system.description' },
		{ sheet: 'Hero', tab: 'journal', field: 'system.notes' },
		{ sheet: 'Vehicle', tab: 'details', field: 'system.description' },
		{ sheet: 'weapon', tab: 'description', field: 'system.description' },
	];
	let shownToggles: Record<string, ToggleIcon> = {};
	await e2e.step('#488 B1 GM hovers an editor of each sheet type, then an adversary description left empty', async () => {
		shownToggles = await toggleIcons(toggleFields, 'described');
		await gm.evaluate(() => window.sheetsE2E.update('Nemesis', { 'system.description': '' }));
		const [empty] = Object.values(await toggleIcons(toggleFields.slice(0, 1), 'empty'));
		shownToggles['Nemesis empty system.description'] = empty;
		await gm.evaluate(() => window.sheetsE2E.update('Nemesis', { 'system.description': '<p>E2E closed</p>' }));
	});
	e2e.log('#488 B1 the toggle icons as laid out', shownToggles);
	e2e.expect(
		"#488 B1 the toggle's icon is centred in its button (±1px), on every sheet type and on an adversary's empty description",
		Object.fromEntries(
			Object.entries(shownToggles).map(([editor, { visible, x, y }]) => [
				editor,
				{ visible, centred: Math.abs(x) <= 1 && Math.abs(y) <= 1 },
			]),
		),
		Object.fromEntries(
			[...toggleFields.map(({ sheet, field }) => `${sheet} ${field}`), 'Nemesis empty system.description'].map((editor) => [
				editor,
				{ visible: true, centred: true },
			]),
		),
	);
}
