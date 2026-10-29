/** @file Tests for the tier a talent's ranks are bought at. */

import { describe, expect, it } from 'vitest';
import { effectiveNextTier, effectiveTier, TIERS } from '@/item/data/Talents';

describe('effectiveTier (CRB p. 72)', () => {
	it("is the talent's tier at rank 1", () => {
		expect(effectiveTier({ tier: 2, rank: 1 })).toBe(2);
	});

	it('rises one tier per rank after the first, each rank counting at the tier it was bought at', () => {
		expect(effectiveTier({ tier: 1, rank: 3 })).toBe(3);
	});

	it('stays at tier 5 once a ranked talent reaches it', () => {
		expect(effectiveTier({ tier: 3, rank: 4 })).toBe(5);
		expect(effectiveTier({ tier: 5, rank: 2 })).toBe(5);
	});
});

describe('effectiveNextTier (CRB p. 72)', () => {
	it('buys the next rank one tier above the latest one', () => {
		expect(effectiveNextTier({ tier: 1, rank: 1 })).toBe(2);
		expect(effectiveNextTier({ tier: 2, rank: 2 })).toBe(4);
	});

	it('buys every rank after tier 5 at tier 5', () => {
		expect(effectiveNextTier({ tier: 4, rank: 1 })).toBe(5);
		expect(effectiveNextTier({ tier: 5, rank: 3 })).toBe(5);
	});
});

describe('TIERS (CRB p. 71-72)', () => {
	it('lists the tiers from 1 to 5', () => {
		expect(TIERS).toEqual([1, 2, 3, 4, 5]);
	});
});
