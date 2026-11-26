import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysItem } from '@/item/GenesysItem';
import VueArmorSheet from '@/vue/sheets/item/ArmorSheet.vue';
import { addDroppedQuality } from '@/operations/QualityEffects';
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
			await addDroppedQuality(this.item, droppedItem, this.item.system.qualities, (qualities) => ({ qualities }));
		} else if (droppedItem.type === 'attachment') {
			await installAttachment(this.item, droppedItem);
		}
	}
}
