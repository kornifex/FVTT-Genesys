import { GenesysActor } from '@/actor/GenesysActor';
import type { Stored } from '@/data/Stored';
import { GenesysItem } from '@/item/GenesysItem';
import { itemFromDrop } from '@/item/GenesysItemSheet';
import { GenesysEffect } from '@/effects/GenesysEffect';
import { VueDocumentSheet } from '@/vue/VueDocumentSheet';
import { DocumentSheetContext } from '@/vue/SheetContext';

import '@/actor/GenesysActorSheet.scss';

/**
 * Basic functionality shared by all actor sheets, which render a Vue component. Foundry's ActorSheetV2 receives the drops:
 * its DragDrop lets a user drop on a sheet they can edit, and its `_onDrop` resolves the dropped document and hands it to
 * the handler of its type, unless the `dropActorSheetData` hook refuses it.
 */
export class GenesysActorSheet<SubType extends Actor.SubType = Actor.SubType> extends VueDocumentSheet(
	foundry.applications.sheets.ActorSheetV2,
) {
	static override DEFAULT_OPTIONS: foundry.applications.api.ApplicationV2.DefaultOptions = {
		classes: ['genesys', 'sheet', 'actor'],
		position: { width: 720, height: 640 },
	};

	/**
	 * The actor, of the type the sheet is registered for. A sheet shows an actor the world or a compendium stores.
	 */
	override get actor() {
		return this.document as Stored<GenesysActor<SubType>>;
	}

	override async getVueContext(): Promise<DocumentSheetContext<Stored<GenesysActor<SubType>>, this>> {
		return { sheet: this, document: this.actor, editable: this.isEditable };
	}

	/**
	 * Called when an ActiveEffect is dropped on the sheet: the actor gets a copy of it, under a new id.
	 */
	protected override async _onDropActiveEffect(_event: DragEvent, effect: GenesysEffect) {
		if (!this.actor.isOwner || effect.target === this.actor) {
			return null;
		}

		return (await GenesysEffect.create(effect.toObject(), { parent: this.actor })) ?? null;
	}

	/**
	 * Called when an Item is dropped on the sheet: an actor the user can edit receives it. An item the actor already owns
	 * stays as it is, since the sheets' Vue components sort their own items. Returns the first item the actor got, as
	 * Foundry's does, or null.
	 */
	protected override async _onDropItem(_event: DragEvent, item: GenesysItem) {
		if (!this.isEditable || item.parent?.uuid === this.actor.uuid) {
			return null;
		}

		const received = await this.receiveItem(item);
		return Array.isArray(received) ? received[0] ?? null : null;
	}

	/**
	 * Receive an item dropped on the sheet, which the actor doesn't own: by default, the actor gets a copy of it. Returns
	 * the items created, or false when the drop is refused.
	 */
	protected async receiveItem(item: GenesysItem): Promise<GenesysItem[] | boolean> {
		return this._onDropItemCreate(item.toObject());
	}

	/**
	 * Called when a Folder is dropped on the sheet: the actor receives each of its items, as if dropped one by one.
	 */
	protected override async _onDropFolder(event: DragEvent, folder: Folder) {
		if (!this.isEditable || folder.type !== 'Item') {
			return null;
		}

		// A compendium's folder holds the index entries of its items: each is resolved by its uuid. The types declare one
		// index entry rather than an array of them.
		for (const { uuid } of folder.contents as { uuid: string }[]) {
			const item = await itemFromDrop({ uuid });
			if (item) {
				await this._onDropItem(event, item);
			}
		}

		return folder;
	}

	/**
	 * Create dropped items on the actor.
	 */
	protected async _onDropItemCreate(itemData: GenesysItem['_source'] | GenesysItem['_source'][]) {
		return await this.actor.createEmbeddedDocuments('Item', Array.isArray(itemData) ? itemData : [itemData]);
	}
}
