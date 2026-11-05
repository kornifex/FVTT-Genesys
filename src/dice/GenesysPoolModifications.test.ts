/** @file Tests for the glyph table of the pool modifications, and for the glyphs in words. */

import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

import {
	dieResultLabel,
	GenesysPoolModifications,
	glyphAttributesHTML,
	glyphCounts,
	glyphLabel,
	type GlyphLocalizer,
	PoolModGlyphPattern,
	poolModificationCounts,
	poolModificationLabel,
	poolModificationStep,
	symbolOfGlyph,
} from '@/dice/GenesysPoolModifications';

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

describe('glyphCounts', () => {
	it('counts each die and symbol once, in the order it first appears, a die by its uppercase glyph', () => {
		expect(glyphCounts('AsPAss')).toEqual([
			{ kind: 'die', name: 'Ability', count: 2 },
			{ kind: 'symbol', name: 'Success', count: 3 },
			{ kind: 'die', name: 'Proficiency', count: 1 },
		]);
	});

	it('counts a blank face once, and leaves out a glyph that stands for nothing', () => {
		expect(glyphCounts(' ')).toEqual([{ kind: 'blank' }]);
		expect(glyphCounts('1a2 3 ')).toEqual([{ kind: 'symbol', name: 'Advantage', count: 1 }, { kind: 'blank' }]);
		expect(glyphCounts('123')).toEqual([]);
	});
});

describe('poolModificationCounts', () => {
	it('counts the same operation on the same die or symbol once, in the order it first appears', () => {
		expect(poolModificationCounts(['A', '-s', 'A', '^', '-A'])).toEqual([
			{ operation: 'Add', target: { kind: 'die', name: 'Ability', count: 2 } },
			{ operation: 'Remove', target: { kind: 'symbol', name: 'Success', count: 1 } },
			{ operation: 'Upgrade', target: { kind: 'die', name: 'Ability', count: 1 } },
			{ operation: 'Remove', target: { kind: 'die', name: 'Ability', count: 1 } },
		]);
	});

	it('upgrades or downgrades the die each grade operation acts on', () => {
		expect(poolModificationCounts(['^', '_', '*', '~']).map(({ operation, target }) => [operation, target.name])).toEqual([
			['Upgrade', 'Ability'],
			['Downgrade', 'Proficiency'],
			['Upgrade', 'Difficulty'],
			['Downgrade', 'Challenge'],
		]);
	});

	it('leaves out a glyph that is no Pool Modification', () => {
		expect(poolModificationCounts(['x', '-^'])).toEqual([]);
	});
});

/**
 * The localization of a language file, as Foundry formats it: each `{name}` of a template replaced by its argument, the
 * plural rules and the narrow list formatter of the language.
 */
function localizer(lang: 'en' | 'fr'): GlyphLocalizer {
	const tree = load(readFileSync(`yaml/lang/${lang}.yml`, 'utf8'));
	const localize = (key: string) =>
		key.split('.').reduce((node: unknown, part) => (node as Record<string, unknown>)[part], tree) as string;

	return {
		localize,
		format: (key, data) => localize(key).replace(/{(\w+)}/g, (_, name: string) => data[name]),
		pluralRules: new Intl.PluralRules(lang),
		listFormatter: new Intl.ListFormat(lang, { style: 'narrow' }),
	};
}

const ALL_DICE = 'PABCDS';
const ALL_SYMBOLS = 'tsadfh';

describe('glyphLabel', () => {
	const en = localizer('en');
	const fr = localizer('fr');

	it('names every die and symbol in English, one and more of each', () => {
		expect(glyphLabel(ALL_DICE, en)).toBe(
			'1 Proficiency die, 1 Ability die, 1 Boost die, 1 Challenge die, 1 Difficulty die, 1 Setback die',
		);
		expect(glyphLabel(ALL_DICE + ALL_DICE, en)).toBe(
			'2 Proficiency dice, 2 Ability dice, 2 Boost dice, 2 Challenge dice, 2 Difficulty dice, 2 Setback dice',
		);
		expect(glyphLabel(ALL_SYMBOLS, en)).toBe('1 Triumph, 1 Success, 1 Advantage, 1 Despair, 1 Failure, 1 Threat');
		expect(glyphLabel(ALL_SYMBOLS + ALL_SYMBOLS, en)).toBe('2 Triumphs, 2 Successes, 2 Advantage, 2 Despair, 2 Failures, 2 Threat');
	});

	it('names every die and symbol in French, one and more of each', () => {
		expect(glyphLabel(ALL_DICE, fr)).toBe(
			"1 dé de maîtrise, 1 dé d'aptitude, 1 dé de fortune, 1 dé de défi, 1 dé de difficulté, 1 dé d'infortune",
		);
		expect(glyphLabel(ALL_DICE + ALL_DICE, fr)).toBe(
			"2 dés de maîtrise, 2 dés d'aptitude, 2 dés de fortune, 2 dés de défi, 2 dés de difficulté, 2 dés d'infortune",
		);
		expect(glyphLabel(ALL_SYMBOLS, fr)).toBe('1 triomphe, 1 succès, 1 avantage, 1 désastre, 1 échec, 1 menace');
		expect(glyphLabel(ALL_SYMBOLS + ALL_SYMBOLS, fr)).toBe('2 triomphes, 2 succès, 2 avantages, 2 désastres, 2 échecs, 2 menaces');
	});

	it('names a blank face', () => {
		expect(glyphLabel(' ', en)).toBe('Blank face');
		expect(glyphLabel(' ', fr)).toBe('face vierge');
	});

	it('is empty for glyphs that stand for nothing', () => {
		expect(glyphLabel('', en)).toBe('');
		expect(glyphLabel('123', en)).toBe('');
	});
});

describe('poolModificationLabel', () => {
	const en = localizer('en');
	const fr = localizer('fr');
	const operations = ['A', '-s', '^', '~'];

	it('words each operation in English', () => {
		expect(poolModificationLabel(operations, en)).toBe(
			'Add 1 Ability die, Remove 1 Success, Upgrade 1 Ability die, Downgrade 1 Challenge die',
		);
		expect(poolModificationLabel(['B', 'B', '-a', '-a'], en)).toBe('Add 2 Boost dice, Remove 2 Advantage');
	});

	it('words each operation in French', () => {
		expect(poolModificationLabel(operations, fr)).toBe(
			"Ajouter 1 dé d'aptitude, Retirer 1 succès, Améliorer 1 dé d'aptitude, Rétrograder 1 dé de défi",
		);
		expect(poolModificationLabel(['B', 'B', '-a', '-a'], fr)).toBe('Ajouter 2 dés de fortune, Retirer 2 avantages');
	});
});

describe('dieResultLabel', () => {
	it('names the die, then the symbols of its face or its blank face', () => {
		expect(dieResultLabel('Ability', 'sa', localizer('en'))).toBe('Ability Die: 1 Success, 1 Advantage');
		expect(dieResultLabel('Setback', ' ', localizer('en'))).toBe('Setback Die: Blank face');
		expect(dieResultLabel('Ability', 'ss', localizer('fr'))).toBe("Dé d'aptitude : 2 succès");
		expect(dieResultLabel('Setback', ' ', localizer('fr'))).toBe("Dé d'infortune : face vierge");
	});
});

describe('glyphAttributesHTML', () => {
	it('makes an image of the glyphs, labelled by the text that is also its tooltip', () => {
		expect(glyphAttributesHTML('1 Success')).toBe('role="img" aria-label="1 Success" data-tooltip=""');
	});

	it('escapes the label', () => {
		expect(glyphAttributesHTML(`1 dé d'aptitude <"&">`)).toBe(
			'role="img" aria-label="1 dé d&#39;aptitude &lt;&quot;&amp;&quot;&gt;" data-tooltip=""',
		);
	});

	it('gives no attribute for an empty label, which would name no image', () => {
		expect(glyphAttributesHTML('')).toBe('');
	});
});
