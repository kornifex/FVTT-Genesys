import { heldByDeletedContainers, containerStateUpdates } from '@/actor/data/Inventory';
import { EQUIPMENT_TYPES, itemsOfType } from '@/item/ItemTypes';

/**
 * An item of the system, typed by its subtype: its `system` is the DataModel registered for that type.
 */
export class GenesysItem<SubType extends Item.SubType = Item.SubType> extends Item<SubType> {
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
