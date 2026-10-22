import { GenesysItem } from '@/item/GenesysItem';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { VueDocumentSheet } from '@/vue/VueDocumentSheet';
import { ItemSheetContext } from '@/vue/SheetContext';

import '@/item/GenesysItemSheet.scss';

export type DropData = {
	type: 'ActiveEffect' | 'Actor' | 'Item' | 'Folder';
	uuid: string;
};

/**
 * The item a drop on a sheet carries, of the data model the sheet expects.
 */
export async function itemFromDrop<ItemDataModel extends BaseItemDataModel>(data: DropData | DropCanvasData) {
	// The types we have lack the configured item class's own methods, read the drop data of a canvas, and return an item
	// of any data model.
	const itemClass = GenesysItem.implementation as typeof GenesysItem;
	return (await itemClass.fromDropData(data as DropCanvasData<'Item'>)) as GenesysItem<ItemDataModel> | undefined;
}

/**
 * Basic functionality shared by all item sheets, which render a Vue component.
 */
export class GenesysItemSheet<ItemDataModel extends BaseItemDataModel = BaseItemDataModel> extends VueDocumentSheet(
	foundry.applications.sheets.ItemSheetV2,
)<GenesysItem<ItemDataModel>> {
	static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.ApplicationConfiguration> = {
		classes: ['genesys', 'sheet', 'item'],
		position: { width: 480, height: 300 },
	};

	override get initialTab() {
		return 'description';
	}

	override async getVueContext(): Promise<ItemSheetContext<ItemDataModel>> {
		return {
			sheet: this,
			data: { item: this.item, editable: this.isEditable },
		};
	}

	/**
	 * Add support for drop data on Item sheets.
	 */
	protected override async _onDrop(event: DragEvent) {
		if (!this.isEditable) {
			return;
		}

		const data: DropData = <DropData>TextEditor.getDragEventData(event as ElementDragEvent);

		switch (data.type) {
			case 'ActiveEffect':
				await this._onDropActiveEffect(event, data);
				break;
			case 'Actor':
				await this._onDropActor(event, data);
				break;
			case 'Item':
				await this._onDropItem(event, data);
				break;
			case 'Folder':
				await this._onDropFolder(event, data);
				break;
		}
	}

	/**
	 * Called when an ActiveEffect is dropped on the item sheet.
	 */
	protected async _onDropActiveEffect(_event: DragEvent, _data: DropData) {}
	/**
	 * Called when an Actor is dropped on the item sheet.
	 */
	protected async _onDropActor(_event: DragEvent, _data: DropData) {}
	/**
	 * Called when an Item is dropped on the item sheet.
	 */
	protected async _onDropItem(_event: DragEvent, _data: DropData) {}
	/**
	 * Called when a Folder is dropped on the item sheet.
	 */
	protected async _onDropFolder(_event: DragEvent, _data: DropData) {}
}
