import type { SheetsContext } from './shared.ts';



export async function tabsAndFieldsPart(ctx: SheetsContext) {
	const { e2e, gm, page } = ctx;
	await e2e.step('#95 GM switches tabs, closes and reopens the sheets', async () => {
		await gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.open('Hero');
			await sheets.clickTab('Hero', 'talents');
			await sheets.open('Vehicle');
			await sheets.clickTab('Vehicle', 'crew');
			await sheets.open('weapon');
			await sheets.clickTab('weapon', 'data');
			for (const name of ['Hero', 'Vehicle', 'weapon']) await sheets.close(name);
			for (const name of ['Hero', 'Vehicle', 'weapon']) await sheets.open(name);
		});
	});
	e2e.expect(
		'#95 A9 a reopened sheet shows the tab it was closed on',
		await gm.evaluate(() => ({
			Hero: window.sheetsE2E.activeTab('Hero'),
			Vehicle: window.sheetsE2E.activeTab('Vehicle'),
			weapon: window.sheetsE2E.activeTab('weapon'),
		})),
		{ Hero: 'talents', Vehicle: 'crew', weapon: 'data' },
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	await e2e.step('#95 GM edits a name and a number field', async () => {
		await gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.open('Rival');
			await sheets.changeField('Rival', 'input[name="system.characteristics.brawn"]', '4');
			await sheets.changeField('Rival', 'input[name="name"]', 'E2E Rival Renamed');
			await sheets.open('weapon');
			await sheets.clickTab('weapon', 'data');
			await sheets.changeField('weapon', 'input[name="system.baseDamage"]', '7');
		});
	});
	e2e.expect(
		'#95 A10 a field change updates the document',
		await gm.evaluate(() => ({
			rival: game.actors.getName('E2E Rival Renamed')?.system.characteristics.brawn ?? null,
			weaponDamage: game.items.getName('E2E weapon').system.baseDamage,
		})),
		{ rival: 4, weaponDamage: 7 },
	);
	await gm.evaluate(() => window.sheetsE2E.update('Rival Renamed', { name: 'E2E Rival' }));
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	await gm.evaluate(async () => {
		await window.sheetsE2E.open('Rival');
		await window.sheetsE2E.markField('Rival', 'input[name="name"]', 'rival-name');
	});
	await page().fill('[data-e2e="rival-name"]', 'E2E Rival Closed');
	// Foundry's keybindings skip a focused field, so Escape can't close a sheet that way: the field keeps its text unsaved.
	await e2e.step('#95 GM presses Escape while the name field has the focus', () => page().keyboard.press('Escape'));
	e2e.expect(
		'#95 A21 Escape leaves a sheet open while one of its fields has the focus, with the text typed and not yet saved',
		await gm.evaluate(() => ({
			open: window.sheetsE2E.isRendered('Rival'),
			focused: document.activeElement === document.querySelector('[data-e2e="rival-name"]'),
			typed: document.querySelector<HTMLInputElement>('[data-e2e="rival-name"]')?.value ?? null,
			saved: !!game.actors.getName('E2E Rival Closed'),
		})),
		{ open: true, focused: true, typed: 'E2E Rival Closed', saved: false },
	);
	await e2e.step('#95 GM closes the sheet while the name field has the focus', () =>
		gm.evaluate(() => game.actors.getName('E2E Rival').sheet.close()),
	);
	e2e.expect(
		'#95 A22 a field edited then closed without leaving it is saved',
		await gm.evaluate(() => !!game.actors.getName('E2E Rival Closed')),
		true,
	);
	await e2e.step('#95 GM reopens the sheet and presses Escape with no field focused', async () => {
		await gm.evaluate(() => window.sheetsE2E.open('Rival Closed'));
		await page().keyboard.press('Escape');
	});
	e2e.expect(
		'#95 A23 Escape closes a sheet once none of its fields has the focus',
		await gm.evaluate(() => window.sheetsE2E.isRendered('Rival Closed')),
		false,
	);
	await gm.evaluate(() => window.sheetsE2E.update('Rival Closed', { name: 'E2E Rival' }));
}
