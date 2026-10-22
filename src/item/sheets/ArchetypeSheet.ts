import { ArchetypeDataModel } from '@/item/data/ArchetypeDataModel';
import VueArchetypeSheet from '@/vue/sheets/item/ArchetypeSheet.vue';

import { GenesysItemSheet, DropData, itemFromDrop } from '@/item/GenesysItemSheet';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { skillNamesMatch } from '@/data/Skills';

import '@/item/sheets/ArchetypeSheet.scss';

/**
 * List of item types that are not allowed to be granted by an archetype.
 */
const BLOCK_GRANTED_ITEM_TYPES = ['archetype', 'career', 'quality'];

export class ArchetypeSheet extends GenesysItemSheet<ArchetypeDataModel> {
	static override DEFAULT_OPTIONS = {
		classes: ['archetype'],
		position: { width: 720, height: 780 },
	};

	override get vueComponent() {
		return VueArchetypeSheet;
	}

	protected override async _onDropItem(_event: DragEvent, data: DropData): Promise<void> {
		if (!this.isEditable || !data.uuid) {
			return;
		}

		const droppedItem = await itemFromDrop<BaseItemDataModel>(data);
		if (!droppedItem) {
			return;
		}

		// Prevent dropping certain item types.
		if (BLOCK_GRANTED_ITEM_TYPES.includes(droppedItem.type)) {
			return;
		}

		// Prevent adding a granted item that's already present. Skill names match whatever their case.
		const matchesName = (name: string) =>
			droppedItem.type === 'skill' ? skillNamesMatch(name, droppedItem.name) : name === droppedItem.name;
		if (this.item.systemData.grantedItems.find((i) => i.type === droppedItem.type && matchesName(i.name))) {
			return;
		}

		await this.item.update({
			'system.grantedItems': [...this.item.systemData.grantedItems, droppedItem.toObject()],
		});
	}
}
