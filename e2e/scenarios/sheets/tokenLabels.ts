import type { SheetsContext } from './shared.ts';



export async function tokenLabelsPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	e2e.expect(
		"#348 A1 the token configuration names a Minion Group's bars and values from the language files",
		await gm.evaluate(() =>
			window.sheetsE2E.trackedAttributeLabels('Minion', {
				'Genesys.Labels.Wounds': 'E2E Wounds',
				'Genesys.Labels.RemainingMembers': 'E2E Remaining Members',
				'Genesys.Labels.Soak': 'E2E Soak',
			}),
		),
		['E2E Wounds', 'E2E Remaining Members', 'E2E Soak'],
	);
}
