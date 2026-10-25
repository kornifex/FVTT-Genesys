/** @file Tests for a character's soak and defense, against the Core Rulebook. */

import { describe, expect, it } from 'vitest';
import { totalDefense, totalSoak } from '@/actor/data/character/Protection';

describe('totalSoak', () => {
	it("is the character's Brawn without armor (CRB p. 105)", () => {
		expect(totalSoak(0, 2, [])).toBe(2);
	});

	it('adds the soak of the equipped armor and of other sources (CRB p. 92, 105)', () => {
		expect(totalSoak(0, 2, [{ soak: 2, defense: 0 }])).toBe(4);
		expect(totalSoak(1, 2, [{ soak: 2, defense: 0 }])).toBe(5);
	});
});

describe('totalDefense', () => {
	it("adds the defense of the equipped armor to both of the character's own defenses (CRB p. 92, 105)", () => {
		expect(totalDefense({ melee: 0, ranged: 1 }, [{ soak: 1, defense: 1 }])).toEqual({ melee: 1, ranged: 2 });
	});

	it('never goes above 4 (CRB p. 104-105)', () => {
		expect(totalDefense({ melee: 4, ranged: 2 }, [{ soak: 1, defense: 3 }])).toEqual({ melee: 4, ranged: 4 });
	});
});
