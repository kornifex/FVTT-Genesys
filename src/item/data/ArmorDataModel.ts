import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { hardPointsField, qualitiesField } from '@/data/schemaFields';

/**
 * The data of an armor.
 */
export abstract class ArmorDataModel extends EquipmentDataModel {
	/**
	 * Amount of Defense given by the item.
	 */
	abstract defense: number;

	/**
	 * Amount of Soak given by the item.
	 */
	abstract soak: number;

	/**
	 * Item qualities for the armor.
	 */
	abstract qualities: ContainedItemQuality[];

	/**
	 * The Hard Points the armor sets as an exception, `null` while it gets them from its encumbrance: read them with
	 * `hardPoints`.
	 */
	abstract hardPoints: number | null;

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			defense: new fields.NumberField({ integer: true, initial: 0 }),
			soak: new fields.NumberField({ integer: true, initial: 0 }),
			qualities: qualitiesField(),
			hardPoints: hardPointsField(),
		};
	}
}
