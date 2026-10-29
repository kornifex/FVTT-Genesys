/** @file The results of a roll: the symbols of its faces counted, then netted against each other, and what a check's card shows of them. */

import type { SymbolName } from '@/dice/DicePool';
import { SYMBOL_GLYPHS, symbolOfGlyph } from '@/dice/GenesysPoolModifications';
import { countedSuccessesAndFailures } from '@/dice/GenesysSymbol';

export type GenesysRollResults = {
	/**
	 * Total number of successes that were rolled, including the one added by Triumphs. Always >= 0.
	 */
	totalSuccess: number;

	/**
	 * Total number of failures that were rolled, including the one added by Despairs. Always >= 0.
	 */
	totalFailures: number;

	/**
	 * Total number of advantages that were rolled. Always >= 0.
	 */
	totalAdvantage: number;

	/**
	 * Total number of threats that were rolled. Always >= 0.
	 */
	totalThreat: number;

	/**
	 * Total number of triumphs that were rolled. Always >= 0.
	 */
	totalTriumph: number;

	/**
	 * Total number of despairs that were rolled. Always >= 0.
	 */
	totalDespair: number;

	/**
	 * Number of successes left over in the roll after cancelling out with failures. May be negative if there were more failures.
	 */
	netSuccess: number;

	/**
	 * Number of failures left over in the roll after cancelling out with successes. May be negative if there were more successes.
	 */
	netFailure: number;

	/**
	 * Number of advantages left over in the roll after cancelling out with threats. May be negative if there were more threats.
	 */
	netAdvantage: number;

	/**
	 * Number of threats left over in the roll after cancelling out with advantages. May be negative if there were more advantages.
	 */
	netThreat: number;

	/**
	 * A map of die type to all the result faces from the roll.
	 */
	faces: Record<string, string[]>;

	/**
	 * Extra symbols added to the roll.
	 */
	extraSymbols: Record<string, number>;
};

/**
 * The results of a roll, from the faces rolled by each die type and the extra symbols added to the roll.
 */
export function rollResults(faces: Record<string, string[]>, extraSymbols: Record<string, number>): GenesysRollResults {
	const counts: Record<SymbolName, number> = { Triumph: 0, Success: 0, Advantage: 0, Despair: 0, Failure: 0, Threat: 0 };

	// Count the symbols of the faces rolled, ignoring the blank ones.
	for (const glyph of Object.values(faces).flat().join('')) {
		const symbol = symbolOfGlyph(glyph);
		if (symbol) {
			counts[symbol] += 1;
		}
	}

	// Add the extra symbols of the roll.
	for (const [glyph, amount] of Object.entries(extraSymbols ?? {})) {
		const symbol = symbolOfGlyph(glyph);
		if (symbol) {
			counts[symbol] += amount ?? 0;
		}
	}

	const { successes, failures } = countedSuccessesAndFailures(counts);

	return {
		totalSuccess: successes,
		totalFailures: failures,
		totalAdvantage: counts.Advantage,
		totalThreat: counts.Threat,
		totalTriumph: counts.Triumph,
		totalDespair: counts.Despair,

		netSuccess: successes - failures,
		netFailure: failures - successes,
		netAdvantage: counts.Advantage - counts.Threat,
		netThreat: counts.Threat - counts.Advantage,

		faces,
		extraSymbols,
	};
}

/**
 * The localization key of the label of each symbol a check's card sums up, in the order the card shows them.
 */
const SUMMARY_LABELS = {
	Success: 'Genesys.Rolls.Summary.Successes',
	Failure: 'Genesys.Rolls.Summary.Failures',
	Advantage: 'Genesys.Rolls.Summary.Advantage',
	Threat: 'Genesys.Rolls.Summary.Threat',
	Triumph: 'Genesys.Rolls.Summary.Triumph',
	Despair: 'Genesys.Rolls.Summary.Despair',
} as const satisfies Record<SymbolName, string>;

type CardSymbol = (typeof SYMBOL_GLYPHS)[SymbolName];

/**
 * What a check's chat card shows of the results of its roll.
 */
export type CardResults = {
	/** The symbols of the card's results row, in the order it shows them. */
	symbols: CardSymbol[];
	/** The lines of the card's summary: each symbol left over, with the localization key of its label and its count. */
	summary: { symbol: CardSymbol; label: (typeof SUMMARY_LABELS)[SymbolName]; count: number }[];
	/** Whether the check succeeded: at least one Success is left over (CRB p. 23). */
	succeeded: boolean;
};

/**
 * The results of a check's roll, as its chat card shows them.
 */
export function cardResults(results: GenesysRollResults): CardResults {
	// The count the summary shows of each symbol, and the count the results row shows. A Triumph counts as a Success that
	// the summary counts, but the row shows the Triumph alone in its place, and likewise a Despair among the Failures.
	const counts: Record<SymbolName, { summary: number; row: number }> = {
		Success: { summary: results.netSuccess, row: results.netSuccess - results.totalTriumph },
		Failure: { summary: results.netFailure, row: results.netFailure - results.totalDespair },
		Advantage: { summary: results.netAdvantage, row: results.netAdvantage },
		Threat: { summary: results.netThreat, row: results.netThreat },
		Triumph: { summary: results.totalTriumph, row: results.totalTriumph },
		Despair: { summary: results.totalDespair, row: results.totalDespair },
	};
	const symbols = Object.keys(SUMMARY_LABELS) as (keyof typeof SUMMARY_LABELS)[];

	return {
		symbols: symbols.flatMap((symbol) => Array<CardSymbol>(Math.max(counts[symbol].row, 0)).fill(SYMBOL_GLYPHS[symbol])),
		summary: symbols
			.filter((symbol) => counts[symbol].summary > 0)
			.map((symbol) => ({ symbol: SYMBOL_GLYPHS[symbol], label: SUMMARY_LABELS[symbol], count: counts[symbol].summary })),
		succeeded: results.netSuccess > 0,
	};
}

/**
 * Whether an attack's card shows its damage and critical: when the attack succeeds, or on a failure when the world
 * setting shows them on failure.
 */
export function showsAttackDetails(card: CardResults, showOnFailure: boolean): boolean {
	return card.succeeded || showOnFailure;
}
