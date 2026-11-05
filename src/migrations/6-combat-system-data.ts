import type { StoredExtraSlot } from '@/combat/InitiativeSlots';
import type { ClaimData } from '@/combat/TurnOrder';

/** The flags of a combat, as 0.4.0 to 0.5.x stored them. */
type CombatFlags = {
	slotClaims?: ClaimData;
	extraSlots?: StoredExtraSlot[];
	/** Claims by position in the turn order, which 0.4.0 replaced with `slotClaims` and stopped reading. */
	claimants?: unknown;
};

/** What this migration reads of a combat. */
export type CombatSource = {
	flags?: { genesys?: CombatFlags };
	combatants: { _id: string | null; flags?: { genesys?: { initiativeSkill?: string } } }[];
};

/** What the migration writes to a combat. */
type CombatChanges = {
	/** The system data the combat's flags held. */
	system: { claims?: ClaimData; extraSlots?: StoredExtraSlot[] };
	/** The keys of the combat's `genesys` flags to delete. */
	deletedFlags: (keyof CombatFlags)[];
	/** The combatants whose flags held a chosen Initiative Skill, which also lose that flag. */
	combatants: { _id: string; initiativeSkill: string }[];
};

/**
 * Up to 0.5.x, a combat kept the Initiative Slots' state in flags, which nothing typed nor cleaned: its Claims and Extra
 * Slots, and each combatant its chosen Initiative Skill. This planner moves them into the system data of the combat and
 * of its combatants. The legacy `claimants` flag is deleted, its Claims dropped: no version since 0.4.0 reads them.
 * Nothing to change gives `undefined`.
 */
export function combatSystemData(source: CombatSource): CombatChanges | undefined {
	const flags = source.flags?.genesys ?? {};
	const system: CombatChanges['system'] = {};
	const deletedFlags: CombatChanges['deletedFlags'] = [];

	if (flags.slotClaims) {
		system.claims = flags.slotClaims;
		deletedFlags.push('slotClaims');
	}
	if (flags.extraSlots) {
		system.extraSlots = flags.extraSlots;
		deletedFlags.push('extraSlots');
	}
	if ('claimants' in flags) {
		deletedFlags.push('claimants');
	}

	const combatants = source.combatants.flatMap(({ _id, flags }) => {
		const initiativeSkill = flags?.genesys?.initiativeSkill;
		return _id && initiativeSkill ? [{ _id, initiativeSkill }] : [];
	});

	if (deletedFlags.length === 0 && combatants.length === 0) {
		return undefined;
	}

	return { system, deletedFlags, combatants };
}
