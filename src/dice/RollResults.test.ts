/**
 * @file Tests for counting the symbols of a roll.
 */

import { describe, expect, it } from 'vitest';
import { rollResults } from '@/dice/RollResults';

describe('rollResults', () => {
	it('counts the symbols of every rolled face', () => {
		const results = rollResults({ a: ['ss', 'a', ' '] }, {});

		expect(results.totalSuccess).toBe(2);
		expect(results.totalAdvantage).toBe(1);
		expect(results.totalFailures).toBe(0);
	});

	it('counts each triumph as a success and each despair as a failure', () => {
		const results = rollResults({ p: ['t'], c: ['d', 'f'] }, {});

		expect(results.totalTriumph).toBe(1);
		expect(results.totalSuccess).toBe(1);
		expect(results.totalDespair).toBe(1);
		expect(results.totalFailures).toBe(2);
	});

	it('nets successes against failures and advantages against threats', () => {
		const results = rollResults({ a: ['ss', 'aa'], d: ['f', 'h'] }, {});

		expect(results.netSuccess).toBe(1);
		expect(results.netFailure).toBe(-1);
		expect(results.netAdvantage).toBe(1);
		expect(results.netThreat).toBe(-1);
	});

	it('adds the extra symbols of the roll', () => {
		const results = rollResults({ a: ['s'] }, { s: 1, h: 2 });

		expect(results.totalSuccess).toBe(2);
		expect(results.totalThreat).toBe(2);
	});
});
