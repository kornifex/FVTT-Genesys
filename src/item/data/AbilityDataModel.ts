import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { AbilityActivation, activationField } from '@/data/schemaFields';

/**
 * The data of an Ability.
 */
export abstract class AbilityDataModel extends BaseItemDataModel {
	/**
	 * Details on what is required to activate the Special Ability.
	 */
	abstract activation: AbilityActivation;

	static override defineSchema() {
		return {
			...super.defineSchema(),
			activation: activationField(),
		};
	}
}
