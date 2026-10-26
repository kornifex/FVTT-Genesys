/** @file #58: a roll that moves a slot before the current one keeps the turn on its slot, with no turn events. */
import type { ScenarioContext, StepStates } from '../scenario.ts';

export async function run(e2e: ScenarioContext) {
	// Hero (the player's) and Boss, with an extra slot each: Hero:0, then Boss:1.
	const setUp = (initiatives: Record<'Hero:-1' | 'Hero:0' | 'Boss:-1' | 'Boss:1', number | null>, turnOn: string) =>
		e2e.setUpCombat({
			combatants: [
				{ name: 'Hero', type: 'character', owner: e2e.playerUser, initiative: initiatives['Hero:-1'] },
				{ name: 'Boss', type: 'rival', initiative: initiatives['Boss:-1'] },
			],
			extraSlots: [
				{ name: 'Hero', initiative: initiatives['Hero:0'] },
				{ name: 'Boss', initiative: initiatives['Boss:1'] },
			],
			turnOn,
		});
	const gmRolls = (combatant: string, extraSlot: number) => () =>
		e2e.gm.evaluate((slot) => game.combat.rollSlotsInitiative([window.e2e.slotId(slot.combatant, slot.extraSlot)]), {
			combatant,
			extraSlot,
		});
	const player = await e2e.player();
	// #58: the turn moved on the client that wrote the roll and stayed on the others, so every client is asserted.
	const turnKept = (step: string, states: StepStates, slot: string) =>
		e2e.expect(
			`${step} the turn stays on ${slot}, with no turn event`,
			Object.entries(states).map(([user, state]) => ({
				user,
				current: state?.current,
				active: state?.trackerActive,
				events: state?.events,
			})),
			[e2e.gm.user, e2e.playerUser].map((user) => ({ user, current: slot, active: [slot], events: [] })),
		);
	const order = (step: string, states: StepStates, slots: string[]) =>
		e2e.expect(
			`${step} the slots sort as ${slots.join(', ')}`,
			states[e2e.gm.user]?.slots.map((slot) => slot.split('=')[0]),
			slots,
		);

	// The GM rolls Boss's extra slot, which moves before Hero's own slot, whose turn it is.
	await setUp({ 'Hero:-1': -50, 'Hero:0': null, 'Boss:-1': 50, 'Boss:1': null }, 'Hero:-1');
	await e2e.step('A0 before');
	const a1 = await e2e.step("A1 GM rolls Boss's extra slot", gmRolls('Boss', 1));
	order('A1', a1, ['Boss:-1', 'Boss:1', 'Hero:-1', 'Hero:0']);
	turnKept('A1', a1, 'Hero:-1');

	// The GM rolls Boss's own slot, which moves before Hero's extra slot, whose turn it is.
	await setUp({ 'Hero:-1': -50, 'Hero:0': null, 'Boss:-1': null, 'Boss:1': 50 }, 'Hero:0');
	await e2e.step('B0 before');
	const b1 = await e2e.step("B1 GM rolls Boss's own slot", gmRolls('Boss', -1));
	order('B1', b1, ['Boss:1', 'Boss:-1', 'Hero:-1', 'Hero:0']);
	turnKept('B1', b1, 'Hero:0');

	// The player rolls all of Hero's slots, which move before Boss's extra slot, whose turn it is; the GM writes them.
	await setUp({ 'Hero:-1': null, 'Hero:0': null, 'Boss:-1': -50, 'Boss:1': -50 }, 'Boss:1');
	await e2e.step('C0 before');
	const c1 = await e2e.step("C1 player rolls all of Hero's slots", () => player.evaluate(() => game.combat.rollAll()));
	order('C1', c1, ['Hero:-1', 'Hero:0', 'Boss:-1', 'Boss:1']);
	turnKept('C1', c1, 'Boss:1');

	// The turn the server stored, as a client that just joined sees it.
	await player.reload();
	turnKept('C2', await e2e.step('C2 player reloaded'), 'Boss:1');
}
