import type { DicePromptContext } from './shared.ts';



export async function customSkillEffectsPart(ctx: DicePromptContext) {
	const { e2e, gm } = ctx;
	e2e.expect(
		'#40 F1 opening and saving an actor effect and an item effect keeps their custom skill',
		{
			actor: await gm.evaluate(() => window.dicePromptE2E.saveEffectSheet({ actor: 'Ada', effect: 'Knack' })),
			item: await gm.evaluate(() => window.dicePromptE2E.saveEffectSheet({ actor: 'Ada', item: 'Map', effect: 'Charm' })),
		},
		{
			actor: { selected: ['E2E Craft'], changes: ['genesys.pool.skill.self.E2E Craft=B'] },
			item: { selected: ['E2E Craft'], changes: ['genesys.pool.skill.self.E2E Craft=a'] },
		},
	);
	await e2e.step('F end');
}
