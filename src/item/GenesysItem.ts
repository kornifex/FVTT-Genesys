import { heldByDeletedContainers, containerStateUpdates } from '@/actor/data/Inventory';
import { EQUIPMENT_TYPES, itemsOfType } from '@/item/ItemTypes';
import { effectQuality, orphanedQualityEffects } from '@/item/data/Qualities';
import { type ContainedAttachment, orphanedAttachmentEffects } from '@/item/data/Attachments';
import { applyItemChanges, itemChangeTotals } from '@/item/ItemChanges';

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

		if (this.type === 'weapon' || this.type === 'armor') {
			const effects = [...this.effects].map((effect) => {
				const quality = effectQuality(effect, this.system);
				return {
					disabled: effect.disabled,
					changes: effect.changes,
					// A quality's rating scales its effect's changes, as it does on the actor (CRB pp. 86–89).
					rank: quality?.isRated ? quality.rating : 1,
				};
			});
			applyItemChanges((this as GenesysItem<'weapon' | 'armor'>).system, itemChangeTotals(effects));
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
			const attachments = (this.system as { attachments?: ContainedAttachment[] }).attachments ?? [];
			const orphaned = [
				...(changesQualities ? orphanedQualityEffects(this.effects, this.system) : []),
				...(changesAttachments ? orphanedAttachmentEffects(this.effects, attachments) : []),
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
