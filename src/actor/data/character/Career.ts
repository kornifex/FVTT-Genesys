/**
 * @file A character's Career: which of their skills it makes Career skills.
 */

import { skillNamesMatch } from '@/data/Skills';

/**
 * Whether a skill is one of a Career's skills. A Career names its skills, which may differ in case from the
 * character's.
 */
export function isCareerSkill(skillName: string, careerSkills: { name: string }[]) {
	return careerSkills.some((careerSkill) => skillNamesMatch(careerSkill.name, skillName));
}
