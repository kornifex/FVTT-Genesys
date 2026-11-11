import { describe, expect, it } from 'vitest';
import { type CombatTurn, enteredRounds, lapseAtTurnEnd } from '@/effects/LapsingEffects';

// The attacker's slot comes first in a round, the actor's second.
const PLACES: Record<string, number> = { attacker: 0, actor: 1 };
const turn = (round: number, slot: string, combat = 'combat'): CombatTurn => ({ combat, round, turn: PLACES[slot], slot });

/**
 * The rounds left of a state applied during a turn after each end of its actor's turns, given in order, as the Acting
 * GM writes them: the rounds, and the last turn counted.
 */
function lifetime(rounds: number, appliedDuring: CombatTurn | null, endedTurns: CombatTurn[]) {
	const ends: (number | 'removed')[] = [];
	let left: number | undefined = rounds;
	let lastCounted: CombatTurn | null = null;
	for (const ended of endedTurns) {
		if (left === undefined) break;
		const lapse = lapseAtTurnEnd({ rounds: left, appliedDuring, lastCounted }, ended);
		if (lapse?.kind === 'remove') {
			left = undefined;
			ends.push('removed');
		} else {
			if (lapse) {
				left = lapse.rounds;
				lastCounted = ended;
			}
			ends.push(left);
		}
	}
	return ends;
}

describe('lapseAtTurnEnd', () => {
	it("removes a one-round state at the end of its actor's next turn, in the same round (CRB p. 114)", () => {
		// The attacker staggers the actor before the actor's turn: the actor loses that turn, and the state ends with it.
		expect(lifetime(1, turn(1, 'attacker'), [turn(1, 'actor')])).toEqual(['removed']);
	});

	it("removes a one-round state at the end of its actor's next turn, in the next round (CRB p. 114)", () => {
		expect(lifetime(1, turn(1, 'attacker'), [turn(2, 'actor')])).toEqual(['removed']);
	});

	it("doesn't count the end of the turn the state was applied during, which isn't the actor's next (CRB p. 114)", () => {
		expect(lifetime(1, turn(1, 'actor'), [turn(1, 'actor'), turn(2, 'actor')])).toEqual([1, 'removed']);
	});

	it('counts the end of a turn on the same slot in another round, or of another combat', () => {
		expect(lapseAtTurnEnd({ rounds: 1, appliedDuring: turn(1, 'actor') }, turn(2, 'actor'))).toEqual({ kind: 'remove' });
		expect(lapseAtTurnEnd({ rounds: 1, appliedDuring: turn(1, 'actor') }, turn(1, 'actor', 'other'))).toEqual({ kind: 'remove' });
	});

	it("lasts its rounds and no more: a round off at each end of its actor's turns, removed at the last (CRB p. 114)", () => {
		expect(lifetime(3, turn(1, 'attacker'), [turn(1, 'actor'), turn(2, 'actor'), turn(3, 'actor'), turn(4, 'actor')])).toEqual([
			2,
			1,
			'removed',
		]);
	});

	it('counts every end of a turn of its actor for a state applied out of combat', () => {
		expect(lifetime(2, null, [turn(1, 'actor'), turn(2, 'actor')])).toEqual([1, 'removed']);
	});

	it('counts the end of a turn once, when the GM goes back to it and ends it again', () => {
		expect(lifetime(3, turn(1, 'attacker'), [turn(1, 'actor'), turn(1, 'actor'), turn(2, 'actor')])).toEqual([2, 2, 1]);
	});

	it('counts no end of an earlier turn, which the GM went back to', () => {
		expect(lifetime(3, turn(1, 'attacker'), [turn(2, 'actor'), turn(1, 'actor'), turn(3, 'actor')])).toEqual([2, 2, 1]);
	});

	it("removes a state left with no round, as one a GM set to 0, at the next end of its actor's turns", () => {
		expect(lapseAtTurnEnd({ rounds: 0 }, turn(1, 'actor'))).toEqual({ kind: 'remove' });
	});
});

describe('enteredRounds', () => {
	it('keeps a whole number of rounds', () => {
		expect(enteredRounds(3)).toBe(3);
	});

	it('applies a state for at least one round, a whole number of them', () => {
		expect(enteredRounds(0)).toBe(1);
		expect(enteredRounds(-2)).toBe(1);
		expect(enteredRounds(2.7)).toBe(2);
	});

	it('applies a state for one round when the entry is no number', () => {
		expect(enteredRounds(NaN)).toBe(1);
	});
});
