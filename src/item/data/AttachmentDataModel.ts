import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { hardPointsRequiredField } from '@/data/schemaFields';

/**
 * The data of an attachment, which weapons and armor copy when it is dropped on them. Its effects say what it changes:
 * the enabled ones are its base modifiers, the disabled ones its modification options.
 */
export abstract class AttachmentDataModel extends BaseItemDataModel {
	/**
	 * The Hard Points the attachment takes on the item it is installed on.
	 */
	abstract hardPointsRequired: number;

	static override defineSchema() {
		return {
			...super.defineSchema(),
			hardPointsRequired: hardPointsRequiredField(),
		};
	}
}
