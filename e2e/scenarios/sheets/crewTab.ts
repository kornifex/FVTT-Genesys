import type { SheetsContext } from './shared.ts';

export async function crewTabPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	const crew = async (name: string, action: () => Promise<unknown>) => {
		await e2e.step(name, action);
		const tab = await gm.evaluate(() => window.sheetsE2E.crewTab('Vehicle'));
		e2e.log(`${name}: Crew tab`, tab);
		return tab;
	};
	await gm.evaluate(() => window.sheetsE2E.open('Vehicle'));
	await gm.evaluate(() => window.sheetsE2E.clickTab('Vehicle', 'crew'));
	const crewSteps = {
		passengersAdded: await crew('#82 GM adds two passengers and a role', () =>
			gm.evaluate(async () => {
				const sheets = window.sheetsE2E;
				await sheets.drop('Vehicle', { type: 'Actor', name: 'Hero' }, '.tab-crew .heading-row');
				await sheets.drop('Vehicle', { type: 'Actor', name: 'Bearer' }, '.tab-crew .heading-row');
				await sheets.click('Vehicle', '.tab-crew .heading-row button');
			}),
		),
		memberAdded: await crew('#82 GM moves a passenger to the role', () =>
			gm.evaluate(() =>
				window.sheetsE2E.drag('Vehicle', '.tab-crew .passengers .actor-tile-mini', 'E2E Bearer', '.tab-crew .roles .role-section'),
			),
		),
		memberRemoved: await crew('#82 GM removes the role member', () =>
			// Its entry reads Remove from Crew since #577, with its own icon.
			gm.evaluate(() => window.sheetsE2E.menu('Vehicle', '.tab-crew .roles .role-member', 'E2E Bearer', 'fa-user-minus')),
		),
		passengerRemoved: await crew('#82 GM removes a passenger', () =>
			gm.evaluate(() => window.sheetsE2E.menu('Vehicle', '.tab-crew .passengers .actor-tile-mini', 'E2E Hero', 'fa-user-minus')),
		),
	};
	e2e.expect('#82 A2 the Crew tab follows the passengers and role members added and removed', crewSteps, {
		passengersAdded: { passengers: ['E2E Hero', 'E2E Bearer'], members: [[]] },
		memberAdded: { passengers: ['E2E Hero'], members: [['E2E Bearer']] },
		memberRemoved: { passengers: ['E2E Hero'], members: [[]] },
		passengerRemoved: { passengers: [], members: [[]] },
	});
	await gm.evaluate(() => window.sheetsE2E.closeAll());
}
