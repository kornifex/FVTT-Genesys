import { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysActorSheet } from '@/actor/GenesysActorSheet';
import VueVehicleSheet from '@/vue/sheets/actor/VehicleSheet.vue';
import { GenesysItem } from '@/item/GenesysItem';
import { CrewDragTransferData, dragData } from '@/data/DragTransferData';
import { isPassengerDrop, receiveCrewDrop } from '@/operations/CrewDrop';
import { receiveInventoryDrop } from '@/operations/InventoryDrop';

/**
 * The drag data of the drops on a vehicle's sheet, by drop event.
 */
const crewDrops = new WeakMap<DragEvent, CrewDragTransferData>();

/**
 * Actor sheet used for vehicles.
 */
export class VehicleSheet extends GenesysActorSheet<'vehicle'> {
	override get vueComponent() {
		return VueVehicleSheet;
	}

	override get initialTab() {
		return 'skills';
	}

	protected override async receiveItem(droppedItem: GenesysItem) {
		let clonedDroppedItem: GenesysItem[] | undefined | boolean;
		if (VehicleDataModel.isRelevantTypeForContext('INVENTORY', droppedItem.type)) {
			clonedDroppedItem = await receiveInventoryDrop(this.actor, droppedItem);
		} else if (VehicleDataModel.isRelevantTypeForContext('COMBAT', droppedItem.type)) {
			clonedDroppedItem = await super.receiveItem(droppedItem);
		} else {
			return false;
		}

		return clonedDroppedItem ?? false;
	}

	protected override async _onDrop(event: DragEvent) {
		// A browser only lets a drop's data be read while its event dispatches, and Foundry's handler awaits the dropped
		// document first: the vehicle's Crew the actor may come from is read now.
		crewDrops.set(event, dragData(event.dataTransfer));
		return super._onDrop(event);
	}

	/**
	 * Called when an Actor is dropped on the sheet: it joins the passengers, unless it comes from the vehicle's own Crew.
	 */
	protected override async _onDropActor(event: DragEvent, actor: GenesysActor) {
		// Actors moved within the Crew are received by the Crew tab; anywhere else on the sheet, they stay where they are.
		const data = crewDrops.get(event) ?? {};
		if (!isPassengerDrop(data) || data.sourceVehicleUuid === this.actor.uuid || !this.isEditable) {
			return null;
		}

		return (await receiveCrewDrop(this.actor, data, { kind: 'passengers', position: 'last' })) ? actor : null;
	}
}
