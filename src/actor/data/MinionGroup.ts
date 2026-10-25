/** @file A Minion Group: its wound threshold, its remaining members and its group skill rank. */

/**
 * What this module reads of a Minion Group: its group size, its wounds, and the wound threshold of each member.
 */
type MinionGroup = {
	groupSize: number;
	wounds: { value: number; threshold: number };
};

/**
 * The group's wound threshold: a member's times the group size.
 */
export function groupWoundThreshold(group: MinionGroup) {
	return group.wounds.threshold * group.groupSize;
}

/**
 * How many of the group's members are still standing.
 */
export function remainingMembers(group: MinionGroup) {
	const { groupSize, wounds } = group;
	// A group without a wound threshold, as a new one is before its threshold is set, has no member standing.
	if (groupWoundThreshold(group) === 0) {
		return 0;
	}
	if (wounds.value === 0) {
		return groupSize;
	}

	// A member falls each time the wounds exceed another member's threshold, not when they reach it.
	return Math.max(0, groupSize - Math.floor((wounds.value - 1) / wounds.threshold));
}

// A group's skill rank can't exceed the highest skill rank.
const MAX_GROUP_SKILL_RANK = 5;

/**
 * The rank the group rolls each of its skills at: one per remaining member beyond the first, up to 5.
 */
export function groupSkillRank(group: MinionGroup) {
	return Math.min(MAX_GROUP_SKILL_RANK, Math.max(0, remainingMembers(group) - 1));
}
