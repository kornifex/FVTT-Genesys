/** @file The results of a roll: the symbols of its faces counted, then netted against each other. */

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
	// Get symbols from the dice results.
	const results = Object.values(faces)
		.flatMap((v) => v)
		.flatMap((v) => v.split(''))
		.filter((v) => v !== ' ')
		.reduce(
			(results: Record<string, number>, result) => {
				results[result] += 1;

				return results;
			},
			{
				a: 0,
				s: 0,
				t: 0,
				h: 0,
				f: 0,
				d: 0,
			},
		);

	// Add extra symbols specified by the roll.
	if (extraSymbols) {
		for (const symbol of ['a', 's', 't', 'h', 'f', 'd']) {
			results[symbol] += extraSymbols[symbol] ?? 0;
		}
	}

	// Triumphs & Despairs add successes & failures.
	results['s'] += results['t'];
	results['f'] += results['d'];

	return {
		totalSuccess: results['s'],
		totalFailures: results['f'],
		totalAdvantage: results['a'],
		totalThreat: results['h'],
		totalTriumph: results['t'],
		totalDespair: results['d'],

		netSuccess: results['s'] - results['f'],
		netFailure: results['f'] - results['s'],
		netAdvantage: results['a'] - results['h'],
		netThreat: results['h'] - results['a'],

		faces,
		extraSymbols,
	};
}
