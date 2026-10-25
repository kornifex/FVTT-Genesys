/** @file Tests for the chance that a dice pool succeeds. */

import { describe, expect, it } from 'vitest';

import { type ChancePool, chanceToSucceed } from '@/dice/ChanceToSucceed';

// The expected chances are the ones the former JavaScript worker computed for the same pools. No Foundry global is
// stubbed: the module runs in a Web Worker, where there is none.
const cases: [string, ChancePool, number][] = [
	['one Ability die', { dice: { Ability: 1 }, symbols: {} }, 0.5],
	['one Proficiency die', { dice: { Proficiency: 1 }, symbols: {} }, 0.6666666666666666],
	['one Boost die', { dice: { Boost: 1 }, symbols: {} }, 0.3333333333333333],
	['one Setback die', { dice: { Setback: 1 }, symbols: {} }, 0],
	['one Difficulty die', { dice: { Difficulty: 1 }, symbols: {} }, 0],
	['one Challenge die', { dice: { Challenge: 1 }, symbols: {} }, 0],
	['an Average check', { dice: { Ability: 2, Difficulty: 2 }, symbols: {} }, 0.43505859375],
	['an upgraded pool', { dice: { Proficiency: 2, Ability: 1, Difficulty: 2 }, symbols: {} }, 0.7004123263888888],
	['an upgraded difficulty', { dice: { Proficiency: 1, Ability: 2, Challenge: 1, Difficulty: 1 }, symbols: {} }, 0.5846625434027778],
	[
		'every die type',
		{ dice: { Proficiency: 1, Ability: 2, Boost: 1, Challenge: 1, Difficulty: 1, Setback: 2 }, symbols: {} },
		0.5011785059799383,
	],
	[
		'a large pool of every die type',
		{ dice: { Proficiency: 3, Ability: 2, Boost: 2, Challenge: 2, Difficulty: 2, Setback: 3 }, symbols: {} },
		0.5726682076730902,
	],
	['a large upgraded pool', { dice: { Proficiency: 5, Ability: 1, Challenge: 4, Difficulty: 1 }, symbols: {} }, 0.6346452395460418],
	['an added Success', { dice: { Ability: 2, Difficulty: 2 }, symbols: { Success: 1 } }, 0.714111328125],
	['added Failures and a Threat', { dice: { Ability: 2, Difficulty: 2 }, symbols: { Failure: 2, Threat: 1 } }, 0.047607421875],
	[
		'an added Triumph and Despair, whose Success and Failure cancel out',
		{ dice: { Ability: 2, Difficulty: 2 }, symbols: { Triumph: 1, Despair: 1, Advantage: 2 } },
		0.43505859375,
	],
	['added Despairs, which count as Failures', { dice: { Ability: 3, Difficulty: 1 }, symbols: { Despair: 2 } }, 0.20703125],
	['an added Triumph, which counts as a Success', { dice: { Ability: 1, Boost: 1 }, symbols: { Triumph: 1 } }, 1],
	['dice and symbols counted zero times', { dice: { Proficiency: 0, Ability: 2, Difficulty: 0 }, symbols: { Success: 0 } }, 0.75],
	['negative dice alone', { dice: { Difficulty: 3 }, symbols: {} }, 0],
	['a Success without dice', { dice: {}, symbols: { Success: 1 } }, 1],
	['a Success and a Failure without dice', { dice: {}, symbols: { Success: 1, Failure: 1 } }, 0],
];

describe('chanceToSucceed', () => {
	it.each(cases)('computes the chance to succeed of %s', (_, pool, chance) => {
		expect(chanceToSucceed(pool)).toBe(chance);
	});
});

// The rough chances the book gives for each difficulty level, for a focused character (a characteristic of 3 and one
// rank: two Ability dice and a Proficiency die) and a general one (a characteristic of 2 and no rank: two Ability dice).
const bookChances: [string, number, (chance: number) => void, (chance: number) => void][] = [
	['Simple', 0, (focused) => expect(focused).toBeGreaterThan(0.9), (general) => expect(general).toBeCloseTo(0.75, 1)],
	['Easy', 1, (focused) => expect(focused).toBeCloseTo(0.8, 1), (general) => expect(general).toBeCloseTo(0.6, 1)],
	['Average', 2, (focused) => expect(focused).toBeCloseTo(2 / 3, 1), (general) => expect(general).toBeLessThan(0.5)],
	['Hard', 3, (focused) => expect(focused).toBeGreaterThan(0.5), (general) => expect(general).toBeCloseTo(1 / 3, 1)],
	['Daunting', 4, (focused) => expect(focused).toBeCloseTo(0.45, 1), (general) => expect(general).toBeCloseTo(0.25, 1)],
	['Formidable', 5, (focused) => expect(focused).toBeCloseTo(1 / 3, 1), (general) => expect(general).toBeLessThan(0.2)],
];

describe('chanceToSucceed against the difficulty levels (CRB p. 16-18)', () => {
	it.each(bookChances)('gives a %s check the chances of the book', (_, difficultyDice, expectFocused, expectGeneral) => {
		expectFocused(chanceToSucceed({ dice: { Ability: 2, Proficiency: 1, Difficulty: difficultyDice }, symbols: {} }));
		expectGeneral(chanceToSucceed({ dice: { Ability: 2, Difficulty: difficultyDice }, symbols: {} }));
	});
});
