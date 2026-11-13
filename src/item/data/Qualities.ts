/**
 * @file The qualities of a weapon or an armor: adding a dropped one with its effects, raising and changing its rating,
 * changing it, removing it with its effects.
 */

import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { withoutIndex } from '@/arrays';
import { effectTag } from '@/item/data/EffectTags';

/**
 * What identifies a quality by its name: the name without its surrounding spaces, whatever its case. Two qualities with
 * the same key are the same quality.
 */
export function qualityNameKey(name: string) {
	return name.trim().toLowerCase();
}

/**
 * The qualities with a quality item dropped on the weapon or armor: added at rating 1, or, when the item already has a
 * quality of that name, that quality's rating raised by 1. `undefined` when nothing changes, as dropping a quality
 * that isn't rated on an item that has it.
 */
export function withQualityAdded(
	qualities: readonly ContainedItemQuality[],
	added: Omit<ContainedItemQuality, 'rating'>,
): ContainedItemQuality[] | undefined {
	const index = qualities.findIndex((quality) => qualityNameKey(quality.name) === qualityNameKey(added.name));
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
 * The qualities with the one at an index changed. `undefined` when nothing changes.
 */
export function withQualityChanged(
	qualities: readonly ContainedItemQuality[],
	index: number,
	changes: Partial<ContainedItemQuality>,
): ContainedItemQuality[] | undefined {
	const quality = qualities[index];
	if (!quality || Object.entries(changes).every(([key, value]) => quality[key as keyof ContainedItemQuality] === value)) {
		return undefined;
	}

	return qualities.map((other, i) => (i === index ? { ...other, ...changes } : other));
}

/**
 * How a quality reads in a list: its name, followed by its rating when it is rated (`Vicious 2`).
 */
export function qualityLabel(quality: ContainedItemQuality) {
	return quality.isRated ? `${quality.name} ${quality.rating}` : quality.name;
}

/**
 * The flag, in the `genesys` scope, that tags an effect of a weapon or an armor with the id of the quality it belongs
 * to: the quality's rating scales it, and removing the quality removes it.
 */
export const QUALITY_FLAG = 'quality';

/**
 * What this module reads of an effect: its flags.
 */
type TaggedEffect = { flags?: object };

/**
 * What this module reads of a weapon's, a vehicle weapon's or an armor's data: its qualities, and a weapon's extra
 * Weapon Profiles with theirs. The data of any other item has neither.
 */
type QualitiesHolder = {
	qualities?: readonly ContainedItemQuality[];
	extraProfiles?: readonly { qualities: readonly ContainedItemQuality[] }[];
};

/**
 * Every quality of an item: those of its main profile, then those of its extra Weapon Profiles. None for an item that
 * holds no qualities.
 */
export function itemQualities(system: object): ContainedItemQuality[] {
	const holder = system as QualitiesHolder;
	return [...(holder.qualities ?? []), ...(holder.extraProfiles ?? []).flatMap((profile) => profile.qualities)];
}

/**
 * The quality of an item that an effect belongs to, or undefined when it belongs to none of the item's.
 */
export function effectQuality(effect: TaggedEffect, system: object | undefined): ContainedItemQuality | undefined {
	const id = effectTag(effect, QUALITY_FLAG);
	return id && system ? itemQualities(system).find((quality) => quality.id === id) : undefined;
}

/**
 * What this module reads of a quality to rank it.
 */
type RankedQuality = Pick<ContainedItemQuality, 'id' | 'name' | 'isRated' | 'rating'>;

/**
 * The rank a quality's effects count for: its rating when it is rated, one otherwise.
 */
export function qualityRank(quality: Pick<RankedQuality, 'isRated' | 'rating'>) {
	return quality.isRated ? quality.rating : 1;
}

/**
 * Whether a quality is outranked by a copy of it among some qualities, by name: a copy at a higher rank, or at the same
 * rank earlier in the list.
 */
export function isOutrankedQuality(quality: RankedQuality, qualities: readonly RankedQuality[]): boolean {
	const key = qualityNameKey(quality.name);
	const copies = qualities.filter((other) => qualityNameKey(other.name) === key);
	const highest = Math.max(...copies.map(qualityRank));
	return copies.find((copy) => qualityRank(copy) === highest)?.id !== quality.id;
}

/**
 * Whether an effect belongs to a quality whose copy on another Weapon Profile of the item, by name, outranks it: at a
 * higher rank, or at the same rank on an earlier profile. Outside the attacks made with its profile, a quality counts
 * once per weapon, at its highest rank (CRB pp. 86–89): Defensive 1 on two profiles of a shield raises melee defense by
 * one, not two. An armor's names are unique in its single list, so none of its qualities is outranked.
 */
export function isOutrankedQualityEffect(effect: TaggedEffect, system: object | undefined): boolean {
	const quality = effectQuality(effect, system);
	return !!quality && !!system && isOutrankedQuality(quality, itemQualities(system));
}

/**
 * What a weapon or an armor copies of a quality item dropped on it, but its rating, under the id given.
 */
export function qualityCopy(
	id: string,
	{ name, system }: { name: string; system: Pick<ContainedItemQuality, 'description' | 'activation' | 'advantageCost' | 'isRated'> },
): Omit<ContainedItemQuality, 'rating'> {
	return {
		id,
		name,
		description: system.description,
		activation: system.activation,
		advantageCost: system.advantageCost,
		isRated: system.isRated,
	};
}
