import type { DeepPartial } from 'fvtt-types/utils';
import { GenesysItem } from '@/item/GenesysItem';
import type { Stored } from '@/data/Stored';
import { DragTransferData, dragData } from '@/data/DragTransferData';
import { VueDocumentSheet } from '@/vue/VueDocumentSheet';
import { DocumentSheetContext } from '@/vue/SheetContext';

import '@/item/GenesysItemSheet.scss';

/**
 * The item a drop carries by its uuid, of the type the receiver expects; undefined when it carries no item.
 */
export async function itemFromDrop<SubType extends Item.SubType = Item.SubType>(data: DragTransferData) {
	if (!data.uuid) {
		return undefined;
	}

	try {
		return (await CONFIG.Item.documentClass.fromDropData(data)) as GenesysItem<SubType> | undefined;
	} catch {
		// Foundry throws when the uuid names no document, as once it is deleted, or one that isn't an item: the drop
		// carries no item.
		return undefined;
	}
}

/**
 * Basic functionality shared by all item sheets, which render a Vue component.
 */
export class GenesysItemSheet<SubType extends Item.SubType = Item.SubType> extends VueDocumentSheet(
	foundry.applications.sheets.ItemSheetV2,
) {
	static override DEFAULT_OPTIONS: foundry.applications.api.ApplicationV2.DefaultOptions = {
		classes: ['genesys', 'sheet', 'item'],
		position: { width: 480, height: 300 },
	};

	override get initialTab() {
		return 'description';
	}

	/**
	 * The item, of the type the sheet is registered for. A sheet shows an item the world, a compendium or an actor
	 * stores.
	 */
	override get item() {
		return this.document as Stored<GenesysItem<SubType>>;
	}

	override async getVueContext(): Promise<DocumentSheetContext<Stored<GenesysItem<SubType>>, this>> {
		return { sheet: this, document: this.item, editable: this.isEditable };
	}

	protected override async _onRender(
		context: DeepPartial<foundry.applications.api.ApplicationV2.RenderContext>,
		options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>,
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
	protected override async _onDrop(event: DragEvent) {
		const data = dragData(event.dataTransfer);
		if (!this.isEditable || data.type !== 'Item') {
			return;
		}

		const item = await itemFromDrop(data);
		if (item) {
			await this.receiveItem(item, event);
		}
	}

	/**
	 * Receive an item dropped on the sheet, by the drop event that carried it. An item takes none, unless its sheet says
	 * what it does with one.
	 */
	protected async receiveItem(_item: GenesysItem, _event?: DragEvent): Promise<void> {}
}
