import { GenesysItemSheet, DropData, itemFromDrop } from '@/item/GenesysItemSheet';
import { ArmorDataModel } from '@/item/data/ArmorDataModel';
import VueArmorSheet from '@/vue/sheets/item/ArmorSheet.vue';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';

export class ArmorSheet extends GenesysItemSheet<ArmorDataModel> {
	override get vueComponent() {
		return VueArmorSheet;
	}

	protected override async _onDropItem(_event: DragEvent, data: DropData): Promise<void> {
		if (!this.isEditable || !data.uuid) {
			return;
		}

		const droppedItem = await itemFromDrop<SkillDataModel | WeaponDataModel>(data);
		if (!droppedItem) {
			return;
		}

		if (droppedItem.type === 'quality') {
			const existingIndex = this.item.systemData.qualities.findIndex((i) => i.name.toLowerCase() === droppedItem.name.toLowerCase());
			const qualities = this.item.systemData.qualities;

			if (existingIndex >= 0) {
				// Do nothing if it's not a rated quality.
				if (!qualities[existingIndex].isRated) {
					return;
				}

				qualities[existingIndex].rating += 1;
				await this.item.update({
					'system.qualities': qualities,
				});
			} else {
				// New Quality
				await this.item.update({
					'system.qualities': [
						...qualities,
						{
							name: droppedItem.name,
							description: droppedItem.systemData.description,
							isRated: (<ItemQualityDataModel>(<unknown>droppedItem.systemData)).isRated,
							rating: 1,
						},
					],
				});
			}
		}
	}
}
