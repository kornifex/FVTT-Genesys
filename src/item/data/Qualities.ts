/** @file The qualities of a weapon or an armor: adding a dropped one, raising and changing its rating, removing it. */

import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { withoutIndex } from '@/arrays';

/**
 * The qualities with a quality item dropped on the weapon or armor: added at rating 1, or, when the item already has a
 * quality of that name, that quality's rating raised by 1. `undefined` when nothing changes, as dropping a quality
 * that isn't rated on an item that has it.
 */
export function withQualityAdded(
	qualities: readonly ContainedItemQuality[],
	added: Omit<ContainedItemQuality, 'rating'>,
): ContainedItemQuality[] | undefined {
	const index = qualities.findIndex((quality) => quality.name.toLowerCase() === added.name.toLowerCase());
	if (index < 0) {
		return [...qualities, { ...added, rating: 1 }];
	}
	if (!qualities[index].isRated) {
		return undefined;
	}

	return qualities.map((quality, i) => (i === index ? { ...quality, rating: quality.rating + 1 } : quality));
}

/**
 * The qualities with a new rating typed for the one at an index: a rating of 0 or less removes the quality. `undefined`
 * when nothing changes: the rating is the current one, or not a number.
 */
export function withQualityRating(
	qualities: readonly ContainedItemQuality[],
	index: number,
	rating: number,
): ContainedItemQuality[] | undefined {
	if (rating <= 0) {
		return withoutIndex(qualities, index);
	}
	if (isNaN(rating) || qualities[index].rating === rating) {
		return undefined;
	}

	return qualities.map((quality, i) => (i === index ? { ...quality, rating } : quality));
}

/**
 * How a quality reads in a list: its name, followed by its rating when it is rated (`Vicious 2`).
 */
export function qualityLabel(quality: ContainedItemQuality) {
	return quality.isRated ? `${quality.name} ${quality.rating}` : quality.name;
}
