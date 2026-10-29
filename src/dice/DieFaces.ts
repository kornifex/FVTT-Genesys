/** @file The faces of each die type, apart from the dice classes so that the chance worker can import them. */

import type { DieName, SymbolName } from '@/dice/DicePool';
import { BLANK_FACE, SYMBOL_GLYPHS } from '@/dice/GenesysPoolModifications';

// The dice classes extend `foundry.dice.terms.Die`, which doesn't exist in a Web Worker.

/**
 * The symbols on each face of each die type (CRB p. 10).
 */
const FACE_SYMBOLS: Record<DieName, SymbolName[][]> = {
	Proficiency: [
		[],
		['Success'],
		['Success'],
		['Success', 'Success'],
		['Success', 'Success'],
		['Advantage'],
		['Success', 'Advantage'],
		['Success', 'Advantage'],
		['Success', 'Advantage'],
		['Advantage', 'Advantage'],
		['Advantage', 'Advantage'],
		['Triumph'],
	],
	Ability: [
		[],
		['Success'],
		['Success'],
		['Success', 'Success'],
		['Advantage'],
		['Advantage'],
		['Success', 'Advantage'],
		['Advantage', 'Advantage'],
	],
	Boost: [[], [], ['Success'], ['Success', 'Advantage'], ['Advantage', 'Advantage'], ['Advantage']],

	Challenge: [
		[],
		['Failure'],
		['Failure'],
		['Failure', 'Failure'],
		['Failure', 'Failure'],
		['Threat'],
		['Threat'],
		['Failure', 'Threat'],
		['Failure', 'Threat'],
		['Threat', 'Threat'],
		['Threat', 'Threat'],
		['Despair'],
	],
	Difficulty: [[], ['Failure'], ['Failure', 'Failure'], ['Threat'], ['Threat'], ['Threat'], ['Threat', 'Threat'], ['Failure', 'Threat']],
	Setback: [[], [], ['Failure'], ['Failure'], ['Threat'], ['Threat']],
};

/**
 * The faces of each die type, as the glyphs of their symbols.
 */
export const DieFaces = Object.fromEntries(
	Object.entries(FACE_SYMBOLS).map(([die, faces]) => [
		die,
		faces.map((symbols) => symbols.map((symbol) => SYMBOL_GLYPHS[symbol]).join('') || BLANK_FACE),
	]),
) as Record<DieName, string[]>;
