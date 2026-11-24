/**
 * @file A character's Career: which of their skills it makes Career skills, and the Free Ranks it gives them.
 */

import { freeRank, skillNamesMatch } from '@/data/Skills';

/**
 * Whether a skill is one of a Career's skills. A Career names its skills, which may differ in case from the
 * character's.
 */
export function isCareerSkill(skillName: string, careerSkills: { name: string }[]) {
	return careerSkills.some((careerSkill) => skillNamesMatch(careerSkill.name, skillName));
}

/**
 * Whether a skill created on a character is a Career skill: the Career's skills are, whenever they are added, and a
 * skill created as a Career skill stays one, since it may have been marked by hand.
 */
export function createdSkillIsCareer(skill: { name: string; career: boolean }, careerSkills: { name: string }[]) {
	return skill.career || isCareerSkill(skill.name, careerSkills);
}

/**
 * The skills of a character that their Career lists.
 */
export function heldCareerSkills<T extends { name: string; type: string }>(items: T[], careerSkills: { name: string }[]) {
	return items.filter((item) => item.type === 'skill' && isCareerSkill(item.name, careerSkills));
}

/**
 * What adding (sign +1) or removing (sign -1) a Career changes on each skill of the character it lists: whether it is a
 * Career skill, and the rank it gains or loses when it was chosen for the Career's Free Ranks.
 */
function careerSkillChanges<T extends { id: string; name: string; type: string; system: unknown }>(
	items: T[],
	careerSkills: { name: string }[],
	freeRankSkillIds: string[],
	sign: 1 | -1,
) {
	// A skill item's data is a skill's, which holds its rank.
	const skills = heldCareerSkills(items, careerSkills) as (T & { system: { rank: number } })[];

	return skills.map((skill) => ({ skill, career: sign > 0, change: freeRankSkillIds.includes(skill.id) ? sign : 0 }));
}

/**
 * The updates of the character's skills when a Career is added (sign +1) or removed (sign -1): the skills it lists
 * become Career skills or stop being ones, and those chosen for its Free Ranks gain or lose a rank, never going below 0.
 */
export function careerSkillUpdates<T extends { id: string; name: string; type: string; system: unknown }>(
	items: T[],
	careerSkills: { name: string }[],
	freeRankSkillIds: string[],
	sign: 1 | -1,
) {
	return careerSkillChanges(items, careerSkills, freeRankSkillIds, sign).map(({ skill, career, change }) => ({
		skill,
		update: { 'system.career': career, 'system.rank': freeRank(skill.system.rank, change) },
	}));
}

/**
 * The writes that give the character a Career, in place of the one they hold if any: the held Career's skills stop being
 * career skills and lose its Free Ranks, then the new Career's skills become career skills and the chosen ones gain a
 * rank. The new Career is created under the id drawn, with the skills chosen for its Free Ranks. Each kind of write is
 * one batch, so a skill both Careers list gets its final rank in one update.
 */
export function careerChange<T extends { id: string; name: string; type: string; system: unknown }>(
	items: T[],
	held: { id: string; system: { careerSkills: { name: string }[]; selectedSkillIDs: string[] } } | undefined,
	dropped: { system: { careerSkills: { name: string }[] }; source: { system?: object } },
	freeRankSkillIds: string[],
	newId: () => string,
) {
	// A skill both Careers list ends as the new Career marks it, and its rank changes by the sum of the Free Rank the held
	// Career took back and the one the new Career gives, floored at 0 once: flooring each change apart would turn a rank
	// taken back by hand into a rank gained. The skills are the items themselves, never copies: a Foundry item's id is a
	// getter of its prototype, which a copy made by spreading it leaves out.
	const changes = new Map<T & { system: { rank: number } }, { career: boolean; change: number }>();
	const addChanges = (careerSkills: { name: string }[], chosen: string[], sign: 1 | -1) => {
		for (const { skill, career, change } of careerSkillChanges(items, careerSkills, chosen, sign)) {
			changes.set(skill, { career, change: (changes.get(skill)?.change ?? 0) + change });
		}
	};

	if (held) {
		addChanges(held.system.careerSkills, held.system.selectedSkillIDs, -1);
	}
	addChanges(dropped.system.careerSkills, freeRankSkillIds, 1);

	return {
		itemCreates: [
			{
				...dropped.source,
				_id: newId(),
				system: { ...dropped.source.system, selectedSkillIDs: freeRankSkillIds },
			},
		],
		itemUpdates: [...changes].map(([skill, { career, change }]) => ({
			_id: skill.id,
			'system.career': career,
			'system.rank': freeRank(skill.system.rank, change),
		})),
		itemDeletes: held ? [held.id] : [],
		actorUpdate: {},
	};
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
