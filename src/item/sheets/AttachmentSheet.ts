import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysItem } from '@/item/GenesysItem';
import VueAttachmentSheet from '@/vue/sheets/item/AttachmentSheet.vue';
import { addDroppedQuality } from '@/operations/QualityEffects';

/**
 * Item sheet used for attachments, which receives the qualities they give the item they are installed on.
 */
export class AttachmentSheet extends GenesysItemSheet<'attachment'> {
	override get vueComponent() {
		return VueAttachmentSheet;
	}

	protected override async receiveItem(droppedItem: GenesysItem): Promise<void> {
		if (droppedItem.type === 'quality') {
			await addDroppedQuality(this.item, droppedItem, this.item.system.qualities, (qualities) => ({ qualities }));
		}
	}
}
