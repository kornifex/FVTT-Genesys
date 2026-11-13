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
 * The Aim effect that gives a number of Boosts to its character's next combat check (CRB p. 98).
 */
export function aimGiving(boosts: number): ManeuverEffect {
	return {
		id: AIM_ID,
		name: 'Genesys.Maneuvers.Aim.Name',
		img: 'icons/svg/dice-target.svg',
		changes: [{ key: COMBAT_CHECK_KEY, value: DieTypes.Boost.GLYPH.repeat(boosts), type: 'custom' }],
	};
}

/**
 * The Boosts a character's Aim gives after a click on the Aim button, from those it gives before, none when they haven't
 * aimed: each click is an Aim maneuver, one Boost more, up to two after two in a row (CRB p. 98); a click once Aim gives
 * two takes it back, which leaves none.
 */
export function aimBoostsAfterClick(boosts: number): number {
	return boosts >= MAX_AIM_BOOSTS ? 0 : boosts + 1;
}

// The tooltip of the Aim button, by the Boosts its next click gives.
const AIM_HINTS = {
	0: 'Genesys.Maneuvers.Aim.TakeBack',
	1: 'Genesys.Maneuvers.Aim.Hint',
	2: 'Genesys.Maneuvers.Aim.HintAgain',
} as const;

/**
 * The localization key of what a click on the Aim button does, from the Boosts the character's Aim gives.
 */
export function aimHint(boosts: number): string {
	// `aimBoostsAfterClick` gives no more than MAX_AIM_BOOSTS.
	return AIM_HINTS[aimBoostsAfterClick(boosts) as keyof typeof AIM_HINTS];
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
