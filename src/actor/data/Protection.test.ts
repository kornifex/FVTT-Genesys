/** @file Tests for a character's soak and defense, an Adversary's defense and a vehicle's defense, against the Core Rulebook. */

import { describe, expect, it } from 'vitest';
import { adversaryDefense, totalDefense, totalSoak, vehicleDefense } from '@/actor/data/Protection';

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

const NONE = { melee: 0, ranged: 0 };
// What cover provides: ranged defense 1 (CRB p. 99).
const COVER = { melee: 0, ranged: 1 };

describe('totalDefense', () => {
	it("is the character's own melee and ranged defense without armor (CRB p. 31, 46)", () => {
		expect(totalDefense({ melee: 0, ranged: 0 }, [], NONE)).toEqual({ melee: 0, ranged: 0 });
		expect(totalDefense({ melee: 1, ranged: 0 }, [], NONE)).toEqual({ melee: 1, ranged: 0 });
	});

	it("adds the defense of the worn armor to both of the character's own defenses (CRB p. 92, 105)", () => {
		expect(totalDefense({ melee: 0, ranged: 1 }, [{ soak: 1, defense: 1 }], NONE)).toEqual({ melee: 1, ranged: 2 });
	});

	it('counts the same armor as soak when the character wears several: the best soak, then the best defense (CRB p. 92)', () => {
		expect(
			totalDefense(
				NONE,
				[
					{ soak: 1, defense: 1 },
					{ soak: 2, defense: 0 },
				],
				NONE,
			),
		).toEqual({ melee: 0, ranged: 0 });
		expect(
			totalDefense(
				NONE,
				[
					{ soak: 1, defense: 0 },
					{ soak: 1, defense: 2 },
				],
				NONE,
			),
		).toEqual({ melee: 2, ranged: 2 });
	});

	it("keeps the best of the defense the armor provides and the one cover provides, which don't stack (CRB p. 106)", () => {
		expect(totalDefense(NONE, [{ soak: 1, defense: 1 }], COVER)).toEqual({ melee: 1, ranged: 1 });
		expect(totalDefense(NONE, [], COVER)).toEqual({ melee: 0, ranged: 1 });
		expect(totalDefense(NONE, [{ soak: 1, defense: 2 }], COVER)).toEqual({ melee: 2, ranged: 2 });
	});

	it('adds the defense a talent increases to the best one provided (CRB p. 106)', () => {
		expect(totalDefense({ melee: 1, ranged: 1 }, [{ soak: 1, defense: 2 }], COVER)).toEqual({ melee: 3, ranged: 3 });
	});

	it('never goes above 4 (CRB p. 104-105)', () => {
		expect(totalDefense({ melee: 4, ranged: 2 }, [{ soak: 1, defense: 3 }], NONE)).toEqual({ melee: 4, ranged: 4 });
		expect(totalDefense({ melee: 3, ranged: 3 }, [], { melee: 2, ranged: 2 })).toEqual({ melee: 4, ranged: 4 });
	});
});

describe('adversaryDefense', () => {
	// What a talent written with a "+" adds to melee and ranged defense.
	const PLUS_ONE = { melee: 1, ranged: 1 };

	it("is the adversary's stat block defense, melee and ranged each, up to 4 (CRB p. 104-105)", () => {
		expect(adversaryDefense({ melee: 1, ranged: 2 }, NONE, NONE)).toEqual({ melee: 1, ranged: 2 });
		expect(adversaryDefense({ melee: 4, ranged: 4 }, NONE, NONE)).toEqual({ melee: 4, ranged: 4 });
		expect(adversaryDefense({ melee: 5, ranged: 6 }, NONE, NONE)).toEqual({ melee: 4, ranged: 4 });
	});

	it('keeps the best of its stat block defense, which counts its armor, and the one cover provides (CRB p. 106)', () => {
		expect(adversaryDefense({ melee: 1, ranged: 1 }, COVER, NONE)).toEqual({ melee: 1, ranged: 1 });
		expect(adversaryDefense({ melee: 0, ranged: 0 }, COVER, NONE)).toEqual({ melee: 0, ranged: 1 });
	});

	it('adds the increases written with a "+" to the best of its stat block defense and the one provided (CRB p. 106)', () => {
		expect(adversaryDefense({ melee: 0, ranged: 0 }, NONE, PLUS_ONE)).toEqual({ melee: 1, ranged: 1 });
		expect(adversaryDefense({ melee: 0, ranged: 0 }, COVER, PLUS_ONE)).toEqual({ melee: 1, ranged: 2 });
		expect(adversaryDefense({ melee: 1, ranged: 1 }, COVER, PLUS_ONE)).toEqual({ melee: 2, ranged: 2 });
	});

	it('never goes above 4 (CRB p. 104-105)', () => {
		expect(adversaryDefense({ melee: 3, ranged: 3 }, { melee: 5, ranged: 5 }, NONE)).toEqual({ melee: 4, ranged: 4 });
		expect(adversaryDefense({ melee: 3, ranged: 3 }, COVER, { melee: 2, ranged: 2 })).toEqual({ melee: 4, ranged: 4 });
	});
});

describe('vehicleDefense', () => {
	it("is the vehicle's defense against melee and ranged attacks alike, up to 4 (CRB p. 223, 104-105)", () => {
		expect(vehicleDefense(0, 0)).toEqual({ melee: 0, ranged: 0 });
		expect(vehicleDefense(2, 0)).toEqual({ melee: 2, ranged: 2 });
		expect(vehicleDefense(5, 0)).toEqual({ melee: 4, ranged: 4 });
	});

	it("adds its Pilot's Defensive Driving, one per rank, still up to 4 (CRB p. 80, 223)", () => {
		expect(vehicleDefense(1, 2)).toEqual({ melee: 3, ranged: 3 });
		expect(vehicleDefense(3, 2)).toEqual({ melee: 4, ranged: 4 });
	});
});
