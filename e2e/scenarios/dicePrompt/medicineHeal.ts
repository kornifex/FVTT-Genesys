import type { Client } from '../../scenario.ts';
import type { DicePromptContext } from './shared.ts';

export async function medicineHealPart(ctx: DicePromptContext) {
	const { e2e, gm, player, opened, click, roll, setSetting, update, target, recoveryButton, recoveryCard, health } = ctx;
	const cy = { actor: 'Cy' };
	const heal = (client: Client) => click(client, cy, '.tab-skills .skill .heal');
	const patientPrompt = (client: Client, pick: string | null) =>
		client.evaluate((pick) => window.dicePromptE2E.patientPrompt(pick), pick);
	// Cy, the player's, rolls two Ability dice for Medicine. Bo, the player's, has suffered more than half his wound
	// threshold; Mark, the GM's, more than his wound threshold; Cy, none.
	await update(cy, { system: { characteristics: { intellect: 2 }, wounds: { value: 0, max: 10 } } });
	await update({ actor: 'Bo' }, { system: { wounds: { value: 8, max: 12 }, strain: { value: 3, max: 10 } } });
	await update({ actor: 'Mark' }, { system: { wounds: { value: 13, max: 12 }, strain: { value: 0, max: 10 } } });
	await player.evaluate(() => window.e2e.target(null));

	let patients: string[] = [];
	const other = await opened(player, async () => {
		await heal(player)();
		patients = await patientPrompt(player, 'Bo');
	});
	e2e.expect(
		"#686 H1 with no target, Heal offers the scene's and the players' characters; healing Bo, past half his wound threshold, opens Medicine at Average",
		{ patients, actor: other.actor, skill: other.skill, pool: other.pool },
		// Hero and Mark have a token on the scene; Bo, Cy and Seeker are the player's.
		{ patients: ['Bo', 'Cy', 'Hero', 'Mark', 'Seeker'], actor: 'Cy', skill: 'Medicine (Int)', pool: 'AA|DD' },
	);

	// Ability dice on two Successes, then a Success and an Advantage; Difficulty dice on blank faces.
	await player.fixDice([
		{ face: 4, faces: 8 },
		{ face: 7, faces: 8 },
		{ face: 1, faces: 8 },
		{ face: 1, faces: 8 },
	]);
	const rolled = await player.evaluate(() => window.dicePromptE2E.promptRoll());
	const { labels } = await player.evaluate(() => window.dicePromptE2E.lastCard());
	const shown = { gm: await recoveryButton(gm, rolled.id), player: await recoveryButton(player, rolled.id) };
	e2e.expect(
		"#686 H2 Bo's card shows a wound healed per Success and a strain per Advantage, and Apply to the GM and Bo's owner",
		{ results: rolled.results, labels, summaries: rolled.summaries, shown },
		{
			results: 's s s a',
			labels: ['Roll Results', 'Summary', 'Heals E2E Bo', 'Dice'],
			summaries: ['s Successes 3 a Advantage 1', 'Wounds 3 Strain 1'],
			shown: { gm: true, player: true },
		},
	);
	await e2e.step("#686 H3 Bo's owner applies the card", () => recoveryButton(player, rolled.id, true));
	e2e.expect("#686 H3 Apply lowers Bo's wounds and strain by the result", await health('Bo'), { wounds: 5, strain: 2 });

	const self = await opened(player, async () => {
		await heal(player)();
		await patientPrompt(player, 'Cy');
	});
	e2e.expect('#686 H4 Cy healing themselves, at no wound, opens Medicine at Easy and two more', self.pool, 'AA|DDD');

	await target('Mark');
	const targeted = await opened(gm, heal(gm));
	const patientPrompts = await gm.evaluate(() => window.e2e.apps('app-select-patient-prompt').length);
	// Ability dice on two Successes each; Difficulty dice on blank faces.
	await gm.fixDice([
		{ face: 4, faces: 8 },
		{ face: 4, faces: 8 },
		{ face: 1, faces: 8 },
		{ face: 1, faces: 8 },
		{ face: 1, faces: 8 },
	]);
	const marked = await roll();
	const markShown = { gm: await recoveryButton(gm, marked.id), player: await recoveryButton(player, marked.id) };
	await recoveryButton(gm, marked.id, true);
	await target(null);
	e2e.expect(
		"#686 H5 healing the GM's target Mark, past his wound threshold, asks for no patient and opens at Hard; Apply shows to the GM alone, and heals Mark",
		{ patientPrompts, pool: targeted.pool, shown: markShown, health: await health('Mark') },
		{ patientPrompts: 0, pool: 'AA|DDD', shown: { gm: true, player: false }, health: { wounds: 9, strain: 0 } },
	);

	// §#723: an applied card records it on its message, so that no re-render, reload or other owner heals again.
	const applied = { button: false, applied: 'Applied' };
	e2e.expect(
		"#723 H6 Bo's card applied by the player shows as applied, with no Apply, after a re-render and to the GM; Mark's to the player; Bo was healed once",
		{
			bo: { player: await recoveryCard(player, rolled.id), gm: await recoveryCard(gm, rolled.id) },
			mark: await recoveryCard(player, marked.id),
			health: await health('Bo'),
		},
		{ bo: { player: applied, gm: applied }, mark: applied, health: { wounds: 5, strain: 2 } },
	);

	// A world whose compendium names the healing skill otherwise (§#727): the Heal button follows the setting.
	await setSetting('skillForHealingWounds', 'e2e sanatio');
	await gm.evaluate(async () => {
		await window.e2e
			.actor('Cy')
			.createEmbeddedDocuments('Item', [
				{ name: 'E2E Sanatio', type: 'skill', system: { characteristic: 'intellect', rank: 1, category: 'general' } },
			]);
		await window.e2e.settle();
	});
	const healRows = await gm.evaluate(async () => {
		const root = await window.e2e.render(window.e2e.actor('Cy').sheet);
		return [...root.querySelectorAll('.tab-skills .skill')]
			.filter((row) => row.querySelector('.heal'))
			.map((row) => window.e2e.text(row.querySelector('.skill-name')));
	});
	await gm.evaluate(async () => {
		await window.e2e.actor('Cy').items.getName('E2E Sanatio').delete();
		await window.e2e.settle();
	});
	await setSetting('skillForHealingWounds', 'Medicine');
	e2e.expect(
		'#727 H6 with the healing skill renamed in the settings, the Heal button shows beside it, and no longer beside Medicine',
		healRows,
		['E2E Sanatio (Int)'],
	);
	await e2e.step('medicineHeal end');
}
