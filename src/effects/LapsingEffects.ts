/**
 * @file Lapsing Effects: a temporary effect whose duration in rounds counts its actor's turns, and which is removed once they have run out (CRB p. 114).
 */

/**
 * A turn of a combat: the Initiative Slot whose turn it is, in a round.
 */
export type CombatTurn = {
	combat: string;
	round: number;
	slot: string;
};

/**
 * What the end of a turn of its actor reads of a Lapsing Effect: its rounds left, and the turn it was applied during,
 * when it was applied in a combat.
 */
type LapsingEffect = {
	rounds: number;
	appliedDuring?: CombatTurn | null;
};

/**
 * What the end of a turn of its actor does to a Lapsing Effect: it takes a round off, or removes the effect.
 */
export type Lapse = { kind: 'shorten'; rounds: number } | { kind: 'remove' };

/**
 * What the end of a turn of its actor does to a Lapsing Effect, or undefined when the effect was applied during that
 * same turn: a state lasting one round lasts until the end of its actor's next turn (CRB p. 114), and the turn it was
 * suffered during isn't their next.
 */
export function lapseAtTurnEnd({ rounds, appliedDuring }: LapsingEffect, ended: CombatTurn): Lapse | undefined {
	if (appliedDuring?.combat === ended.combat && appliedDuring.round === ended.round && appliedDuring.slot === ended.slot) {
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
