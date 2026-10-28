/** @file The faces of each die type, apart from the dice classes so that the chance worker can import them. */

import type { DieName } from '@/dice/DicePool';
import { GenesysDieFace } from '@/dice/GenesysSymbol';

// The dice classes extend `foundry.dice.terms.Die`, which doesn't exist in a Web Worker.

/**
 * The faces of each die type, as symbol glyphs.
 */
export const DieFaces = {
	Proficiency: [' ', 's', 's', 'ss', 'ss', 'a', 'sa', 'sa', 'sa', 'aa', 'aa', 't'],
	Ability: [' ', 's', 's', 'ss', 'a', 'a', 'sa', 'aa'],
	Boost: [' ', ' ', 's', 'sa', 'aa', 'a'],

	Challenge: [' ', 'f', 'f', 'ff', 'ff', 'h', 'h', 'fh', 'fh', 'hh', 'hh', 'd'],
	Difficulty: [' ', 'f', 'ff', 'h', 'h', 'h', 'hh', 'fh'],
	Setback: [' ', ' ', 'f', 'f', 'h', 'h'],
} satisfies Record<DieName, GenesysDieFace[]>;
