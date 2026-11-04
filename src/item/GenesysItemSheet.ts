import type { DeepPartial } from 'fvtt-types/utils';
import { GenesysItem } from '@/item/GenesysItem';
import type { Stored } from '@/data/Stored';
import { DragTransferData, dragData } from '@/data/DragTransferData';
import { VueDocumentSheet } from '@/vue/VueDocumentSheet';
import { DocumentSheetContext } from '@/vue/SheetContext';
import { isFoundryV13 } from '@/foundryGeneration';

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
 * Whether a drop's link names a document that still exists, as far as Foundry tells without waiting.
 */
function linksExistingDocument(uuid: string) {
	try {
		return fromUuidSync(uuid) !== null;
	} catch {
		// Foundry only finds a document embedded in a compendium's by waiting for it: it is left to resolve it.
		return true;
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
		// The window opens at its content's height; a height in pixels keeps it there (VueDocumentSheet).
		position: { width: 480, height: 300 },
	};

	/**
	 * An item sheet opens no taller than 75% of the viewport, like a journal at its fixed height: a long description
	 * scrolls rather than filling the screen.
	 */
	protected override get openingHeightCap() {
		return window.innerHeight * 0.75;
	}

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

		// v13: ItemSheetV2 binds no drag and drop. v14's binds its DragDrop on each render, whose `_onDrop` lets the
		// `dropItemSheetData` hook refuse a drop, then hands the dropped document to `_onDropDocument`.
		if (isFoundryV13()) {
			this.element.ondragover = (event) => event.preventDefault();
			this.element.ondrop = (event) => {
				event.preventDefault();
				void this.#onDropV13(event);
			};
		}
	}

	/**
	 * v13: receive the item a drop carries, on a sheet the user can edit.
	 */
	async #onDropV13(event: DragEvent) {
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
	 * Handle a drop on v14 by ItemSheetV2's own `_onDrop`, which lets the `dropItemSheetData` hook refuse it, unless the
	 * drop links a document deleted since the link was made: Foundry would throw as it resolves it (#271).
	 */
	protected override async _onDrop(event: DragEvent) {
		// A drop's data reads only while its event dispatches, so the link is checked before anything is awaited.
		const { uuid } = dragData(event.dataTransfer);
		if (uuid && !linksExistingDocument(uuid)) {
			return;
		}
		return super._onDrop(event);
	}

	/**
	 * Receive a document dropped on the sheet. Only an item is received: an Active Effect is not, as on v13.
	 */
	protected override async _onDropDocument<ConcreteDocument extends foundry.applications.sheets.ItemSheetV2.DroppableDocument>(
		event: DragEvent,
		document: ConcreteDocument,
	): Promise<ConcreteDocument | null> {
		if (!(document instanceof Item)) {
			return null;
		}
		await this.receiveItem(document as GenesysItem, event);
		return document;
	}

	/**
	 * Receive an item dropped on the sheet, by the drop event that carried it. An item takes none, unless its sheet says
	 * what it does with one.
	 */
	protected async receiveItem(_item: GenesysItem, _event?: DragEvent): Promise<void> {}
}
