/** @file The effects of a weapon's or an armor's qualities: copied from a quality item dropped on it, or added to one of its qualities. */

import type { GenesysItem } from '@/item/GenesysItem';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { taggedEffectsData } from '@/item/data/EffectTags';
import { QUALITY_FLAG } from '@/item/data/Qualities';
import { newEffectData } from '@/effects/NewEffect';

/**
 * Copies the effects of a quality item dropped on a weapon or an armor onto it, tagged with the id of the quality the
 * drop added, once the item's qualities hold it. A drop that only raised the rating of a quality the item had copies
 * none: the item already has that quality's effects.
 */
export async function copyQualityEffects(item: GenesysItem, dropped: GenesysItem, qualities: readonly ContainedItemQuality[], id: string) {
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
 * Adds an effect to a quality of a weapon or an armor, named after the quality, which applies while the item does.
 */
export async function addQualityEffect(item: GenesysItem, quality: Pick<ContainedItemQuality, 'id' | 'name'>) {
	const data = { ...newEffectData(quality.name, 'passive'), flags: { genesys: { [QUALITY_FLAG]: quality.id } } };
	await item.createEmbeddedDocuments('ActiveEffect', [data as ActiveEffect.CreateData]);
}
