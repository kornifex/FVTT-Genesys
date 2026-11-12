import { describe, expect, it } from 'vitest';
import { type CombatTurn, enteredRounds, lapseAtTurnEnd } from '@/effects/LapsingEffects';

// The attacker's slot comes first in a round, the actor's second; with an Extra Slot, an ally's comes next, then the
// actor's Extra Slot.
const PLACES: Record<string, number> = { attacker: 0, actor: 1, ally: 2, extra: 3 };
const turn = (round: number, slot: string, combat = 'combat'): CombatTurn => ({ combat, round, turn: PLACES[slot], slot });
const OWN_SLOT_ONLY = [PLACES.actor];
const WITH_EXTRA_SLOT = [PLACES.actor, PLACES.extra];

/**
 * The rounds left of a state applied during a turn after each end of its actor's turns, given in order, as the Acting
 * GM writes them: the rounds, and the last turn counted. The actor takes the turns given by their place in each round.
 */
function lifetime(rounds: number, appliedDuring: CombatTurn | null, endedTurns: CombatTurn[], actorTurns = OWN_SLOT_ONLY) {
	const ends: (number | 'removed')[] = [];
	let left: number | undefined = rounds;
	let lastCounted: CombatTurn | null = null;
	for (const ended of endedTurns) {
		if (left === undefined) break;
		const lapse = lapseAtTurnEnd({ rounds: left, appliedDuring, lastCounted }, ended, actorTurns);
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
		expect(lapseAtTurnEnd({ rounds: 1, appliedDuring: turn(1, 'actor') }, turn(2, 'actor'), OWN_SLOT_ONLY)).toEqual({
			kind: 'remove',
		});
		expect(lapseAtTurnEnd({ rounds: 1, appliedDuring: turn(1, 'actor') }, turn(1, 'actor', 'other'), OWN_SLOT_ONLY)).toEqual({
			kind: 'remove',
		});
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
		expect(lapseAtTurnEnd({ rounds: 0 }, turn(1, 'actor'), OWN_SLOT_ONLY)).toEqual({ kind: 'remove' });
	});

	it("takes one round off per round, at the end of its actor's first turn, however many slots they take (CRB p. 114)", () => {
		const ends = [turn(1, 'actor'), turn(1, 'extra'), turn(2, 'actor'), turn(2, 'extra')];
		expect(lifetime(2, turn(1, 'attacker'), ends, WITH_EXTRA_SLOT)).toEqual([1, 1, 'removed']);
	});

	it("doesn't count the actor's Extra Slot, when the state was applied after their first turn of that round (CRB p. 114)", () => {
		// The ally disorients the actor between their own slot and their Extra Slot: the round's first turn of theirs is over.
		expect(lifetime(1, turn(1, 'ally'), [turn(1, 'extra'), turn(2, 'actor')], WITH_EXTRA_SLOT)).toEqual([1, 'removed']);
	});

	it("counts none of the actor's slots in the round the state was applied during one of them", () => {
		expect(lifetime(1, turn(1, 'actor'), [turn(1, 'actor'), turn(1, 'extra'), turn(2, 'actor')], WITH_EXTRA_SLOT)).toEqual([
			1,
			1,
			'removed',
		]);
		expect(lifetime(1, turn(1, 'extra'), [turn(1, 'extra'), turn(2, 'actor')], WITH_EXTRA_SLOT)).toEqual([1, 'removed']);
	});

	it("counts a round once, when the GM goes back to the actor's first turn after their Extra Slot", () => {
		const ends = [turn(1, 'actor'), turn(1, 'extra'), turn(1, 'actor'), turn(1, 'extra'), turn(2, 'actor')];
		expect(lifetime(3, turn(1, 'attacker'), ends, WITH_EXTRA_SLOT)).toEqual([2, 2, 2, 2, 1]);
	});

	it('counts no end of a turn of a round before the one the state was applied in, which the GM went back to', () => {
		expect(lifetime(2, turn(2, 'ally'), [turn(1, 'actor'), turn(3, 'actor')], WITH_EXTRA_SLOT)).toEqual([2, 1]);
	});

	it("counts the actor's first turn of a round, whichever slot it is", () => {
		// The actor took only the ally's slot this round, as a PC Claiming another slot of their side.
		expect(lapseAtTurnEnd({ rounds: 2 }, turn(1, 'ally'), [PLACES.ally])).toEqual({ kind: 'shorten', rounds: 1 });
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
