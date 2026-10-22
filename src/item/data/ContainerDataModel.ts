/**
 * @file Base data model for Container-type Items.
 */

import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';

export abstract class ContainerDataModel extends EquipmentDataModel {
	/**
	 * Whether the container is open or not.
	 */
	abstract open: boolean;

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			open: new fields.BooleanField({ initial: false }),
		};
	}
}
