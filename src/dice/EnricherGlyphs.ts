/** @file The glyphs the `@dice` and `@pool` enrichers show, parsed from the text they enrich. */

import { DieTypes } from '@/dice/DieTypes';
import { GenesysPoolModifications, PoolModGlyphPattern } from '@/dice/GenesysPoolModifications';
import { isPoolModificationValue } from '@/effects/PoolModifications';

/**
 * The letters of a `@dice` enricher: die letters, or die colour letters.
 */
export type DiceLetters = { dice?: string; colors?: string };

// A die letter is its glyph, or its denomination: a Difficulty die rolls as `di`.
const GLYPH_OF_LETTER: Record<string, string> = Object.fromEntries(
	Object.values(DieTypes).flatMap(({ GLYPH, DENOMINATION }) => [
		[GLYPH, GLYPH],
		[DENOMINATION.toUpperCase(), GLYPH],
	]),
);

const GLYPH_OF_COLOR: Record<string, string> = Object.fromEntries(Object.values(DieTypes).map(({ GLYPH, COLOR }) => [COLOR, GLYPH]));

function glyphsOf(letters: string, glyphOfLetter: Record<string, string>) {
	return letters
		.toUpperCase()
		.split('')
		.map((letter) => glyphOfLetter[letter] ?? letter);
}

/**
 * The glyphs of the dice a `@dice` enricher shows, from its colour letters if it has any.
 */
export function diceGlyphs({ dice = '', colors }: DiceLetters): string[] {
	return colors ? glyphsOf(colors, GLYPH_OF_COLOR) : glyphsOf(dice, GLYPH_OF_LETTER);
}

/**
 * How a `@pool` enricher shows a pool modification: its die or symbol, and the Font Awesome icon of its operation.
 */
export type PoolModificationIcon = { className: string; glyph: string; operator: string };

/**
 * The icons of the pool modifications a `@pool` enricher shows. Undefined when a glyph isn't one, as in the wrong case:
 * the enricher matches its prefix in any case, but a glyph's case carries its meaning (`A` an Ability die, `a` an
 * Advantage).
 */
export function poolModificationIcons(glyphs: string): PoolModificationIcon[] | undefined {
	if (!isPoolModificationValue(glyphs)) {
		return undefined;
	}

	return (glyphs.match(PoolModGlyphPattern) ?? []).map((glyph) => {
		const { icon } = GenesysPoolModifications[glyph];
		return {
			className: icon.baseType === 'dice' ? `die die-${icon.baseName}` : 'symbol',
			glyph: icon.baseGlyph,
			operator: icon.operator,
		};
	});
}
