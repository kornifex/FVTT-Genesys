import { heldByDeletedContainers, containerStateUpdates } from '@/actor/data/Inventory';
import { EQUIPMENT_TYPES, itemsOfType } from '@/item/ItemTypes';
import { itemQualities, QUALITY_FLAG } from '@/item/data/Qualities';
import { ATTACHMENT_FLAG } from '@/item/data/Attachments';
import { orphanedTaggedEffects } from '@/item/data/EffectTags';
import { applyItemChanges } from '@/item/ItemChanges';

/**
 * Whether an item is one that holds attachments: a weapon or an armor.
 */
function hasAttachments(item: Item.Implementation): item is GenesysItem<'weapon' | 'armor'> {
	return item.type === 'weapon' || item.type === 'armor';
}

/**
 * An item of the system, typed by its subtype: its `system` is the DataModel registered for that type.
 */
export class GenesysItem<SubType extends Item.SubType = Item.SubType> extends Item<SubType> {
	/**
	 * A weapon's or an armor's own effects change its prepared data through their Item Changes, as an attachment's do. Its
	 * stored data keeps the values the table typed, which its sheet edits.
	 * @inheritDoc
	 */
	override prepareDerivedData() {
		super.prepareDerivedData();

		if (hasAttachments(this)) {
			applyItemChanges(this.system, this.effects);
		}
	}

	/**
	 * Keep a Container's contents in its Equipment State, whatever changed the state of either, and remove the effects of
	 * a quality or an attachment removed from a weapon or an armor.
	 * @inheritDoc
	 */
	protected override _onUpdate(changed: Item.UpdateData, options: Item.Database.OnUpdateOptions, userId: string) {
		super._onUpdate(changed, options, userId);

		// Removing a weapon's or an armor's quality, whatever removed it (its trash icon, a rating of 0, a Weapon Profile
		// deleted), removes its effects.
		const changesQualities = ['system.qualities', 'system.extraProfiles'].some((key) => foundry.utils.hasProperty(changed, key));
		// The same goes for an attachment.
		const changesAttachments = foundry.utils.hasProperty(changed, 'system.attachments');
		if (userId === game.user.id && (changesQualities || changesAttachments)) {
			const orphaned = [
				...(changesQualities
					? orphanedTaggedEffects(
							this.effects,
							QUALITY_FLAG,
							itemQualities(this.system).map(({ id }) => id),
						)
					: []),
				// Only a weapon or an armor holds attachments: another item has none to orphan.
				...(changesAttachments && hasAttachments(this)
					? orphanedTaggedEffects(
							this.effects,
							ATTACHMENT_FLAG,
							this.system.attachments.map(({ id }) => id),
						)
					: []),
			];
			if (orphaned.length > 0) {
				void this.deleteEmbeddedDocuments('ActiveEffect', orphaned);
			}
		}

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
