/**
 * @file Spells and their Additional Effects (CRB pp. 210–219): the magic action a spell performs and what it fills, the
 * Additional Effects a spell holds, copied whole from the items dropped on it, and the qualities an Additional Effect
 * gives an attack.
 */

import type { AbilityActivation } from '@/data/schemaFields';
import { AVERAGE, EASY, HARD } from '@/dice/Difficulty';
import { qualityNameKey } from '@/item/data/Qualities';

/**
 * The magic actions of the Core Rulebook (CRB pp. 214–218), and Custom, a spell the table writes outside them.
 */
export const SPELL_ACTIONS = ['attack', 'augment', 'barrier', 'conjure', 'curse', 'dispel', 'heal', 'utility', 'custom'] as const;

/**
 * The magic action a spell performs.
 */
export type SpellAction = (typeof SPELL_ACTIONS)[number];

/**
 * The localization key of each magic action's name.
 */
export const SPELL_ACTION_LABELS: Record<SpellAction, string> = {
	attack: 'Genesys.SpellAction.Attack',
	augment: 'Genesys.SpellAction.Augment',
	barrier: 'Genesys.SpellAction.Barrier',
	conjure: 'Genesys.SpellAction.Conjure',
	curse: 'Genesys.SpellAction.Curse',
	dispel: 'Genesys.SpellAction.Dispel',
	heal: 'Genesys.SpellAction.Heal',
	utility: 'Genesys.SpellAction.Utility',
	custom: 'Genesys.SpellAction.Custom',
};

/**
 * What a magic action sets on a spell: its base difficulty, in Difficulty dice, whether it is an attack, and the magic
 * skills that may perform it.
 */
export type SpellActionDefaults = {
	difficulty: number;
	isAttack: boolean;
	skills: string[];
};

// Table III.2–2 and each action's own section (CRB pp. 214–218). The skills are the CRB's names, as the Skills Compendium
// it ships names them.
const ACTION_DEFAULTS: Record<Exclude<SpellAction, 'custom'>, SpellActionDefaults> = {
	attack: { difficulty: EASY, isAttack: true, skills: ['Arcana', 'Divine', 'Primal'] },
	augment: { difficulty: AVERAGE, isAttack: false, skills: ['Divine', 'Primal'] },
	barrier: { difficulty: EASY, isAttack: false, skills: ['Arcana', 'Divine'] },
	conjure: { difficulty: EASY, isAttack: false, skills: ['Arcana', 'Primal'] },
	curse: { difficulty: AVERAGE, isAttack: false, skills: ['Arcana', 'Divine'] },
	dispel: { difficulty: HARD, isAttack: false, skills: ['Arcana'] },
	heal: { difficulty: EASY, isAttack: false, skills: ['Divine', 'Primal'] },
	utility: { difficulty: EASY, isAttack: false, skills: ['Arcana', 'Divine', 'Primal'] },
};

/**
 * What picking a magic action changes on a spell: the action, and the difficulty, attack flag and skills the Core
 * Rulebook gives it, which the table may edit afterwards. Custom changes the action alone.
 */
export function withAction(action: SpellAction): { action: SpellAction } & Partial<SpellActionDefaults> {
	if (action === 'custom') {
		return { action };
	}

	const { difficulty, isAttack, skills } = ACTION_DEFAULTS[action];
	return { action, difficulty, isAttack, skills: [...skills] };
}

/**
 * Where a quality an Additional Effect gives gets its rating: none, a fixed one, or the caster's ranks in a skill, as
 * most of Table III.2–5 does with Knowledge (CRB p. 215).
 */
export const QUALITY_RATING_SOURCES = ['unrated', 'fixed', 'skillRanks'] as const;

/**
 * Where a quality an Additional Effect gives gets its rating.
 */
export type QualityRatingSource = (typeof QUALITY_RATING_SOURCES)[number];

/**
 * The skill a quality's rating counts the caster's ranks in, unless the table names another: Knowledge, as Table
 * III.2–5 does (CRB p. 215). Realms of Terrinoth names Knowledge (Lore).
 */
export const DEFAULT_RATING_SKILL = 'Knowledge';

/**
 * A quality an Additional Effect gives the attack, as the effect holds it: a copy of the quality item dropped on it,
 * with where its rating comes from.
 */
export type SpellQuality = {
	name: string;
	description: string;
	activation: AbilityActivation['type'];
	advantageCost: number;
	ratingSource: QualityRatingSource;
	/**
	 * The rating of a quality whose rating is fixed.
	 */
	rating: number;
	/**
	 * The skill whose ranks a quality's rating counts, when it counts the caster's ranks.
	 */
	ratingSkill: string;
};

/**
 * Where a quality's rating comes from, as casting reads it: only the field its source uses, the fixed rating or the skill
 * whose ranks it counts, and none other.
 */
type SpellQualityRating =
	| { ratingSource: 'unrated' }
	| { ratingSource: 'fixed'; rating: number }
	| { ratingSource: 'skillRanks'; ratingSkill: string };

/**
 * The rating of a stored quality, parsed: the stored shape keeps all its fields, whichever the source reads.
 */
export function spellQualityRating({ ratingSource, rating, ratingSkill }: SpellQuality): SpellQualityRating {
	switch (ratingSource) {
		case 'unrated':
			return { ratingSource };
		case 'fixed':
			return { ratingSource, rating };
		case 'skillRanks':
			return { ratingSource, ratingSkill };
	}
}

/**
 * The qualities of an Additional Effect with a quality item dropped on it: a rated quality counts the caster's ranks in
 * Knowledge, as Table III.2–5 does, an unrated one has no rating. `undefined` when the effect already gives a quality of
 * that name, whatever its case: an attack has each quality once.
 */
export function withSpellQualityAdded(
	qualities: readonly SpellQuality[],
	{
		name,
		system,
	}: { name: string; system: { description: string; activation: AbilityActivation['type']; advantageCost: number; isRated: boolean } },
): SpellQuality[] | undefined {
	if (qualities.some((quality) => qualityNameKey(quality.name) === qualityNameKey(name))) {
		return undefined;
	}

	return [
		...qualities,
		{
			name,
			description: system.description,
			activation: system.activation,
			advantageCost: system.advantageCost,
			ratingSource: system.isRated ? 'skillRanks' : 'unrated',
			rating: 1,
			ratingSkill: DEFAULT_RATING_SKILL,
		},
	];
}

/**
 * What an Additional Effect adds to a spell (CRB pp. 215–218): the difficulty it adds, whether it starts checked when the
 * spell is cast and whether it can be added more than once, and what it gives an attack.
 */
export type AdditionalEffectData = {
	description: string;
	/**
	 * The Difficulty dice the effect adds to the check.
	 */
	difficulty: number;
	/**
	 * Whether the effect starts checked when the spell is cast.
	 */
	startsChecked: boolean;
	/**
	 * Whether the caster may add the effect more than once, as Range says it may: any other is added once (CRB p. 215).
	 */
	repeatable: boolean;
	/**
	 * The qualities the effect gives an attack.
	 */
	qualities: SpellQuality[];
	/**
	 * The Critical rating the effect gives an attack, which has none of its own (CRB p. 215), or `null`: Deadly gives 2.
	 */
	critical: number | null;
	/**
	 * Whether an attack deals damage equal to twice the characteristic linked to its skill: Empowered.
	 */
	doublesDamageCharacteristic: boolean;
};

/**
 * An Additional Effect as a spell holds it: a copy of the Additional Effect item dropped on it.
 */
export type ContainedAdditionalEffect = AdditionalEffectData & {
	/**
	 * The id of the copy, unique among the spell's effects: the same effect dropped twice is held twice.
	 */
	id: string;
	name: string;
};

/**
 * What a spell copies of an Additional Effect item dropped on it, under the id given.
 */
export function additionalEffectCopy(
	id: string,
	{ name, system }: { name: string; system: AdditionalEffectData },
): ContainedAdditionalEffect {
	return {
		id,
		name,
		description: system.description,
		difficulty: system.difficulty,
		startsChecked: system.startsChecked,
		repeatable: system.repeatable,
		qualities: system.qualities.map((quality) => ({ ...quality })),
		critical: system.critical,
		doublesDamageCharacteristic: system.doublesDamageCharacteristic,
	};
}
