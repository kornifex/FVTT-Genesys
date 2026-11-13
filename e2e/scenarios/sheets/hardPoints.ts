import type { SheetsContext } from './shared.ts';

export async function hardPointsPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	const hardPoints = () =>
		gm.evaluate(() =>
			Object.fromEntries(
				['weapon', 'armor', 'vehicleWeapon'].map((name) => {
					const item = game.items.getName(`E2E ${name}`);
					const field = window.e2e.htmlOf(item.sheet)?.querySelector<HTMLInputElement>('.hard-points');
					return [name, { shown: field?.value ?? null, stored: item.system.hardPoints ?? null }];
				}),
			),
		);
	await e2e.step("#695 H1 GM sets the weapon to encumbrance 3, the armor to 4, and opens their Data tabs and the vehicle weapon's", () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.closeAll();
			await sheets.update('weapon', { 'system.encumbrance': 3, 'system.hardPoints': null });
			await sheets.update('armor', { 'system.encumbrance': 4, 'system.hardPoints': null });
			await sheets.update('vehicleWeapon', { 'system.encumbrance': 3 });
			for (const name of ['weapon', 'armor', 'vehicleWeapon']) {
				await sheets.open(name);
				await sheets.clickTab(name, 'data');
			}
		}),
	);
	e2e.expect(
		'#695 H1 a weapon of encumbrance 3 shows 2 hard points, an armor of encumbrance 4 shows 2, a vehicle weapon none (CRB p. 206)',
		await hardPoints(),
		{
			weapon: { shown: '2', stored: null },
			armor: { shown: '2', stored: null },
			vehicleWeapon: { shown: null, stored: null },
		},
	);
	await e2e.step("#695 H2 GM types 4 in the weapon's hard points, then raises its encumbrance to 5", () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.changeField('weapon', '.hard-points', '4');
			await sheets.changeField('weapon', '[name="system.encumbrance"]', '5');
		}),
	);
	e2e.expect('#695 H2 the weapon keeps the 4 typed, an exception, whatever its encumbrance', (await hardPoints()).weapon, {
		shown: '4',
		stored: 4,
	});
	await e2e.step("#695 H3 GM empties the weapon's hard points, then changes its price", () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.changeField('weapon', '.hard-points', '');
			await sheets.changeField('weapon', '[name="system.price"]', '150');
		}),
	);
	e2e.expect(
		"#695 H3 emptied, the weapon's hard points follow its encumbrance of 5 again, and saving another field doesn't fix them",
		(await hardPoints()).weapon,
		{ shown: '3', stored: null },
	);
	await e2e.step("#695 H4 GM types the computed 3, then -1, in the weapon's hard points", () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.changeField('weapon', '.hard-points', '3');
			await sheets.changeField('weapon', '.hard-points', '-1');
		}),
	);
	e2e.expect(
		'#695 H4 the computed number stores no exception, and a negative one is refused, the field showing the computed 3',
		(await hardPoints()).weapon,
		{ shown: '3', stored: null },
	);
	// The next part sets the items up again.
	await gm.evaluate(() => window.sheetsE2E.closeAll());
}
