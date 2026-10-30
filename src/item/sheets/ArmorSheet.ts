import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysItem } from '@/item/GenesysItem';
import VueArmorSheet from '@/vue/sheets/item/ArmorSheet.vue';
import { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';
import { withQualityAdded } from '@/item/data/Qualities';

/**
 * Item sheet used for armor, which receives qualities.
 */
export class ArmorSheet extends GenesysItemSheet<'armor'> {
	override get vueComponent() {
		return VueArmorSheet;
	}

	protected override async receiveItem(droppedItem: GenesysItem): Promise<void> {
		if (droppedItem.type === 'quality') {
			const quality = droppedItem.system as ItemQualityDataModel;
			const qualities = withQualityAdded(this.item.system.qualities, {
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
