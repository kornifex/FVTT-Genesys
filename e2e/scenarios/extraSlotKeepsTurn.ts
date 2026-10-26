/** @file #54: adding an Extra Slot keeps the turn on the slot whose turn it was, with no turn events. */
import type { ScenarioContext, StepStates } from '../scenario.ts';

export async function run(e2e: ScenarioContext) {
	const combatants = (initiatives: { Hero?: number; Boss?: number } = {}) => [
		{ name: 'Hero', type: 'character' as const, owner: e2e.playerUser, initiative: initiatives.Hero },
		{ name: 'Boss', type: 'rival' as const, initiative: initiatives.Boss },
	];
	const player = await e2e.player();
	const addExtraSlotFor = (name: string) => () => e2e.gm.evaluate((name) => window.e2e.addExtraSlotFor(name), name);
	// #54 showed the turn on one slot and the tracker highlighting another, so both are asserted on every client.
	const turnOn = (step: string, states: StepStates, slot: string | null) =>
		e2e.expect(
			`${step} the turn is on ${slot ?? 'no slot'}`,
			Object.entries(states).map(([user, state]) => ({ user, current: state?.current, active: state?.trackerActive })),
			[e2e.gm.user, e2e.playerUser].map((user) => ({ user, current: slot, active: slot ? [slot] : [] })),
		);
	const noTurnEvent = (step: string, states: StepStates) =>
		e2e.expect(
			`${step} no turn event`,
			Object.values(states).flatMap((state) => state?.events ?? []),
			[],
		);
	const order = (step: string, states: StepStates, slots: string[]) =>
		e2e.expect(
			`${step} the slots sort as ${slots.join(', ')}`,
			states[e2e.gm.user]?.slots.map((slot) => slot.split('=')[0]),
			slots,
		);

	// No initiative rolled: every slot ties, so Hero's new slot sorts before Boss's, whose turn it is.
	await e2e.setUpCombat({ combatants: combatants(), turnOn: 'Boss:-1' });
	await e2e.step('A0 before');
	const a1 = await e2e.step('A1 GM adds an extra slot for Hero', addExtraSlotFor('Hero'));
	order('A1', a1, ['Hero:-1', 'Hero:0', 'Boss:-1']);
	turnOn('A1', a1, 'Boss:-1');
	noTurnEvent('A1', a1);
	const a2 = await e2e.step('A2 GM adds an extra slot for Boss', addExtraSlotFor('Boss'));
	order('A2', a2, ['Hero:-1', 'Hero:0', 'Boss:-1', 'Boss:1']);
	turnOn('A2', a2, 'Boss:-1');
	noTurnEvent('A2', a2);
	// v12 fires no turn event when the turn stays with the same combatant, v13 does: only the turn is asserted.
	turnOn('A3', await e2e.step('A3 GM ends the turn', () => e2e.gm.evaluate(() => game.combat.nextTurn())), 'Boss:1');

	// Initiatives rolled, Boss ahead: Hero's new slot sorts after the current one.
	await e2e.setUpCombat({ combatants: combatants({ Hero: 1, Boss: 2 }), turnOn: 'Boss:-1' });
	await e2e.step('B0 before');
	const b1 = await e2e.step('B1 GM adds an extra slot for Hero', addExtraSlotFor('Hero'));
	order('B1', b1, ['Boss:-1', 'Hero:-1', 'Hero:0']);
	turnOn('B1', b1, 'Boss:-1');
	noTurnEvent('B1', b1);

	// Before the combat starts, there is no turn to keep.
	await e2e.setUpCombat({ combatants: combatants(), start: false });
	await e2e.step('C0 before');
	const c1 = await e2e.step('C1 GM adds an extra slot for Hero', addExtraSlotFor('Hero'));
	order('C1', c1, ['Hero:-1', 'Hero:0', 'Boss:-1']);
	turnOn('C1', c1, null);
	noTurnEvent('C1', c1);
	turnOn('C2', await e2e.step('C2 GM starts the combat', () => e2e.gm.evaluate(() => game.combat.startCombat())), 'Hero:-1');

	await player.reload();
	turnOn('C3', await e2e.step('C3 player reloaded'), 'Hero:-1');
}
