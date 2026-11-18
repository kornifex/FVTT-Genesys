import type { Client } from '../../scenario.ts';
import type { DicePromptContext } from './shared.ts';

export async function storyPointSpendsPart(ctx: DicePromptContext) {
	const { e2e, gm, player, update, control, linkPrompt } = ctx;
	const found = await gm.evaluate(() => game.settings.get('genesys', 'storyPoints'));
	const setPools = (pools: { player: number; gm: number }) =>
		gm.evaluate((pools) => game.settings.set('genesys', 'storyPoints', pools), pools);
	const pools = () => gm.evaluate(() => game.settings.get('genesys', 'storyPoints'));
	const spends = (client: Client) => client.evaluate(() => window.dicePromptE2E.promptSpends());
	const spend = (client: Client, name: string) => client.evaluate((name) => window.dicePromptE2E.promptSpend(name), name);
	const rollSpending = (client: Client) => client.evaluate(() => window.dicePromptE2E.promptRollSpending());
	const option = (spend: string, label: string, state: { checked?: boolean; disabled?: boolean; why?: string } = {}) => ({
		spend,
		label,
		checked: state.checked ?? false,
		disabled: state.disabled ?? false,
		why: state.why ?? '',
	});
	const UPGRADE = 'Spend a point to upgrade the ability';
	const GM_UPGRADE = 'The GM spends a point to upgrade the difficulty (GM)';
	const EMPTY = 'The pool has no point left to spend.';
	const IMPOSSIBLE_ONLY = 'An Impossible task allows no other Story Point.';
	await update({ actor: 'Bo' }, { 'system.characteristics.brawn': 2 });
	const message = await gm.evaluate(() => window.dicePromptE2E.chatMessage('<p>@check[Athletics,2]</p><p>@check[Athletics,6]</p>'));
	await control(player, ['Bo']);
	await setPools({ player: 1, gm: 0 });

	await linkPrompt(player, { message }, 'Athletics', 'DD');
	const offered = await spends(player);
	const ticked = await spend(player, 'upgradeAbility');
	const rolled = await rollSpending(player);
	e2e.expect(
		"#671 X1 a player's check with the Story Point option on rolls one more Proficiency die, and moves a point to the GM pool",
		{ offered, ticked, rolled: { formula: rolled.rolled?.formula, ...rolled, rolled: undefined }, pools: await pools() },
		{
			offered: {
				spends: [
					option('upgradeAbility', `${UPGRADE} (Players)`),
					option('upgradeDifficulty', GM_UPGRADE, { disabled: true, why: EMPTY }),
				],
				difficulty: 'Difficulty: Average',
				pool: 'AA|DD',
				canRoll: true,
			},
			ticked: {
				spends: [
					option('upgradeAbility', `${UPGRADE} (Players)`, { checked: true }),
					option('upgradeDifficulty', GM_UPGRADE, { disabled: true, why: EMPTY }),
				],
				difficulty: 'Difficulty: Average',
				pool: 'PA|DD',
				canRoll: true,
			},
			rolled: { formula: '1dp + 1da + 2di', storyPointMessages: 1, prompts: 0, rolled: undefined },
			pools: { player: 0, gm: 1 },
		},
	);

	const emptyPlayer = await linkPrompt(player, { message }, 'Athletics', 'DD').then(() => spends(player));
	await player.evaluate(() => window.dicePromptE2E.closePrompts());
	await control(gm, ['Bo']);
	const gmOffered = await linkPrompt(gm, { message }, 'Athletics', 'DD').then(() => spends(gm));
	e2e.expect(
		"#671 X2 a player's option is closed while the player pool is empty; a GM spends from the GM pool, and a player's point on the difficulty",
		{ emptyPlayer: emptyPlayer.spends, gmOffered: gmOffered.spends },
		{
			emptyPlayer: [
				option('upgradeAbility', `${UPGRADE} (Players)`, { disabled: true, why: EMPTY }),
				option('upgradeDifficulty', GM_UPGRADE),
			],
			gmOffered: [
				option('upgradeAbility', `${UPGRADE} (GM)`),
				option('upgradeDifficulty', "Spend a player's point to upgrade the difficulty (Players)", {
					disabled: true,
					why: EMPTY,
				}),
			],
		},
	);

	await setPools({ player: 1, gm: 1 });
	await e2e.settle();
	await spend(gm, 'upgradeAbility');
	const gmTicked = await spend(gm, 'upgradeDifficulty');
	const gmRolled = await rollSpending(gm);
	await control(gm, []);
	e2e.expect(
		"#671 X3 a GM's point upgrades the ability and a player's the difficulty, each going to the other pool",
		{ pool: gmTicked.pool, storyPointMessages: gmRolled.storyPointMessages, prompts: gmRolled.prompts, pools: await pools() },
		{ pool: 'PA|CD', storyPointMessages: 2, prompts: 0, pools: { player: 1, gm: 1 } },
	);

	await setPools({ player: 1, gm: 0 });
	await linkPrompt(player, { message }, 'Athletics', 'DDDDD');
	const impossible = await spends(player);
	const refused = await rollSpending(player);
	const paid = await spend(player, 'impossible');
	const impossibleRolled = await rollSpending(player);
	e2e.expect(
		"#671 X4 an Impossible task can't be rolled until the roller spends its point, which leaves none for the upgrade",
		{
			impossible,
			refused: { rolled: refused.rolled, prompts: refused.prompts },
			paid,
			rolled: { formula: impossibleRolled.rolled?.formula, prompts: impossibleRolled.prompts },
			pools: await pools(),
		},
		{
			impossible: {
				spends: [
					option('impossible', 'Spend a point to attempt the Impossible task (Players)', {
						why: "An Impossible task can't be rolled without it.",
					}),
					option('upgradeAbility', `${UPGRADE} (Players)`),
					option('upgradeDifficulty', GM_UPGRADE, { disabled: true, why: EMPTY }),
				],
				difficulty: 'Difficulty: Impossible',
				pool: 'AA|DDDDD',
				canRoll: false,
			},
			refused: { rolled: null, prompts: 1 },
			paid: {
				spends: [
					option('impossible', 'Spend a point to attempt the Impossible task (Players)', {
						checked: true,
						why: "An Impossible task can't be rolled without it.",
					}),
					option('upgradeAbility', `${UPGRADE} (Players)`, { disabled: true, why: IMPOSSIBLE_ONLY }),
					option('upgradeDifficulty', GM_UPGRADE, { disabled: true, why: IMPOSSIBLE_ONLY }),
				],
				difficulty: 'Difficulty: Impossible',
				pool: 'AA|DDDDD',
				canRoll: true,
			},
			rolled: { formula: '0dp + 2da + 5di', prompts: 0 },
			pools: { player: 0, gm: 1 },
		},
	);

	await setPools({ player: 2, gm: 0 });
	await linkPrompt(player, { message }, 'Athletics', 'DDDDD');
	await spend(player, 'impossible');
	const closed = await spends(player);
	const reopened = await spend(player, 'impossible');
	await spend(player, 'impossible');
	const attempted = await rollSpending(player);
	e2e.expect(
		"#725 X5 the Impossible task's point closes the upgrade even with a point to spare, unchecking it opens it again, and the roll spends one point",
		{
			closed: closed.spends.map(({ spend, disabled, why }) => [spend, disabled, why]),
			reopened: reopened.spends.map(({ spend, checked, disabled }) => [spend, checked, disabled]),
			storyPointMessages: attempted.storyPointMessages,
			pools: await pools(),
		},
		{
			closed: [
				['impossible', false, "An Impossible task can't be rolled without it."],
				['upgradeAbility', true, IMPOSSIBLE_ONLY],
				['upgradeDifficulty', true, IMPOSSIBLE_ONLY],
			],
			reopened: [
				['impossible', false, false],
				['upgradeAbility', false, false],
				['upgradeDifficulty', false, true],
			],
			storyPointMessages: 1,
			pools: { player: 1, gm: 1 },
		},
	);
	// §#898: the GM's point that upgrades the difficulty of a player's check, which the player marks and the Acting GM
	// writes, as the GM's own spend.
	await setPools({ player: 1, gm: 1 });
	await linkPrompt(player, { message }, 'Athletics', 'DD');
	const marked = await spend(player, 'upgradeDifficulty');
	const markedRolled = await rollSpending(player);
	const lastAuthor = await gm.evaluate(
		() => game.messages.contents.filter((message: { content: string }) => message.content.includes('story-point')).at(-1)?.author?.name,
	);
	e2e.expect(
		"#898 X7 a player marks the GM's point, which upgrades the difficulty once and moves from the GM pool to the player pool, as the GM's spend",
		{
			marked: { spends: marked.spends, pool: marked.pool },
			formula: markedRolled.rolled?.formula,
			storyPointMessages: markedRolled.storyPointMessages,
			author: lastAuthor,
			pools: await pools(),
		},
		{
			marked: {
				spends: [option('upgradeAbility', `${UPGRADE} (Players)`), option('upgradeDifficulty', GM_UPGRADE, { checked: true })],
				pool: 'AA|CD',
			},
			formula: '0dp + 2da + 1di + 1dc',
			storyPointMessages: 1,
			author: gm.user,
			pools: { player: 2, gm: 0 },
		},
	);

	// The same upgrades, as the GM's spends and as the manual changes of a Pool Modifications' row.
	await setPools({ player: 1, gm: 1 });
	await control(gm, ['Bo']);
	await linkPrompt(gm, { message }, 'Athletics', 'DD');
	await spend(gm, 'upgradeAbility');
	await spend(gm, 'upgradeDifficulty');
	await gm.evaluate(() => window.dicePromptE2E.promptAdd(['A^', 'D^']));
	const looks = await gm.evaluate(() => window.dicePromptE2E.promptModificationLooks());
	const theme = await gm.evaluate(() => window.dicePromptE2E.promptTheme());
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	await control(gm, []);
	const looksOf = (row: string) =>
		looks.filter((look) => look.row === row).map(({ modification, font, color, arrow }) => ({ modification, font, color, arrow }));
	e2e.expect(
		'#758 X6 the dice of a Story Point row look as the same dice of a Pool Modification row: the dice font, the colour of the die they upgrade, and a small arrow',
		looksOf('spend'),
		looksOf('manual'),
	);
	// Each die's outline in the Palette: black on light paper; on dark paper, white around the dark dice and a dark shade
	// of the die around the light ones (#865), the Ability die's mixed with 65% black.
	const outlines = {
		light: { ability: 'rgb(0, 0, 0)', difficulty: 'rgb(0, 0, 0)' },
		dark: { ability: 'color(srgb 0.0892157 0.237451 0.100196)', difficulty: 'rgb(255, 255, 255)' },
	}[theme];
	e2e.expect(
		'#758 X6 the ability upgrade shows the Ability die and the difficulty upgrade the Difficulty die, each with its outline',
		looksOf('spend').map(({ modification, color }) => [modification, color]),
		[
			['A^', `rgb(65, 173, 73), outline 0.5px ${outlines.ability}`],
			['D^', `rgb(82, 35, 128), outline 0.5px ${outlines.difficulty}`],
		],
	);
	await control(player, []);
	await setPools(found);
	await e2e.step('X end');
}
