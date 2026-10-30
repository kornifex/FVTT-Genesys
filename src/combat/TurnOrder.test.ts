/**
 * @file Tests for the Turn Order: the turns of a round, and the turn each combatant and slot holds.
 */

import { describe, expect, it } from 'vitest';
import { InitiativeSide, StoredExtraSlot } from '@/combat/InitiativeSlots';
import { slotsForRound, turnNumbers, turnOfSlotAfter, TurnOrderState } from '@/combat/TurnOrder';

function combatant(id: string, initiative: number | null, side: InitiativeSide = 'pc') {
	return { id, initiative, hasPlayerOwner: side === 'pc' };
}

function storedSlot(activationSource: string, initiative: number | null, startingRound = 1): StoredExtraSlot {
	return { activationSource, initiative, startingRound };
}

function state(overrides: Partial<TurnOrderState> = {}): TurnOrderState {
	return {
		combatants: [combatant('hero', 3), combatant('boss', 2, 'npc'), combatant('ally', 1)],
		storedExtraSlots: [],
		claims: {},
		...overrides,
	};
}

describe('slotsForRound', () => {
	it("orders a round's slots with the Extra Slots and the Claims of that round only", () => {
		const twoRounds = state({
			storedExtraSlots: [storedSlot('boss', 5, 2)],
			claims: { 1: { 'boss:-1': 'boss' }, 2: { 'hero:-1': 'ally' } },
		});
		const slots = (round: number) => slotsForRound(twoRounds, round).map((slot) => `${slot.id}>${slot.claimantId ?? ''}`);

		expect(slots(1)).toEqual(['hero:-1>', 'boss:-1>boss', 'ally:-1>']);
		expect(slots(2)).toEqual(['boss:0>', 'hero:-1>ally', 'boss:-1>', 'ally:-1>']);
	});
});

describe('turnNumbers', () => {
	it("numbers each combatant's turn by its slot's place in the round", () => {
		expect(turnNumbers(state(), 1)).toEqual(
			new Map([
				['hero', 0],
				['boss', 1],
				['ally', 2],
			]),
		);
	});

	it('gives a combatant with an Extra Slot the number of its first turn in the round', () => {
		// Boss's Extra Slot goes last: Boss still acts first at its own slot.
		expect(turnNumbers(state({ storedExtraSlots: [storedSlot('boss', 0.5)] }), 1).get('boss')).toBe(1);
		// Boss's Extra Slot goes first: Boss first acts at it.
		expect(turnNumbers(state({ storedExtraSlots: [storedSlot('boss', 5)] }), 1).get('boss')).toBe(0);
	});

	it('leaves out an Extra Slot from a later round', () => {
		expect(turnNumbers(state({ storedExtraSlots: [storedSlot('boss', 5, 2)] }), 1).get('boss')).toBe(1);
	});
});

describe('turnOfSlotAfter', () => {
	it("is a slot's turn once a rolled initiative moves it", () => {
		// Ally's roll passes Hero: Boss's slot moves from the second turn to the third.
		expect(turnOfSlotAfter(state(), 1, 'boss:-1', { initiatives: [{ _id: 'ally', initiative: 4 }] })).toBe(2);
	});

	it("is a slot's turn once an Extra Slot sorts before it", () => {
		const extraSlots = [storedSlot('ally', 5)];

		expect(turnOfSlotAfter(state(), 1, 'hero:-1', { storedExtraSlots: extraSlots })).toBe(1);
		expect(turnOfSlotAfter(state(), 1, 'ally:0', { storedExtraSlots: extraSlots })).toBe(0);
	});

	it("is a slot's turn without changes", () => {
		expect(turnOfSlotAfter(state(), 1, 'ally:-1', {})).toBe(2);
	});

	it('is undefined for a slot the round no longer has', () => {
		const withAllyExtraSlot = state({ storedExtraSlots: [storedSlot('ally', 5)] });

		expect(turnOfSlotAfter(withAllyExtraSlot, 1, 'ally:0', { storedExtraSlots: [] })).toBeUndefined();
		expect(turnOfSlotAfter(withAllyExtraSlot, 1, 'ally:0', { storedExtraSlots: [storedSlot('ally', 5, 2)] })).toBeUndefined();
	});
});
