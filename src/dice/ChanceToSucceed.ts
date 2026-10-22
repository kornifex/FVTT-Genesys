/** @file The chance that a dice pool succeeds, counted exactly over every way its dice can land. */

// The dice prompt runs this module in a Web Worker, where there is no Foundry: it imports nothing that needs Foundry.

import type { DicePool, DieName, SymbolName } from '@/dice/DicePool';
import { DieFaces } from '@/dice/DieFaces';
import { GenesysSymbol } from '@/dice/GenesysSymbol';

/**
 * The dice and symbols of a pool, as the worker receives them.
 */
export type ChancePool = Pick<DicePool, 'dice' | 'symbols'>;

// A Triumph also counts as a Success, and a Despair as a Failure.
const SUCCESS_GLYPHS: string[] = [GenesysSymbol.Success.GLYPH, GenesysSymbol.Triumph.GLYPH];
const FAILURE_GLYPHS: string[] = [GenesysSymbol.Failure.GLYPH, GenesysSymbol.Despair.GLYPH];

/**
 * Successes left once the Failures cancel them out, on a die face.
 */
function netSuccesses(face: string) {
	return [...face].reduce((net, glyph) => net + Number(SUCCESS_GLYPHS.includes(glyph)) - Number(FAILURE_GLYPHS.includes(glyph)), 0);
}

/**
 * The chance, from 0 to 1, that a check rolling this pool succeeds: that its Successes outnumber its Failures. A
 * Proficiency die that explodes with a super characteristic counts as a plain one.
 */
export function chanceToSucceed({ dice, symbols }: ChancePool) {
	let symbolsNet = 0;
	for (const [symbolName, amount] of Object.entries(symbols) as [SymbolName, number][]) {
		symbolsNet += amount * netSuccesses(GenesysSymbol[symbolName].GLYPH);
	}

	// How many of the ways the dice can land leave each number of net Successes. The counts stay integers, so the
	// chance is exact as long as they fit in a double.
	let outcomes = new Map([[symbolsNet, 1]]);
	for (const [dieName, amount] of Object.entries(dice) as [DieName, number][]) {
		const faces = DieFaces[dieName].map(netSuccesses);
		for (let die = 0; die < amount; die++) {
			const rolled = new Map<number, number>();
			for (const [net, count] of outcomes) {
				for (const face of faces) {
					rolled.set(net + face, count + (rolled.get(net + face) ?? 0));
				}
			}
			outcomes = rolled;
		}
	}

	let total = 0;
	let successes = 0;
	for (const [net, count] of outcomes) {
		total += count;
		if (net > 0) {
			successes += count;
		}
	}

	return successes / total;
}
