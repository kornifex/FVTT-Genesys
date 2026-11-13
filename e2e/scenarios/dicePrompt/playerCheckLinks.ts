import type { Doc, DicePromptContext } from './shared.ts';



export async function playerCheckLinksPart(ctx: DicePromptContext) {
	const { e2e, gm, player, noPrompt, control, journal, linkPrompt } = ctx;
	const warning = 'warning: Select a single token or assign yourself a character to roll this check.';
	const playerLink = (doc: Doc | { message: string }, skill: string, difficulty?: string) =>
		linkPrompt(player, doc, skill, difficulty);
	const playerNoPrompt = (doc: Doc) =>
		noPrompt(player, () =>
			player.evaluate((doc) => window.dicePromptE2E.clickLink({ doc, skill: 'Athletics', difficulty: 'DDD' }), doc),
		);
	await control(player, []);
	const noToken = await playerNoPrompt(journal);
	await control(player, ['Bo']);
	const oneToken = { hard: await playerLink(journal, 'Athletics', 'DDD'), upgraded: await playerLink(journal, 'Cool', 'CD') };
	await control(player, ['Bo', 'Cy']);
	const twoTokens = await playerNoPrompt(journal);
	e2e.expect(
		'#51 H1 as a player without a character, a link rolls for the single controlled token, and asks for one otherwise',
		{ noToken, oneToken, twoTokens },
		{
			noToken: { prompts: 0, notifications: [warning] },
			oneToken: {
				hard: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|DDD' },
				upgraded: { actor: 'Bo', skill: 'Cool (Pr)', pool: '|CD' },
			},
			twoTokens: { prompts: 0, notifications: [warning] },
		},
	);
	await gm.evaluate((user) => game.users.getName(user).update({ character: game.actors.getName('E2E Cy').id }), e2e.playerUser);
	await e2e.settle();
	await control(player, ['Bo', 'Cy']);
	const characterTwoTokens = await playerLink(journal, 'Athletics', 'DDD');
	await control(player, []);
	const characterNoToken = await playerLink(journal, 'Athletics', 'DDD');
	await control(player, ['Bo']);
	const playerMessage = await gm.evaluate(() => window.dicePromptE2E.chatMessage('<p>@check[Athletics,3]</p>'));
	e2e.expect(
		'#51 H2 as a player with a character, a link rolls for the single controlled token, otherwise the character',
		{
			twoTokens: characterTwoTokens,
			noToken: characterNoToken,
			message: await playerLink({ message: playerMessage }, 'Athletics'),
			opposed: await noPrompt(player, () =>
				player.evaluate((doc) => window.dicePromptE2E.clickLink({ doc, skill: null }), journal),
			),
		},
		{
			twoTokens: { actor: 'Cy', skill: 'Athletics (Br)', pool: '|DDD' },
			noToken: { actor: 'Cy', skill: 'Athletics (Br)', pool: '|DDD' },
			message: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|DDD' },
			opposed: { prompts: 0, notifications: [] },
		},
	);
	await control(player, ['Cy']);
	e2e.expect(
		"#51 H3 as a player, an actor sheet's link rolls for that actor",
		{ character: await playerLink({ actor: 'Bo' }, 'Athletics'), adversary: await playerLink({ actor: 'Rival' }, 'Athletics') },
		{
			character: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|DDD' },
			adversary: { actor: 'Rival', skill: 'Athletics (Br)', pool: 'AA|DDD' },
		},
	);
	await control(player, []);
	await player.evaluate(() => window.dicePromptE2E.closePrompts());
	await player.evaluate(() => window.dicePromptE2E.closeSheets());
	await e2e.step('H end');
}
