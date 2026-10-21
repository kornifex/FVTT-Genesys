/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @file The Talent Pyramid: a character must always have more talents of each tier than of the tier above it.
 */

/**
 * Number of talents counted at each tier, from 1 to 5.
 */
export type TalentPyramidTotals = Record<number, number>;

/**
 * What the Talent Pyramid needs to know about a talent.
 */
export type PyramidTalent = {
	tier: number;
	rank: number;
	effectiveTier: number;
};

/**
 * Count the talents at each tier. A ranked talent counts once at each tier its ranks have reached, and every rank bought
 * at tier 5 counts at tier 5.
 */
export function countTalentsPerTier(talents: PyramidTalent[]): TalentPyramidTotals {
	return talents.reduce(
		(accumulator, talent) => {
			const talentEffectiveTier = talent.effectiveTier;
			for (let k = talentEffectiveTier; k > 0; k--) {
				if (k === 5 && talentEffectiveTier === 5) {
					// If we want to count talents of tier 5 it requires that we consider the ranking of the talent if appropriate;
					// ranked talents that are at tier 5 remain at that tier for any future purchases.
					accumulator[k] += talent.rank - (talentEffectiveTier - talent.tier);
				} else if (talent.tier === k) {
					// Count the talent if it matches the desired tier.
					accumulator[k]++;
				} else if (talent.tier < k && talentEffectiveTier >= k) {
					// Count the talent if it's from a lower tier but it has been purchased enough times that at some point it was
					// considered as a talent of the desired tier.
					accumulator[k]++;
				}
			}
			return accumulator;
		},
		{
			'1': 0,
			'2': 0,
			'3': 0,
			'4': 0,
			'5': 0,
		} as TalentPyramidTotals,
	);
}

/**
 * The most talents the pyramid allows at a tier, given the talents of the tier below. Tier 1 has no limit.
 */
export function tierLimit(totals: TalentPyramidTotals, tier: number) {
	if (tier <= 1) {
		return Infinity;
	}

	return Math.max(0, totals[tier - 1] - 1);
}

/**
 * Whether a talent (or a rank of one) can be bought at a tier without breaking the pyramid.
 */
export function canAddTalentAtTier(totals: TalentPyramidTotals, tier: number) {
	return totals[tier] + 1 <= tierLimit(totals, tier);
}

/**
 * Whether a talent (or a rank of one) counted at a tier can be removed without breaking the pyramid above it.
 */
export function canRemoveTalentAtTier(totals: TalentPyramidTotals, tier: number) {
	if (tier >= 5) {
		return true;
	}

	const totalNextTier = totals[tier + 1];

	return totalNextTier === 0 || totalNextTier < totals[tier] - 1;
}
