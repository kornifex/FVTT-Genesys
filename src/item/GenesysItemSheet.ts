import { GenesysItem } from '@/item/GenesysItem';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { DragTransferData, dragData } from '@/data/DragTransferData';
import { VueDocumentSheet } from '@/vue/VueDocumentSheet';
import { DocumentSheetContext } from '@/vue/SheetContext';

import '@/item/GenesysItemSheet.scss';

/**
 * The item a drop carries by its uuid, of the data model the receiver expects; undefined when it carries no item.
 */
export async function itemFromDrop<ItemDataModel extends BaseItemDataModel>(data: DragTransferData) {
	if (!data.uuid) {
		return undefined;
	}

	// The types we have lack the configured item class's own methods, read the drop data of a canvas, and return an item
	// of any data model.
	const itemClass = GenesysItem.implementation as typeof GenesysItem;
	try {
		return (await itemClass.fromDropData(data as DropCanvasData<'Item'>)) as GenesysItem<ItemDataModel> | undefined;
	} catch {
		// Foundry throws when the uuid names no document, as once it is deleted, or one that isn't an item: the drop
		// carries no item.
		return undefined;
	}
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

	override async getVueContext(): Promise<DocumentSheetContext<GenesysItem<ItemDataModel>, this>> {
		return { sheet: this, document: this.item, editable: this.isEditable };
	}

	protected override async _onRender(
		context: foundry.applications.ApplicationRenderContext,
		options: foundry.applications.ApplicationRenderOptions,
	) {
		await super._onRender(context, options);

		// v13: ItemSheetV2 binds no drag and drop. v14's binds its DragDrop to `_onDrop` on each render, which this replaces.
		this.element.ondragover = (event) => event.preventDefault();
		this.element.ondrop = (event) => {
			event.preventDefault();
			void this._onDrop(event);
		};
	}

	/**
	 * Handle data dropped on the sheet: an item the user can edit receives the item a drop carries, and nothing else.
	 */
	protected async _onDrop(event: DragEvent) {
		const data = dragData(event.dataTransfer);
		if (!this.isEditable || data.type !== 'Item') {
			return;
		}

		const item = await itemFromDrop(data);
		if (item) {
			await this.receiveItem(item);
		}
	}

	/**
	 * Receive an item dropped on the sheet. An item takes none, unless its sheet says what it does with one.
	 */
	protected async receiveItem(_item: GenesysItem): Promise<void> {}
}
