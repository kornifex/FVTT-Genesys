import type { SheetsContext } from './shared.ts';



export async function editorsPart(ctx: SheetsContext) {
	const { e2e, gm, page } = ctx;
	const editors = [
		{ sheet: 'Hero', tab: 'journal', field: 'system.notes' },
		{ sheet: 'Hero', tab: 'journal', field: 'system.motivations.strength.description' },
		{ sheet: 'Nemesis', tab: 'stats', field: 'system.description' },
		{ sheet: 'Nemesis', tab: 'miscellaneous', field: 'system.motivations.fear.description' },
		{ sheet: 'Vehicle', tab: 'details', field: 'system.description' },
		{ sheet: 'weapon', tab: 'description', field: 'system.description' },
		{ sheet: 'career', tab: 'description', field: 'system.description' },
		{ sheet: 'archetype', tab: 'description', field: 'system.description' },
	];
	const bearerLink = await gm.evaluate(() => `@UUID[${game.actors.getName('E2E Bearer').uuid}]{E2E Bearer}`);
	await e2e.step('#260 GM writes a link in each editor with the keyboard, and saves it', async () => {
		for (const [index, { sheet, tab, field }] of editors.entries()) {
			const mark = `editor-${index}`;
			await gm.evaluate(
				async ({ sheet, tab, field, mark }) => {
					await window.sheetsE2E.open(sheet);
					await window.sheetsE2E.clickTab(sheet, tab);
					await window.sheetsE2E.openEditor(sheet, field, mark);
				},
				{ sheet, tab, field, mark },
			);
			await page().click(`[data-e2e="${mark}"]`);
			await page().keyboard.type(`E2E ${index} ${bearerLink}`);
			await gm.evaluate(({ sheet, field }) => window.sheetsE2E.saveEditor(sheet, field), { sheet, field });
		}
	});
	e2e.expect(
		'#260 A1 an editor saves its text to its field, a nested one included',
		await gm.evaluate((editors) => editors.map(({ sheet, field }) => window.sheetsE2E.stored(sheet, field)), editors),
		editors.map((_, index) => `<p>E2E ${index} ${bearerLink}</p>`),
	);
	e2e.expect(
		'#260 A2 a saved editor closes and shows its new text enriched, with its toggle button',
		await gm.evaluate((editors) => Promise.all(editors.map(({ sheet, field }) => window.sheetsE2E.editor(sheet, field))), editors),
		editors.map((_, index) => ({ toggle: 'enabled', open: false, text: `E2E ${index} E2E Bearer`, links: 1 })),
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	await gm.evaluate(async () => {
		await window.sheetsE2E.open('Nemesis');
		// The sheet reopens on the tab it was closed on.
		await window.sheetsE2E.clickTab('Nemesis', 'stats');
		await window.sheetsE2E.openEditor('Nemesis', 'system.description', 'nemesis-description');
	});
	await page().click('[data-e2e="nemesis-description"]');
	await page().keyboard.press('ControlOrMeta+a');
	await page().keyboard.type('E2E typing');
	await e2e.step('#260 GM changes another field of the sheet while an editor is open', () =>
		gm.evaluate(() => window.sheetsE2E.changeField('Nemesis', 'input[name="system.characteristics.brawn"]', '3')),
	);
	e2e.expect(
		'#260 A3 the open editor stays open with its text, which the form saves with the other field',
		await gm.evaluate(async () => ({
			open: (await window.sheetsE2E.editor('Nemesis', 'system.description')).open,
			typed: window.e2e.text(document.querySelector('[data-e2e="nemesis-description"]')),
			stored: window.sheetsE2E.stored('Nemesis', 'system.description'),
			brawn: window.sheetsE2E.stored('Nemesis', 'system.characteristics.brawn'),
		})),
		{ open: true, typed: 'E2E typing', stored: '<p>E2E typing</p>', brawn: 3 },
	);
	await page().click('[data-e2e="nemesis-description"]');
	await page().keyboard.press('ControlOrMeta+a');
	await page().keyboard.type('E2E closed');
	await e2e.step('#260 GM closes the sheet while an editor is open', () => gm.evaluate(() => window.sheetsE2E.close('Nemesis')));
	e2e.expect(
		'#260 A4 closing a sheet saves the text of its open editor',
		await gm.evaluate(() => window.sheetsE2E.stored('Nemesis', 'system.description')),
		'<p>E2E closed</p>',
	);
}
