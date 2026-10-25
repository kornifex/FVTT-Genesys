/**
 * @file Tests for a Minion Group's wound threshold, remaining members and group skill rank.
 */

import { describe, expect, it } from 'vitest';

import { groupSkillRank, groupWoundThreshold, remainingMembers } from '@/actor/data/MinionGroup';

function group(groupSize: number, threshold: number, value = 0) {
	return { groupSize, wounds: { value, threshold } };
}

describe('groupWoundThreshold', () => {
	it("is a member's wound threshold times the group size", () => {
		expect(groupWoundThreshold(group(4, 5))).toBe(20);
	});
});

describe('remainingMembers', () => {
	it('is the group size without wounds', () => {
		expect(remainingMembers(group(4, 5))).toBe(4);
	});

	it("keeps every member while the wounds equal a member's threshold", () => {
		expect(remainingMembers(group(4, 5, 5))).toBe(4);
	});

	it("loses a member when the wounds exceed a member's threshold", () => {
		expect(remainingMembers(group(4, 5, 6))).toBe(3);
	});

	it("keeps the last member while the wounds equal the group's threshold", () => {
		expect(remainingMembers(group(4, 5, 20))).toBe(1);
	});

	it("has no member left once the wounds exceed the group's threshold, however far", () => {
		expect(remainingMembers(group(4, 5, 21))).toBe(0);
		expect(remainingMembers(group(4, 5, 40))).toBe(0);
	});

	it("has no member when a member's wound threshold is 0, the default", () => {
		expect(remainingMembers(group(4, 0))).toBe(0);
		expect(remainingMembers(group(4, 0, 3))).toBe(0);
	});
});

describe('groupSkillRank', () => {
	it('is one per remaining member beyond the first', () => {
		expect(groupSkillRank(group(4, 5))).toBe(3);
		expect(groupSkillRank(group(4, 5, 6))).toBe(2);
	});

	it('is capped at 5', () => {
		expect(groupSkillRank(group(8, 5))).toBe(5);
	});

	it("is 0 for a group with one member left, a defeated group, and a new group whose members' threshold is 0", () => {
		expect(groupSkillRank(group(4, 5, 20))).toBe(0);
		expect(groupSkillRank(group(4, 5, 21))).toBe(0);
		expect(groupSkillRank(group(4, 0))).toBe(0);
	});
});
