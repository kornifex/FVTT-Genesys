/**
 * @file Token States: the states the token's status menu puts on an actor, as Active Effects: the Status Effects, which last a number of rounds (CRB p. 114), and cover and prone, which last until removed (CRB p. 99–100).
 */

import { DieTypes } from '@/dice/DieTypes';
import { encodeKey } from '@/effects/PoolModifications';

/**
 * A change a Token State or a maneuver makes, as an Active Effect stores it. A Pool Modification takes Foundry's custom
 * type, which keeps Foundry from applying it; a defense raised takes the add type.
 */
export type StateChange = {
	key: string;
	value: string;
	type: 'custom' | 'add';
};

// The actors that take cover or drop prone: characters and adversaries, not vehicles, whose single defense has no
// ranged rating to raise.
const CHARACTER_TYPES = ['character', 'minion', 'rival', 'nemesis'] as const;

/**
 * A state the token's status menu offers, which Foundry calls a status effect.
 */
export type TokenState = {
	/** The status id, which the effect's `statuses` hold. */
	id: string;
	/** The localization key of its name. */
	name: string;
	img: string;
	changes: StateChange[];
	/** The actor types whose token's status menu offers the state; every type when left undefined. */
	actorTypes?: readonly string[];
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
	// A character in cover gains ranged defense 1, which they keep while they stay in cover (CRB p. 99).
	{
		id: 'cover',
		name: 'Genesys.TokenStates.Cover.Name',
		img: 'icons/svg/barrel.svg',
		changes: [{ key: 'system.defense.ranged', value: '1', type: 'add' }],
		actorTypes: CHARACTER_TYPES,
		lapses: false,
	},
	// A prone character adds a Setback to the ranged attacks against them, a Boost to the melee ones (CRB p. 100, 108). It
	// takes Foundry's own prone status's place, keeping its id and icon, until they stand up.
	{
		id: 'prone',
		name: 'Genesys.TokenStates.Prone.Name',
		img: 'icons/svg/falling.svg',
		changes: [
			{ key: encodeKey({ kind: 'ranged', source: 'target', subject: '' }), value: DieTypes.Setback.GLYPH, type: 'custom' },
			{ key: encodeKey({ kind: 'melee', source: 'target', subject: '' }), value: DieTypes.Boost.GLYPH, type: 'custom' },
		],
		actorTypes: CHARACTER_TYPES,
		lapses: false,
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
