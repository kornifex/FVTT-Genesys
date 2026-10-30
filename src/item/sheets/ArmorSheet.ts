import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysItem } from '@/item/GenesysItem';
import { ArmorDataModel } from '@/item/data/ArmorDataModel';
import VueArmorSheet from '@/vue/sheets/item/ArmorSheet.vue';
import { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';
import { withQualityAdded } from '@/item/data/Qualities';

/**
 * Item sheet used for armor, which receives qualities.
 */
export class ArmorSheet extends GenesysItemSheet<ArmorDataModel> {
	override get vueComponent() {
		return VueArmorSheet;
	}

	protected override async receiveItem(droppedItem: GenesysItem): Promise<void> {
		if (droppedItem.type === 'quality') {
			const quality = <ItemQualityDataModel>(<unknown>droppedItem.systemData);
			const qualities = withQualityAdded(this.item.systemData.qualities, {
				name: droppedItem.name,
				description: quality.description,
				isRated: quality.isRated,
			});
			if (qualities) {
				await this.item.update({ system: { qualities } });
			}
		}
	}
}
