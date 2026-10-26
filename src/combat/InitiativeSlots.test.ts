/**
 * @file Tests for Initiative Slots: turn order, Claims and what a user may do with them.
 */

import { describe, expect, it } from 'vitest';
import {
	buildSlots,
	claimRefusal,
	decodeInitiative,
	Disposition,
	encodeInitiative,
	ExtraSlot,
	extraSlotsForRound,
	InitiativeSlot,
	initiativeWrites,
	ownSlotIds,
	slotIdsOf,
	slotsToRoll,
	slotView,
	SlotViewer,
	StoredExtraSlot,
	withExtraSlotInitiatives,
} from '@/combat/InitiativeSlots';

function combatant(id: string, initiative: number | null, disposition: Disposition = 'friendly') {
	return { id, initiative, disposition };
}

function extraSlot(activationSource: string, index: number, initiative: number | null): ExtraSlot {
	return { activationSource, index, initiative, startingRound: 1 };
}

function storedSlot(activationSource: string, startingRound: number, initiative: number | null = null): StoredExtraSlot {
	return { activationSource, initiative, startingRound };
}

function order(slots: InitiativeSlot[]) {
	return slots.map((slot) => slot.id);
}

const player: SlotViewer = { isGM: false, isPlayerOf: (combatantId) => combatantId === 'hero' };
const gm: SlotViewer = { isGM: true, isPlayerOf: () => false };

describe('buildSlots', () => {
	it('orders the slots by initiative, highest first, and slots without initiative last', () => {
		const slots = buildSlots([combatant('a', 1), combatant('b', null), combatant('c', 3.02), combatant('d', 3.01)], []);

		expect(order(slots)).toEqual(['c:-1', 'd:-1', 'a:-1', 'b:-1']);
	});

	it('breaks initiative ties by disposition, friendly first, then by combatant id', () => {
		const slots = buildSlots([combatant('h', 2, 'hostile'), combatant('n', 2, 'neutral'), combatant('f2', 2), combatant('f1', 2)], []);

		expect(order(slots)).toEqual(['f1:-1', 'f2:-1', 'n:-1', 'h:-1']);
	});

	it('ranks the checks by Successes, then by Advantage (CRB p. 96)', () => {
		const slots = buildSlots(
			[combatant('a', encodeInitiative(2, 0)), combatant('b', encodeInitiative(1, 5)), combatant('c', encodeInitiative(2, 1))],
			[],
		);

		expect(order(slots)).toEqual(['c:-1', 'a:-1', 'b:-1']);
	});

	it('ranks a PC above an NPC with as many Successes and Advantage (CRB p. 96)', () => {
		const slots = buildSlots([combatant('boss', encodeInitiative(1, 2), 'hostile'), combatant('hero', encodeInitiative(1, 2))], []);

		expect(order(slots)).toEqual(['hero:-1', 'boss:-1']);
	});

	it('ranks checks without Successes by their Advantage, whatever Failures are left (CRB p. 96)', () => {
		const slots = buildSlots([combatant('a', encodeInitiative(-1, 2)), combatant('b', encodeInitiative(-2, 3))], []);

		expect(order(slots)).toEqual(['b:-1', 'a:-1']);
	});

	it('counts leftover Threats as no Advantage, so a PC and an NPC with as many Successes tie (CRB p. 96)', () => {
		const slots = buildSlots([combatant('boss', encodeInitiative(1, -1), 'hostile'), combatant('hero', encodeInitiative(1, -2))], []);

		expect(order(slots)).toEqual(['hero:-1', 'boss:-1']);
	});

	it('gives each extra slot its own initiative, as a nemesis records both its results (CRB p. 205)', () => {
		const slots = buildSlots(
			[combatant('boss', 1, 'hostile'), combatant('hero', 2)],
			[extraSlot('boss', 0, 3), extraSlot('boss', 1, null)],
		);

		expect(slots.map(({ id, originId, activationId, initiative }) => ({ id, originId, activationId, initiative }))).toEqual([
			{ id: 'boss:0', originId: 'boss', activationId: 0, initiative: 3 },
			{ id: 'hero:-1', originId: 'hero', activationId: -1, initiative: 2 },
			{ id: 'boss:-1', originId: 'boss', activationId: -1, initiative: 1 },
			{ id: 'boss:1', originId: 'boss', activationId: 1, initiative: null },
		]);
	});

	it('drops the extra slots of combatants that left', () => {
		const slots = buildSlots([combatant('hero', 2)], [extraSlot('gone', 0, 5)]);

		expect(order(slots)).toEqual(['hero:-1']);
	});

	it('gives friendly combatants PC slots and every other combatant NPC slots', () => {
		const slots = buildSlots([combatant('f', 3), combatant('n', 2, 'neutral'), combatant('h', 1, 'hostile')], []);

		expect(slots.map((slot) => slot.side)).toEqual(['pc', 'npc', 'npc']);
	});

	it("gives an NPC's extra slots NPC slots, as both of a nemesis's results are NPC slots (CRB p. 205)", () => {
		const slots = buildSlots([combatant('hero', 2), combatant('boss', 1, 'hostile')], [extraSlot('boss', 0, 3)]);

		expect(slots.map(({ id, side }) => ({ id, side }))).toEqual([
			{ id: 'boss:0', side: 'npc' },
			{ id: 'hero:-1', side: 'pc' },
			{ id: 'boss:-1', side: 'npc' },
		]);
	});

	it('keeps a Claim on its slot when a reroll changes the turn order', () => {
		const claims = { 'b:-1': 'hero' };
		const before = buildSlots([combatant('a', 3), combatant('b', 1)], [], claims);
		const after = buildSlots([combatant('a', 0), combatant('b', 1)], [], claims);

		expect(before.map((slot) => slot.claimantId)).toEqual([undefined, 'hero']);
		expect(after.map((slot) => slot.claimantId)).toEqual(['hero', undefined]);
	});
});

describe('claimRefusal', () => {
	const slots = buildSlots([combatant('hero', 3), combatant('ally', 2), combatant('boss', 1, 'hostile')], [extraSlot('ally', 0, 1.5)]);

	it('lets a combatant claim an unclaimed slot of its side (CRB p. 96)', () => {
		expect(claimRefusal(slots, {}, 'ally:-1', { id: 'hero', side: 'pc' })).toBeUndefined();
	});

	it('refuses a slot that does not exist', () => {
		expect(claimRefusal(slots, {}, 'nobody:-1', { id: 'hero', side: 'pc' })).toBe('Genesys.Notifications.GenericError');
	});

	it('refuses a slot of the other side: PC slots go to PCs, NPC slots to NPCs (CRB p. 96)', () => {
		expect(claimRefusal(slots, {}, 'boss:-1', { id: 'hero', side: 'pc' })).toBe('Genesys.Notifications.CannotClaimOppositeSlot');
	});

	it('refuses a slot that is already claimed (CRB p. 96)', () => {
		expect(claimRefusal(slots, { 'hero:-1': 'ally' }, 'hero:-1', { id: 'hero', side: 'pc' })).toBe(
			'Genesys.Notifications.SlotAlreadyClaimed',
		);
	});

	it('refuses a combatant that claimed as many slots as its initiative gives: a character acts once per round (CRB p. 96)', () => {
		expect(claimRefusal(slots, { 'hero:-1': 'hero' }, 'ally:-1', { id: 'hero', side: 'pc' })).toBe(
			'Genesys.Notifications.CombatantHasNoActivationLeft',
		);
	});

	it('lets a combatant with extra slots claim once more for each of them', () => {
		expect(claimRefusal(slots, { 'hero:-1': 'ally' }, 'ally:-1', { id: 'ally', side: 'pc' })).toBeUndefined();
		expect(claimRefusal(slots, { 'hero:-1': 'ally', 'ally:-1': 'ally' }, 'ally:0', { id: 'ally', side: 'pc' })).toBe(
			'Genesys.Notifications.CombatantHasNoActivationLeft',
		);
	});

	it('lets a nemesis with an extra slot take two turns a round, and no more (CRB p. 205)', () => {
		const withNemesis = buildSlots(
			[combatant('hero', 3), combatant('goons', 2, 'hostile'), combatant('boss', 1, 'hostile')],
			[extraSlot('boss', 0, 2)],
		);
		const nemesis = { id: 'boss', side: 'npc' as const };

		expect(claimRefusal(withNemesis, { 'boss:0': 'boss' }, 'boss:-1', nemesis)).toBeUndefined();
		expect(claimRefusal(withNemesis, { 'boss:0': 'boss', 'boss:-1': 'boss' }, 'goons:-1', nemesis)).toBe(
			'Genesys.Notifications.CombatantHasNoActivationLeft',
		);
	});
});

describe('slotView', () => {
	const [unclaimed] = buildSlots([combatant('hero', 1)], []);
	const claimed = { ...unclaimed, claimantId: 'hero' };
	const npcSlot = { ...unclaimed, side: 'npc' as const };

	it('shows every slot as claimed before the combat starts, then only the claimed ones', () => {
		expect(slotView(unclaimed, false, player).showsAsClaimed).toBe(true);
		expect(slotView(unclaimed, true, player).showsAsClaimed).toBe(false);
		expect(slotView(claimed, true, player).showsAsClaimed).toBe(true);
	});

	it('lets players claim PC slots, and the GM any slot: the GM picks the NPCs (CRB p. 96)', () => {
		expect(slotView(unclaimed, true, player).canClaim).toBe(true);
		expect(slotView(npcSlot, true, player).canClaim).toBe(false);
		expect(slotView(npcSlot, true, gm).canClaim).toBe(true);
	});

	it('lets the GM revoke a Claim once the combat started', () => {
		expect(slotView(claimed, true, gm).canRevoke).toBe(true);
		expect(slotView(claimed, false, gm).canRevoke).toBe(false);
		expect(slotView(unclaimed, true, gm).canRevoke).toBe(false);
		expect(slotView(claimed, true, player).canRevoke).toBe(false);
	});

	it("gives the claimant's players control of the turn", () => {
		expect(slotView(claimed, true, player).controlsTurn).toBe(true);
		expect(slotView({ ...claimed, claimantId: 'ally' }, true, player).controlsTurn).toBe(false);
		expect(slotView(unclaimed, true, player).controlsTurn).toBe(false);
	});
});

describe('extraSlotsForRound', () => {
	it('keeps the index of each extra slot among all stored ones, and leaves out those of a later round', () => {
		const stored: StoredExtraSlot[] = [storedSlot('boss', 3), storedSlot('hero', 2), storedSlot('boss', 1)];

		expect(extraSlotsForRound(stored, 2).map(({ activationSource, index }) => ({ activationSource, index }))).toEqual([
			{ activationSource: 'hero', index: 1 },
			{ activationSource: 'boss', index: 2 },
		]);
	});
});

describe('withExtraSlotInitiatives', () => {
	it('writes initiatives by index to a copy', () => {
		const stored = [storedSlot('boss', 1), storedSlot('hero', 1)];

		expect(withExtraSlotInitiatives(stored, [{ index: 1, initiative: 2 }]).map((slot) => slot.initiative)).toEqual([null, 2]);
		expect(stored.map((slot) => slot.initiative)).toEqual([null, null]);
	});

	it('ignores writes to an index the combat does not store', () => {
		expect(withExtraSlotInitiatives([storedSlot('boss', 1)], [{ index: 3, initiative: 2 }])).toEqual([storedSlot('boss', 1)]);
	});
});

describe('rolling Initiative Slots', () => {
	const combatants = [combatant('hero', null), combatant('boss', null, 'hostile')];

	// At round 3, an extra slot for Boss; back at round 2, one for Hero and another for Boss.
	const stored = [storedSlot('boss', 3), storedSlot('hero', 2), storedSlot('boss', 2)];
	const round2 = buildSlots(combatants, extraSlotsForRound(stored, 2));

	function roll(slots: InitiativeSlot[], slotIds: string[], initiatives: Record<string, number>) {
		return initiativeWrites(slotsToRoll(slots, slotIds).map((slot) => ({ slot, initiative: initiatives[slot.id] })));
	}

	it('writes each roll of Roll All to its own slot, even with an extra slot of a later round', () => {
		const slotIds = slotIdsOf(
			round2,
			combatants.map((c) => c.id),
			{ unrolledOnly: true },
		);
		const writes = roll(round2, slotIds, { 'hero:-1': 1, 'boss:-1': 2, 'hero:1': 3, 'boss:2': 4 });

		expect(writes.combatants).toEqual([
			{ _id: 'hero', initiative: 1 },
			{ _id: 'boss', initiative: 2 },
		]);
		expect(withExtraSlotInitiatives(stored, writes.extraSlots).map((slot) => slot.initiative)).toEqual([null, 3, 4]);
	});

	it("writes the roll of an extra slot to that slot, not to the combatant's own, so both results are kept (CRB p. 205)", () => {
		expect(roll(round2, ['hero:1'], { 'hero:1': 3 })).toEqual({ combatants: [], extraSlots: [{ index: 1, initiative: 3 }] });
	});

	it('writes each roll to the slot it names, whatever the order of the slots asked', () => {
		const slots = buildSlots(
			[combatant('boss', null, 'hostile')],
			extraSlotsForRound([storedSlot('boss', 1), storedSlot('boss', 1)], 1),
		);

		expect(roll(slots, ['boss:1', 'boss:-1', 'boss:0'], { 'boss:1': 1, 'boss:-1': 2, 'boss:0': 3 })).toEqual({
			combatants: [{ _id: 'boss', initiative: 2 }],
			extraSlots: [
				{ index: 1, initiative: 1 },
				{ index: 0, initiative: 3 },
			],
		});
	});

	it('neither rolls nor lists an extra slot of a later round', () => {
		expect(slotsToRoll(round2, ['boss:0'])).toEqual([]);
		expect(slotIdsOf(round2, ['boss'], { unrolledOnly: false })).toEqual(['boss:-1', 'boss:2']);
	});

	it('rolls the own slots of the combatants Foundry names, once each, and only those of the combat', () => {
		expect(slotsToRoll(round2, ownSlotIds(['boss', 'hero', 'boss', 'gone'])).map((slot) => slot.id)).toEqual(['boss:-1', 'hero:-1']);
	});

	it('lists only the slots without initiative, unless asked for all', () => {
		const slots = buildSlots([combatant('hero', 2)], extraSlotsForRound([storedSlot('hero', 1)], 1));

		expect(slotIdsOf(slots, ['hero'], { unrolledOnly: true })).toEqual(['hero:0']);
		expect(slotIdsOf(slots, ['hero'], { unrolledOnly: false })).toEqual(['hero:-1', 'hero:0']);
	});
});

describe('initiative', () => {
	it('stores net successes with net advantages as hundredths', () => {
		expect(encodeInitiative(2, 3)).toBe(2.03);
		expect(decodeInitiative(encodeInitiative(2, 3))).toEqual({ successes: 2, advantages: 3 });
		expect(decodeInitiative(encodeInitiative(1, 0))).toEqual({ successes: 1, advantages: 0 });
		expect(decodeInitiative(encodeInitiative(0, 12))).toEqual({ successes: 0, advantages: 12 });
	});

	it('stores leftover Failures as no Successes and leftover Threats as no Advantage (CRB p. 96)', () => {
		expect(encodeInitiative(1, -2)).toBe(1);
		expect(encodeInitiative(-1, 2)).toBe(0.02);
		expect(encodeInitiative(-2, -3)).toBe(0);
	});

	it('decodes a check with leftover Failures or Threats to the Successes and Advantage it has (CRB p. 96)', () => {
		expect(decodeInitiative(encodeInitiative(1, -2))).toEqual({ successes: 1, advantages: 0 });
		expect(decodeInitiative(encodeInitiative(-1, 2))).toEqual({ successes: 0, advantages: 2 });
		expect(decodeInitiative(encodeInitiative(-2, -3))).toEqual({ successes: 0, advantages: 0 });
	});

	it('decodes no initiative as nothing', () => {
		expect(decodeInitiative(null)).toEqual({ successes: 0, advantages: 0 });
	});
});
