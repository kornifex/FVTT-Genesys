/** @file Receives the actors and skills dropped on a vehicle's Crew, placed as the CrewRoster module decides. */

import { addRoleSkill, CrewPlace, placeActor, removeActor } from '@/actor/data/CrewRoster';
import type { GenesysActor } from '@/actor/GenesysActor';
import { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { CloneActorPrompt } from '@/app/CloneActorPrompt';
import { CrewDragTransferData, dragData } from '@/data/DragTransferData';

/**
 * Whether a drop carries an actor the Crew takes as a passenger.
 */
export function isPassengerDrop(data: CrewDragTransferData) {
	return droppedEntity(data, 'PASSENGER') !== undefined;
}

/**
 * Receive an actor dropped on the passengers or a Role of the Crew tab, or a skill dropped on a Role. The event is
 * stopped at once, before the Role or the sheet around the target receives it too; anything else goes on to them.
 */
export async function receiveCrewEvent(vehicle: GenesysActor<VehicleDataModel>, event: DragEvent, place: CrewPlace) {
	const data: CrewDragTransferData = dragData(event.dataTransfer);
	const entity = droppedEntity(data, place.kind === 'passengers' ? 'PASSENGER' : 'ROLE');
	if (!entity) {
		return false;
	}

	event.stopPropagation();
	if (entity.type !== 'skill') {
		return receiveCrewDrop(vehicle, data, place);
	}

	return (
		place.kind === 'role' && vehicle.isOwner && vehicle.systemData.updateCrew((crew) => addRoleSkill(crew, place.roleId, entity.name))
	);
}

/**
 * The type and name of the entity a drop carries, when the Crew takes it among the passengers or in a Role, which also
 * takes skills.
 */
function droppedEntity(data: CrewDragTransferData, context: 'PASSENGER' | 'ROLE') {
	if (!data.uuid || (data.genesysType && !VehicleDataModel.isRelevantTypeForContext(context, data.genesysType))) {
		return undefined;
	}

	const entity = fromUuidSync(data.uuid) as { type: string; name: string } | null;
	return entity && VehicleDataModel.isRelevantTypeForContext(context, entity.type) ? entity : undefined;
}

/**
 * Receive an actor dropped on a vehicle's Crew. One from the vehicle's own Crew moves within it; one from another
 * vehicle the user owns joins this Crew, then leaves the other; one from the sidebar or a compendium joins it, or a
 * clone of it does when it makes unlinked tokens. An actor already in the Crew is refused from anywhere else. Returns
 * whether the Crew changed.
 */
export async function receiveCrewDrop(vehicle: GenesysActor<VehicleDataModel>, data: CrewDragTransferData, place: CrewPlace) {
	// The target is checked before the clone prompt, so no clone is made for a drop the Crew refuses.
	if (!vehicle.isOwner || !data.uuid || !placeActor(vehicle.systemData.crew, data.uuid, place)) {
		return false;
	}

	let uuid = data.uuid;
	let source: GenesysActor<VehicleDataModel> | undefined;
	if (data.sourceVehicleUuid !== vehicle.uuid) {
		if (vehicle.systemData.hasCrew(uuid)) {
			return false;
		}

		if (data.sourceVehicleUuid) {
			source = (await fromUuid<GenesysActor<VehicleDataModel>>(data.sourceVehicleUuid)) ?? undefined;
			if (!source || source.type !== 'vehicle' || !source.isOwner) {
				return false;
			}
		} else {
			const clone = await cloneForCrew(uuid);
			if (clone === null) {
				return false;
			}
			uuid = clone ?? uuid;
		}
	}

	// The actor joins this Crew before it leaves the other: if the second update fails, it is in both, which the Crew
	// allows, rather than in neither.
	if (!(await vehicle.systemData.updateCrew((crew) => placeActor(crew, uuid, place)))) {
		return false;
	}
	await source?.systemData.updateCrew((sourceCrew) => removeActor(sourceCrew, uuid));
	return true;
}

/**
 * The uuid of the clone the user makes of an actor that makes unlinked tokens, when they can create actors. Undefined
 * when no clone is offered, null when the user closes the prompt.
 */
async function cloneForCrew(uuid: string) {
	const actor = fromUuidSync(uuid) as GenesysActor | null;
	if (!actor || actor.prototypeToken.actorLink || !Actor.implementation.canUserCreate(game.user)) {
		return undefined;
	}

	const clone = await CloneActorPrompt.promptForInstantiation(actor);
	return clone ? clone.uuid : null;
}
