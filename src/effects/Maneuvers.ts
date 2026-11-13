/**
 * @file The maneuvers a character performs from their sheet's Combat tab, Aim and Guarded Stance, as the effects they put on the character, and the effects a check uses up (CRB p. 98–99).
 */

import { DieTypes } from '@/dice/DieTypes';
import { type CheckPurpose, isCombatCheck } from '@/dice/Check';
import { encodeKey } from '@/effects/PoolModifications';
import type { StateChange } from '@/effects/TokenStates';

/**
 * The effect a maneuver puts on its character.
 */
export type ManeuverEffect = {
	/** The status id, which the effect's `statuses` hold. */
	id: string;
	/** The localization key of its name. */
	name: string;
	img: string;
	changes: StateChange[];
};

// The changes of a character's own combat checks.
const COMBAT_CHECK_KEY = encodeKey({ kind: 'combat', source: 'self', subject: '' });

const AIM_ID = 'aim';

// Two consecutive Aim maneuvers give the most Boosts (CRB p. 98).
const MAX_AIM_BOOSTS = 2;

/**
 * The Aim effect of a character who performs the Aim maneuver while their Aim already gives some Boosts, none when they
 * haven't aimed: one more Boost on their next combat check, up to two after two Aim maneuvers in a row (CRB p. 98).
 */
export function aimAfter(boosts: number): ManeuverEffect {
	const count = Math.min(boosts + 1, MAX_AIM_BOOSTS);
	return {
		id: AIM_ID,
		name: 'Genesys.Maneuvers.Aim.Name',
		img: 'icons/svg/dice-target.svg',
		changes: [{ key: COMBAT_CHECK_KEY, value: DieTypes.Boost.GLYPH.repeat(count), type: 'custom' }],
	};
}

/**
 * The Boosts the changes of an Aim effect give.
 */
export function aimBoosts(changes: readonly { key?: string; value: unknown }[]): number {
	return changes
		.filter(({ key }) => key === COMBAT_CHECK_KEY)
		.reduce((count, { value }) => count + [...String(value)].filter((glyph) => glyph === DieTypes.Boost.GLYPH).length, 0);
}

/**
 * The effect of the Guarded Stance maneuver: a Setback on the character's combat checks and melee defense 1, until the
 * end of their next turn (CRB p. 99), which the effect lasts as a Lapsing Effect of one round. The maneuver provides that
 * defense: it doesn't stack with their armor's (CRB p. 106).
 */
export const GUARDED_STANCE: ManeuverEffect = {
	id: 'guardedStance',
	name: 'Genesys.Maneuvers.GuardedStance.Name',
	img: 'icons/svg/shield.svg',
	changes: [
		{ key: COMBAT_CHECK_KEY, value: DieTypes.Setback.GLYPH, type: 'custom' },
		{ key: 'system.providedDefense.melee', value: '1', type: 'upgrade' },
	],
};

/**
 * The status id of a maneuver's effect, which finds it among its character's effects.
 */
export const MANEUVER_IDS = { aim: AIM_ID, guardedStance: GUARDED_STANCE.id } as const;

/**
 * The ids of the effects of its actor a check uses up once rolled: their next combat check uses up their Aim, whose Boost
 * it got (CRB p. 98).
 */
export function effectsUsedUp(purpose: CheckPurpose, effects: Iterable<{ id: string; statuses: ReadonlySet<string> }>): string[] {
	if (!isCombatCheck(purpose)) {
		return [];
	}

	return [...effects].filter(({ statuses }) => statuses.has(AIM_ID)).map(({ id }) => id);
}
