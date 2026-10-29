import { GenesysItemSheet, DropData, itemFromDrop } from '@/item/GenesysItemSheet';
import { ArmorDataModel } from '@/item/data/ArmorDataModel';
import VueArmorSheet from '@/vue/sheets/item/ArmorSheet.vue';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';
import { withQualityAdded } from '@/item/data/Qualities';

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
			const quality = <ItemQualityDataModel>(<unknown>droppedItem.systemData);
			const qualities = withQualityAdded(this.item.systemData.qualities, {
				name: droppedItem.name,
				description: quality.description,
				isRated: quality.isRated,
			});
			if (qualities) {
				await this.item.update({ 'system.qualities': qualities });
			}
		}
	}
}
