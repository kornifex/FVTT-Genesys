/**
 * @file Tests for a Minion Group's wound threshold, remaining members and group skill rank.
 */

import { describe, expect, it } from 'vitest';

import { groupSkillRank, groupWoundThreshold, remainingMembers } from '@/actor/data/MinionGroup';

function group(groupSize: number, threshold: number, value = 0) {
	return { groupSize, wounds: { value, threshold } };
}

describe('groupWoundThreshold', () => {
	it("is a member's wound threshold times the group size: three street toughs of 4 have 12 (CRB p. 132)", () => {
		expect(groupWoundThreshold(group(3, 4))).toBe(12);
	});
});

describe('remainingMembers', () => {
	it('is the group size without wounds', () => {
		expect(remainingMembers(group(4, 5))).toBe(4);
	});

	it("keeps every member while the wounds equal a member's threshold (CRB p. 132)", () => {
		expect(remainingMembers(group(3, 4, 4))).toBe(3);
	});

	it("loses a member when the wounds exceed a member's threshold: a street tough falls past 4 (CRB p. 132)", () => {
		expect(remainingMembers(group(3, 4, 5))).toBe(2);
	});

	it("loses one member at a time, each time the wounds exceed another member's share (CRB p. 132)", () => {
		expect(remainingMembers(group(3, 4, 8))).toBe(2);
		expect(remainingMembers(group(3, 4, 9))).toBe(1);
	});

	it("keeps the last member while the wounds equal the group's threshold (CRB p. 132)", () => {
		expect(remainingMembers(group(3, 4, 12))).toBe(1);
	});

	it("has no member left once the wounds exceed the group's threshold, however far (CRB p. 132)", () => {
		expect(remainingMembers(group(3, 4, 13))).toBe(0);
		expect(remainingMembers(group(3, 4, 40))).toBe(0);
	});

	it("has no member when a member's wound threshold is 0, the default", () => {
		expect(remainingMembers(group(4, 0))).toBe(0);
		expect(remainingMembers(group(4, 0, 3))).toBe(0);
	});
});

describe('groupSkillRank', () => {
	it('is one per member beyond the first: three street toughs have 2 (CRB p. 132)', () => {
		expect(groupSkillRank(group(3, 4))).toBe(2);
	});

	it('counts only the members still standing, as each one that falls takes a rank away (CRB p. 132)', () => {
		expect(groupSkillRank(group(3, 4, 5))).toBe(1);
	});

	it('is 4 for a group of five, the largest the CRB allows (CRB p. 135)', () => {
		expect(groupSkillRank(group(5, 4))).toBe(4);
	});

	it('is capped at 5, the highest skill rank, for a group larger than the CRB allows', () => {
		expect(groupSkillRank(group(8, 5))).toBe(5);
	});

	it("is 0 for a group with one member left, a defeated group, and a new group whose members' threshold is 0", () => {
		expect(groupSkillRank(group(3, 4, 12))).toBe(0);
		expect(groupSkillRank(group(3, 4, 13))).toBe(0);
		expect(groupSkillRank(group(4, 0))).toBe(0);
	});
});
