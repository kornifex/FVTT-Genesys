/**
 * @file A character's Career: which of their skills it makes Career skills, and the Free Ranks it gives them.
 */

import { skillNamesMatch } from '@/data/Skills';

/**
 * Whether a skill is one of a Career's skills. A Career names its skills, which may differ in case from the
 * character's.
 */
export function isCareerSkill(skillName: string, careerSkills: { name: string }[]) {
	return careerSkills.some((careerSkill) => skillNamesMatch(careerSkill.name, skillName));
}

/**
 * The skills of a character that their Career lists.
 */
export function heldCareerSkills<T extends { name: string; type: string }>(items: T[], careerSkills: { name: string }[]) {
	return items.filter((item) => item.type === 'skill' && isCareerSkill(item.name, careerSkills));
}

/**
 * The updates of the character's skills when a Career is added (sign +1) or removed (sign -1): the skills it lists
 * become Career skills or stop being ones, and those chosen for its Free Ranks gain or lose a rank.
 */
export function careerSkillUpdates<T extends { id: string; name: string; type: string; system: unknown }>(
	items: T[],
	careerSkills: { name: string }[],
	freeRankSkillIds: string[],
	sign: 1 | -1,
) {
	const skills = heldCareerSkills(items, careerSkills) as (T & { system: { rank: number } })[];

	return skills.map((skill) => ({
		skill,
		update: {
			'system.career': sign > 0,
			'system.rank': skill.system.rank + (freeRankSkillIds.includes(skill.id) ? sign : 0),
		},
	}));
}

/**
 * The skills chosen for a Career's Free Ranks after one is picked: a chosen skill is unpicked, another is added while
 * Free Ranks are left, so each skill gets one rank at most.
 */
export function toggledFreeRankChoice(chosenSkillIds: string[], skillId: string, freeRanks: number) {
	if (chosenSkillIds.includes(skillId)) {
		return chosenSkillIds.filter((id) => id !== skillId);
	}

	return chosenSkillIds.length < freeRanks ? [...chosenSkillIds, skillId] : chosenSkillIds;
}
