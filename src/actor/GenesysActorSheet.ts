import { GenesysActor } from '@/actor/GenesysActor';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { GenesysItem } from '@/item/GenesysItem';
import { itemFromDrop } from '@/item/GenesysItemSheet';
import { GenesysEffect } from '@/effects/GenesysEffect';
import { DragTransferData, dragData } from '@/data/DragTransferData';
import { VueDocumentSheet } from '@/vue/VueDocumentSheet';
import { ActorSheetContext } from '@/vue/SheetContext';

import '@/actor/GenesysActorSheet.scss';

/**
 * Basic functionality shared by all actor sheets, which render a Vue component.
 */
export class GenesysActorSheet<
	ActorDataModel extends foundry.abstract.DataModel = foundry.abstract.DataModel,
	ItemDataModel extends BaseItemDataModel = BaseItemDataModel,
> extends VueDocumentSheet(foundry.applications.sheets.ActorSheetV2)<GenesysActor<ActorDataModel>> {
	static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.ApplicationConfiguration> = {
		classes: ['genesys', 'sheet', 'actor'],
		position: { width: 720, height: 640 },
	};

	override async getVueContext(): Promise<ActorSheetContext<ActorDataModel>> {
		return {
			sheet: this,
			data: { actor: this.actor, editable: this.isEditable },
		};
	}

	/**
	 * Handle data dropped on the sheet. Foundry's ActorSheetV2 hands the dropped document to its handlers where the
	 * system's take the drop data, so this replaces Foundry's own. It can go once the handlers take the documents (#254).
	 */
	protected override async _onDrop(event: DragEvent) {
		if (!this.isEditable) {
			return;
		}

		const data = dragData<DropCanvasData>(event.dataTransfer);
		if (Hooks.call('dropActorSheetData', this.actor, this, data) === false) {
			return;
		}

		switch (data.type) {
			case 'ActiveEffect':
				await this._onDropActiveEffect(event, data as DropCanvasData<'ActiveEffect', GenesysEffect>);
				break;
			case 'Actor':
				await this._onDropActor(event, data as DropCanvasData<'Actor', GenesysActor<ActorDataModel>>);
				break;
			case 'Item':
				await this._onDropItem(event, data);
				break;
			case 'Folder':
				await this._onDropFolder(event, data as DropCanvasData<'Folder', Folder>);
				break;
		}
	}

	/**
	 * Called when an ActiveEffect is dropped on the sheet: the actor gets a copy of it.
	 */
	protected async _onDropActiveEffect(_event: DragEvent, data: DropCanvasData<'ActiveEffect', GenesysEffect>) {
		const effect = await GenesysEffect.fromDropData(data);
		// The types we have lack `target`, the document an effect applies to.
		if (!this.actor.isOwner || !effect || (effect as { target?: unknown }).target === this.actor) {
			return false;
		}

		return GenesysEffect.create(effect.toObject(), { parent: this.actor });
	}

	/**
	 * Called when an Actor is dropped on the sheet.
	 */
	protected async _onDropActor(_event: DragEvent, _data: DropCanvasData<'Actor', GenesysActor<ActorDataModel>>): Promise<false | void> {
		return false;
	}

	/**
	 * Called when an Item is dropped on the sheet: an actor the user can edit receives the item the drop carries. An item
	 * the actor already owns stays as it is, since the sheets' Vue components sort their own items.
	 */
	protected async _onDropItem(event: DragEvent, data: DragTransferData): Promise<GenesysItem<ItemDataModel>[] | boolean> {
		// The sheet is the last to receive the drop: it is stopped now, before the first await lets it bubble on.
		event.stopPropagation();
		if (!this.isEditable) {
			return false;
		}

		const item = await itemFromDrop<ItemDataModel>(data);
		if (!item || item.parent?.uuid === this.actor.uuid) {
			return false;
		}

		return this.receiveItem(item);
	}

	/**
	 * Receive an item dropped on the sheet, which the actor doesn't own: by default, the actor gets a copy of it. Returns
	 * the items created, or false when the drop is refused.
	 */
	protected async receiveItem(item: GenesysItem<ItemDataModel>): Promise<GenesysItem<ItemDataModel>[] | boolean> {
		return this._onDropItemCreate(item.toObject());
	}

	/**
	 * Called when a Folder is dropped on the sheet: the actor gets a copy of each of its items.
	 */
	protected async _onDropFolder(event: DragEvent, data: DropCanvasData<'Folder', Folder>) {
		if (!this.actor.isOwner) return [];
		const folder = await Folder.fromDropData(data);
		if (!folder) return [];
		if (folder.type !== 'Item') return [];

		const createdItems: GenesysItem<ItemDataModel>[] = [];

		const folderContent = folder.contents;
		for (const item of folderContent) {
			const creationResult = await this._onDropItem(new DragEvent(event.type), { uuid: item.uuid });

			if (!creationResult) {
				continue;
			}

			if (Array.isArray(creationResult)) {
				createdItems.push(...creationResult);
			}
		}

		return createdItems;
	}

	/**
	 * Create dropped items on the actor.
	 */
	protected async _onDropItemCreate(itemData: GenesysItem<ItemDataModel>['_source'] | GenesysItem<ItemDataModel>['_source'][]) {
		return (await this.actor.createEmbeddedDocuments(
			'Item',
			Array.isArray(itemData) ? itemData : [itemData],
		)) as GenesysItem<ItemDataModel>[];
	}
}
