import { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { GenesysActorSheet } from '@/actor/GenesysActorSheet';
import VueVehicleSheet from '@/vue/sheets/actor/VehicleSheet.vue';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { GenesysItem } from '@/item/GenesysItem';
import { CrewDragTransferData, dragData } from '@/data/DragTransferData';
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

	/**
	 * Called when an Actor is dropped on the sheet: it joins the passengers, unless it comes from the vehicle's own Crew.
	 */
	protected override async _onDropActor(event: DragEvent, actor: Actor) {
		// Actors moved within the Crew are received by the Crew tab; anywhere else on the sheet, they stay where they are. The
		// drag data says which vehicle's Crew the actor comes from.
		const data: CrewDragTransferData = dragData(event.dataTransfer);
		if (!isPassengerDrop(data) || data.sourceVehicleUuid === this.actor.uuid || !this.isEditable) {
			return null;
		}

		return (await receiveCrewDrop(this.actor, data, { kind: 'passengers', position: 'last' })) ? actor : null;
	}
}
