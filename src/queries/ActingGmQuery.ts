/** @file The operations a player's client asks the Acting GM to write, as Foundry queries, and why one may fail. */
import type { ExtraSlotInitiative } from '@/combat/InitiativeSlots';
import type { CheckPurpose } from '@/dice/Check';

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
} as const;

export type QueryName = (typeof QueryName)[keyof typeof QueryName];

/**
 * What every query carries.
 */
type QueryBaseData = {
	/**
	 * v13: the user who asks. Foundry v13 doesn't tell the handler who sent a query; v14 does, and the handler trusts
	 * Foundry rather than this.
	 */
	userId: string;
};

type CombatQueryData = QueryBaseData & {
	/** The combat the query is for. */
	combatId: string;
};

/**
 * The data each query carries.
 */
export type QueryData = {
	[QueryName.SpendStoryPoint]: QueryBaseData & {
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
	[QueryName.UseUpEffects]: QueryBaseData & {
		/** The actor that made the check. */
		actorUuid: string;
		/** What the check was rolled for, which tells the effects it uses up. */
		purpose: CheckPurpose;
	};
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
 * What a query's handler receives besides its data: Foundry v14 adds the user who sent it, v13 only the timeout.
 */
export type QueryContext<User> = { timeout?: number; user?: User };

/**
 * The user who sent a query, whom its handler checks may ask it: the sender Foundry names on v14.
 */
export function querierOf<User>(data: QueryBaseData, context: QueryContext<User> | undefined, findUser: (id: string) => User | undefined) {
	if (context?.user) {
		return context.user;
	}

	// v13: Foundry doesn't name the sender, so the handler trusts the user the data names.
	const user = findUser(data.userId);
	if (!user) {
		throw new Error(`A query was received from an unknown user ${data.userId}`);
	}
	return user;
}

/**
 * Each query's warning that no GM is connected to write it.
 */
const NO_ACTING_GM = {
	[QueryName.SpendStoryPoint]: 'Genesys.Notifications.NoGMForStoryPoint',
	[QueryName.ClaimInitiativeSlot]: 'Genesys.Notifications.NoGMForClaim',
	[QueryName.WriteExtraSlotInitiative]: 'Genesys.Notifications.NoGMForExtraSlot',
	[QueryName.UseUpEffects]: 'Genesys.Notifications.NoGMForUsedUpEffects',
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
