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
	// A world whose Skills Compendium names the strain recovery skills otherwise (§#756): the check picks between the skills
	// it marks « Recovers strain at the end of an encounter ».
	await gm.evaluate(async () => {
		const pack = await window.e2e.createCompendium({ label: 'E2E Strain Skills', name: 'e2e-strain-skills', type: 'Item' });
		const skill = (name: string, characteristic: string) => ({
			name,
			type: 'skill',
			system: { characteristic, recoversStrain: true },
		});
		await Item.create([skill('E2E Serenite', 'willpower'), skill('E2E Calme', 'presence')], { pack: pack.collection });
	});
	await setSetting('skillsCompendium', 'world.e2e-strain-skills');
	await gm.evaluate(async () => {
		const skill = (name: string, characteristic: string) => ({
			name,
			type: 'skill',
			system: { characteristic, rank: 1, category: 'general' },
		});
		await window.e2e.actor('Cy').createEmbeddedDocuments('Item', [skill('E2E Serenite', 'willpower'), skill('E2E Calme', 'presence')]);
		await window.e2e.settle();
	});
	const renamed = await opened(player, click(player, cy, '.recovery-actions .end-of-encounter'));
	await player.evaluate(() => window.dicePromptE2E.closePrompts());
	await gm.evaluate(async () => {
		const calme = (await game.packs.get('world.e2e-strain-skills')!.getDocuments()).find(
			(skill: { name: string }) => skill.name === 'E2E Calme',
		);
		await calme.update({ 'system.recoversStrain': false });
	});
	// The system reloads the skills of its Skills Compendium without waiting for the update, on each client.
	for (const client of [gm, player]) {
		await client.evaluate(async () => {
			await window.e2e.waitFor(
				'the reloaded skills',
				() =>
					CONFIG.genesys.skills.filter((loaded: { system: { recoversStrain: boolean } }) => loaded.system.recoversStrain)
						.length === 1,
			);
			await window.e2e.settle();
		});
	}
	const unticked = await opened(player, click(player, cy, '.recovery-actions .end-of-encounter'));
	await player.evaluate(() => window.dicePromptE2E.closePrompts());
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
	await setSetting('skillsCompendium', 'genesys.crb-skills');
	await gm.evaluate(() => game.packs.get('world.e2e-strain-skills')?.deleteCompendium());
	e2e.expect(
		'#756 R4 End of encounter opens on the better of the skills the Skills Compendium marks, whatever their names, and leaves one out once it is unticked',
		{ marked: { skill: renamed.skill, pool: renamed.pool }, unticked: { skill: unticked.skill, pool: unticked.pool } },
		{ marked: { skill: 'E2E Calme (Pr)', pool: 'PAA|' }, unticked: { skill: 'E2E Serenite (Will)', pool: 'PA|' } },
	);
	await e2e.step('recovery end');
}
