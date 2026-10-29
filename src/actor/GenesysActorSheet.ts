import { GenesysActor } from '@/actor/GenesysActor';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { GenesysItem } from '@/item/GenesysItem';
import { itemFromDrop } from '@/item/GenesysItemSheet';
import { GenesysEffect } from '@/effects/GenesysEffect';
import { VueDocumentSheet } from '@/vue/VueDocumentSheet';
import { ActorSheetContext } from '@/vue/SheetContext';

import '@/actor/GenesysActorSheet.scss';

/**
 * Basic functionality shared by all actor sheets, which render a Vue component. Foundry's ActorSheetV2 receives the drops:
 * its DragDrop lets a user drop on a sheet they can edit, and its `_onDrop` resolves the dropped document and hands it to
 * the handler of its type, unless the `dropActorSheetData` hook refuses it.
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
	 * Called when an ActiveEffect is dropped on the sheet: the actor gets a copy of it, under a new id.
	 */
	protected override async _onDropActiveEffect(_event: DragEvent, effect: GenesysEffect) {
		// The types we have lack `target`, the document an effect applies to.
		if (!this.actor.isOwner || (effect as { target?: unknown }).target === this.actor) {
			return null;
		}

		return GenesysEffect.create(effect.toObject(), { parent: this.actor });
	}

	/**
	 * Called when an Item is dropped on the sheet: an actor the user can edit receives it. An item the actor already owns
	 * stays as it is, since the sheets' Vue components sort their own items.
	 */
	protected override async _onDropItem(_event: DragEvent, item: GenesysItem<ItemDataModel>) {
		if (!this.isEditable || item.parent?.uuid === this.actor.uuid) {
			return null;
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
	 * Called when a Folder is dropped on the sheet: the actor receives each of its items, as if dropped one by one.
	 */
	protected override async _onDropFolder(event: DragEvent, folder: Folder) {
		if (!this.isEditable || folder.type !== 'Item') {
			return null;
		}

		// A compendium's folder holds the index entries of its items: each is resolved by its uuid.
		for (const { uuid } of folder.contents) {
			const item = await itemFromDrop<ItemDataModel>({ uuid });
			if (item) {
				await this._onDropItem(event, item);
			}
		}

		return folder;
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
