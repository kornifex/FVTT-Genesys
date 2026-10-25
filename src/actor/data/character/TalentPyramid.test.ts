/**
 * @file Tests for the Talent Pyramid.
 */

import { describe, expect, it } from 'vitest';
import {
	canAddTalentAtTier,
	canRemoveTalentAtTier,
	countTalentsPerTier,
	PyramidTalent,
	TalentPyramidTotals,
	tierLimit,
} from '@/actor/data/character/TalentPyramid';

function talent(tier: number, rank = 1): PyramidTalent {
	return { tier, rank };
}

function totals(...counts: number[]): TalentPyramidTotals {
	return { 1: counts[0] ?? 0, 2: counts[1] ?? 0, 3: counts[2] ?? 0, 4: counts[3] ?? 0, 5: counts[4] ?? 0 };
}

describe('countTalentsPerTier', () => {
	it('counts unranked talents at their tier', () => {
		expect(countTalentsPerTier([talent(1), talent(1), talent(2)])).toEqual(totals(2, 1));
	});

	it('counts a ranked talent once at each tier its ranks have reached', () => {
		expect(countTalentsPerTier([talent(1, 3)])).toEqual(totals(1, 1, 1));
		expect(countTalentsPerTier([talent(2, 2)])).toEqual(totals(0, 1, 1));
	});

	it('counts every rank bought at tier 5 at tier 5', () => {
		expect(countTalentsPerTier([talent(3, 4)])).toEqual(totals(0, 0, 1, 1, 2));
		expect(countTalentsPerTier([talent(5, 2)])).toEqual(totals(0, 0, 0, 0, 2));
	});
});

describe('tierLimit', () => {
	it('allows one talent less than the tier below', () => {
		expect(tierLimit(totals(3, 1), 2)).toBe(2);
	});

	it('never goes below zero', () => {
		expect(tierLimit(totals(0), 2)).toBe(0);
	});

	it('has no limit at tier 1', () => {
		expect(tierLimit(totals(), 1)).toBe(Infinity);
	});
});

describe('canAddTalentAtTier', () => {
	it('always allows tier 1', () => {
		expect(canAddTalentAtTier(totals(), 1)).toBe(true);
	});

	it('requires more talents at the tier below once the talent is added', () => {
		expect(canAddTalentAtTier(totals(1), 2)).toBe(false);
		expect(canAddTalentAtTier(totals(2), 2)).toBe(true);
		expect(canAddTalentAtTier(totals(2, 1), 2)).toBe(false);
		expect(canAddTalentAtTier(totals(3, 1), 2)).toBe(true);
	});

	it('applies at tier 5', () => {
		expect(canAddTalentAtTier(totals(5, 4, 3, 2, 1), 5)).toBe(false);
		expect(canAddTalentAtTier(totals(5, 4, 3, 3, 1), 5)).toBe(true);
	});
});

describe('canRemoveTalentAtTier', () => {
	it('allows removing when nothing sits on the tier above', () => {
		expect(canRemoveTalentAtTier(totals(1), 1)).toBe(true);
	});

	it('keeps more talents than the tier above once the talent is removed', () => {
		expect(canRemoveTalentAtTier(totals(2, 1), 1)).toBe(false);
		expect(canRemoveTalentAtTier(totals(3, 1), 1)).toBe(true);
	});

	it('always allows removing from tier 5', () => {
		expect(canRemoveTalentAtTier(totals(5, 4, 3, 2, 1), 5)).toBe(true);
	});
});
