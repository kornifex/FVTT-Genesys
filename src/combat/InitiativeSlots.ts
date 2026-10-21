/**
 * @file Initiative Slots: their turn order, their Claims, and what a user may do with them.
 */

/**
 * The side an Initiative Slot belongs to.
 */
export type InitiativeSide = 'pc' | 'npc';

export type Disposition = 'friendly' | 'neutral' | 'hostile';

/**
 * What this module needs of a combatant.
 */
export type SlotCombatant = {
	id: string;
	initiative: number | null;
	disposition: Disposition;
};

/**
 * An extra Initiative Slot a combatant gets from a round on, as the combat stores it.
 */
export type StoredExtraSlot = {
	activationSource: string;
	initiative: number | null;
	startingRound: number;
};

/**
 * An extra Initiative Slot, identified by its index among all of the combat's stored extra slots.
 */
export type ExtraSlot = StoredExtraSlot & {
	index: number;
};

/**
 * The initiative written to an extra slot, by its index among all of the combat's stored extra slots.
 */
export type ExtraSlotInitiative = {
	index: number;
	initiative: number | null;
};

/**
 * The initiatives that rolls write: to combatants for their own slots, and to extra slots.
 */
export type InitiativeWrites = {
	combatants: { _id: string; initiative: number }[];
	extraSlots: ExtraSlotInitiative[];
};

/**
 * The Claims of one round: the combatant that claimed each Initiative Slot, by slot id.
 */
export type RoundClaims = Record<string, string | undefined>;

export type InitiativeSlot = {
	/**
	 * Identifies the slot whatever its position in the turn order.
	 */
	id: string;

	/**
	 * The combatant whose initiative gave this slot.
	 */
	originId: string;

	/**
	 * The extra slot this slot comes from, -1 for the combatant's own slot.
	 */
	activationId: number;

	side: InitiativeSide;
	initiative: number | null;
	claimantId?: string;
};

/**
 * What this module needs of the user looking at the Initiative Slots.
 */
export type SlotViewer = {
	isGM: boolean;

	/**
	 * Whether the user is one of the players of a combatant.
	 */
	isPlayerOf(combatantId: string): boolean;
};

// Initiative ties go to friendly combatants, then neutral ones, then hostile ones.
const DISPOSITION_ORDER: Disposition[] = ['hostile', 'neutral', 'friendly'];

/**
 * The side of the Initiative Slots a combatant gives and can claim: friendly combatants are PCs, any other is an NPC.
 */
export function sideOf(disposition: Disposition): InitiativeSide {
	return disposition === 'friendly' ? 'pc' : 'npc';
}

export function slotId(originId: string, activationId: number) {
	return `${originId}:${activationId}`;
}

/**
 * The initiative of a check, as stored on a combatant: net successes, with net advantages as hundredths.
 */
export function encodeInitiative(netSuccess: number, netAdvantage: number) {
	return netSuccess + netAdvantage / 100;
}

export function decodeInitiative(initiative: number | null) {
	const value = initiative ?? 0;
	const successes = Math.floor(value);

	return { successes, advantages: Math.round((value - successes) * 100) };
}

/**
 * The extra slots a combat has in a round, with their index among all of its stored extra slots. Those added for a later
 * round, after going back a round, are left out.
 */
export function extraSlotsForRound(storedExtraSlots: StoredExtraSlot[], round: number): ExtraSlot[] {
	return storedExtraSlots.flatMap((extraSlot, index) => (extraSlot.startingRound <= round ? [{ ...extraSlot, index }] : []));
}

/**
 * The stored extra slots with some initiatives written, as a copy. Writes to an index the combat doesn't store are
 * ignored.
 */
export function withExtraSlotInitiatives(storedExtraSlots: StoredExtraSlot[], writes: ExtraSlotInitiative[]): StoredExtraSlot[] {
	const extraSlots = storedExtraSlots.map((extraSlot) => ({ ...extraSlot }));

	for (const { index, initiative } of writes) {
		if (extraSlots[index]) {
			extraSlots[index].initiative = initiative;
		}
	}

	return extraSlots;
}

/**
 * The Initiative Slots of a round in turn order: every combatant's own slot and the extra slots they have this round,
 * ordered by initiative, then disposition, then combatant id.
 */
export function buildSlots(combatants: SlotCombatant[], extraSlots: ExtraSlot[], claims: RoundClaims = {}): InitiativeSlot[] {
	const combatantsById = new Map(combatants.map((combatant) => [combatant.id, combatant]));

	const activations = [
		...combatants.map((combatant) => ({ combatant, activationId: -1, initiative: combatant.initiative })),
		...extraSlots.flatMap((extraSlot) => {
			const combatant = combatantsById.get(extraSlot.activationSource);
			return combatant ? [{ combatant, activationId: extraSlot.index, initiative: extraSlot.initiative }] : [];
		}),
	];

	return activations.sort(compareActivations).map(({ combatant, activationId, initiative }) => {
		const id = slotId(combatant.id, activationId);
		return { id, originId: combatant.id, activationId, side: sideOf(combatant.disposition), initiative, claimantId: claims[id] };
	});
}

function compareActivations(first: { combatant: SlotCombatant; initiative: number | null }, second: { combatant: SlotCombatant; initiative: number | null }) {
	const firstInitiative = first.initiative ?? -Infinity;
	const secondInitiative = second.initiative ?? -Infinity;

	if (firstInitiative !== secondInitiative) {
		return secondInitiative - firstInitiative;
	}

	if (first.combatant.disposition !== second.combatant.disposition) {
		return DISPOSITION_ORDER.indexOf(second.combatant.disposition) - DISPOSITION_ORDER.indexOf(first.combatant.disposition);
	}

	if (first.combatant.id === second.combatant.id) {
		return 0;
	}

	return first.combatant.id > second.combatant.id ? 1 : -1;
}

/**
 * The ids of the own Initiative Slots of some combatants.
 */
export function ownSlotIds(combatantIds: string[]) {
	return combatantIds.map((combatantId) => slotId(combatantId, -1));
}

/**
 * The ids of the Initiative Slots of the round that some combatants' initiative gives, in turn order: all of them, or
 * only those without initiative yet.
 */
export function slotIdsOf(slots: InitiativeSlot[], combatantIds: string[], { unrolledOnly }: { unrolledOnly: boolean }) {
	return slots.filter((slot) => combatantIds.includes(slot.originId) && (!unrolledOnly || slot.initiative === null)).map((slot) => slot.id);
}

/**
 * The Initiative Slots of the round to roll for some slot ids, once each and in the order asked. Ids of slots the round
 * doesn't have, such as an extra slot of a later round, are left out.
 */
export function slotsToRoll(slots: InitiativeSlot[], slotIds: string[]) {
	const slotsById = new Map(slots.map((slot) => [slot.id, slot]));

	return [...new Set(slotIds)].flatMap((id) => slotsById.get(id) ?? []);
}

/**
 * Where the initiatives rolled for Initiative Slots are written: a combatant's own slot to the combatant, an extra slot to
 * its index among the combat's stored extra slots.
 */
export function initiativeWrites(rolls: { slot: InitiativeSlot; initiative: number }[]): InitiativeWrites {
	const writes: InitiativeWrites = { combatants: [], extraSlots: [] };

	for (const { slot, initiative } of rolls) {
		if (slot.activationId < 0) {
			writes.combatants.push({ _id: slot.originId, initiative });
		} else {
			writes.extraSlots.push({ index: slot.activationId, initiative });
		}
	}

	return writes;
}

/**
 * Why a combatant can't claim an Initiative Slot of the round, as a localization key, or undefined if it can.
 */
export function claimRefusal(slots: InitiativeSlot[], claims: RoundClaims, targetSlotId: string, claimant: { id: string; side: InitiativeSide }) {
	const slot = slots.find((candidate) => candidate.id === targetSlotId);
	if (!slot) {
		return 'Genesys.Notifications.GenericError';
	}

	// A combatant may only claim a slot of its own side.
	if (claimant.side !== slot.side) {
		return 'Genesys.Notifications.CannotClaimOppositeSlot';
	}

	if (claims[targetSlotId] !== undefined) {
		return 'Genesys.Notifications.SlotAlreadyClaimed';
	}

	// A combatant acts once per round for each slot its initiative gives.
	const claimCount = Object.values(claims).filter((claimantId) => claimantId === claimant.id).length;
	const activationCount = slots.filter((candidate) => candidate.originId === claimant.id).length;
	if (claimCount >= activationCount) {
		return 'Genesys.Notifications.CombatantHasNoActivationLeft';
	}

	return undefined;
}

/**
 * What a user sees of an Initiative Slot and may do with it.
 */
export function slotView(slot: InitiativeSlot, combatStarted: boolean, viewer: SlotViewer) {
	return {
		// Before the combat starts, every slot shows the combatant whose initiative gave it.
		showsAsClaimed: combatStarted ? slot.claimantId !== undefined : true,
		canClaim: slot.side === 'pc' || viewer.isGM,
		canRevoke: viewer.isGM && combatStarted && slot.claimantId !== undefined,
		controlsTurn: slot.claimantId !== undefined && viewer.isPlayerOf(slot.claimantId),
	};
}
