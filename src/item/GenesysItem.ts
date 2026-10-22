import { GenesysActor } from '@/actor/GenesysActor';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { HasPreCreate } from '@/data/HasPreCreate';
import { heldByDeletedContainers, containerStateUpdates } from '@/actor/data/Inventory';

/**
 * Item class used as a base for all Genesys items.
 */
export class GenesysItem<ItemDataModel extends foundry.abstract.DataModel = BaseItemDataModel> extends Item<GenesysActor> {
	/**
	 * Specialized property for accessing `item.system` in a typed manner.
	 */
	get systemData(): ItemDataModel {
		return <ItemDataModel>this.system;
	}

	/**
	 * Override the _preCreate callback to call preCreate from the data model class, if present.
	 * @inheritDoc
	 */
	protected override async _preCreate(
		data: PreDocumentId<this['_source']>,
		options: DocumentModificationContext<this>,
		user: foundry.documents.BaseUser,
	) {
		await (<HasPreCreate<this>>this.systemData).preCreate?.(this, data, options, user);

		return super._preCreate(data, options, user);
	}

	/**
	 * Keep a Container's contents in its Equipment State, whatever changed the state of either.
	 * @inheritDoc
	 */
	protected override _onUpdate(changed: DeepPartial<this['_source']>, options: DocumentModificationContext<this>, userId: string) {
		super._onUpdate(changed, options, userId);

		const changesPlace = foundry.utils.hasProperty(changed, 'system.state') || foundry.utils.hasProperty(changed, 'system.container');
		if (!this.actor || userId !== game.user.id || !changesPlace) {
			return;
		}

		const updates = containerStateUpdates(this.actor.items.contents, [this.id]);
		if (updates.length > 0) {
			void this.actor.updateEmbeddedDocuments('Item', updates);
		}
	}

	/**
	 * Delete a Container's contents with it, whatever deleted it.
	 * @inheritDoc
	 */
	protected override _onDelete(options: DocumentModificationContext<this>, userId: string) {
		super._onDelete(options, userId);

		if (!this.actor || userId !== game.user.id || this.type !== 'container') {
			return;
		}

		// Contents deleted in the same batch are already gone from the actor.
		const held = heldByDeletedContainers(this.actor.items.contents, [this.id]);
		if (held.length > 0) {
			void this.actor.deleteEmbeddedDocuments('Item', held);
		}
	}

	/**
	 * Override the createDialog callback to include an unique class that identifies the created dialog.
	 * @inheritDoc
	 */
	static override createDialog(
		data?: { folder?: string | undefined },
		options?: Partial<FormApplicationOptions>,
	): Promise<ClientDocument<foundry.documents.BaseItem> | undefined> {
		// The 'dialog' class needs to be added explicitly, otherwise it won't be added by the super call.
		const touchedOptions = {
			...options,
			classes: [...(options?.classes ?? []), 'dialog', 'dialog-item-create'],
		};

		return super.createDialog(data, touchedOptions);
	}
}
