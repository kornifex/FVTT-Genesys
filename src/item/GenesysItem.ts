import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { HasPreCreate } from '@/data/HasPreCreate';
import { heldByDeletedContainers, containerStateUpdates } from '@/actor/data/Inventory';
import { EQUIPMENT_TYPES, itemsOfType } from '@/item/ItemTypes';

/**
 * Item class used as a base for all Genesys items.
 */
export class GenesysItem<ItemDataModel extends foundry.abstract.DataModel.Any = BaseItemDataModel> extends Item {
	// Foundry builds `system` with the DataModel registered for the item's type, which the generic names.
	// @ts-expect-error -- The types declare the union of every type's DataModel, which no single one is assignable to (#246).
	declare system: ItemDataModel;

	/**
	 * Specialized property for accessing `item.system` in a typed manner.
	 */
	get systemData(): ItemDataModel {
		return this.system;
	}

	/**
	 * Override the _preCreate callback to call preCreate from the data model class, if present.
	 * @inheritDoc
	 */
	protected override async _preCreate(data: Item.CreateData, options: Item.Database.PreCreateOptions, user: User.Stored) {
		await (<HasPreCreate<this>>this.systemData).preCreate?.(this, data, options, user);

		return super._preCreate(data, options, user);
	}

	/**
	 * Keep a Container's contents in its Equipment State, whatever changed the state of either.
	 * @inheritDoc
	 */
	protected override _onUpdate(changed: Item.UpdateData, options: Item.Database.OnUpdateOptions, userId: string) {
		super._onUpdate(changed, options, userId);

		const changesPlace = ['system.state', 'system.container'].some((key) => foundry.utils.hasProperty(changed, key));
		if (!this.actor || !this.id || userId !== game.user.id || !changesPlace) {
			return;
		}

		const updates = containerStateUpdates(itemsOfType(this.actor, EQUIPMENT_TYPES), [this.id]);
		if (updates.length > 0) {
			void this.actor.updateEmbeddedDocuments('Item', updates);
		}
	}

	/**
	 * Delete a Container's contents with it, whatever deleted it.
	 * @inheritDoc
	 */
	protected override _onDelete(options: Item.Database.OnDeleteOptions, userId: string) {
		super._onDelete(options, userId);

		if (!this.actor || !this.id || userId !== game.user.id || this.type !== 'container') {
			return;
		}

		// Contents deleted in the same batch are already gone from the actor.
		const held = heldByDeletedContainers(itemsOfType(this.actor, EQUIPMENT_TYPES), [this.id]);
		if (held.length > 0) {
			void this.actor.deleteEmbeddedDocuments('Item', held);
		}
	}
}
