/**
 * @file Expired Effects: a temporary effect whose duration in rounds or turns has run out stops applying, but isn't deleted.
 */

/**
 * What an effect stores of its expiry.
 */
type StoredExpiry = {
	/** The `flags.genesys.expired` flag, which the Acting GM writes. */
	flag: unknown;
};

/**
 * Whether an effect is an Expired Effect.
 */
export function isExpired({ flag }: StoredExpiry) {
	return flag === true;
}

/**
 * An effect's duration, as Foundry v12 and v13 store it.
 */
type StoredDuration = {
	seconds?: number | null;
	rounds?: number | null;
	turns?: number | null;
	startRound?: number | null;
	startTurn?: number | null;
};

/**
 * The point a combat has reached: its round, its turn, and the number of turns of a round (its Initiative Slots).
 */
type CombatTime = {
	round: number;
	turn: number | null;
	turnCount: number;
};

/**
 * What a turn or round change reads of an effect.
 */
type TrackedEffect = {
	expired: boolean;
	duration: StoredDuration;
};

// Foundry's `_getCombatTime`: a round and a turn as a decimal, the turn in hundredths.
function combatTime(round: number | null | undefined, turn: number | null | undefined, turnCount?: number) {
	const cappedTurn = turnCount === undefined ? turn : Math.min(turn ?? 0, turnCount);
	return (Math.max(round ?? 0, 0) || 0) + (Math.max(cappedTurn ?? 0, 0) || 0) / 100;
}

/**
 * The remaining duration of an effect in rounds or turns, as Foundry v12 and v13 compute it in
 * `ActiveEffect#_prepareDuration`, but against a given combat: Foundry counts it against the combat the user views, and
 * not for a duration that is about to be written. Undefined for a duration in seconds or no duration, or without combat.
 */
function combatRemaining(duration: StoredDuration, combat: CombatTime | undefined) {
	// Foundry counts a duration in seconds first, whatever its rounds and turns.
	if (typeof duration.seconds === 'number' || !(duration.rounds || duration.turns) || !combat) {
		return undefined;
	}

	const current = combatTime(combat.round, combat.turn);
	const length = combatTime(duration.rounds, duration.turns);
	const start = combatTime(duration.startRound, duration.startTurn, combat.turnCount || 1);
	if (current <= start) {
		return length;
	}

	return Math.max(Math.round((start + length - current) * 100) / 100, 0);
}

/**
 * The effects a turn or round change of a combat expires: those whose duration in rounds or turns has run out, and that
 * aren't expired yet.
 */
export function effectsToExpire<T extends TrackedEffect>(effects: T[], combat: CombatTime): T[] {
	return effects.filter((effect) => !effect.expired && combatRemaining(effect.duration, combat) === 0);
}

const DURATION_FIELDS = ['seconds', 'rounds', 'turns', 'startRound', 'startTurn'] as const;

/**
 * Whether an update of an expired effect's duration makes it no longer expired: the duration changes, and has time left
 * in the combat the user views. Out of combat, no time is counted, so any change of the duration rearms it; and a
 * duration that is no longer in rounds or turns can't run out.
 */
export function rearms(effect: TrackedEffect, newDuration: StoredDuration, combat: CombatTime | undefined) {
	const changed = DURATION_FIELDS.some((field) => (effect.duration[field] ?? null) !== (newDuration[field] ?? null));

	return effect.expired && changed && combatRemaining(newDuration, combat) !== 0;
}
