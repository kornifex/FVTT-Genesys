import type { GenesysActor } from '@/actor/GenesysActor';
import { DragTransferData } from '@/data/DragTransferData';
import type { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import { EquipmentState } from '@/item/data/EquipmentDataModel';
import type { GenesysItem } from '@/item/GenesysItem';

async function cloneInventoryItemForAnotherActor(
	sourceItem: GenesysItem<EquipmentDataModel>,
	targetActor: GenesysActor,
	containerId: string,
) {
	// Clone the source object and add it to the target actor. The clone carries the item's effects.
	const clonedItemAsObject = sourceItem.toObject();
	const clonedItemAsObjectSystem = clonedItemAsObject.system as EquipmentDataModel;
	clonedItemAsObjectSystem.state = EquipmentState.Carried;
	clonedItemAsObjectSystem.container = containerId;

	const [clonedItem] = (await targetActor.createEmbeddedDocuments('Item', [clonedItemAsObject])) as GenesysItem<EquipmentDataModel>[];

	return clonedItem;
}

export async function transferInventoryBetweenActors(
	dragData: DragTransferData,
	actor: GenesysActor,
	isRelevantType: (type: string) => boolean,
) {
	// Check that we have the UUID of whatever was dropped, that it's permitted to be dropped on this actor, and that the target
	// actor is owned by the user.
	if (!actor.isOwner || !dragData.uuid || (dragData.genesysType && !isRelevantType(dragData.genesysType))) {
		return;
	}

	// Make sure we can access the dropped item, that it's permitted to be dropped on this actor, and that it's being transfered from
	// another actor the user owns.
	const droppedItem = await fromUuid<GenesysItem<EquipmentDataModel>>(dragData.uuid);
	const sourceActor = droppedItem?.actor;
	if (!droppedItem || !isRelevantType(droppedItem.type) || !sourceActor || !sourceActor.isOwner || sourceActor.uuid === actor.uuid) {
		return;
	}

	// If this is a container make sure to transfer all the contained items so long they also follow the restrictions of what can be dropped to the inventory.
	let containedItems: GenesysItem<EquipmentDataModel>[] = [];
	if (droppedItem.type === 'container') {
		containedItems = sourceActor.items.filter(
			(item) => (item as GenesysItem<EquipmentDataModel>).systemData.container === droppedItem.id,
		) as GenesysItem<EquipmentDataModel>[];
		if (!containedItems.every((item) => isRelevantType(item.type))) {
			return;
		}
	}

	// Clone the source object and add it to the target actor.
	const clonedItem = await cloneInventoryItemForAnotherActor(droppedItem, actor, '');
	const allCreatedItems = [clonedItem];

	// Clone the contained items and add them to the target actor.
	for (const containedItem of containedItems) {
		allCreatedItems.push(await cloneInventoryItemForAnotherActor(containedItem, actor, clonedItem.id));

		// Delete the contained item from the source actor.
		await containedItem.delete();
	}

	// Delete the dropped item from the source actor.
	await droppedItem.delete();

	return allCreatedItems;
}
