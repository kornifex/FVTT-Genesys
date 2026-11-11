/**
 * @file Lapsing Effects: a temporary effect whose duration in rounds counts its actor's turns, and which is removed once they have run out (CRB p. 114).
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
 * What the end of a turn of its actor does to a Lapsing Effect, or undefined when that end doesn't count:
 * - the effect was applied during that same turn: a state lasting one round lasts until the end of its actor's next
 *   turn (CRB p. 114), and the turn it was suffered during isn't their next;
 * - the turn ends again, or an earlier one does, once the GM has gone back in the combat: its end was counted already.
 */
export function lapseAtTurnEnd({ rounds, appliedDuring, lastCounted }: LapsingEffect, ended: CombatTurn): Lapse | undefined {
	if (appliedDuring?.combat === ended.combat && appliedDuring.round === ended.round && appliedDuring.slot === ended.slot) {
		return undefined;
	}

	if (lastCounted?.combat === ended.combat && !isAfter(ended, lastCounted)) {
		return undefined;
	}

	return rounds > 1 ? { kind: 'shorten', rounds: rounds - 1 } : { kind: 'remove' };
}

function isAfter(turn: CombatTurn, other: CombatTurn) {
	return turn.round > other.round || (turn.round === other.round && turn.turn > other.turn);
}

/**
 * The rounds a Token State is applied for, from the number the user entered: a whole number of at least one round, one
 * when the entry is no number.
 */
export function enteredRounds(entered: number) {
	return Number.isFinite(entered) ? Math.max(Math.trunc(entered), 1) : 1;
}
