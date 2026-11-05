/** @file Removes the actors of a deletion from the Crews of the world's vehicles. */

import { removeActors } from '@/actor/data/CrewRoster';
import type { GenesysActor } from '@/actor/GenesysActor';
import { unlinkedTokenActors } from '@/actor/tokenActors';
import type { Stored } from '@/data/Stored';
import { isActingGm } from '@/queries';

/**
 * Remove the actors one operation deleted from the Crew of every vehicle in the world, its vehicle actors and those of
 * its scenes' unlinked tokens, in one update per vehicle that crews any of them.
 */
export async function removeDeletedFromCrews(deleted: Stored<GenesysActor>[]) {
	// Every client sees the deletion: one GM writes the vehicles, which a player may not, and writes them once.
	if (!isActingGm()) {
		return;
	}

	// The vehicles are not removed from Crews, which only hold the actors aboard.
	const uuids = deleted.filter((actor) => actor.type !== 'vehicle').map((actor) => actor.uuid);
	if (!uuids.length) {
		return;
	}

	// Each vehicle's new Crew is computed from its current one: removing the actors one by one, in writes that don't wait
	// for each other, would have each write of a Crew field (its passengers, its Roles) put back the actors the others
	// removed from it. A vehicle deleted in the same operation has already left `game.actors`: Foundry removes every
	// document of the operation before it post-processes it. VehicleDataModel's `isVehicle` would bring in an import
	// cycle through GenesysActor, which calls this.
	const vehicles = [...game.actors, ...unlinkedTokenActors()].filter(
		(actor): actor is GenesysActor<'vehicle'> => actor.type === 'vehicle',
	);
	await Promise.all(vehicles.map((vehicle) => vehicle.system.updateCrew((crew) => removeActors(crew, uuids))));
}
