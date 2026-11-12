/**
 * @file The attachments of a weapon or an armor: copied whole from an attachment item dropped on it, with its effects,
 * removed with them, and the Hard Points they take.
 */

/**
 * An attachment as a weapon or an armor holds it: a copy of the attachment item. Its effects are the item's own, tagged
 * with its id.
 */
export type ContainedAttachment = {
	/**
	 * The id that tags the attachment's effects on the item, unique among the item's attachments: the same attachment
	 * installed twice is two attachments.
	 */
	id: string;
	name: string;
	description: string;
	/**
	 * The Hard Points the attachment takes on the item (CRB p. 206).
	 */
	hardPointsRequired: number;
};

/**
 * The flag, in the `genesys` scope, that tags an effect of a weapon or an armor with the id of the attachment it belongs
 * to: removing the attachment removes it.
 */
export const ATTACHMENT_FLAG = 'attachment';

/**
 * What this module reads of an effect: its id and its flags.
 */
type TaggedEffect = { id: string | null; flags?: object };

/**
 * The id of the attachment an effect belongs to, or undefined when it belongs to none.
 */
export function attachmentIdOf(effect: Pick<TaggedEffect, 'flags'>): string | undefined {
	const id = (effect.flags as { genesys?: Record<string, unknown> } | undefined)?.genesys?.[ATTACHMENT_FLAG];
	return typeof id === 'string' && id !== '' ? id : undefined;
}

/**
 * What a weapon or an armor copies of an attachment item dropped on it, under the id given.
 */
export function attachmentCopy(
	id: string,
	{ name, system }: { name: string; system: Pick<ContainedAttachment, 'description' | 'hardPointsRequired'> },
): ContainedAttachment {
	return { id, name, description: system.description, hardPointsRequired: system.hardPointsRequired };
}

/**
 * The data of the effects a weapon or an armor creates for an attachment dropped on it: the attachment item's effects,
 * without their ids, tagged with the attachment's id on the weapon or armor. Each keeps whether it is disabled: a
 * modification option stays off until the table installs it.
 */
export function attachmentEffectsData<Data extends { _id?: unknown; flags?: object | null }>(effects: readonly Data[], id: string) {
	return effects.map(({ _id: _ignored, ...data }) => {
		const flags = (data.flags ?? {}) as { genesys?: object };
		return { ...data, flags: { ...flags, genesys: { ...flags.genesys, [ATTACHMENT_FLAG]: id } } };
	});
}

/**
 * The ids of an item's effects that belong to an attachment the item no longer holds, which go with it.
 */
export function orphanedAttachmentEffects(effects: Iterable<TaggedEffect>, attachments: readonly Pick<ContainedAttachment, 'id'>[]) {
	const ids = new Set(attachments.map((attachment) => attachment.id));
	return [...effects].flatMap((effect) => {
		const id = attachmentIdOf(effect);
		return effect.id && id && !ids.has(id) ? [effect.id] : [];
	});
}

/**
 * The Hard Points an item's attachments take together.
 */
export function hardPointsTaken(attachments: readonly Pick<ContainedAttachment, 'hardPointsRequired'>[]) {
	return attachments.reduce((total, attachment) => total + attachment.hardPointsRequired, 0);
}
