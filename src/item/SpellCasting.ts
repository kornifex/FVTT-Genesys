/**
 * @file Casting a spell (CRB pp. 210–215): the magic skill it is cast with, the Additional Effects the caster checks and
 * the difficulty they add, never beyond Formidable, the qualities they give, and the strain casting costs.
 */

import { ownedSkill, type Skill } from '@/data/Skills';
import { FORMIDABLE } from '@/dice/Difficulty';
import type { ContainedAdditionalEffect, SpellQuality } from '@/item/data/Spells';

/**
 * The strain a caster suffers once the check is resolved, whether it succeeds or not (CRB p. 210).
 */
const CASTING_STRAIN = 2;

/**
 * The name of the magic skill a character casts a spell with: of the spell's skills, the one they have the most ranks
 * in, then the first in the spell's order. Undefined when they have no rank in any, and can't cast it (CRB p. 210).
 */
export function castingSkillName(ownedSkills: Skill[], spellSkills: string[]): string | undefined {
	let best: Skill | undefined;

	for (const name of spellSkills) {
		const owned = ownedSkill(ownedSkills, name);
		if (owned && owned.system.rank > 0 && (!best || owned.system.rank > best.system.rank)) {
			best = owned;
		}
	}

	return best?.name;
}

/**
 * What casting reads of an Additional Effect: its id among the spell's, the difficulty it adds, and whether it starts
 * checked.
 */
type CastEffect = Pick<ContainedAdditionalEffect, 'id' | 'difficulty' | 'startsChecked'>;

/**
 * The Difficulty dice the checked Additional Effects add to the spell's (CRB p. 215).
 */
export function addedDifficulty(effects: readonly CastEffect[], checked: readonly string[]) {
	return effects.filter((effect) => checked.includes(effect.id)).reduce((sum, effect) => sum + effect.difficulty, 0);
}

/**
 * Whether the caster may check an Additional Effect: an effect already checked may always be unchecked; another, as long
 * as the spell's difficulty and its checked effects' stay within Formidable (CRB p. 215). The difficulty the roller
 * changes by hand doesn't count, as the free effects of an implement (CRB pp. 218–219) are taken off it.
 */
export function canCheckEffect(spellDifficulty: number, effects: readonly CastEffect[], checked: readonly string[], effect: CastEffect) {
	return checked.includes(effect.id) || spellDifficulty + addedDifficulty(effects, checked) + effect.difficulty <= FORMIDABLE;
}

/**
 * The Additional Effects checked as the Dice Prompt opens: each that starts checked, in the spell's order, as long as it
 * keeps the difficulty within Formidable.
 */
export function initiallyCheckedEffects(spellDifficulty: number, effects: readonly CastEffect[]) {
	return effects.reduce<string[]>(
		(checked, effect) =>
			effect.startsChecked && canCheckEffect(spellDifficulty, effects, checked, effect) ? [...checked, effect.id] : checked,
		[],
	);
}

/**
 * The difficulty level of a spell cast with Additional Effects checked: its own, raised by theirs, never beyond
 * Formidable.
 */
export function castingDifficulty(spellDifficulty: number, effects: readonly CastEffect[], checked: readonly string[]) {
	return Math.min(spellDifficulty + addedDifficulty(effects, checked), FORMIDABLE);
}

/**
 * A quality an Additional Effect gives, as a card shows it: its rating is the caster's ranks in the effect's skill when
 * it counts them.
 */
type CastQuality = { name: string; description: string; isRated: boolean; rating: number };

/**
 * What a spell's card shows of its casting: the Additional Effects checked, with their qualities, and the strain the
 * caster suffers.
 */
export type SpellCast = {
	effects: { name: string; qualities: CastQuality[] }[];
	strain: number;
};

/**
 * What a spell cast with Additional Effects checked shows on its card, in the spell's order. A quality rated by the
 * caster's ranks in a skill takes them from `ranksIn`.
 */
export function spellCast(
	effects: readonly Pick<ContainedAdditionalEffect, 'id' | 'name' | 'qualities'>[],
	checked: readonly string[],
	ranksIn: (skill: string) => number,
): SpellCast {
	return {
		effects: effects
			.filter((effect) => checked.includes(effect.id))
			.map(({ name, qualities }) => ({ name, qualities: qualities.map((quality) => castQuality(quality, ranksIn)) })),
		strain: CASTING_STRAIN,
	};
}

function castQuality({ name, description, ratingSource, rating, ratingSkill }: SpellQuality, ranksIn: (skill: string) => number) {
	switch (ratingSource) {
		case 'unrated':
			return { name, description, isRated: false, rating: 0 };
		case 'fixed':
			return { name, description, isRated: true, rating };
		case 'skillRanks':
			return { name, description, isRated: true, rating: ranksIn(ratingSkill) };
	}
}
