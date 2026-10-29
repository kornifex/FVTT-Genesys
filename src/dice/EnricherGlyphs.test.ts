/** @file Tests for the glyphs the `@dice` and `@pool` enrichers show. */

import { describe, expect, it } from 'vitest';
import { diceGlyphs, poolModificationIcons } from '@/dice/EnricherGlyphs';

describe('diceGlyphs', () => {
	it('reads the dice of their letters, in any case', () => {
		expect(diceGlyphs({ dice: 'apbDCs' })).toEqual(['A', 'P', 'B', 'D', 'C', 'S']);
	});

	it('reads a Difficulty die of an I, as its denomination spells it', () => {
		expect(diceGlyphs({ dice: 'Ii' })).toEqual(['D', 'D']);
	});

	it('reads the dice of their colour letters over die letters, in any case', () => {
		expect(diceGlyphs({ colors: 'gyBPrk', dice: 'A' })).toEqual(['A', 'P', 'B', 'D', 'C', 'S']);
	});

	it('reads no dice of no letters', () => {
		expect(diceGlyphs({})).toEqual([]);
	});
});

describe('poolModificationIcons', () => {
	it('shows each modification as the die or symbol it applies to, and its operation', () => {
		expect(poolModificationIcons('A-s^')).toEqual([
			{ className: 'die die-Ability', glyph: 'A', operator: 'fa-plus' },
			{ className: 'symbol', glyph: 's', operator: 'fa-minus' },
			{ className: 'die die-Ability', glyph: 'A', operator: 'fa-arrow-up' },
		]);
	});

	it('shows nothing of a glyph in the wrong case, whose case carries its meaning', () => {
		expect(poolModificationIcons('AT')).toBeUndefined();
	});
});
