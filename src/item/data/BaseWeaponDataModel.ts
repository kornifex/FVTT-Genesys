import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import { choiceField, qualitiesField } from '@/data/schemaFields';
import { RangeBand, RANGES } from '@/item/Weapons';

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
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			baseDamage: new fields.NumberField({ initial: 0, integer: true }),
			critical: new fields.NumberField({ initial: 0, integer: true }),
			range: choiceField(RANGES, 'engaged'),
			skills: new fields.ArrayField(new fields.StringField()),
			qualities: qualitiesField(),
		};
	}
}
