import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { SEVERITIES, Severity } from '@/item/data/Injuries';
import { choiceField } from '@/data/schemaFields';

/**
 * The data of a Critical Injury, or of a vehicle's Critical Hit.
 */
export abstract class InjuryDataModel extends BaseItemDataModel {
	/**
	 * Severity level of the injury, which aligns with Difficulty levels to heal it.
	 */
	abstract severity: Severity;

	static override defineSchema() {
		return {
			...super.defineSchema(),
			severity: choiceField(SEVERITIES, 'average'),
		};
	}
}
