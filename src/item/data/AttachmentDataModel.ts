import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { hardPointsRequiredField, qualitiesField } from '@/data/schemaFields';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';

/**
 * The data of an attachment, which weapons and armor copy when it is dropped on them. Its effects say what it changes:
 * the enabled ones are its base modifiers, the disabled ones its modification options. Its qualities are those it gives
 * the item it is installed on, each with its effects.
 */
export abstract class AttachmentDataModel extends BaseItemDataModel {
	/**
	 * The Hard Points the attachment takes on the item it is installed on.
	 */
	abstract hardPointsRequired: number;

	/**
	 * The qualities the attachment gives every profile of the item it is installed on, or raises by their rating there.
	 */
	abstract qualities: ContainedItemQuality[];

	static override defineSchema() {
		return {
			...super.defineSchema(),
			hardPointsRequired: hardPointsRequiredField(),
			qualities: qualitiesField(),
		};
	}
}
