/** @file Tests for the tier a talent's ranks are bought at. */

import { describe, expect, it } from 'vitest';
import { effectiveNextTier, effectiveTier } from '@/item/data/Talents';

describe('effectiveTier', () => {
	it("is the talent's tier at rank 1", () => {
		expect(effectiveTier({ tier: 2, rank: 1 })).toBe(2);
	});

	it('rises one tier per rank after the first', () => {
		expect(effectiveTier({ tier: 1, rank: 3 })).toBe(3);
	});

	it('stops at tier 5', () => {
		expect(effectiveTier({ tier: 3, rank: 4 })).toBe(5);
		expect(effectiveTier({ tier: 5, rank: 2 })).toBe(5);
	});
});

describe('effectiveNextTier', () => {
	it('is one tier above the latest rank', () => {
		expect(effectiveNextTier({ tier: 1, rank: 1 })).toBe(2);
		expect(effectiveNextTier({ tier: 2, rank: 2 })).toBe(4);
	});

	it('stops at tier 5', () => {
		expect(effectiveNextTier({ tier: 4, rank: 1 })).toBe(5);
		expect(effectiveNextTier({ tier: 5, rank: 3 })).toBe(5);
	});
});
