/** @file Installing an attachment dropped on a weapon or an armor: its copy and its qualities, then its effects. */

import type { GenesysItem } from '@/item/GenesysItem';
import type { AttachmentDataModel } from '@/item/data/AttachmentDataModel';
import type { ArmorDataModel } from '@/item/data/ArmorDataModel';
import type { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { ATTACHMENT_FLAG, attachmentCopy, attachmentQualitiesInstalled, type ContainedAttachment } from '@/item/data/Attachments';
import { effectTag, taggedEffectsData } from '@/item/data/EffectTags';
import { QUALITY_FLAG } from '@/item/data/Qualities';

/**
 * Installs an attachment item dropped on a weapon or an armor: its copy joins the item's attachments, even when the item
 * holds it already or has no Hard Points left, and its qualities join or raise those of every profile. Then its effects
 * become the item's own, tagged with the copy's id, and the effects of each quality it brought become those of the
 * quality's copy. A quality it raised brings none: the item already has that quality's effects.
 */
export async function installAttachment(item: GenesysItem<'weapon' | 'armor'>, dropped: GenesysItem) {
	// The sheet hands over an attachment item, which a generic GenesysItem doesn't say.
	const system = dropped.system as AttachmentDataModel;
	const copy = attachmentCopy(foundry.utils.randomID(), { name: dropped.name, system });
	const attachments: ContainedAttachment[] = [...item.system.attachments, copy];
	// The stored data, which the update copies whole: the prepared profiles hold the damage and Critical ratings the
	// item's Item Changes add. fvtt-types types `_source.system` loosely, not as the type's DataModel.
	const source = item._source.system as WeaponDataModel | ArmorDataModel;
	const { update, brought } = attachmentQualitiesInstalled(source, { id: copy.id, qualities: system.qualities }, () =>
		foundry.utils.randomID(),
	);
	await item.update({ system: { attachments, ...update } });

	const dropEffects = dropped.effects.map((effect) => effect.toObject());
	const effects = [
		...taggedEffectsData(
			dropEffects.filter((effect) => !effectTag(effect, QUALITY_FLAG)),
			ATTACHMENT_FLAG,
			copy.id,
		),
		...brought.flatMap(({ from, to }) =>
			taggedEffectsData(
				dropEffects.filter((effect) => effectTag(effect, QUALITY_FLAG) === from),
				QUALITY_FLAG,
				to,
			),
		),
	];
	if (effects.length > 0) {
		await item.createEmbeddedDocuments('ActiveEffect', effects);
	}
}
