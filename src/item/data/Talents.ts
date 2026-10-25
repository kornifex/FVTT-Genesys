/** @file Talents: the tier a talent's ranks are bought at. */

const MAX_TIER = 5;

/**
 * What this module reads of a talent: its own tier and its rank.
 */
type TieredTalent = { tier: number; rank: number };

/**
 * The tier the talent's latest rank was bought at. Each rank after the first is bought one tier higher, and a talent
 * stays at tier 5 once it reaches it.
 */
export function effectiveTier({ tier, rank }: TieredTalent) {
	return Math.min(MAX_TIER, tier + rank - 1);
}

/**
 * The tier the talent's next rank is bought at.
 */
export function effectiveNextTier({ tier, rank }: TieredTalent) {
	return Math.min(MAX_TIER, tier + rank);
}
