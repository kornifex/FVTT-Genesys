import type { DicePromptContext } from './shared.ts';

export async function gmCheckLinksPart(ctx: DicePromptContext) {
	const { e2e, gm, noPrompt, control, ada, journal, linkPrompt } = ctx;
	e2e.expect(
		'#51 G1 a journal page renders its check links with their difficulty',
		await gm.evaluate((doc) => window.dicePromptE2E.links(doc), journal),
		[
			{ skill: 'Athletics', difficulty: 'DDD', text: 'Hard [DDD] Athletics check' },
			{ skill: 'Cool', difficulty: 'CD', text: 'Average [CD] Cool check' },
			{ skill: null, difficulty: null, text: 'Opposed Athletics versus Cool check' },
			{ skill: 'Athletics', difficulty: 'CC', text: 'Easy [CC] Athletics check' },
			{ skill: 'Athletics', difficulty: 'CCD', text: 'Average [CCD] Athletics check' },
			{ skill: 'Athletics', difficulty: 'D', text: 'Simple [D] Athletics check' },
			{ skill: 'Athletics', difficulty: 'CCCCCD', text: 'Impossible [CCCCCD] Athletics check' },
			{ skill: 'Athletics', difficulty: 'CDD', text: 'Hard [CDD] Athletics check' },
		],
	);
	await control(gm, ['Bo']);
	e2e.expect(
		"#51 G2 a journal entry's link opens the prompt for the controlled token's actor, with the link's difficulty",
		{
			hard: await linkPrompt(gm, journal, 'Athletics', 'DDD'),
			upgraded: await linkPrompt(gm, journal, 'Cool', 'CD'),
			upgradedPastDifficulty: await linkPrompt(gm, journal, 'Athletics', 'CC'),
		},
		{
			hard: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|DDD' },
			upgraded: { actor: 'Bo', skill: 'Cool (Pr)', pool: '|CD' },
			upgradedPastDifficulty: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|CC' },
		},
	);
	e2e.expect(
		'#51 G3 an opposed check link stays inert',
		await noPrompt(gm, () => gm.evaluate((doc) => window.dicePromptE2E.clickLink({ doc, skill: null }), journal)),
		{ prompts: 0, notifications: [] },
	);
	const gmMessage = await gm.evaluate(() => window.dicePromptE2E.chatMessage('<p>@check[Athletics,3]</p>'));
	e2e.expect(
		"#51 G4 a chat message's and an item sheet's links open the prompt for the controlled token's actor",
		{
			message: await linkPrompt(gm, { message: gmMessage }, 'Athletics'),
			item: await linkPrompt(gm, { item: 'Note' }, 'Athletics'),
			ownedItem: await linkPrompt(gm, { actor: 'Ada', item: 'Map' }, 'Cool'),
		},
		{
			message: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|DDD' },
			item: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|DDD' },
			ownedItem: { actor: 'Bo', skill: 'Cool (Pr)', pool: '|CD' },
		},
	);
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	e2e.expect(
		"#51 G5 an actor sheet's link rolls for that actor, with a token controlled, right after the sheet opens",
		{
			character: await linkPrompt(gm, ada, 'Athletics'),
			adversary: await linkPrompt(gm, { actor: 'Rival' }, 'Athletics'),
		},
		{
			character: { actor: 'Ada', skill: 'Athletics (Br)', pool: 'AAA|DDD' },
			adversary: { actor: 'Rival', skill: 'Athletics (Br)', pool: 'AA|DDD' },
		},
	);
	await control(gm, []);
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await e2e.step('G end');
}
