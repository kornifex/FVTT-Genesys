/** @file Talents: the tier a talent's ranks are bought at, and the groups the Talents tab lists talents and abilities in. */

/**
 * The highest tier a talent can have (CRB p. 71-72).
 */
export const MAX_TIER = 5;

/**
 * The tiers a talent can have, from 1 to the highest.
 */
export const TIERS = Array.from({ length: MAX_TIER }, (_, index) => index + 1);

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

/**
 * What the grouping reads of a talent or an ability: its name, its activation, and its tier when it has one.
 */
type ListedTalent = { name: string; system: { activation: { type: 'active' | 'passive'; detail: string }; effectiveTier?: number } };

/**
 * The talents or abilities of the Talents tab, by activation: the active ones with no activation detail, those with one
 * under their detail, lowercased, and the passive ones.
 */
type TalentGroups<T extends ListedTalent> = {
	active: T[];
	activeByDetail: { detail: string; talents: T[] }[];
	passive: T[];
};

/**
 * Group talents or abilities by activation, each group by tier then by name in the game's language. An ability has no
 * tier, so abilities sort by name alone. The details of active ones come in the order of their first talent.
 */
export function talentGroups<T extends ListedTalent>(talents: T[], locale: string): TalentGroups<T> {
	const sorted = [...talents].sort(
		(left, right) =>
			(left.system.effectiveTier ?? 0) - (right.system.effectiveTier ?? 0) || left.name.localeCompare(right.name, locale),
	);

	const active: T[] = [];
	const byDetail = new Map<string, T[]>();
	for (const talent of sorted.filter((listed) => listed.system.activation.type === 'active')) {
		// The detail is typed by hand on each talent (Maneuver, Incidental…), so its case and surrounding spaces don't count.
		const detail = talent.system.activation.detail.trim().toLowerCase();
		if (detail === '') {
			active.push(talent);
		} else {
			byDetail.set(detail, [...(byDetail.get(detail) ?? []), talent]);
		}
	}

	return {
		active,
		activeByDetail: [...byDetail].map(([detail, detailed]) => ({ detail, talents: detailed })),
		passive: sorted.filter((talent) => talent.system.activation.type === 'passive'),
	};
}
