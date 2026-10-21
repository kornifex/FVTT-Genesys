/**
 * @file Tests for counting the symbols of a roll.
 */

import { describe, expect, it, vi } from 'vitest';

// The dice types extend Foundry's `Die` and the Dice So Nice! registration listens to `Hooks`; both are Foundry globals.
vi.hoisted(() => {
	Object.assign(globalThis, {
		Die: class {},
		Hooks: { once: () => {}, on: () => {} },
	});
});

import GenesysRoller from '@/dice/GenesysRoller';

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

describe('GenesysRoller.parseRollResults', () => {
	it('counts the symbols of every rolled face', () => {
		const results = GenesysRoller.parseRollResults(fakeRoll([{ denomination: 'a', labels: ['ss', 'a', ' '] }]));

		expect(results.totalSuccess).toBe(2);
		expect(results.totalAdvantage).toBe(1);
		expect(results.totalFailures).toBe(0);
	});

	it('counts each triumph as a success and each despair as a failure', () => {
		const results = GenesysRoller.parseRollResults(
			fakeRoll([
				{ denomination: 'p', labels: ['t'] },
				{ denomination: 'c', labels: ['d', 'f'] },
			]),
		);

		expect(results.totalTriumph).toBe(1);
		expect(results.totalSuccess).toBe(1);
		expect(results.totalDespair).toBe(1);
		expect(results.totalFailures).toBe(2);
	});

	it('nets successes against failures and advantages against threats', () => {
		const results = GenesysRoller.parseRollResults(
			fakeRoll([
				{ denomination: 'a', labels: ['ss', 'aa'] },
				{ denomination: 'd', labels: ['f', 'h'] },
			]),
		);

		expect(results.netSuccess).toBe(1);
		expect(results.netFailure).toBe(-1);
		expect(results.netAdvantage).toBe(1);
		expect(results.netThreat).toBe(-1);
	});

	it('adds the extra symbols of the roll', () => {
		const results = GenesysRoller.parseRollResults(fakeRoll([{ denomination: 'a', labels: ['s'] }], { s: 1, h: 2 }));

		expect(results.totalSuccess).toBe(2);
		expect(results.totalThreat).toBe(2);
	});

	it('counts every term when the same die appears more than once', () => {
		const results = GenesysRoller.parseRollResults(
			fakeRoll([
				{ denomination: 'a', labels: ['s'] },
				{ denomination: 'a', labels: ['s', 'a'] },
			]),
		);

		expect(results.totalSuccess).toBe(2);
		expect(results.totalAdvantage).toBe(1);
		expect(results.faces['a']).toEqual(['s', 's', 'a']);
	});
});
