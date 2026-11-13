import type { SheetsContext } from './shared.ts';

export async function unregisteredChangeTypePart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	if (e2e.version >= 14) {
		let unregistered: unknown;
		await e2e.step(
			'#297 GM opens the sheet of an effect whose change has a type no module registers, edits another change and saves it',
			async () => {
				unregistered = await gm.evaluate(() => window.sheetsE2E.unregisteredChangeType());
			},
		);
		e2e.expect(
			'#297 A1 a change whose type no module registers keeps its type in the sheet and when the sheet is saved, beside an edited change',
			unregistered,
			{
				shown: 'e2eremoved',
				stored: ['system.characteristics.brawn e2eremoved "1"', 'system.characteristics.agility add 2'],
			},
		);
	}
}
