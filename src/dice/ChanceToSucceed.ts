/** @file The chance that a dice pool succeeds, counted exactly over every way its dice can land, and how the dice prompt gets and shows it. */

// The dice prompt runs this module in a Web Worker, where there is no Foundry: it imports nothing that needs Foundry.

import { type DicePool, type DieName, hasSameChanceToSucceed } from '@/dice/DicePool';
import { DieFaces } from '@/dice/DieFaces';
import { symbolOfGlyph } from '@/dice/GenesysPoolModifications';
import { symbolsNetSuccesses } from '@/dice/GenesysSymbol';
import type { GenesysRollResults } from '@/dice/RollResults';

/**
 * The dice and symbols of a pool, as the worker receives them.
 */
export type ChancePool = Pick<DicePool, 'dice' | 'symbols'>;

/**
 * Successes left once the Failures cancel them out, on a die face.
 */
function faceNetSuccesses(face: string) {
	const symbols: ChancePool['symbols'] = {};
	for (const glyph of face) {
		const symbol = symbolOfGlyph(glyph);
		if (symbol) {
			symbols[symbol] = 1 + (symbols[symbol] ?? 0);
		}
	}
	return symbolsNetSuccesses(symbols);
}

/**
 * The chance, from 0 to 1, that a check rolling this pool succeeds: that its Successes outnumber its Failures. A
 * Proficiency die that explodes with a super characteristic counts as a plain one.
 */
export function chanceToSucceed({ dice, symbols }: ChancePool) {
	// How many of the ways the dice can land leave each number of net Successes. The counts stay integers, so the
	// chance is exact as long as they fit in a double.
	let outcomes = new Map([[symbolsNetSuccesses(symbols), 1]]);
	for (const [dieName, amount] of Object.entries(dice) as [DieName, number][]) {
		const faces = DieFaces[dieName].map(faceNetSuccesses);
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

/**
 * The chance, from 0 to 1, that a check succeeds, from the results of simulated rolls of its pool.
 */
export function simulatedChance(rolls: Pick<GenesysRollResults, 'netSuccess'>[]) {
	return rolls.filter(({ netSuccess }) => netSuccess > 0).length / rolls.length;
}

/**
 * A chance to succeed as the dice prompt shows it: a percentage with two decimals.
 */
export function formatChance(chance: number) {
	return (Math.round(chance * 10000) / 100).toFixed(2);
}

/**
 * How the chance to succeed is computed: exactly over every way the dice can land, or from simulated rolls.
 */
type ChanceMethod = 'permutation' | 'simulation';

/**
 * How the dice prompt gets the chance to succeed of its pool, from the pool it showed the chance of before: a pool
 * without dice is counted at once, whatever the method; the chance shown is kept when the pool has the same; any other
 * pool's chance is computed with the method the settings choose.
 */
export function chanceComputation(pool: DicePool, previousPool: DicePool, method: ChanceMethod): 'count' | 'unchanged' | ChanceMethod {
	if (Object.values(pool.dice).every((amount) => !amount)) {
		return 'count';
	}

	return hasSameChanceToSucceed(previousPool, pool) ? 'unchanged' : method;
}
