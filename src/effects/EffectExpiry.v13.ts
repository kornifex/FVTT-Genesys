/**
 * @file Expired Effects on Foundry v13, which never expires an effect: the Acting GM marks those whose duration in rounds or turns ran out.
 */

import { hasTimeLeft } from '@/effects/EffectExpiry';

/**
 * An effect's duration, as Foundry v13 stores it.
 */
export type V13Duration = {
	seconds?: number | null;
	rounds?: number | null;
	turns?: number | null;
	startRound?: number | null;
	startTurn?: number | null;
};

/**
 * The point a combat has reached: its round, its turn, and the number of turns of a round (its Initiative Slots).
 */
export type CombatClock = {
	round: number;
	turn: number | null;
	turnCount: number;
};

/**
 * What a turn or round change reads of an effect.
 */
type TrackedEffect = {
	expired: boolean;
	duration: V13Duration;
};

// Foundry's `_getCombatTime`: a round and a turn as a decimal, the turn in hundredths.
function decimalTime(round: number | null | undefined, turn: number | null | undefined, turnCount?: number) {
	const cappedTurn = turnCount === undefined ? turn : Math.min(turn ?? 0, turnCount);
	return (Math.max(round ?? 0, 0) || 0) + (Math.max(cappedTurn ?? 0, 0) || 0) / 100;
}

/**
 * The remaining duration of an effect in rounds or turns, as Foundry v13 computes it in
 * `ActiveEffect#_prepareDuration`, but against a given combat: Foundry counts it against the combat the user views, and
 * not for a duration that is about to be written. Undefined for a duration in seconds or no duration, or without combat.
 *
 * An effect created before a combat has no start round, so that it counts from round 0, as Foundry's own `remaining`
 * does: a one-round effect made before a combat has run out once the combat starts. Foundry v14 counts such an effect
 * from the round its combatant joined the combat instead.
 */
function combatRemaining(duration: V13Duration, combat: CombatClock | undefined) {
	// Foundry counts a duration in seconds first, whatever its rounds and turns.
	if (typeof duration.seconds === 'number' || !(duration.rounds || duration.turns) || !combat) {
		return undefined;
	}

	const current = decimalTime(combat.round, combat.turn);
	const length = decimalTime(duration.rounds, duration.turns);
	const start = decimalTime(duration.startRound, duration.startTurn, combat.turnCount || 1);
	if (current <= start) {
		return length;
	}

	return Math.max(Math.round((start + length - current) * 100) / 100, 0);
}

/**
 * The effects a turn or round change of a combat expires: those whose duration in rounds or turns has run out, and that
 * aren't expired yet.
 */
export function effectsToExpire<T extends TrackedEffect>(effects: T[], combat: CombatClock): T[] {
	return effects.filter((effect) => !effect.expired && combatRemaining(effect.duration, combat) === 0);
}

const DURATION_FIELDS = ['seconds', 'rounds', 'turns', 'startRound', 'startTurn'] as const;

/**
 * Whether a new duration extends an Expired Effect, which is then no longer expired: the duration changes, and has time
 * left in the combat the user views. Out of combat, no time is counted, so any change of the duration extends it; and a
 * duration that is no longer in rounds or turns can't run out.
 */
export function extendsExpiredEffect(effect: TrackedEffect, newDuration: V13Duration, combat: CombatClock | undefined) {
	const changed = DURATION_FIELDS.some((field) => (effect.duration[field] ?? null) !== (newDuration[field] ?? null));

	return effect.expired && changed && hasTimeLeft(combatRemaining(newDuration, combat));
}
