/** @file Tests for the glyph table of the pool modifications. */

import { describe, expect, it } from 'vitest';

import { GenesysPoolModifications, PoolModGlyphPattern, poolModificationStep, symbolOfGlyph } from '@/dice/GenesysPoolModifications';

const DIE_GLYPHS = ['P', 'A', 'B', 'C', 'D', 'S'];
const SYMBOL_GLYPHS = ['t', 's', 'a', 'd', 'f', 'h'];
const GRADE_GLYPHS = ['^', '_', '*', '~'];

describe('the glyph table', () => {
	it('lists the glyph of every die, symbol and grade operation, and the removal of every die and symbol', () => {
		const removals = [...DIE_GLYPHS, ...SYMBOL_GLYPHS].map((glyph) => `-${glyph}`);

		expect(Object.keys(GenesysPoolModifications).sort()).toEqual(
			[...DIE_GLYPHS, ...SYMBOL_GLYPHS, ...GRADE_GLYPHS, ...removals].sort(),
		);
	});

	it('upgrades an Ability die into a Proficiency die, and a Difficulty die into a Challenge die, and downgrades them back (CRB p. 22)', () => {
		expect(GenesysPoolModifications['^'].operation).toEqual({ kind: 'upgrade', from: 'Ability', to: 'Proficiency' });
		expect(GenesysPoolModifications['_'].operation).toEqual({ kind: 'downgrade', from: 'Proficiency', to: 'Ability' });
		expect(GenesysPoolModifications['*'].operation).toEqual({ kind: 'upgrade', from: 'Difficulty', to: 'Challenge' });
		expect(GenesysPoolModifications['~'].operation).toEqual({ kind: 'downgrade', from: 'Challenge', to: 'Difficulty' });
	});

	it('orders the steps as adding dice, upgrading, downgrading, removing dice, then adding and removing symbols (CRB p. 20-23)', () => {
		const steps = ['A', '^', '*', '_', '~', '-A', 'a', '-a'].map(poolModificationStep);

		expect(steps).toEqual([0, 1, 1, 2, 2, 3, 4, 5]);
	});

	it('tells the symbol a glyph stands for, and none for a die or a blank face', () => {
		expect(SYMBOL_GLYPHS.map(symbolOfGlyph)).toEqual(['Triumph', 'Success', 'Advantage', 'Despair', 'Failure', 'Threat']);
		expect(symbolOfGlyph('A')).toBeUndefined();
		expect(symbolOfGlyph(' ')).toBeUndefined();
	});
});

describe('PoolModGlyphPattern', () => {
	it('matches every glyph of the table, a removal as one glyph, and nothing else', () => {
		expect('PA-Sx^*-h~_ t?'.match(PoolModGlyphPattern)).toEqual(['P', 'A', '-S', '^', '*', '-h', '~', '_', 't']);
	});

	it('matches no removal of a grade operation', () => {
		expect('-^'.match(PoolModGlyphPattern)).toEqual(['^']);
	});
});
