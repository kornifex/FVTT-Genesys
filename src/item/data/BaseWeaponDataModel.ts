import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import { baseProfileFields } from '@/item/data/WeaponProfileFields';
import type { RangeBand } from '@/item/Weapons';
import type { AbilityActivation } from '@/data/schemaFields';

/**
 * A quality as a weapon or an armor holds it: a copy of the quality item, with its rating. Its effects are the item's
 * own, tagged with its id.
 */
export type ContainedItemQuality = {
	/**
	 * The id that tags the quality's effects on the item, unique among the item's qualities. Empty for a copy stored
	 * before it had one, which has no effects yet.
	 */
	id: string;

	/**
	 * Quality's Display name
	 */
	name: string;

	/**
	 * HTML Descriptive text for the quality.
	 */
	description: string;

	/**
	 * Whether the quality always applies, or only once the attacker spends Advantage to trigger it.
	 */
	activation: AbilityActivation['type'];

	/**
	 * The Advantage an active quality costs to trigger.
	 */
	advantageCost: number;

	/**
	 * Whether the quality is Rated.
	 */
	isRated: boolean;

	/**
	 * Rating value for the item: what the item holds of the quality, plus what each of its attachments adds. An unrated
	 * quality reads as held once whatever its rating, which counts its holders the same way, so that removing the last
	 * one removes it.
	 */
	rating: number;

	/**
	 * What each attachment installed on the item added to the rating, by the attachment's id, which removing the
	 * attachment takes back. Empty for a quality of the item alone, and on an attachment item.
	 */
	attachmentRatings: AttachmentRating[];

	/**
	 * Whether the item holds the quality itself, rather than only through its attachments: a quality an attachment
	 * brought is not, until the table drops the quality on the item. Removing the attachments never takes away a quality
	 * the item holds, whatever rating the table typed for it.
	 */
	heldByItem: boolean;
};

/**
 * What an attachment installed on a weapon or an armor added to the rating of one of its qualities.
 */
export type AttachmentRating = {
	/**
	 * The id of the attachment among the item's attachments.
	 */
	attachment: string;
	rating: number;
};

/**
 * The data a character's weapon and a vehicle weapon share.
 */
export abstract class BaseWeaponDataModel extends EquipmentDataModel {
	/**
	 * Base damage for the weapon.
	 */
	abstract baseDamage: number;

	/**
	 * Critical value.
	 */
	abstract critical: number;

	/**
	 * Weapon's effective range.
	 */
	abstract range: RangeBand;

	/**
	 * Names of skills that can be used to wield the weapon.
	 */
	abstract skills: string[];

	/**
	 * Item qualities for the weapon.
	 */
	abstract qualities: ContainedItemQuality[];

	static override defineSchema() {
		return {
			...super.defineSchema(),
			// A weapon's own attack fields are its main Weapon Profile.
			...baseProfileFields(),
		};
	}
}
