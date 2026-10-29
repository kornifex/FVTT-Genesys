import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';

/**
 * The data of a quality, which weapons and armor copy when it is dropped on them.
 */
export abstract class ItemQualityDataModel extends BaseItemDataModel {
	/**
	 * Whether the quality is passively applied or requires spending advantage.
	 */
	abstract activation: 'active' | 'passive';

	/**
	 * Whether the ability has levels (e.g. "Vicious 3") or not.
	 */
	abstract isRated: boolean;

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			activation: new fields.StringField({
				initial: 'passive',
				choices: ['active', 'passive'],
			}),
			isRated: new fields.BooleanField({ initial: true }),
		};
	}
}
