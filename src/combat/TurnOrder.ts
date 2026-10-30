/** @file The turn order of a combat's rounds, each turn an Initiative Slot, and the turn each combatant and slot holds. */

import { buildSlots, extraSlotsForRound, InitiativeSlot, RoundClaims, SlotCombatant, StoredExtraSlot } from '@/combat/InitiativeSlots';

/**
 * The Claims on the Initiative Slots, by round.
 */
export type ClaimData = Record<number, RoundClaims>;

/**
 * What the turn order needs of a combat.
 */
export type TurnOrderState = {
	combatants: SlotCombatant[];

	/**
	 * Every extra slot the combat stores, whatever round it starts from.
	 */
	storedExtraSlots: StoredExtraSlot[];

	claims: ClaimData;
};

/**
 * The Initiative Slots of a round in turn order, with their Claims.
 */
export function slotsForRound(state: TurnOrderState, round: number): InitiativeSlot[] {
	return buildSlots(state.combatants, extraSlotsForRound(state.storedExtraSlots, round), state.claims[round] ?? {});
}

/**
 * The number of each combatant's turn in a round, by combatant id: the place of the first Initiative Slot its initiative
 * gives, whoever claimed it.
 */
export function turnNumbers(state: TurnOrderState, round: number): Map<string, number> {
	const numbers = new Map<string, number>();
	slotsForRound(state, round).forEach((slot, turn) => {
		// A combatant with an Extra Slot first acts at its earliest slot: Foundry v14 counts an effect created out of this
		// combat from that turn.
		if (!numbers.has(slot.originId)) {
			numbers.set(slot.originId, turn);
		}
	});

	return numbers;
}

/**
 * Changes to a combat that move its Initiative Slots: initiatives written to combatants, or the stored extra slots
 * replaced.
 */
export type TurnOrderChanges = {
	initiatives?: { _id: string; initiative: number }[];
	storedExtraSlots?: StoredExtraSlot[];
};

/**
 * The turn of an Initiative Slot of a round once changes to the combat are made, or undefined if the round no longer has
 * that slot.
 */
export function turnOfSlotAfter(state: TurnOrderState, round: number, slotId: string, changes: TurnOrderChanges): number | undefined {
	const initiatives = new Map((changes.initiatives ?? []).map(({ _id, initiative }) => [_id, initiative]));
	const changed: TurnOrderState = {
		...state,
		combatants: state.combatants.map((combatant) =>
			initiatives.has(combatant.id) ? { ...combatant, initiative: initiatives.get(combatant.id)! } : combatant,
		),
		storedExtraSlots: changes.storedExtraSlots ?? state.storedExtraSlots,
	};
	const turn = slotsForRound(changed, round).findIndex((slot) => slot.id === slotId);

	return turn === -1 ? undefined : turn;
}
