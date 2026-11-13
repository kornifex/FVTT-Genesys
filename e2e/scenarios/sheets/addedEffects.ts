import type { SheetsContext } from './shared.ts';

export async function addedEffectsPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	const added = ['Observed', 'Vehicle', 'Nemesis', 'gear'];
	await e2e.step('#101 GM adds an effect in each section of the Effects tab of a character, a vehicle, an adversary and an item', () =>
		gm.evaluate(async (names) => {
			const sheets = window.sheetsE2E;
			for (const name of names) {
				await sheets.open(name);
				await sheets.clickTab(name, 'effects');
				for (const section of [1, 2, 3]) await sheets.addEffect(name, section);
			}
		}, added),
	);
	const addedRows = await gm.evaluate(
		(names) =>
			Object.fromEntries(
				names.map((name) => [
					name,
					{
						rows: window.sheetsE2E.effectRows(name).map(({ section, name }) => [section, name]),
						effects: window.sheetsE2E.effectsData(name),
					},
				]),
			),
		added,
	);
	const addedFor = (name: string) => ({
		rows: [
			['Temporary Effects', name],
			['Passive Effects', name],
			['Inactive Effects', name],
		],
		effects: [
			{ name, disabled: false, rounds: 1 },
			{ name, disabled: false, rounds: null },
			{ name, disabled: true, rounds: null },
		],
	});
	e2e.expect(
		'#101 A1 Add in each section creates an effect named after the document, shown in the tab without reopening the sheet',
		addedRows,
		{
			Observed: addedFor('E2E Observed'),
			Vehicle: addedFor('E2E Vehicle'),
			Nemesis: addedFor('E2E Nemesis'),
			gear: addedFor('E2E gear'),
		},
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());
}
