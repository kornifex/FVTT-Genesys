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
 * The categories a skill belongs to, in the order a character's skills are listed.
 */
const SKILL_CATEGORIES = ['general', 'magic', 'combat', 'social', 'knowledge'] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

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
 * The name of the skill an actor rolls a weapon with, among the skills the weapon lists: the one they own with the
 * highest rank, then the first in the weapon's order. If they own none, the first listed skill, as an Unranked Skill
 * Check. Undefined when the weapon lists no skill, and it offers no attack.
 */
export function weaponSkillName(ownedSkills: Skill[], weaponSkills: string[]): string | undefined {
	let best: Skill | undefined;

	for (const name of weaponSkills) {
		const owned = ownedSkill(ownedSkills, name);
		if (owned && (!best || owned.system.rank > best.system.rank)) {
			best = owned;
		}
	}

	return best?.name ?? weaponSkills[0];
}

/**
 * The skills the dice prompt offers, sorted by name: those the actor owns, and the Skills Compendium's other skills,
 * which are rolled as Unranked Skill Checks.
 */
export function promptSkills<S extends Skill>(ownedSkills: S[], compendiumSkills: S[]) {
	return {
		owned: [...ownedSkills].sort(byName),
		unranked: compendiumSkills.filter((skill) => !ownedSkill(ownedSkills, skill.name)).sort(byName),
	};
}

/**
 * A skill's rank after a Free Rank up or down: gained or lost without spending XP, and never below 0.
 */
export function freeRank(rank: number, step: 1 | -1) {
	return Math.max(0, rank + step);
}

/**
 * A character's skills, grouped by category in the categories' order and sorted by name within each. A category with
 * no skill is left out.
 */
export function skillsByCategory<S extends { name: string; system: { category: SkillCategory } }>(skills: S[]) {
	return SKILL_CATEGORIES.map((category) => ({
		category,
		skills: skills.filter((skill) => skill.system.category === category).sort((left, right) => left.name.localeCompare(right.name)),
	})).filter((group) => group.skills.length > 0);
}

function byName(left: Skill, right: Skill) {
	const leftName = left.name.toLowerCase();
	const rightName = right.name.toLowerCase();
	return leftName < rightName ? -1 : leftName > rightName ? 1 : 0;
}
