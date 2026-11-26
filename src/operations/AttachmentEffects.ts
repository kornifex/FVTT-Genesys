/**
 * @file Installing an attachment dropped on a weapon or an armor: its copy and its qualities, then its effects. And the
 * qualities the installed attachments give a Weapon Profile added after them.
 */

import type { GenesysItem } from '@/item/GenesysItem';
import type { AttachmentDataModel } from '@/item/data/AttachmentDataModel';
import type { ArmorDataModel } from '@/item/data/ArmorDataModel';
import type { WeaponDataModel } from '@/item/data/WeaponDataModel';
import {
	ATTACHMENT_FLAG,
	attachmentCopy,
	attachmentQualitiesInstalled,
	attachmentQualitiesOfNewProfile,
	type ContainedAttachment,
} from '@/item/data/Attachments';
import { effectTag, taggedEffectsData } from '@/item/data/EffectTags';
import { QUALITY_FLAG } from '@/item/data/Qualities';
import { addExtraProfileUpdate } from '@/item/WeaponProfiles';

/**
 * The data of the effects of the quality copies given, from the id of the copy whose effects are copied, among the
 * effects given, to that of the copy that gains them.
 */
function qualityEffectsCopied<Data extends { _id?: unknown; flags?: object }>(
	effects: readonly Data[],
	copied: readonly { from: string; to: string }[],
) {
	return copied.flatMap(({ from, to }) =>
		taggedEffectsData(
			effects.filter((effect) => effectTag(effect, QUALITY_FLAG) === from),
			QUALITY_FLAG,
			to,
		),
	);
}

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
		...qualityEffectsCopied(dropEffects, brought),
	];
	if (effects.length > 0) {
		await item.createEmbeddedDocuments('ActiveEffect', effects);
	}
}

/**
 * Adds an extra profile to a weapon, which its installed attachments give what they give every profile: each quality
 * they raise on the main profile, at what they add, with a copy of its effects. Removing the attachments takes it back
 * as from any other profile.
 */
export async function addExtraProfile(weapon: GenesysItem<'weapon'>) {
	// The stored data, which the update copies whole: the prepared profiles hold the damage and Critical ratings the
	// weapon's Item Changes add. fvtt-types types `_source.system` loosely, not as the type's DataModel.
	const source = weapon._source.system as WeaponDataModel;
	const { qualities, copied } = attachmentQualitiesOfNewProfile(source.qualities, () => foundry.utils.randomID());
	await weapon.update({ system: addExtraProfileUpdate(source, qualities) });

	const effects = qualityEffectsCopied(
		weapon.effects.map((effect) => effect.toObject()),
		copied,
	);
	if (effects.length > 0) {
		await weapon.createEmbeddedDocuments('ActiveEffect', effects);
	}
}
