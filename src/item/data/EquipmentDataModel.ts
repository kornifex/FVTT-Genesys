/**
 * @file Base data model for Equipment-type Items.
 */

import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { EquipmentDamageState } from '@/item/data/EquipmentDamage';
import { EquipmentState } from '@/item/data/EquipmentState';

/**
 * The data of a piece of equipment, with its Equipment State: that of gear and consumables, and the base of the other
 * equipment.
 */
export abstract class EquipmentDataModel extends BaseItemDataModel {
	/**
	 * Rarity value for the item.
	 */
	abstract rarity: number;

	/**
	 * Encumbrance value for the item.
	 */
	abstract encumbrance: number;

	/**
	 * Price of the item (in generic Currency).
	 */
	abstract price: number;

	/**
	 * Damage state of the item.
	 */
	abstract damage: EquipmentDamageState;

	/**
	 * (Owned Only) Quantity of the item possessed.
	 */
	abstract quantity: number;

	/**
	 * (Owned Only) ID of the container the item is held in.
	 */
	abstract container: string;

	/**
	 * (Owned Only) State of the item (carried, dropped, or equipped)
	 */
	abstract state: EquipmentState;

	/**
	 * Read an item saved in the Used state as Carried: nothing in the system set it, and it is gone since #205
	 * (`.out-of-scope/using-consumables.md`), so only a macro or older data holds it, which would fail validation.
	 * @inheritDoc
	 */
	static override migrateData(source: { state?: unknown }) {
		if (source.state === 'used') {
			source.state = EquipmentState.Carried;
		}

		return super.migrateData(source) as typeof source;
	}

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			rarity: new fields.NumberField({ integer: true, initial: 0 }),
			encumbrance: new fields.NumberField({ integer: true, initial: 0 }),
			price: new fields.NumberField({ initial: 0 }),
			damage: new fields.StringField({
				initial: EquipmentDamageState.Undamaged,
				choices: Object.values(EquipmentDamageState),
			}),
			container: new fields.StringField({ initial: '' }),
			quantity: new fields.NumberField({ integer: true, initial: 1 }),
			state: new fields.StringField({
				initial: EquipmentState.Carried,
				choices: Object.values(EquipmentState),
			}),
		};
	}
}
