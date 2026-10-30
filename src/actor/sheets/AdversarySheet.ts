/**
 * @file Shared functionality between the Minion, Rival, and Nemesis Sheets.
 */

import { GenesysActorSheet } from '@/actor/GenesysActorSheet';
import { AdversaryDataModel, type AdversaryType } from '@/actor/data/AdversaryDataModel';
import { GenesysItem } from '@/item/GenesysItem';
import { itemsOfType } from '@/item/ItemTypes';
import { decideAdversaryDrop } from '@/actor/data/AdversaryItems';
import { notify } from '@/notifications';
import { receiveInventoryDrop } from '@/operations/InventoryDrop';

/**
 * Actor sheet shared by the adversaries: minions, rivals and nemeses.
 */
export class AdversarySheet extends GenesysActorSheet<AdversaryType> {
	static override DEFAULT_OPTIONS = {
		position: { width: 480 },
	};

	override get initialTab() {
		return 'stats';
	}

	protected override async receiveItem(droppedItem: GenesysItem) {
		if (AdversaryDataModel.isRelevantTypeForContext('INVENTORY', droppedItem.type)) {
			return receiveInventoryDrop(this.actor, droppedItem);
		}

		const decision = decideAdversaryDrop(
			{
				type: this.actor.type,
				skills: this.actor.skills,
				talents: itemsOfType(this.actor, 'talent'),
				abilities: itemsOfType(this.actor, 'ability'),
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
