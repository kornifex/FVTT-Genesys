import { installDicePromptHelpers, type DicePromptContext } from './shared.ts';



export async function chanceToSucceedPart(ctx: DicePromptContext) {
	const { e2e, gm, player, opened } = ctx;
	// The player's character is Cy, so that the reloaded player controls only Cy's token: with no character, Foundry 13
	// controls every token the player owns, and the Dice Roller refuses to open for several.
	await gm.evaluate((user) => game.users.getName(user).update({ character: game.actors.getName('E2E Cy').id }), e2e.playerUser);
	await player.evaluate(() => game.settings.set('genesys', 'dicePoolChanceToSucceedByPermutation', true));
	await player.reload();
	await player.evaluate(installDicePromptHelpers);
	const playerGendr = () => opened(player, () => player.evaluate(() => ui.chat.processMessage('/gendr')));
	const chance = (expected: string) =>
		player.evaluate((expected) => window.dicePromptE2E.promptChance({ expected, timeout: 10_000 }), expected);
	const add = (keys: string[]) => player.evaluate((keys) => window.dicePromptE2E.promptAdd(keys), keys);
	await playerGendr();
	const chances: Record<string, string | null> = { DD: await chance('0.00%') };
	const steps: [string, string[], string][] = [
		['+A', ['A+'], '23.44%'],
		['+P', ['P+'], '50.20%'],
		['+B', ['B+'], '58.82%'],
		['upgrade A', ['A^'], '64.42%'],
		['+C', ['C+'], '45.09%'],
		['upgrade D', ['D^'], '38.79%'],
		['+S', ['S+'], '31.91%'],
		['+s', ['s+'], '54.64%'],
		['+f', ['f+'], '31.91%'],
	];
	for (const [name, keys, expected] of steps) {
		await add(keys);
		chances[name] = await chance(expected);
	}
	await player.evaluate(() => window.dicePromptE2E.promptRemove('C'));
	chances['-C'] = await chance('48.64%');
	e2e.expect(
		'#90 K1 the worker started after the setting is turned on gives the chance of each pool',
		chances,
		Object.fromEntries([['DD', '0.00%'], ...steps.map(([name, , expected]) => [name, expected]), ['-C', '48.64%']]),
	);
	await add(['P+', 'P+', 'A+', 'A+', 'A+', 'B+', 'D+', 'D+', 'C+', 'S+']);
	const large = await player.evaluate(async () => {
		const start = Date.now();
		let last = start;
		let longestPause = 0;
		const ticker = setInterval(() => {
			longestPause = Math.max(longestPause, Date.now() - last);
			last = Date.now();
		}, 20);
		const chance = await window.dicePromptE2E.promptChance({ expected: '74.52%', timeout: 30_000 });
		clearInterval(ticker);
		return { chance, answered: Date.now() - start < 30_000, frozen: longestPause > 1000 };
	});
	e2e.expect('#90 K2 a pool of 16 dice gets its chance without freezing the prompt', large, {
		chance: '74.52%',
		answered: true,
		frozen: false,
	});
	await playerGendr();
	await player.evaluate(() => window.dicePromptE2E.promptRemove('D'));
	await player.evaluate(() => window.dicePromptE2E.promptRemove('D'));
	const noDice = await chance('0.00%');
	await add(['s+']);
	e2e.expect(
		'#157 K3 a pool without dice has a chance of 0 %, then 100 % with a Success',
		{ noDice, success: await chance('100.00%') },
		{
			noDice: '0.00%',
			success: '100.00%',
		},
	);
	const errorsBefore = player.errors.length;
	const workerFailed = () => player.errors.slice(errorsBefore).some((error) => error.includes('Genesys | The chance worker failed.'));
	await player.evaluate(() => window.dicePromptE2E.breakChanceWorker(true));
	await playerGendr();
	// The worker's error is no activity of the page that settling sees: wait for it to be logged, or long enough to tell it
	// isn't.
	for (const start = Date.now(); !workerFailed() && Date.now() - start < 3000; ) await e2e.settle();
	e2e.expect(
		'#90 K4 a worker error is logged and the prompt keeps its spinner',
		{
			chance: (await player.evaluate(() => window.dicePromptE2E.promptChance({ expected: 'spinner', timeout: 0 }))) ?? null,
			logged: workerFailed(),
		},
		{ chance: 'spinner', logged: true },
	);
	await player.evaluate(() => window.dicePromptE2E.breakChanceWorker(false));
	await player.evaluate(() => window.dicePromptE2E.closePrompts());
	await player.evaluate(() => game.settings.set('genesys', 'dicePoolChanceToSucceedByPermutation', false));
	await e2e.step('K end');
}
