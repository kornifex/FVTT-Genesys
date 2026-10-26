/** @file Tests for a character's soak and defense, against the Core Rulebook. */

import { describe, expect, it } from 'vitest';
import { totalDefense, totalSoak } from '@/actor/data/character/Protection';

describe('totalSoak', () => {
	it("is the character's current Brawn without armor, raised whenever Brawn is (CRB p. 31, 46, 105)", () => {
		expect(totalSoak(0, 2, [])).toBe(2);
		expect(totalSoak(0, 3, [])).toBe(3);
	});

	it('adds the soak of the worn armor and of other sources (CRB p. 92, 105)', () => {
		expect(totalSoak(0, 2, [{ soak: 2, defense: 0 }])).toBe(4);
		expect(totalSoak(1, 2, [{ soak: 2, defense: 0 }])).toBe(5);
	});

	it('counts one armor when the character wears several, the one with the best soak (CRB p. 92)', () => {
		expect(
			totalSoak(0, 2, [
				{ soak: 1, defense: 1 },
				{ soak: 2, defense: 0 },
			]),
		).toBe(4);
	});
});

describe('totalDefense', () => {
	it("is the character's own melee and ranged defense without armor (CRB p. 31, 46)", () => {
		expect(totalDefense({ melee: 0, ranged: 0 }, [])).toEqual({ melee: 0, ranged: 0 });
		expect(totalDefense({ melee: 1, ranged: 0 }, [])).toEqual({ melee: 1, ranged: 0 });
	});

	it("adds the defense of the worn armor to both of the character's own defenses (CRB p. 92, 105)", () => {
		expect(totalDefense({ melee: 0, ranged: 1 }, [{ soak: 1, defense: 1 }])).toEqual({ melee: 1, ranged: 2 });
	});

	it('counts the same armor as soak when the character wears several: the best soak, then the best defense (CRB p. 92)', () => {
		const none = { melee: 0, ranged: 0 };

		expect(
			totalDefense(none, [
				{ soak: 1, defense: 1 },
				{ soak: 2, defense: 0 },
			]),
		).toEqual({ melee: 0, ranged: 0 });
		expect(
			totalDefense(none, [
				{ soak: 1, defense: 0 },
				{ soak: 1, defense: 2 },
			]),
		).toEqual({ melee: 2, ranged: 2 });
	});

	it('never goes above 4 (CRB p. 104-105)', () => {
		expect(totalDefense({ melee: 4, ranged: 2 }, [{ soak: 1, defense: 3 }])).toEqual({ melee: 4, ranged: 4 });
	});
});
