import type { DicePromptContext } from './shared.ts';

export async function skillDifficultyPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, select, setSetting, control, skillRoll, attack, linkPrompt } = ctx;
	await setSetting('defaultDifficulty', 'D');
	// Ada's own copy of Melee holds a difficulty of its own, which the prompt ignores.
	await gm.evaluate(() => game.actors.getName('E2E Ada').items.getName('Melee').update({ 'system.difficulty': 'DDDD' }));
	const compendium = await gm.evaluate(() =>
		Object.fromEntries(
			CONFIG.genesys.skills
				.filter((skill: { name: string }) => ['Brawl', 'Melee', 'Cool'].includes(skill.name))
				.map((skill: { name: string; system: { difficulty: string } }) => [skill.name, skill.system.difficulty]),
		),
	);
	const spear = await opened(gm, attack('Spear'));
	const cool = await opened(gm, skillRoll('Cool'));
	const coolToMelee = await select('skill', 'Melee (Br)');
	await control(gm, ['Bo']);
	const message = await gm.evaluate(() => window.dicePromptE2E.chatMessage('<p>@check[Melee,3]</p>'));
	const link = await linkPrompt(gm, { message }, 'Melee');
	await control(gm, []);
	e2e.expect(
		"#669 W1 a melee attack opens at its compendium skill's Average, a skill without one at the world's Easy, a check link at its own difficulty; picking another skill keeps it",
		{
			compendium,
			spear: { skill: spear.skill, pool: spear.pool },
			cool: cool.pool,
			coolToMelee: coolToMelee.pool,
			link: link.pool,
		},
		{
			compendium: { Brawl: 'DD', Cool: '', Melee: 'DD' },
			spear: { skill: 'Melee (Br)', pool: 'PPP|DD' },
			cool: 'A|D',
			coolToMelee: 'PPP|D',
			link: '|DDD',
		},
	);
	await e2e.step('W end');
}
