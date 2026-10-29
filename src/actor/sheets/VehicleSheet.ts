import { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { GenesysActorSheet } from '@/actor/GenesysActorSheet';
import VueVehicleSheet from '@/vue/sheets/actor/VehicleSheet.vue';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { GenesysItem } from '@/item/GenesysItem';
import { GenesysActor } from '@/actor/GenesysActor';
import { CrewDragTransferData } from '@/data/DragTransferData';
import { isPassengerDrop, receiveCrewDrop } from '@/operations/CrewDrop';
import { receiveInventoryDrop } from '@/operations/InventoryDrop';

export class VehicleSheet extends GenesysActorSheet<VehicleDataModel> {
	override get vueComponent() {
		return VueVehicleSheet;
	}

	override get initialTab() {
		return 'skills';
	}

	protected override async receiveItem(droppedItem: GenesysItem<BaseItemDataModel>) {
		let clonedDroppedItem: GenesysItem<BaseItemDataModel>[] | undefined | boolean;
		if (VehicleDataModel.isRelevantTypeForContext('INVENTORY', droppedItem.type)) {
			clonedDroppedItem = await receiveInventoryDrop(this.actor, droppedItem);
		} else if (VehicleDataModel.isRelevantTypeForContext('COMBAT', droppedItem.type)) {
			// Let `super` handle the drop and save a reference to it.
			clonedDroppedItem = await super.receiveItem(droppedItem);
		} else {
			// If the dropped item is not of a type that we have a default behavior then end early.
			return false;
		}

		return clonedDroppedItem ?? false;
	}

	protected override async _onDropActor(
		event: DragEvent,
		data: DropCanvasData<'Actor', GenesysActor<VehicleDataModel>>,
	): Promise<false | void> {
		// Regardless of what was dropped this is the last spot to process it.
		event.stopPropagation();

		// Actors moved within the Crew are received by the Crew tab; anywhere else on the sheet, they stay where they are.
		const dragData = data as CrewDragTransferData;
		if (!isPassengerDrop(dragData) || dragData.sourceVehicleUuid === this.actor.uuid || !this.isEditable) {
			return false;
		}

		await receiveCrewDrop(this.actor, dragData, { kind: 'passengers', position: 'last' });
	}
}
