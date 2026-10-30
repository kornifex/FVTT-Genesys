import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import { baseProfileFields } from '@/item/data/WeaponProfileFields';
import type { RangeBand } from '@/item/Weapons';

/**
 * A quality as a weapon or an armor holds it: a copy of the quality item, with its rating.
 */
export type ContainedItemQuality = {
	/**
	 * Quality's Display name
	 */
	name: string;

	/**
	 * HTML Descriptive text for the quality.
	 */
	description: string;

	/**
	 * Whether the quality is Rated.
	 */
	isRated: boolean;

	/**
	 * Rating value for the item.
	 */
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
