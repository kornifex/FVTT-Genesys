import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { AbilityActivation, ACTIVATION_TYPES, advantageCostField, choiceField } from '@/data/schemaFields';

/**
 * The data of a quality, which weapons and armor copy when it is dropped on them.
 */
export abstract class ItemQualityDataModel extends BaseItemDataModel {
	/**
	 * Whether the quality is passively applied or requires spending advantage.
	 */
	abstract activation: AbilityActivation['type'];

	/**
	 * Whether the ability has levels (e.g. "Vicious 3") or not.
	 */
	abstract isRated: boolean;

	/**
	 * The Advantage an active quality costs to trigger.
	 */
	abstract advantageCost: number;

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			activation: choiceField(ACTIVATION_TYPES, 'passive'),
			advantageCost: advantageCostField(),
			isRated: new fields.BooleanField({ initial: true }),
		};
	}
}
