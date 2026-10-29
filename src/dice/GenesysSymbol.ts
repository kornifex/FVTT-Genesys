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
