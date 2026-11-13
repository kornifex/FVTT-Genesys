import type { DicePromptContext } from './shared.ts';



export async function storyPointTrackerPart(ctx: DicePromptContext) {
	const { e2e, gm, player } = ctx;
	const storyPoints = async () => ({
		gm: await gm.evaluate(() => window.dicePromptE2E.storyPoints()),
		player: await player.evaluate(() => window.dicePromptE2E.storyPoints()),
	});
	const tracker = (gmPool: number, playerPool: number, spendable: { gm: boolean[]; player: boolean[] }) => ({
		gm: { setting: { gm: gmPool, player: playerPool }, shown: [`${gmPool}`, `${playerPool}`], spendable: spendable.gm },
		player: { setting: { gm: gmPool, player: playerPool }, shown: [`${gmPool}`, `${playerPool}`], spendable: spendable.player },
	});
	await gm.evaluate(() => window.dicePromptE2E.clickStoryPoints('reset'));
	const reset = await storyPoints();
	await gm.evaluate(() => window.dicePromptE2E.clickStoryPoints('gm'));
	const gmSpentGm = await storyPoints();
	await gm.evaluate(() => window.dicePromptE2E.clickStoryPoints('player'));
	const gmSpentPlayer = await storyPoints();
	await player.evaluate(() => window.dicePromptE2E.clickStoryPoints('player'));
	const playerSpentLast = await storyPoints();
	await player.evaluate(() => window.dicePromptE2E.clickStoryPoints('player'));
	e2e.expect(
		'#157 L1 the Story Point pools move between the GM and the players, from both clients',
		{ reset, gmSpentGm, gmSpentPlayer, playerSpentLast, playerSpentNone: await storyPoints() },
		{
			reset: tracker(1, 1, { gm: [true, true], player: [false, true] }),
			gmSpentGm: tracker(0, 2, { gm: [false, true], player: [false, true] }),
			gmSpentPlayer: tracker(1, 1, { gm: [true, true], player: [false, true] }),
			playerSpentLast: tracker(2, 0, { gm: [true, false], player: [false, false] }),
			playerSpentNone: tracker(2, 0, { gm: [true, false], player: [false, false] }),
		},
	);
	await e2e.step('L end');
}
