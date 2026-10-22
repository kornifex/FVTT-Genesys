import { GenesysItem } from '@/item/GenesysItem';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';

import './GenesysItemSheet.scss';

export type DropData = {
	type: 'ActiveEffect' | 'Actor' | 'Item' | 'Folder';
	uuid: string;
};

/**
 * The item a drop on a sheet carries, of the data model the sheet expects.
 */
export async function itemFromDrop<ItemDataModel extends BaseItemDataModel>(data: DropData) {
	// The types we have lack the configured item class's own methods, read the drop data of a canvas, and return an item
	// of any data model.
	const itemClass = GenesysItem.implementation as typeof GenesysItem;
	return (await itemClass.fromDropData(data as DropCanvasData<'Item'>)) as GenesysItem<ItemDataModel> | undefined;
}

/**
 * Basic functionality shared by all ItemSheets.
 */
export class GenesysItemSheet<ItemDataModel extends BaseItemDataModel = BaseItemDataModel> extends ItemSheet<GenesysItem<ItemDataModel>> {
	static override get defaultOptions() {
		return {
			...super.defaultOptions,
			classes: ['genesys', 'sheet', 'item'],
			width: 480,
			height: 300,
			dragDrop: [
				{
					dragSelector: '.item-list .item',
				},
			],
			tabs: [
				{
					navSelector: '.sheet-tabs',
					contentSelector: '.sheet-body',
					initial: 'description',
				},
			],
		};
	}

	protected override _canDragDrop(_selector: string): boolean {
		return this.isEditable;
	}

	override activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html);

		if (this.isEditable) {
			// Bind our own image picker in place of Foundry's.
			html.find('img[data-edit]').off('click');
			html.find('img[data-edit]').on('click', this._onEditImage.bind(this));
		}
	}

	/**
	 * Add support for drop data on Item sheets.
	 */
	protected override _onDrop(event: DragEvent) {
		const data: DropData = <DropData>TextEditor.getDragEventData(event as ElementDragEvent);

		switch (data.type) {
			case 'ActiveEffect':
				void this._onDropActiveEffect(event, data);
				break;
			case 'Actor':
				void this._onDropActor(event, data);
				break;
			case 'Item':
				void this._onDropItem(event, data);
				break;
			case 'Folder':
				void this._onDropFolder(event, data);
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
