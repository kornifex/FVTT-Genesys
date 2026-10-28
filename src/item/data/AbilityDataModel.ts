import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';

interface AbilityActivation {
	type: 'passive' | 'active';
	detail: string;
}

export abstract class AbilityDataModel extends BaseItemDataModel {
	/**
	 * Details on what is required to activate the Special Ability.
	 */
	abstract activation: AbilityActivation;

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			activation: new fields.SchemaField({
				type: new fields.StringField({
					choices: ['passive', 'active'],
					initial: 'passive',
				}),
				detail: new fields.StringField({ initial: '' }),
			}),
		};
	}
}
