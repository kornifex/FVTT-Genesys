import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysItem } from '@/item/GenesysItem';
import VueArmorSheet from '@/vue/sheets/item/ArmorSheet.vue';
import { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';
import { qualityCopy, withQualityAdded } from '@/item/data/Qualities';
import { copyQualityEffects } from '@/operations/QualityEffects';
import { installAttachment } from '@/operations/AttachmentEffects';

/**
 * Item sheet used for armor, which receives qualities and attachments.
 */
export class ArmorSheet extends GenesysItemSheet<'armor'> {
	override get vueComponent() {
		return VueArmorSheet;
	}

	protected override async receiveItem(droppedItem: GenesysItem): Promise<void> {
		if (droppedItem.type === 'quality') {
			const copy = qualityCopy(foundry.utils.randomID(), {
				name: droppedItem.name,
				system: droppedItem.system as ItemQualityDataModel,
			});
			const qualities = withQualityAdded(this.item.system.qualities, copy);
			if (qualities) {
				await this.item.update({ system: { qualities } });
				await copyQualityEffects(this.item, droppedItem, qualities, copy.id);
			}
		} else if (droppedItem.type === 'attachment') {
			await installAttachment(this.item, droppedItem);
		}
	}
}
