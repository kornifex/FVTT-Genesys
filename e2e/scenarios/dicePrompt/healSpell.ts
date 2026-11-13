import type { DicePromptContext } from './shared.ts';

export async function healSpellPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, noPrompt, click, roll, update, target, recoveryButton, health } = ctx;
	await gm.evaluate(async () => {
		await Actor.createDocuments([
			{
				name: 'E2E Priest',
				type: 'character',
				system: { characteristics: { willpower: 2 } },
				items: [
					{ name: 'Divine', type: 'skill', system: { characteristic: 'willpower', rank: 1 } },
					{ name: 'E2E Heal', type: 'spell', system: { action: 'heal', difficulty: 1, skills: ['Divine', 'Primal'] } },
				],
			},
		]);
	});
	const cast = click(gm, { actor: 'Priest' }, '.tab-magic .spell .name button|E2E Heal');
	const patientPrompt = (pick: string | null) => gm.evaluate((pick) => window.dicePromptE2E.patientPrompt(pick), pick);
	// Mark, with a token, has suffered more than his wound threshold, where Medicine would open at Hard; Bo more than
	// half of it, where Medicine would open at Average.
	await update({ actor: 'Mark' }, { system: { wounds: { value: 13, max: 12 }, strain: { value: 4, max: 10 } } });
	await update({ actor: 'Bo' }, { system: { wounds: { value: 8, max: 12 }, strain: { value: 0, max: 10 } } });

	await target('Mark');
	const targeted = await opened(gm, cast);
	const patientPrompts = await gm.evaluate(() => window.e2e.apps('app-select-patient-prompt').length);
	e2e.expect(
		"#707 HS1 the Priest's Heal on their target Mark asks for no patient and opens Divine at Easy, whatever Mark's wounds",
		{ patientPrompts, skill: targeted.skill, pool: targeted.pool },
		{ patientPrompts: 0, skill: 'Divine (Will)', pool: 'PA|D' },
	);

	// Proficiency on two Successes, Ability on a Success and an Advantage; Difficulty on a blank face.
	await gm.fixDice([
		{ face: 4, faces: 12 },
		{ face: 7, faces: 8 },
		{ face: 1, faces: 8 },
	]);
	const rolled = await roll();
	const card = await gm.evaluate(() => window.dicePromptE2E.lastCard());
	await recoveryButton(gm, rolled.id, true);
	await target(null);
	e2e.expect(
		'#707 HS2 the card heals Mark a wound per Success and a strain per Advantage, and Apply heals him',
		{ results: rolled.results, labels: card.labels, summaries: card.summaries, health: await health('Mark') },
		{
			results: 's s s a',
			labels: ['Roll Results', 'Summary', 'Heals E2E Mark', 'Dice'],
			summaries: ['s Successes 3 a Advantage 1', 'Strain suffered by the caster 2', 'Wounds 3 Strain 1'],
			health: { wounds: 10, strain: 3 },
		},
	);

	let patients: string[] = [];
	const picked = await opened(gm, async () => {
		await cast();
		patients = await patientPrompt('Bo');
	});
	e2e.expect(
		'#707 HS3 without a target, the Priest picks Bo among the patients Medicine offers, and Heal opens at Easy',
		{ patients, pool: picked.pool },
		{ patients: ['Bo', 'Cy', 'Hero', 'Mark', 'Priest', 'Seeker', 'Foe (Rival)', 'Rival (Rival)', 'Veiled (Rival)'], pool: 'PA|D' },
	);

	e2e.expect(
		'#707 HS4 cancelling the pick opens no Dice Prompt',
		await noPrompt(gm, async () => {
			await cast();
			await patientPrompt(null);
		}),
		{ prompts: 0, notifications: [] },
	);
	// The Rival's token is unlinked: its wounds live on the token's own actor, not on the world's.
	const rivalWounds = () =>
		gm.evaluate(() => {
			const token = canvas.scene.tokens.find((candidate: { name: string }) => candidate.name === 'E2E Rival');
			return (token.actor.system as { wounds: { value: number } }).wounds.value;
		});
	await gm.evaluate(() => {
		const token = canvas.scene.tokens.find((candidate: { name: string }) => candidate.name === 'E2E Rival');
		return token.actor.update({ 'system.wounds': { value: 8, max: 12 } });
	});
	await gm.fixDice([
		{ face: 4, faces: 12 },
		{ face: 7, faces: 8 },
		{ face: 1, faces: 8 },
	]);
	const rivalPicked = await opened(gm, async () => {
		await cast();
		await patientPrompt('Rival (Rival)');
	});
	const rivalRolled = await roll();
	await recoveryButton(gm, rivalRolled.id, true);
	e2e.expect(
		"#766 HS5 the Priest picks the scene's unlinked Rival, and Apply heals the token's wounds by the Successes",
		{ pool: rivalPicked.pool, wounds: await rivalWounds() },
		{ pool: 'PA|D', wounds: 5 },
	);
	await e2e.step('healSpell end');
}
