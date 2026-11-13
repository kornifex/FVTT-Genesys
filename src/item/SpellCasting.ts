/**
 * @file Casting a spell (CRB pp. 210–215): the magic skill it is cast with, the Additional Effects the caster checks and
 * the difficulty they add, never beyond Formidable, the qualities they give, the strain casting costs, and the profile
 * of a magic attack.
 */

import { ownedSkill, type Skill } from '@/data/Skills';
import { FORMIDABLE } from '@/dice/Difficulty';
import type { ContainedAdditionalEffect, SpellQuality } from '@/item/data/Spells';
import type { DamageCharacteristic, RangeBand } from '@/item/Weapons';
import type { AttackProfile } from '@/item/WeaponProfiles';

/**
 * The strain a caster suffers once the check is resolved, whether it succeeds or not (CRB p. 210).
 */
const CASTING_STRAIN = 2;

/**
 * The range band of a magic attack's target, whose defense it meets: short, which the table may change with Range or
 * Close Combat (CRB p. 215).
 */
export const MAGIC_ATTACK_RANGE = 'short' satisfies RangeBand;

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
 * The levels of difficulty checking an Additional Effect adds to the level the roller has now: its own, as far as
 * Formidable lets it, and none from a level already at or beyond it (CRB p. 215). Unchecking the effect gives back
 * exactly these.
 */
export function difficultyAddedBy(level: number, effect: Pick<CastEffect, 'difficulty'>) {
	return Math.max(0, Math.min(level + effect.difficulty, FORMIDABLE) - level);
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

/**
 * The profile of a magic attack cast with Additional Effects checked (CRB p. 215): its damage adds the characteristic
 * linked to the skill rolled, twice with Empowered, to the spell's base damage, an implement's bonus; it has no Critical
 * rating, so only a Triumph inflicts a Critical Injury, unless an effect gives one, as Deadly does; its qualities are its
 * effects', a rating counted from the caster's ranks in its skill.
 */
export function spellAttackProfile(
	spell: { name: string; system: { baseDamage: number; additionalEffects: readonly ContainedAdditionalEffect[] } },
	checked: readonly string[],
	damageCharacteristic: DamageCharacteristic,
	ranksIn: (skill: string) => number,
): AttackProfile {
	const effects = spell.system.additionalEffects.filter((effect) => checked.includes(effect.id));
	// Of two effects that give a Critical rating, the lower one triggers more often.
	const criticals = effects.flatMap((effect) => effect.critical ?? []);

	return {
		attackName: spell.name,
		skills: [],
		baseDamage: spell.system.baseDamage,
		damageCharacteristic,
		doublesDamageCharacteristic: effects.some((effect) => effect.doublesDamageCharacteristic),
		critical: criticals.length > 0 ? Math.min(...criticals) : 0,
		range: MAGIC_ATTACK_RANGE,
		// The qualities an Additional Effect gives are copied without Active Effects (#704), so they have no id to tag any.
		qualities: effects.flatMap((effect) =>
			effect.qualities.map((quality) => ({
				...castQuality(quality, ranksIn),
				id: '',
				activation: quality.activation,
				advantageCost: quality.advantageCost,
			})),
		),
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
