import type { DicePromptContext } from './shared.ts';



export async function recoveryPart(ctx: DicePromptContext) {
	const { e2e, gm, player, opened, click, setSetting, update, recoveryButton, health } = ctx;
	const cy = { actor: 'Cy' };
	// Cy, the player's, rolls Cool on three Ability dice, Discipline on two.
	await update(cy, {
		system: { characteristics: { willpower: 2, presence: 3 }, wounds: { value: 4, max: 10 }, strain: { value: 5, max: 10 } },
	});

	const encounter = await opened(player, click(player, cy, '.recovery-actions .end-of-encounter'));
	const difficulty = await player.evaluate(() => window.dicePromptE2E.promptDifficulty().label);
	const discipline = await player.evaluate((args) => window.dicePromptE2E.promptSelect(args), {
		name: 'skill' as const,
		option: 'Discipline',
	});
	e2e.expect(
		'#687 R1 End of encounter opens a Simple check on the better of Discipline and Cool, and the player can pick the other',
		{ actor: encounter.actor, skill: encounter.skill, pool: encounter.pool, difficulty, other: discipline.pool },
		{ actor: 'Cy', skill: 'Cool (Pr)', pool: 'AAA|', difficulty: 'Difficulty: Simple', other: 'AA|' },
	);

	// Discipline's Ability dice on two Successes, then a Success and an Advantage.
	await player.fixDice([
		{ face: 4, faces: 8 },
		{ face: 7, faces: 8 },
	]);
	const rolled = await player.evaluate(() => window.dicePromptE2E.promptRoll());
	const { labels } = await player.evaluate(() => window.dicePromptE2E.lastCard());
	const shown = await recoveryButton(player, rolled.id, true);
	e2e.expect(
		"#687 R2 the card recovers a strain per Success, and no wound; Apply lowers Cy's strain by them",
		{ results: rolled.results, labels, summaries: rolled.summaries, shown, health: await health('Cy') },
		{
			results: 's s s a',
			labels: ['Roll Results', 'Summary', 'E2E Cy recovers', 'Dice'],
			summaries: ['s Successes 3 a Advantage 1', 'Strain 3'],
			shown: true,
			health: { wounds: 4, strain: 2 },
		},
	);

	await e2e.step("#687 R3 Cy's owner rests for the night", click(player, cy, '.recovery-actions .nights-rest'));
	await e2e.settle();
	e2e.expect(
		"#687 R3 Night's rest empties the strain and heals one wound, and the chat says so",
		{ health: await health('Cy'), message: await gm.evaluate(() => window.dicePromptE2E.lastMessageText()) },
		{
			health: { wounds: 3, strain: 0 },
			message: { speaker: 'Cy', text: 'Rests for the night. Strain recovered: 2. Wounds healed: 1.' },
		},
	);
	// A world whose compendium names the two skills otherwise (§#727): the check picks between those the settings name.
	await setSetting('skillForRecoveringStrain', 'E2E Serenite');
	await setSetting('alternativeSkillForRecoveringStrain', 'e2e calme');
	await gm.evaluate(async () => {
		const skill = (name: string, characteristic: string) => ({
			name,
			type: 'skill',
			system: { characteristic, rank: 1, category: 'general' },
		});
		await window.e2e
			.actor('Cy')
			.createEmbeddedDocuments('Item', [skill('E2E Serenite', 'willpower'), skill('E2E Calme', 'presence')]);
		await window.e2e.settle();
	});
	const renamed = await opened(player, click(player, cy, '.recovery-actions .end-of-encounter'));
	await gm.evaluate(async () => {
		const cy = window.e2e.actor('Cy');
		await cy.deleteEmbeddedDocuments(
			'Item',
			cy.items
				.filter((item: { name: string }) => ['E2E Serenite', 'E2E Calme'].includes(item.name))
				.map((item: { id: string }) => item.id),
		);
		await window.e2e.settle();
	});
	await setSetting('skillForRecoveringStrain', 'Discipline');
	await setSetting('alternativeSkillForRecoveringStrain', 'Cool');
	e2e.expect(
		'#727 R4 with the two strain recovery skills renamed in the settings, End of encounter opens on the better of those',
		{ skill: renamed.skill, pool: renamed.pool },
		{ skill: 'E2E Calme (Pr)', pool: 'PAA|' },
	);
	await e2e.step('recovery end');
}
