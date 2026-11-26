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
 * How a talent's ranks scale its effects: once per rank (`yes`), once (`no`), or, for its Pool Modifications, as many
 * times as the roller chooses for each check, up to its rank (`upTo`), as Rapid Reaction adds up to its ranks in
 * Successes for as much strain (CRB p. 74).
 */
export const RANK_SCALINGS = ['yes', 'no', 'upTo'] as const;

/**
 * The data of an item of any type, which only a talent fills the rank fields of.
 */
export type RankedSystem = object & { ranked?: 'yes' | 'no'; rank?: number; scalesWithRank?: (typeof RANK_SCALINGS)[number] };

// How a talent's ranks scale its effects: only a ranked talent's do. The sheet hides the choice once the talent is made
// unranked, but keeps the value set before, which then no longer applies.
function rankScaling(item: { system: RankedSystem } | undefined) {
	return item?.system.ranked === 'yes' ? item.system.scalesWithRank : undefined;
}

/**
 * How many times a talent's Critical Injury and healing changes count: once per rank when the talent is ranked and
 * scales with rank, or up to it, once otherwise, and for an item that is no talent.
 */
export function scalingRank(item: { system: RankedSystem } | undefined) {
	const scaling = rankScaling(item);
	return scaling === 'yes' || scaling === 'upTo' ? item?.system.rank ?? 1 : 1;
}

/**
 * How many times a talent's Pool Modifications count: a number of times its ranks fix (`times`), once per rank when the
 * talent is ranked and scales with rank, once otherwise, and for an item that is no talent; or, for a ranked talent
 * counted up to its rank, as many times as the roller chooses, from 0 up to its rank (`upTo`).
 */
export function poolModificationCount(item: { system: RankedSystem } | undefined): { times: number } | { upTo: number } {
	return rankScaling(item) === 'upTo' ? { upTo: item?.system.rank ?? 1 } : { times: scalingRank(item) };
}

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
