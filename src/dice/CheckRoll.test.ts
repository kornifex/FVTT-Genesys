/**
 * @file Tests for reading the results of a Foundry roll.
 */

import { describe, expect, it } from 'vitest';

import { parseRollResults } from '@/dice/CheckRoll';

/**
 * A dice term as `parseRollResults` reads it: a denomination and the labels of the rolled faces.
 */
type FakeTerm = { denomination: string; labels: string[] };

function fakeRoll(terms: FakeTerm[], symbols?: Record<string, number>): Roll {
	const dice = terms.map(({ denomination, labels }) => ({
		denomination,
		results: labels.map((label) => ({ label })),
		getResultLabel: (result: { label: string }) => result.label,
	}));

	return { dice, data: { symbols } } as unknown as Roll;
}

describe('parseRollResults', () => {
	it('counts every term when the same die appears more than once', () => {
		const results = parseRollResults(
			fakeRoll([
				{ denomination: 'a', labels: ['s'] },
				{ denomination: 'a', labels: ['s', 'a'] },
			]),
		);

		expect(results.totalSuccess).toBe(2);
		expect(results.totalAdvantage).toBe(1);
		expect(results.faces['a']).toEqual(['s', 's', 'a']);
	});

	it('adds the extra symbols of the roll data', () => {
		const results = parseRollResults(fakeRoll([{ denomination: 'a', labels: ['s'] }], { s: 1, h: 2 }));

		expect(results.totalSuccess).toBe(2);
		expect(results.totalThreat).toBe(2);
	});
});
