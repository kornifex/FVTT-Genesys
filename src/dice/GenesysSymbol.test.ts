/** @file Tests for how the symbols of a roll or a pool count towards its success. */

import { describe, expect, it } from 'vitest';

import { countedSuccessesAndFailures, symbolsNetSuccesses } from '@/dice/GenesysSymbol';

describe('countedSuccessesAndFailures', () => {
	it('counts a Triumph as a Success and a Despair as a Failure, on top of their own (CRB p. 12)', () => {
		expect(countedSuccessesAndFailures({ Success: 2, Triumph: 1, Failure: 1, Despair: 2 })).toEqual({ successes: 3, failures: 3 });
	});

	it('ignores Advantages and Threats, and counts a missing symbol as none', () => {
		expect(countedSuccessesAndFailures({ Advantage: 3, Threat: 1 })).toEqual({ successes: 0, failures: 0 });
		expect(countedSuccessesAndFailures({})).toEqual({ successes: 0, failures: 0 });
	});
});

describe('symbolsNetSuccesses', () => {
	it('leaves the Successes the Failures do not cancel out, a Triumph counting as a Success and a Despair as a Failure (CRB p. 12)', () => {
		expect(symbolsNetSuccesses({ Success: 1, Triumph: 1, Failure: 1 })).toBe(1);
		expect(symbolsNetSuccesses({ Triumph: 1, Despair: 2 })).toBe(-1);
		expect(symbolsNetSuccesses({ Advantage: 2, Threat: 1 })).toBe(0);
	});
});
