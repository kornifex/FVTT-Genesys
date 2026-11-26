import type { DicePromptContext } from './shared.ts';

export async function recoveryBonusesPart(ctx: DicePromptContext) {
	const { e2e, gm, player, opened, click, update, recoveryButton, health } = ctx;
	const cy = { actor: 'Cy' };
	// Cy, the player's, rolls Cool on three Ability dice. Their talent of rank 2, which scales with rank, adds a wound to
	// their night's rest, a strain and a wound to their end of encounter check, each twice.
	await update(cy, {
		system: { characteristics: { willpower: 2, presence: 3 }, wounds: { value: 6, max: 10 }, strain: { value: 5, max: 10 } },
	});
	await gm.evaluate(async () => {
		const change = (key: string) => ({ key, value: '1', type: 'custom' });
		await window.e2e.actor('Cy').createEmbeddedDocuments('Item', [
			{
				name: 'E2E Hardy',
				type: 'talent',
				system: { ranked: 'yes', rank: 2, scalesWithRank: 'yes' },
				effects: [
					{
						name: 'E2E Hardy',
						system: {
							changes: [
								change('genesys.healing.rest.wounds'),
								change('genesys.healing.encounterEnd.strain'),
								change('genesys.healing.encounterEnd.wounds'),
							],
						},
					},
				],
			},
		]);
		await window.e2e.settle();
	});
	const endOfEncounter = click(player, cy, '.recovery-actions .end-of-encounter');

	await opened(player, endOfEncounter);
	// Ability dice on a Success, then two blank faces.
	await player.fixDice([
		{ face: 2, faces: 8 },
		{ face: 1, faces: 8 },
		{ face: 1, faces: 8 },
	]);
	const rolled = await player.evaluate(() => window.dicePromptE2E.promptRoll());
	const shown = await recoveryButton(player, rolled.id, true);
	e2e.expect(
		"#931 RB1 Cy's end of encounter card recovers a strain per Success and two more, heals two wounds and shows them; Apply lowers both",
		{ results: rolled.results, summaries: rolled.summaries, shown, health: await health('Cy') },
		{ results: 's', summaries: ['s Successes 1', 'Wounds 2 Strain 3'], shown: true, health: { wounds: 4, strain: 2 } },
	);

	await opened(player, endOfEncounter);
	// Ability dice on blank faces: the check fails.
	await player.fixDice([
		{ face: 1, faces: 8 },
		{ face: 1, faces: 8 },
		{ face: 1, faces: 8 },
	]);
	const failed = await player.evaluate(() => window.dicePromptE2E.promptRoll());
	e2e.expect(
		"#931 RB2 a failed end of encounter check still recovers Cy's two strain and heals their two wounds, and offers Apply",
		{ summaries: failed.summaries, shown: await recoveryButton(player, failed.id) },
		// The results' summary is empty: no symbol was rolled.
		{ summaries: ['', 'Wounds 2 Strain 2'], shown: true },
	);

	const rest = async () => {
		await click(player, cy, '.recovery-actions .nights-rest')();
		await e2e.settle();
		return { health: await health('Cy'), message: await gm.evaluate(() => window.dicePromptE2E.lastMessageText()) };
	};
	const atFourWounds = await rest();
	const atOneWound = await rest();
	e2e.expect(
		"#931 RB3 Cy's night's rest heals one wound and two more, never more than Cy suffers, and the chat gives the count healed",
		{ atFourWounds, atOneWound },
		{
			atFourWounds: {
				health: { wounds: 1, strain: 0 },
				message: { speaker: 'Cy', text: 'Rests for the night. Strain recovered: 2. Wounds healed: 3.' },
			},
			atOneWound: {
				health: { wounds: 0, strain: 0 },
				message: { speaker: 'Cy', text: 'Rests for the night. Strain recovered: 0. Wounds healed: 1.' },
			},
		},
	);
	await gm.evaluate(async () => {
		await window.e2e.actor('Cy').items.getName('E2E Hardy').delete();
		await window.e2e.settle();
	});
	await e2e.step('recoveryBonuses end');
}
