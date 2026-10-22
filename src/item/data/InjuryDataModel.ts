import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { SEVERITIES, Severity } from '@/item/data/Injuries';

export abstract class InjuryDataModel extends BaseItemDataModel {
	/**
	 * Severity level of the injury, which aligns with Difficulty levels to heal it.
	 */
	abstract severity: Severity;

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			severity: new fields.StringField({
				initial: 'average',
				choices: [...SEVERITIES],
			}),
		};
	}
}
