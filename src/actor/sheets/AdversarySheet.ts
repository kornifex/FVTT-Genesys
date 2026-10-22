/**
 * @file Shared functionality between the Minion, Rival, and Nemesis Sheets.
 */

import { GenesysActorSheet } from '@/actor/GenesysActorSheet';
import { AdversaryDataModel } from '@/actor/data/AdversaryDataModel';
import { GenesysItem } from '@/item/GenesysItem';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { DragTransferData } from '@/data/DragTransferData';
import { decideAdversaryDrop } from '@/actor/data/AdversaryItems';
import { notify } from '@/notifications';
import { receiveInventoryDrop } from '@/operations/InventoryDrop';

/**
 * Actor sheet shared by the adversaries: minions, rivals and nemeses.
 */
export class AdversarySheet extends GenesysActorSheet<AdversaryDataModel> {
	static override DEFAULT_OPTIONS = {
		position: { width: 480 },
	};

	override get initialTab() {
		return 'stats';
	}

	protected override async _onDropItem(event: DragEvent, data: DropCanvasData<'Item', GenesysItem<BaseItemDataModel>>) {
		// Regardless of what was dropped this is the last spot to process it.
		event.stopPropagation();

		// Check that the we have the UUID of the item that was dropped.
		const dragData = data as DragTransferData;
		if (!dragData.uuid) {
			return false;
		}

		// Make sure that the item in question exists and this actor doesn't own it.
		const droppedItem = await fromUuid<GenesysItem<BaseItemDataModel>>(dragData.uuid);
		if (!droppedItem || droppedItem.actor?.uuid === this.actor.uuid) {
			return false;
		}

		// We must be able to edit the actor to proceed.
		if (!this.isEditable) {
			return false;
		}

		if (AdversaryDataModel.isRelevantTypeForContext('INVENTORY', droppedItem.type)) {
			return receiveInventoryDrop(this.actor, data);
		}

		const items = this.actor.items.contents;
		const decision = decideAdversaryDrop(
			{
				type: this.actor.type,
				skills: this.actor.skills,
				talents: items.filter((item) => item.type === 'talent'),
				abilities: items.filter((item) => item.type === 'ability'),
			},
			droppedItem,
		);

		switch (decision.action) {
			case 'create': {
				const source = droppedItem.toObject();
				return this._onDropItemCreate(
					decision.rank === undefined ? source : foundry.utils.mergeObject(source, { system: { rank: decision.rank } }),
				);
			}
			case 'update':
				await this.actor.updateEmbeddedDocuments('Item', [decision.update]);
				return false;
			case 'refuse':
				if (decision.refusal) {
					notify(decision.refusal);
				}
				return false;
		}
	}
}
