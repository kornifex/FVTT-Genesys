/** @file The operations a player's client asks the Acting GM to write, as Foundry queries, and why one may fail. */
import type { ExtraSlotInitiative } from '@/combat/InitiativeSlots';

/**
 * The queries the Acting GM answers. Foundry asks a system to prefix their names with its id.
 */
export const QueryName = {
	/** A player spends Story Points from the player pool. */
	SpendStoryPoint: 'genesys.spendStoryPoint',
	/** A player claims an Initiative Slot for a combatant. */
	ClaimInitiativeSlot: 'genesys.claimInitiativeSlot',
	/** A player rolled the initiative of Extra Slots. */
	WriteExtraSlotInitiative: 'genesys.writeExtraSlotInitiative',
	/** A player rolled a check of an actor they can't write, which uses up some of its effects, as an attack its Aim. */
	UseUpEffects: 'genesys.useUpEffects',
	/** A player cast a spell for an actor they can't write, which makes the actor suffer its strain. */
	SufferCastingStrain: 'genesys.sufferCastingStrain',
	/** A player applies the healing of the card of a check that heals. */
	ApplyRecovery: 'genesys.applyRecovery',
} as const;

export type QueryName = (typeof QueryName)[keyof typeof QueryName];

type CombatQueryData = {
	/** The combat the query is for. */
	combatId: string;
};

/**
 * The data each query carries.
 */
export type QueryData = {
	[QueryName.SpendStoryPoint]: {
		/** How many points are spent together: one when left out, as from the tracker; up to two for a check. */
		count?: number;
	};
	[QueryName.ClaimInitiativeSlot]: CombatQueryData & {
		combatantId: string;
		round: number;
		slotId: string;
	};
	[QueryName.WriteExtraSlotInitiative]: CombatQueryData & {
		updates: ExtraSlotInitiative[];
		/** Whether the turn stays on the slot it is on once the initiatives are written. */
		updateTurn: boolean;
	};
	[QueryName.UseUpEffects]: RolledCheckQueryData;
	[QueryName.SufferCastingStrain]: RolledCheckQueryData;
	[QueryName.ApplyRecovery]: {
		/** The chat message of the card, whose flags hold the recovery. */
		messageId: string;
	};
};

/**
 * What a query about a check a player rolled carries: the Acting GM reads what the check was rolled for from its chat
 * message rather than from the query, and the strain of a spell from the rules.
 */
type RolledCheckQueryData = {
	/** The actor that made the check. */
	actorUuid: string;
	/** The chat message of the check. */
	messageId: string;
};

/**
 * How long a player waits for the Acting GM's answer, in ms.
 */
const QUERY_TIMEOUT = 10_000;

// The reason Foundry's server gives once a query's timeout elapsed: the message of socket.io's timeout error, on v13
// and v14 alike.
const TIMEOUT_REASON = 'operation has timed out';

/**
 * The Acting GM as a client queries it: Foundry's `User#query`, or an in-memory GM in the tests.
 */
export type ActingGm = {
	query(name: string, data: unknown, options: { timeout: number }): Promise<unknown>;
};

/**
 * Why the Acting GM may refuse a query, as the localization keys of the player's notification. Each one is formatted with
 * the combatant's `name`, which the player's client knows.
 */
const REFUSALS = [
	'Genesys.Notifications.GenericError',
	'Genesys.Notifications.NotEnoughStoryPoints',
	'Genesys.Notifications.NotOwnerOfCombatant',
	'Genesys.Notifications.CannotClaimOppositeSlot',
	'Genesys.Notifications.SlotAlreadyClaimed',
	'Genesys.Notifications.CombatantHasNoActivationLeft',
] as const;

export type Refusal = (typeof REFUSALS)[number];

/**
 * Refuses a query, from its handler. Foundry's server passes the player only the message of the error a handler throws:
 * the message is the refusal.
 */
export function refuse(refusal: Refusal): never {
	throw new Error(refusal);
}

/**
 * Why a query wasn't written.
 */
export type QueryFailure =
	/** No GM is connected. */
	| { cause: 'noActingGm' }
	/** The Acting GM refused it. */
	| { cause: 'refused'; refusal: Refusal }
	/** The Acting GM didn't answer in time. */
	| { cause: 'timedOut' }
	/** The query failed otherwise: the Acting GM left, or its handler failed. */
	| { cause: 'failed'; error: Error };

/**
 * Asks the Acting GM to write an operation, and tells why it wasn't, or undefined once it was.
 */
export async function queryActingGm<N extends QueryName>(
	actingGm: ActingGm | undefined,
	name: N,
	data: QueryData[N],
): Promise<QueryFailure | undefined> {
	if (!actingGm) {
		return { cause: 'noActingGm' };
	}

	try {
		await actingGm.query(name, data, { timeout: QUERY_TIMEOUT });
		return undefined;
	} catch (error) {
		// `User#query` rejects with an Error that holds the reason the server gave.
		const reason = (error as Error).message;
		const refusal = REFUSALS.find((key) => key === reason);
		if (refusal) {
			return { cause: 'refused', refusal };
		}

		return reason === TIMEOUT_REASON ? { cause: 'timedOut' } : { cause: 'failed', error: error as Error };
	}
}

/**
 * What a query's handler receives besides its data: the timeout, and the user who sent it, whom Foundry checks exists.
 */
export type QueryContext<User> = { timeout?: number; user: User };

/**
 * Each query's warning that no GM is connected to write it.
 */
const NO_ACTING_GM = {
	[QueryName.SpendStoryPoint]: 'Genesys.Notifications.NoGMForStoryPoint',
	[QueryName.ClaimInitiativeSlot]: 'Genesys.Notifications.NoGMForClaim',
	[QueryName.WriteExtraSlotInitiative]: 'Genesys.Notifications.NoGMForExtraSlot',
	[QueryName.UseUpEffects]: 'Genesys.Notifications.NoGMForUsedUpEffects',
	[QueryName.SufferCastingStrain]: 'Genesys.Notifications.NoGMForCastingStrain',
	[QueryName.ApplyRecovery]: 'Genesys.Notifications.NoGMForRecovery',
} as const satisfies Record<QueryName, string>;

/**
 * The localization key of the warning a failed query gives the player.
 */
export function failureNotification(failure: QueryFailure, name: QueryName) {
	switch (failure.cause) {
		case 'noActingGm':
			return NO_ACTING_GM[name];
		case 'refused':
			return failure.refusal;
		case 'timedOut':
			return 'Genesys.Notifications.ActingGMTimedOut';
		case 'failed':
			return 'Genesys.Notifications.GenericError';
	}
}
