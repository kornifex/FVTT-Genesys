/**
 * @file Tests for counting the symbols of a roll, and for what a check's card shows of them.
 */

import { describe, expect, it } from 'vitest';
import { cardResults, rollResults } from '@/dice/RollResults';

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

describe('interpreting a roll (CRB p. 23-24)', () => {
	it('cancels one Success with each Failure, so that a check succeeds with at least one Success left (CRB p. 23)', () => {
		expect(rollResults({ a: ['ss', 's'], d: ['ff'] }, {}).netSuccess).toBe(1);
		expect(rollResults({ a: ['ss'], d: ['ff'] }, {}).netSuccess).toBe(0);
		expect(rollResults({ a: ['s'], d: ['ff'] }, {}).netFailure).toBe(1);
	});

	it('cancels one Advantage with each Threat, whether the check succeeds or fails (CRB p. 23)', () => {
		const results = rollResults({ a: ['aa', 'a'], d: ['h', 'ff'] }, {});

		expect(results.netAdvantage).toBe(2);
		expect(results.netFailure).toBe(2);
	});

	it('counts a Triumph as a Success that a Failure can cancel, its Triumph kept (CRB p. 12, 24)', () => {
		const results = rollResults({ p: ['t'], d: ['f'] }, {});

		expect(results.netSuccess).toBe(0);
		expect(results.totalTriumph).toBe(1);
	});

	it('counts a Despair as a Failure that a Success can cancel, its Despair kept (CRB p. 13, 24)', () => {
		const results = rollResults({ a: ['s'], c: ['d'] }, {});

		expect(results.netSuccess).toBe(0);
		expect(results.totalDespair).toBe(1);
	});

	it("keeps both a Triumph and a Despair, which don't cancel each other (CRB p. 24)", () => {
		const results = rollResults({ p: ['t'], c: ['d'] }, {});

		expect(results.totalTriumph).toBe(1);
		expect(results.totalDespair).toBe(1);
		expect(results.netSuccess).toBe(0);
	});
});

describe('cardResults', () => {
	it('shows the net Successes and Failures besides the Triumphs and Despairs, then the net Advantages and Threats, then the Triumphs and Despairs', () => {
		expect(cardResults(rollResults({ p: ['t', 'ss'], d: ['f', 'aa'] }, {})).symbols).toEqual(['s', 'a', 'a', 't']);
		expect(cardResults(rollResults({ c: ['d', 'ff'], a: ['s', 'h'] }, {})).symbols).toEqual(['f', 'h', 'd']);
	});

	it('sums up each net symbol left over, the Triumphs and Despairs counted among the Successes and Failures', () => {
		expect(cardResults(rollResults({ p: ['t', 'ss'], d: ['f', 'aa'] }, {})).summary).toEqual([
			{ symbol: 's', label: 'Genesys.Rolls.Summary.Successes', count: 2 },
			{ symbol: 'a', label: 'Genesys.Rolls.Summary.Advantage', count: 2 },
			{ symbol: 't', label: 'Genesys.Rolls.Summary.Triumph', count: 1 },
		]);
		expect(cardResults(rollResults({ c: ['d', 'ff'], a: ['s', 'h'] }, {})).summary).toEqual([
			{ symbol: 'f', label: 'Genesys.Rolls.Summary.Failures', count: 2 },
			{ symbol: 'h', label: 'Genesys.Rolls.Summary.Threat', count: 1 },
			{ symbol: 'd', label: 'Genesys.Rolls.Summary.Despair', count: 1 },
		]);
	});

	it('shows no symbol and sums up nothing when every symbol cancels out', () => {
		expect(cardResults(rollResults({ a: ['sa'], d: ['fh'] }, {}))).toEqual({ symbols: [], summary: [], succeeded: false });
	});

	it('succeeds with at least one net Success, which a Triumph counts as (CRB p. 23-24)', () => {
		expect(cardResults(rollResults({ p: ['t'] }, {})).succeeded).toBe(true);
		expect(cardResults(rollResults({ p: ['t'], d: ['f'] }, {})).succeeded).toBe(false);
		expect(cardResults(rollResults({ a: ['s'], d: ['ff'] }, {})).succeeded).toBe(false);
	});
});
