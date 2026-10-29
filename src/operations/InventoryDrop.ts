/**
 * @file Receives the items dropped on an actor's inventory, as the Inventory module decides.
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import { decideDrop, DropTarget, isInventoryType } from '@/actor/data/Inventory';
import { dragData } from '@/data/DragTransferData';
import type { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import type { GenesysItem } from '@/item/GenesysItem';
import { itemFromDrop } from '@/item/GenesysItemSheet';

/**
 * Receive an item dropped on an inventory component. The event is stopped at once, before the sheet receives it too;
 * anything else, an item of a type the actor doesn't keep in its inventory included, goes on to the sheet.
 */
export async function receiveInventoryEvent(actor: GenesysActor, event: DragEvent, at: DropTarget) {
	const data = dragData(event.dataTransfer);
	const type = data.type === 'Item' && data.uuid ? data.genesysType ?? droppedType(data.uuid) : undefined;
	if (!type || !isInventoryType(actor.type, type)) {
		return false;
	}

	event.stopPropagation();
	const item = await itemFromDrop<EquipmentDataModel>(data);
	return item ? receiveInventoryDrop(actor, item, at) : false;
}

function droppedType(uuid: string) {
	try {
		return (fromUuidSync(uuid) as { type?: string } | null)?.type;
	} catch {
		// Foundry can't read an item of an actor in a compendium synchronously: the sheet receives it.
		return undefined;
	}
}

/**
 * Receive the item a drop on an actor's inventory carries: one from an actor the user owns is moved with its contents,
 * one from an actor they don't own is refused, and one from a compendium or the sidebar is copied. Returns the created
 * items, or false when the drop is refused.
 */
export async function receiveInventoryDrop(actor: GenesysActor, item: GenesysItem, at: DropTarget = { kind: 'sheet' }) {
	if (!actor.isOwner) {
		return false;
	}

	// An item of an actor in a compendium is copied, as from the compendium itself.
	const holder = item.actor && !item.actor.pack ? item.actor : undefined;
	const decision = decideDrop(
		{ uuid: actor.uuid, type: actor.type, items: actor.items.contents },
		{ item, from: holder && { uuid: holder.uuid, isOwner: holder.isOwner, items: holder.items.contents }, at },
		() => foundry.utils.randomID(),
	);
	if (decision.action === 'refuse') {
		return false;
	}

	// Every item lands on the receiver in one batch, then leaves its holder in one batch.
	let created: GenesysItem<EquipmentDataModel>[] = [];
	if (decision.create.length > 0) {
		const createData = decision.create.map(({ sourceId, ...placed }) =>
			foundry.utils.mergeObject((holder?.items.get(sourceId) ?? item).toObject(), placed),
		);
		created = (await actor.createEmbeddedDocuments('Item', createData, { keepId: true })) as GenesysItem<EquipmentDataModel>[];
	}

	if (decision.update.length > 0) {
		await actor.updateEmbeddedDocuments('Item', decision.update);
	}

	if (holder && decision.delete.length > 0) {
		await holder.deleteEmbeddedDocuments('Item', decision.delete);
	}

	return created;
}
