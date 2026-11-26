import type { DicePromptContext, PromptState } from './shared.ts';

export async function initiativeModificationsPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, click, select, named } = ctx;
	const hero = { actor: 'Hero' };
	// The Hero, a combatant, holds an effect of its initiative checks alone, and Vigilance and Cool to roll from its sheet:
	// another part may have taken Vigilance away.
	const created = await gm.evaluate(async () => {
		const actor = window.e2e.actor('Hero');
		await actor.createEmbeddedDocuments('ActiveEffect', [
			{
				name: 'E2E Rapid Reaction',
				system: { changes: [{ key: 'genesys.pool.initiative.self.', value: 'B', type: 'genesys.poolModification' }] },
			},
		]);
		const missing = [
			{ name: 'Vigilance', characteristic: 'willpower' },
			{ name: 'Cool', characteristic: 'presence' },
		].filter(({ name }) => !actor.items.getName(name));
		const skills = await actor.createEmbeddedDocuments(
			'Item',
			missing.map(({ name, characteristic }) => ({ name, type: 'skill', system: { characteristic, rank: 0, category: 'general' } })),
		);
		await window.e2e.settle();
		return skills.map((skill: { id: string }) => skill.id);
	});
	const rapidReaction = (state: PromptState) => named(state, 'From Self').filter(({ name }) => name.includes('Rapid Reaction'));

	// The prompt opens on the Hero's Initiative Skill, Vigilance, and the GM picks Cool, then Perception, which is none.
	const prompts = [await opened(gm, () => gm.evaluate(() => void game.combat.rollSlotInitiative(window.e2e.slotId('Hero'))))];
	prompts.push(await select('skill', 'Cool'), await select('skill', 'Perception'));
	const bySkill = Object.fromEntries(prompts.map((state) => [state.skill, rapidReaction(state)]));
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	// The world's setting leaves the effects' Pool Modifications off: the row is listed, for the roller to turn on.
	const row = [{ name: 'From Self: E2E Rapid Reaction', enabled: false, mods: 'B+' }];
	e2e.expect(
		"#931 I1 the Hero's initiative check lists the effect of its initiative checks, with Vigilance, Cool or any other skill",
		bySkill,
		{ 'Vigilance (Will)': row, 'Cool (Pr)': row, 'Perception (Cun)': row },
	);

	const skillChecks = {
		vigilance: rapidReaction(await opened(gm, click(gm, hero, '.tab-skills .skill button.skill-name|Vigilance ('))),
		cool: rapidReaction(await opened(gm, click(gm, hero, '.tab-skills .skill button.skill-name|Cool ('))),
	};
	await gm.evaluate(async (skillIds) => {
		await window.dicePromptE2E.closePrompts();
		const actor = window.e2e.actor('Hero');
		await actor.effects.getName('E2E Rapid Reaction').delete();
		await actor.deleteEmbeddedDocuments('Item', skillIds);
		await window.e2e.settle();
	}, created);
	e2e.expect("#931 I2 the Hero's Vigilance and Cool checks rolled from the sheet, for no initiative, leave the effect out", skillChecks, {
		vigilance: [],
		cool: [],
	});
	await e2e.step('initiativeModifications end');
}
