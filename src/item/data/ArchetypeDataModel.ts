import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { CharacteristicsContainer } from '@/data/Characteristics';
import { characteristicsField } from '@/data/schemaFields';
import type { StoredItem } from '@/item/ItemTypes';

/**
 * The data of an Archetype: what it gives a character, and the items it grants.
 */
export abstract class ArchetypeDataModel extends BaseItemDataModel {
	/**
	 * Characteristics values granted by the Archetype.
	 */
	abstract characteristics: CharacteristicsContainer;

	/**
	 * Wound Threshold granted by the Archetype.
	 */
	abstract woundThreshold: number;

	/**
	 * Strain Threshold granted by the Archetype.
	 */
	abstract strainThreshold: number;

	/**
	 * Starting XP granted by the Archetype.
	 */
	abstract startingXP: number;

	/**
	 * Arbitrary items such as skills, talents, etc. granted by the archetype.
	 */
	abstract grantedItems: StoredItem[];

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			characteristics: characteristicsField(2),
			woundThreshold: new fields.NumberField({ initial: 10, integer: true }),
			strainThreshold: new fields.NumberField({ initial: 10, integer: true }),
			startingXP: new fields.NumberField({ initial: 100, integer: true }),
			grantedItems: new fields.ArrayField(new fields.ObjectField()),
		};
	}
}
