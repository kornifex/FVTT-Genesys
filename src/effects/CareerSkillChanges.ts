/**
 * @file Career Skill changes: the changes of an actor's effects that make a skill a career skill for the character, as
 * Bard does for Knowledge (Lore) and Verse (RoT p. 87), on top of the skills their Career lists and those marked by hand.
 */

import { skillNamesMatch } from '@/data/Skills';

/**
 * The key the effect sheets offer for a Career Skill change, before a skill is picked for it.
 */
export const CAREER_SKILL_CHANGE_KEY = 'genesys.careerSkill';

/**
 * The change key of a Career Skill change, which names its skill, as a Pool Modification of a skill does.
 */
export function careerSkillChangeKey(skillName: string) {
	return `${CAREER_SKILL_CHANGE_KEY}.${skillName}`;
}

/**
 * The skill a change makes a career skill, empty when none is picked, or undefined if the change isn't a Career Skill
 * change.
 */
export function decodeCareerSkillChangeKey(key: string) {
	if (key === CAREER_SKILL_CHANGE_KEY) {
		return '';
	}

	return key.startsWith(`${CAREER_SKILL_CHANGE_KEY}.`) ? key.slice(CAREER_SKILL_CHANGE_KEY.length + 1) : undefined;
}

/**
 * What this module needs of an effect of the character.
 */
type CareerSkillEffect = {
	isSuppressed: boolean;
	system: { changes: { key?: string }[] };
	originItem?: { id: string | null } | null;
};

/**
 * A skill an effect makes a career skill: its name as the change writes it, and the effect.
 */
export type CareerSkillGrant<Effect extends CareerSkillEffect = CareerSkillEffect> = { skillName: string; effect: Effect };

/**
 * The skills the character's effects make career skills, one grant per change. A suppressed effect, disabled among
 * others, grants none, nor does a change whose skill isn't picked.
 */
export function careerSkillGrants<Effect extends CareerSkillEffect>(effects: Iterable<Effect>): CareerSkillGrant<Effect>[] {
	const grants: CareerSkillGrant<Effect>[] = [];
	for (const effect of effects) {
		if (effect.isSuppressed) {
			continue;
		}

		for (const { key = '' } of effect.system.changes) {
			const skillName = decodeCareerSkillChangeKey(key);
			if (skillName) {
				grants.push({ skillName, effect });
			}
		}
	}

	return grants;
}

/**
 * The grants that make a skill a career skill, whatever the case of the name they give it.
 */
export function grantsOfSkill<Grant extends CareerSkillGrant>(skillName: string, grants: Grant[]) {
	return grants.filter((grant) => skillNamesMatch(grant.skillName, skillName));
}

/**
 * Whether a skill is a career skill for the character: marked as one, by their Career or by hand, or made one by an
 * effect that applies.
 */
export function isCareerSkillFor(skill: { name: string; career: boolean }, grants: CareerSkillGrant[]) {
	return skill.career || grantsOfSkill(skill.name, grants).length > 0;
}

/**
 * The ids of the skills that are career skills only through the effects of an item: not marked as ones, and made ones by
 * no effect of another item. They stop being career skills once the item is gone.
 */
export function careerSkillsOnlyThrough(
	itemId: string,
	skills: { id: string; name: string; career: boolean }[],
	grants: CareerSkillGrant[],
) {
	return skills
		.filter((skill) => {
			const skillGrants = grantsOfSkill(skill.name, grants);
			return !skill.career && skillGrants.length > 0 && skillGrants.every((grant) => grant.effect.originItem?.id === itemId);
		})
		.map((skill) => skill.id);
}
