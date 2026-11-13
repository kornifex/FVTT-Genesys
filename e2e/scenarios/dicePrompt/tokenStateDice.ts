import type { PromptState, DicePromptContext } from './shared.ts';

export async function tokenStateDicePart(ctx: DicePromptContext) {
	const { e2e, gm, opened, toggle, skillRoll, characteristicRoll } = ctx;
	const STATES = ['immobilized', 'disoriented', 'staggered'];
	const setStates = (active: boolean) =>
		gm.evaluate(
			async (args) => {
				const ada = game.actors.getName('E2E Ada');
				for (const id of args.states) await ada.toggleStatusEffect(id, { active: args.active, rounds: 1 });
			},
			{ states: STATES, active },
		);
	const stateRows = (state: PromptState) => state.modifications.filter(({ name }) => /Immobilized|Disoriented|Staggered/.test(name));
	const reminders = () => gm.evaluate(() => window.dicePromptE2E.promptReminders());

	await setStates(true);
	const cool = await opened(gm, skillRoll('Cool'));
	const shown = await reminders();
	const turnedOn = await toggle('Disoriented');
	const brawn = await opened(gm, characteristicRoll(1));
	e2e.expect(
		"#682 S1 a Disoriented character's checks list its Setback, which the roller turns on like any effect; Immobilized and Staggered show as reminders",
		{ rows: stateRows(cool), reminders: shown, on: turnedOn.pool, brawn: stateRows(brawn) },
		{
			rows: [{ name: 'From Self: Disoriented', enabled: false, mods: 'S+' }],
			reminders: ["Immobilized: can't perform maneuvers.", "Staggered: can't perform actions."],
			on: 'A|DDS',
			brawn: [{ name: 'From Self: Disoriented', enabled: false, mods: 'S+' }],
		},
	);

	await setStates(false);
	const cleared = await opened(gm, skillRoll('Cool'));
	e2e.expect(
		'#682 S2 once the states are removed, the check lists no Setback and shows no reminder',
		{ rows: stateRows(cleared), reminders: await reminders() },
		{ rows: [], reminders: [] },
	);
	await e2e.step('token states end');
}
