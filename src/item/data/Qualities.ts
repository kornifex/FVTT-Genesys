/**
 * @file The qualities of a weapon or an armor: adding a dropped one with its effects, raising and changing its rating,
 * changing it, removing it with its effects.
 */

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
 * What this module reads of an effect: its id and its flags.
 */
type TaggedEffect = { id: string | null; flags?: object };

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
 * The id of the quality an effect belongs to, or undefined when it belongs to none.
 */
export function qualityIdOf(effect: Pick<TaggedEffect, 'flags'>): string | undefined {
	const id = (effect.flags as { genesys?: Record<string, unknown> } | undefined)?.genesys?.[QUALITY_FLAG];
	return typeof id === 'string' && id !== '' ? id : undefined;
}

/**
 * The quality of an item that an effect belongs to, or undefined when it belongs to none of the item's.
 */
export function effectQuality(effect: Pick<TaggedEffect, 'flags'>, system: object | undefined): ContainedItemQuality | undefined {
	const id = qualityIdOf(effect);
	return id && system ? itemQualities(system).find((quality) => quality.id === id) : undefined;
}

/**
 * The ids of an item's effects that belong to a quality the item no longer holds, which go with it.
 */
export function orphanedQualityEffects(effects: Iterable<TaggedEffect>, system: object): string[] {
	const ids = new Set(itemQualities(system).map((quality) => quality.id));
	return [...effects].flatMap((effect) => {
		const id = qualityIdOf(effect);
		return effect.id && id && !ids.has(id) ? [effect.id] : [];
	});
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

/**
 * The data of the effects a weapon or an armor creates for a quality dropped on it: the quality item's effects, without
 * their ids, tagged with the quality's id on the weapon or armor.
 */
export function qualityEffectsData<Data extends { _id?: unknown; flags?: object | null }>(effects: readonly Data[], id: string) {
	return effects.map(({ _id: _ignored, ...data }) => {
		const flags = (data.flags ?? {}) as { genesys?: object };
		return { ...data, flags: { ...flags, genesys: { ...flags.genesys, [QUALITY_FLAG]: id } } };
	});
}
