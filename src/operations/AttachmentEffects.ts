/** @file Installing an attachment dropped on a weapon or an armor: its copy, then its effects. */

import type { GenesysItem } from '@/item/GenesysItem';
import type { AttachmentDataModel } from '@/item/data/AttachmentDataModel';
import { attachmentCopy, attachmentEffectsData, type ContainedAttachment } from '@/item/data/Attachments';

/**
 * Installs an attachment item dropped on a weapon or an armor: its copy joins the item's attachments, even when the item
 * holds it already or has no Hard Points left, then its effects become the item's own, tagged with the copy's id.
 */
export async function installAttachment(item: GenesysItem<'weapon' | 'armor'>, dropped: GenesysItem) {
	const copy = attachmentCopy(foundry.utils.randomID(), { name: dropped.name, system: dropped.system as AttachmentDataModel });
	const attachments: ContainedAttachment[] = [...item.system.attachments, copy];
	await item.update({ system: { attachments } });

	const effects = attachmentEffectsData(
		dropped.effects.map((effect) => effect.toObject()),
		copy.id,
	);
	if (effects.length > 0) {
		await item.createEmbeddedDocuments('ActiveEffect', effects);
	}
}
