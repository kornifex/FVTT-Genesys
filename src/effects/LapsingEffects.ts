/**
 * @file Lapsing Effects: a temporary effect whose duration in rounds counts its actor's turns, one per round, and which is removed once they have run out (CRB p. 114).
 */

/**
 * A turn of a combat: the Initiative Slot whose turn it is, in a round, and its place among the round's turns.
 */
export type CombatTurn = {
	combat: string;
	round: number;
	turn: number;
	slot: string;
};

/**
 * What the end of a turn of its actor reads of a Lapsing Effect: its rounds left, the turn it was applied during, when
 * it was applied in a combat, and the last turn whose end took a round off.
 */
type LapsingEffect = {
	rounds: number;
	appliedDuring?: CombatTurn | null;
	lastCounted?: CombatTurn | null;
};

/**
 * What the end of a turn of its actor does to a Lapsing Effect: it takes a round off, or removes the effect.
 */
type Lapse = { kind: 'shorten'; rounds: number } | { kind: 'remove' };

/**
 * What the end of a turn of its actor does to a Lapsing Effect, or undefined when that end doesn't count. The effect's
 * rounds are combat rounds: only the end of the actor's first turn of a round counts, which the places of the round's
 * turns the actor takes tell, so that an actor with an Extra Slot loses one round per round, as any other. It doesn't
 * count either when:
 * - the effect was applied during that same turn: a state lasting one round lasts until the end of its actor's next
 *   turn (CRB p. 114), and the turn it was suffered during isn't their next. An effect applied after the actor's first
 *   turn of a round, during it or between their slots, thus counts from their first turn of the next round;
 * - a round was counted already in that round or a later one, once the GM has gone back in the combat and ends a turn
 *   again.
 */
export function lapseAtTurnEnd(
	{ rounds, appliedDuring, lastCounted }: LapsingEffect,
	ended: CombatTurn,
	actorTurns: number[],
): Lapse | undefined {
	if (actorTurns.some((place) => place < ended.turn)) {
		return undefined;
	}

	if (appliedDuring?.combat === ended.combat && appliedDuring.round === ended.round && appliedDuring.slot === ended.slot) {
		return undefined;
	}

	if (lastCounted?.combat === ended.combat && ended.round <= lastCounted.round) {
		return undefined;
	}

	return rounds > 1 ? { kind: 'shorten', rounds: rounds - 1 } : { kind: 'remove' };
}

/**
 * The rounds a Token State is applied for, from the number the user entered: a whole number of at least one round, one
 * when the entry is no number.
 */
export function enteredRounds(entered: number) {
	return Number.isFinite(entered) ? Math.max(Math.trunc(entered), 1) : 1;
}
