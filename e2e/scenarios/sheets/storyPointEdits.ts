import type { SheetsContext } from './shared.ts';



export async function storyPointEditsPart(ctx: SheetsContext, storyPoints: { gm: number; player: number }) {
	const { e2e, gm } = ctx;
	await e2e.step('#95 GM sets the story points, spends one of the GM pool, then resets them', async () => {
		await gm.evaluate(() => window.sheetsE2E.setStoryPoints({ gm: 3, player: 2 }));
		await gm.evaluate(() => window.sheetsE2E.clickStoryPoints('.gm button.points'));
	});
	const spent = await gm.evaluate(() => window.sheetsE2E.storyPoints());
	await gm.evaluate(() => window.sheetsE2E.clickStoryPoints('button:has(.fa-arrows-rotate)'));
	e2e.expect(
		'#95 A20 GM: spending a story point moves it from the GM pool to the players, and resetting gives one to each player',
		{ spent, reset: await gm.evaluate(() => window.sheetsE2E.storyPoints()) },
		{ spent: { gm: 2, player: 3 }, reset: { gm: 1, player: 1 } },
	);
	await e2e.step('#277 GM types letters, then a count, into the GM pool', () =>
		gm.evaluate(() => window.sheetsE2E.editGMStoryPoints('abc')),
	);
	const afterLetters = await gm.evaluate(() => window.sheetsE2E.storyPoints());
	await gm.evaluate(() => window.sheetsE2E.editGMStoryPoints('4'));
	e2e.expect(
		'#277 A1 GM: letters typed into a Story Point pool leave the pools unchanged, and a count sets that pool',
		{ afterLetters, afterCount: await gm.evaluate(() => window.sheetsE2E.storyPoints()) },
		{ afterLetters: { gm: 1, player: 1 }, afterCount: { gm: 4, player: 1 } },
	);

	// §#528: the GM's input closes on the count the pool already holds, and Escape closes it without writing.
	await gm.evaluate(() => window.sheetsE2E.storyPointLog());
	let closing = {};
	await e2e.step(
		"#528 GM confirms the GM pool's own count with Enter then a blur, cancels another with Escape, then sets two with Enter and a blur",
		async () => {
			closing = await gm.evaluate(async () => {
				const stillOpen = {
					enter: await window.sheetsE2E.editGMStoryPoints('4', 'Enter'),
					blur: await window.sheetsE2E.editGMStoryPoints('4', 'blur'),
					escape: await window.sheetsE2E.editGMStoryPoints('7', 'Escape'),
				};
				const unchanged = { pools: window.sheetsE2E.storyPoints(), writes: window.sheetsE2E.storyPointLog().writes.length };
				await window.sheetsE2E.editGMStoryPoints('2', 'Enter');
				const afterEnter = window.sheetsE2E.storyPoints();
				await window.sheetsE2E.editGMStoryPoints('3', 'blur');
				return { stillOpen, unchanged, afterEnter, afterBlur: window.sheetsE2E.storyPoints() };
			});
		},
	);
	e2e.expect(
		"#528 A1 GM: Enter, a blur and Escape close a Story Point pool's input, the same count and Escape write nothing, and a new count is written",
		closing,
		{
			stillOpen: { enter: false, blur: false, escape: false },
			unchanged: { pools: { gm: 4, player: 1 }, writes: 0 },
			afterEnter: { gm: 2, player: 1 },
			afterBlur: { gm: 3, player: 1 },
		},
	);
	await gm.evaluate((points) => window.sheetsE2E.setStoryPoints(points), storyPoints);
}
