/** @file The symbols of the dice, and how they count towards a check's success. */

import { SYMBOL_GLYPHS } from '@/dice/GenesysPoolModifications';

export const GenesysSymbol = {
	Triumph: {
		GLYPH: SYMBOL_GLYPHS.Triumph,
		CATEGORY: 'positive',
	},
	Success: {
		GLYPH: SYMBOL_GLYPHS.Success,
		CATEGORY: 'positive',
	},
	Advantage: {
		GLYPH: SYMBOL_GLYPHS.Advantage,
		CATEGORY: 'positive',
	},

	Despair: {
		GLYPH: SYMBOL_GLYPHS.Despair,
		CATEGORY: 'negative',
	},
	Failure: {
		GLYPH: SYMBOL_GLYPHS.Failure,
		CATEGORY: 'negative',
	},
	Threat: {
		GLYPH: SYMBOL_GLYPHS.Threat,
		CATEGORY: 'negative',
	},
} as const;

/**
 * Counts of symbols, by name. A missing symbol counts as none.
 */
type SymbolCounts = Partial<Record<keyof typeof GenesysSymbol, number>>;

/**
 * The Successes and Failures a set of symbols counts: a Triumph also counts as a Success, and a Despair as a Failure
 * (CRB p. 12).
 */
export function countedSuccessesAndFailures(symbols: SymbolCounts) {
	return {
		successes: (symbols.Success ?? 0) + (symbols.Triumph ?? 0),
		failures: (symbols.Failure ?? 0) + (symbols.Despair ?? 0),
	};
}

/**
 * The Successes of a set of symbols left once its Failures cancel them out, negative when the Failures outnumber them.
 */
export function symbolsNetSuccesses(symbols: SymbolCounts) {
	const { successes, failures } = countedSuccessesAndFailures(symbols);
	return successes - failures;
}
