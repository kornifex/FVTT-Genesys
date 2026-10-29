/** @file The details of each die type, apart from the dice classes, which extend `foundry.dice.terms.Die`, so that a unit-tested module can import them. */

import type { DieCategory } from '@/dice/dice/GenesysDie';
import { DIE_GLYPHS } from '@/dice/GenesysPoolModifications';

/**
 * The details of a die type, which its dice class carries as static fields.
 */
type DieType = {
	/** The denomination Foundry rolls the die under. */
	DENOMINATION: string;
	/** The text glyph used to symbolize the die. */
	GLYPH: string;
	/** The format used when adding the die to a roll. */
	FORMULA: `d${string}`;
	/** The category to which the die belongs. */
	CATEGORY: DieCategory;
	/** The color glyph used to symbolize the die. */
	COLOR: string;
};

/**
 * The details of each die type.
 */
export const DieTypes = {
	Proficiency: { DENOMINATION: 'p', GLYPH: DIE_GLYPHS.Proficiency, FORMULA: 'dp', CATEGORY: 'positive', COLOR: 'Y' },
	Ability: { DENOMINATION: 'a', GLYPH: DIE_GLYPHS.Ability, FORMULA: 'da', CATEGORY: 'positive', COLOR: 'G' },
	Boost: { DENOMINATION: 'b', GLYPH: DIE_GLYPHS.Boost, FORMULA: 'db', CATEGORY: 'positive', COLOR: 'B' },

	Challenge: { DENOMINATION: 'c', GLYPH: DIE_GLYPHS.Challenge, FORMULA: 'dc', CATEGORY: 'negative', COLOR: 'R' },
	Difficulty: { DENOMINATION: 'i', GLYPH: DIE_GLYPHS.Difficulty, FORMULA: 'di', CATEGORY: 'negative', COLOR: 'P' },
	Setback: { DENOMINATION: 's', GLYPH: DIE_GLYPHS.Setback, FORMULA: 'ds', CATEGORY: 'negative', COLOR: 'K' },
} satisfies Record<string, DieType>;
