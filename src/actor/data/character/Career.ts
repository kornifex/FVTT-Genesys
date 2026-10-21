/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @file A character's Career: which of their skills it makes Career skills.
 */

/**
 * Whether a skill is one of a Career's skills. A Career names its skills, which may differ in case from the
 * character's.
 */
export function isCareerSkill(skillName: string, careerSkills: { name: string }[]) {
	const name = skillName.toLowerCase();
	return careerSkills.some((careerSkill) => careerSkill.name.toLowerCase() === name);
}
