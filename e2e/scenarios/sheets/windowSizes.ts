import type { Size, SheetClosing, SheetsContext } from './shared.ts';



export async function windowSizesPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	const sizedSheets = ['Hero', 'Rival', 'gear', 'archetype'];
	const roundTrips: Record<string, { open: Size; minimized: Size; headerHeight: number; maximized: Size }> = {};
	const belowMinimum: Record<string, Size> = {};
	await e2e.step('#304 GM minimizes and maximizes a character, a rival, a gear and an archetype sheet', async () => {
		for (const name of sizedSheets) {
			await gm.evaluate((name) => window.sheetsE2E.open(name), name);
			roundTrips[name] = await gm.evaluate((name) => window.sheetsE2E.minimizeAndMaximize(name), name);
			belowMinimum[name] = await gm.evaluate((name) => window.sheetsE2E.resizeBelowMinimum(name), name);
			await gm.evaluate((name) => window.sheetsE2E.close(name), name);
		}
	});
	e2e.expect(
		'#304 A1 a minimized sheet collapses to its header, and takes its size back once maximized',
		Object.fromEntries(
			sizedSheets.map((name) => [name, { minimized: roundTrips[name].minimized, maximized: roundTrips[name].maximized }]),
		),
		Object.fromEntries(
			sizedSheets.map((name) => [
				name,
				{ minimized: { width: 200, height: roundTrips[name].headerHeight }, maximized: roundTrips[name].open },
			]),
		),
	);
	e2e.expect('#304 A2 an open sheet keeps its minimum size', belowMinimum, {
		Hero: { width: 580, height: 600 },
		Rival: { width: 580, height: 600 },
		gear: { width: 320, height: 200 },
		archetype: { width: 580, height: 600 },
	});

	// §#315: ApplicationV2 closes a window by bringing its max-height to 0 through a transition, which a minimum height
	// on the window would block. The transition is ended as soon as it starts, and the height it leaves is read.
	const closings: Record<string, SheetClosing> = {};
	await e2e.step('#315 GM closes a character, a rival, a gear and an archetype sheet', async () => {
		for (const name of sizedSheets) closings[name] = await gm.evaluate((name) => window.sheetsE2E.closeAnimation(name), name);
	});
	e2e.log('#315 closings', closings);
	e2e.expect(
		"#315 A1 a closing sheet collapses through its max-height's transition, to a tenth of its height or less",
		Object.fromEntries(
			Object.entries(closings).map(([name, { open, closed, transitions }]) => [
				name,
				{ transitions, collapsed: closed <= open / 10 },
			]),
		),
		Object.fromEntries(sizedSheets.map((name) => [name, { transitions: ['max-height'], collapsed: true }])),
	);
}
