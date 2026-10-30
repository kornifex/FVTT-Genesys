/**
 * @file Initiative Skills: the one a combatant rolls, and the one the tracker switches to next.
 */

import { Characteristic } from '@/data/Characteristics';
import { skillNamesMatch } from '@/data/Skills';

/**
 * A skill a combatant can roll initiative with.
 */
export type InitiativeSkill = {
	skillName: string;
	skillChar: Characteristic;
};

// When the players and the GM can't tell whether a combatant was ready (Cool) or caught unaware (Vigilance), the check
// is Vigilance (CRB p. 95). Skill names aren't localized, so a compendium that renames it falls back to the first.
const DEFAULT_INITIATIVE_SKILL_NAME = 'Vigilance';

/**
 * The Initiative Skills: the skills marked for initiative, in their order. Without any, initiative is a Characteristic
 * Check on Brawn, named `brawnName`.
 */
export function initiativeSkillsOf(
	skills: { name: string; system: { characteristic: Characteristic; initiative: boolean } }[],
	brawnName: string,
): InitiativeSkill[] {
	const initiativeSkills = skills
		.filter((skill) => skill.system.initiative)
		.map((skill) => ({ skillName: skill.name, skillChar: skill.system.characteristic }));

	return initiativeSkills.length > 0 ? initiativeSkills : [{ skillName: brawnName, skillChar: Characteristic.Brawn }];
}

function findInitiativeSkill(initiativeSkills: InitiativeSkill[], skillName: string) {
	return initiativeSkills.find((skill) => skillNamesMatch(skill.skillName, skillName));
}

/**
 * The Initiative Skill chosen for a combatant, if it's still among the Initiative Skills.
 */
export function chosenInitiativeSkill(
	initiativeSkills: InitiativeSkill[],
	chosenSkillName: string | undefined,
): InitiativeSkill | undefined {
	return chosenSkillName ? findInitiativeSkill(initiativeSkills, chosenSkillName) : undefined;
}

/**
 * The Initiative Skill a combatant rolls: the one chosen for it if it's still among the Initiative Skills, else
 * Vigilance, else the first. The Initiative Skills are never empty: without any, initiative is a Brawn check.
 */
export function initiativeSkillToRoll(initiativeSkills: InitiativeSkill[], chosenSkillName: string | undefined): InitiativeSkill {
	return (
		chosenInitiativeSkill(initiativeSkills, chosenSkillName) ??
		findInitiativeSkill(initiativeSkills, DEFAULT_INITIATIVE_SKILL_NAME) ??
		initiativeSkills[0]
	);
}

/**
 * The Initiative Skill a combatant switches to from the one it rolls: the next in their order, back to the first after
 * the last. Undefined when there's only one.
 */
export function nextInitiativeSkill(initiativeSkills: InitiativeSkill[], chosenSkillName: string | undefined): InitiativeSkill | undefined {
	if (initiativeSkills.length < 2) {
		return undefined;
	}

	const skillIndex = initiativeSkills.indexOf(initiativeSkillToRoll(initiativeSkills, chosenSkillName));
	return initiativeSkills[(skillIndex + 1) % initiativeSkills.length];
}
