/**
 * @file Token States: the states the token's status menu puts on an actor, as Active Effects that last a number of rounds (CRB p. 114).
 */

import { DieTypes } from '@/dice/DieTypes';
import { encodeKey } from '@/effects/PoolModifications';

/**
 * A change a Token State makes, as an Active Effect stores it. A Pool Modification takes Foundry's custom type, which
 * keeps Foundry from applying it.
 */
type TokenStateChange = {
	key: string;
	value: string;
	type: 'custom';
};

/**
 * A state the token's status menu offers, which Foundry calls a status effect.
 */
export type TokenState = {
	/** The status id, which the effect's `statuses` hold. */
	id: string;
	/** The localization key of its name. */
	name: string;
	img: string;
	changes: TokenStateChange[];
	/**
	 * The localization key of what the state keeps its actor from doing, which the Dice Prompt reminds the roller of. A
	 * state whose changes modify the dice needs none: the prompt lists them.
	 */
	reminder?: string;
	/**
	 * Whether the state lasts a number of rounds, set when it is applied, after which it is removed: a Lapsing Effect.
	 */
	lapses: boolean;
};

/**
 * The Token States the system adds to the token's status menu, in the menu's order.
 */
export const TOKEN_STATES: readonly TokenState[] = [
	// An immobilized character cannot perform maneuvers (CRB p. 114).
	{
		id: 'immobilized',
		name: 'Genesys.TokenStates.Immobilized.Name',
		img: 'icons/svg/anchor.svg',
		changes: [],
		reminder: 'Genesys.TokenStates.Immobilized.Reminder',
		lapses: true,
	},
	// A disoriented character adds a Setback die to all their checks (CRB p. 114).
	{
		id: 'disoriented',
		name: 'Genesys.TokenStates.Disoriented.Name',
		img: 'icons/svg/stoned.svg',
		changes: [{ key: encodeKey({ kind: 'check', source: 'self', subject: '' }), value: DieTypes.Setback.GLYPH, type: 'custom' }],
		lapses: true,
	},
	// A staggered character cannot perform actions (CRB p. 114).
	{
		id: 'staggered',
		name: 'Genesys.TokenStates.Staggered.Name',
		img: 'icons/svg/statue.svg',
		changes: [],
		reminder: 'Genesys.TokenStates.Staggered.Reminder',
		lapses: true,
	},
	// An incapacitated character is knocked out until their wounds or strain no longer exceed their threshold (CRB pp.
	// 112–113): the Threshold States set and clear it, and it lasts no number of rounds.
	{
		id: 'incapacitated',
		name: 'Genesys.TokenStates.Incapacitated.Name',
		img: 'icons/svg/down.svg',
		changes: [],
		lapses: false,
	},
];

/**
 * The Token State of a status id, or undefined when the system adds no such state.
 */
export function tokenState(id: string): TokenState | undefined {
	return TOKEN_STATES.find((state) => state.id === id);
}

/**
 * The reminders of the Token States an actor has, from its statuses, in the menu's order.
 */
export function stateReminders(statuses: Iterable<string>): string[] {
	const held = new Set(statuses);
	return TOKEN_STATES.flatMap((state) => (state.reminder && held.has(state.id) ? [state.reminder] : []));
}
