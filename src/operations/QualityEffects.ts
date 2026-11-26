/** @file The qualities of a weapon or an armor and their effects: copied from a quality item dropped on it, or added to one of its qualities. */

import type { GenesysItem } from '@/item/GenesysItem';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import type { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';
import { taggedEffectsData } from '@/item/data/EffectTags';
import { QUALITY_FLAG, qualityCopy, withQualityAdded } from '@/item/data/Qualities';
import { newEffectData } from '@/effects/NewEffect';

/**
 * Adds a quality item dropped on an item to the qualities given, the item's or those of one of its Weapon Profiles,
 * saved as the system update `update` builds from the new list, then copies the quality's effects onto the item. A drop
 * that changes nothing, a quality that isn't rated which the list holds, saves nothing.
 */
export async function addDroppedQuality(
	item: GenesysItem,
	dropped: GenesysItem,
	qualities: readonly ContainedItemQuality[],
	update: (qualities: ContainedItemQuality[]) => object,
) {
	// The sheet hands over a quality item, which a generic GenesysItem doesn't say.
	const copy = qualityCopy(foundry.utils.randomID(), { name: dropped.name, system: dropped.system as ItemQualityDataModel });
	const added = withQualityAdded(qualities, copy);
	if (added) {
		await item.update({ system: update(added) });
		await copyQualityEffects(item, dropped, added, copy.id);
	}
}

/**
 * Copies the effects of a quality item dropped on a weapon or an armor onto it, tagged with the id of the quality the
 * drop added, once the item's qualities hold it. A drop that only raised the rating of a quality the item had copies
 * none: the item already has that quality's effects.
 */
async function copyQualityEffects(item: GenesysItem, dropped: GenesysItem, qualities: readonly ContainedItemQuality[], id: string) {
	if (!qualities.some((quality) => quality.id === id)) {
		return;
	}

	const effects = taggedEffectsData(
		dropped.effects.map((effect) => effect.toObject()),
		QUALITY_FLAG,
		id,
	);
	if (effects.length > 0) {
		await item.createEmbeddedDocuments('ActiveEffect', effects);
	}
}

/**
 * Adds an effect to a quality of a weapon or an armor, named after the quality, which applies while the item does, and
 * opens its sheet: the item's Effects tab lists it, out of sight of the quality.
 */
export async function addQualityEffect(item: GenesysItem, quality: Pick<ContainedItemQuality, 'id' | 'name'>) {
	const data = { ...newEffectData(quality.name, 'passive'), flags: { genesys: { [QUALITY_FLAG]: quality.id } } };
	// A module's preCreate hook may refuse the effect, which Foundry returns no effect for.
	const [effect] = await item.createEmbeddedDocuments('ActiveEffect', [data as ActiveEffect.CreateData]);
	// The system's effect sheet is an ApplicationV2.
	await (effect?.sheet as foundry.applications.api.DocumentSheetV2.Any | null | undefined)?.render({ force: true });
}
