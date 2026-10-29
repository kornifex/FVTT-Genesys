/**
 * @file Skills: how skill names match, which skill an actor rolls for a name, for a weapon, and in the dice prompt, Free
 * Ranks, and how a character's skills are listed.
 */

/**
 * What this module needs of a skill, owned by an actor or defined by the Skills Compendium.
 */
export type Skill = {
	name: string;
	system: { rank: number };
};

/**
 * The categories of skills, in the order a character's skills are listed in.
 */
export const SKILL_CATEGORIES = ['general', 'magic', 'combat', 'social', 'knowledge'] as const;

/**
 * The category a skill belongs to.
 */
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

/**
 * The localization key of each skill category's name.
 */
export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
	general: 'Genesys.SkillCategory.General',
	magic: 'Genesys.SkillCategory.Magic',
	combat: 'Genesys.SkillCategory.Combat',
	social: 'Genesys.SkillCategory.Social',
	knowledge: 'Genesys.SkillCategory.Knowledge',
};

/**
 * The localization key of the heading a character's skills of each category are listed under.
 */
export const SKILL_CATEGORY_HEADINGS: Record<SkillCategory, string> = {
	general: 'Genesys.Labels.GeneralSkills',
	magic: 'Genesys.Labels.MagicSkills',
	combat: 'Genesys.Labels.CombatSkills',
	social: 'Genesys.Labels.SocialSkills',
	knowledge: 'Genesys.Labels.KnowledgeSkills',
};

/**
 * A skill an actor rolls: one they own, or the Skills Compendium's, as an Unranked Skill Check.
 */
export type RolledSkill<S extends Skill> = {
	skill: S;
	unranked: boolean;
};

/**
 * Whether two skill names name the same skill. They match whatever their case.
 */
export function skillNamesMatch(left: string, right: string) {
	return left.toLowerCase() === right.toLowerCase();
}

/**
 * The owned skill with a name. An actor may own several skills whose names only differ by case: the one with the
 * highest rank wins, then the first in item order.
 */
export function ownedSkill<S extends Skill>(ownedSkills: S[], name: string): S | undefined {
	let found: S | undefined;

	for (const skill of ownedSkills) {
		if (skillNamesMatch(skill.name, name) && (!found || skill.system.rank > found.system.rank)) {
			found = skill;
		}
	}

	return found;
}

/**
 * Whether an item is a skill among the owned skills, whatever the case of its name.
 */
export function isOwnedSkill(ownedSkills: Skill[], item: { type: string; name: string }) {
	return item.type === 'skill' && ownedSkill(ownedSkills, item.name) !== undefined;
}

/**
 * The skill an actor rolls for a name: the one they own, otherwise the Skills Compendium's as an Unranked Skill Check.
 * Undefined when neither has it, and the caller's characteristic gives a Characteristic Check.
 */
export function skillToRoll<S extends Skill>(ownedSkills: S[], compendiumSkills: S[], name: string): RolledSkill<S> | undefined {
	const owned = ownedSkill(ownedSkills, name);
	if (owned) {
		return { skill: owned, unranked: false };
	}

	const defined = compendiumSkills.find((skill) => skillNamesMatch(skill.name, name));
	return defined && { skill: defined, unranked: true };
}

/**
 * The skills an actor can choose a weapon's Attack Skill from: each skill the weapon lists, once whatever its case, in
 * the weapon's order.
 */
export function attackSkillChoices(weaponSkills: string[]) {
	return weaponSkills.filter((name, index) => weaponSkills.findIndex((other) => skillNamesMatch(other, name)) === index);
}

/**
 * The name of a weapon's Attack Skill, among the skills the weapon lists: the chosen one, otherwise the one the actor
 * owns with the highest rank, then the first in the weapon's order. If they own none, the first listed skill, as an
 * Unranked Skill Check. Undefined when the weapon lists no skill, and it offers no attack.
 */
export function attackSkillName(ownedSkills: Skill[], weapon: { skills: string[]; attackSkill?: string }): string | undefined {
	const chosen = weapon.skills.find((name) => skillNamesMatch(name, weapon.attackSkill ?? ''));
	if (chosen) {
		return ownedSkill(ownedSkills, chosen)?.name ?? chosen;
	}

	let best: Skill | undefined;

	for (const name of weapon.skills) {
		const owned = ownedSkill(ownedSkills, name);
		if (owned && (!best || owned.system.rank > best.system.rank)) {
			best = owned;
		}
	}

	return best?.name ?? weapon.skills[0];
}

/**
 * The skills the dice prompt offers. For an attack, first the skills the weapon lists, in its order, owned or not;
 * then, sorted by name, the actor's other skills, and the Skills Compendium's others, which are rolled as Unranked
 * Skill Checks.
 */
export function promptSkills<S extends Skill>(ownedSkills: S[], compendiumSkills: S[], weaponSkills: string[] = []) {
	const weapon: S[] = [];
	for (const name of weaponSkills) {
		const rolled = skillToRoll(ownedSkills, compendiumSkills, name);
		if (rolled && !weapon.includes(rolled.skill)) {
			weapon.push(rolled.skill);
		}
	}

	const offered = (skill: S) => !weapon.some((listed) => skillNamesMatch(listed.name, skill.name));

	return {
		weapon,
		owned: ownedSkills.filter(offered).sort(byName),
		unranked: compendiumSkills.filter((skill) => offered(skill) && !ownedSkill(ownedSkills, skill.name)).sort(byName),
	};
}

/**
 * A skill's rank after a Free Rank up or down: gained or lost without spending XP, and never below 0.
 */
export function freeRank(rank: number, step: 1 | -1) {
	return Math.max(0, rank + step);
}

/**
 * A character's skills, grouped by category in the categories' order and sorted by name within each, in the given
 * locale. A category with no skill is left out.
 */
export function skillsByCategory<S extends { name: string; system: { category: SkillCategory } }>(skills: S[], locale: string) {
	return SKILL_CATEGORIES.map((category) => ({
		category,
		skills: skills
			.filter((skill) => skill.system.category === category)
			.sort((left, right) => left.name.localeCompare(right.name, locale)),
	})).filter((group) => group.skills.length > 0);
}

function byName(left: Skill, right: Skill) {
	const leftName = left.name.toLowerCase();
	const rightName = right.name.toLowerCase();
	return leftName < rightName ? -1 : leftName > rightName ? 1 : 0;
}
