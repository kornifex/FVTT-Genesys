import { ArchetypeDataModel } from '@/item/data/ArchetypeDataModel';
import VueArchetypeSheet from '@/vue/sheets/item/ArchetypeSheet.vue';

import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysItem } from '@/item/GenesysItem';
import { grantsItem } from '@/actor/data/character/Archetype';

import '@/item/sheets/ArchetypeSheet.scss';

/**
 * List of item types that are not allowed to be granted by an archetype.
 */
const BLOCK_GRANTED_ITEM_TYPES = ['archetype', 'career', 'quality'];

/**
 * Item sheet used for Archetypes, which receives the items the Archetype grants.
 */
export class ArchetypeSheet extends GenesysItemSheet<ArchetypeDataModel> {
	static override DEFAULT_OPTIONS = {
		classes: ['archetype'],
		position: { width: 720, height: 780 },
	};

	override get vueComponent() {
		return VueArchetypeSheet;
	}

	protected override async receiveItem(droppedItem: GenesysItem): Promise<void> {
		if (BLOCK_GRANTED_ITEM_TYPES.includes(droppedItem.type)) {
			return;
		}

		if (grantsItem(this.item.systemData.grantedItems, droppedItem)) {
			return;
		}

		await this.item.update({
			system: { grantedItems: [...this.item.systemData.grantedItems, droppedItem.toObject()] },
		});
	}
}
