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
 * What a weapon or an armor copies of an attachment item dropped on it, under the id given.
 */
export function attachmentCopy(
	id: string,
	{ name, system }: { name: string; system: Pick<ContainedAttachment, 'description' | 'hardPointsRequired'> },
): ContainedAttachment {
	return { id, name, description: system.description, hardPointsRequired: system.hardPointsRequired };
}

/**
 * The Hard Points an item's attachments take together.
 */
export function hardPointsTaken(attachments: readonly Pick<ContainedAttachment, 'hardPointsRequired'>[]) {
	return attachments.reduce((total, attachment) => total + attachment.hardPointsRequired, 0);
}
