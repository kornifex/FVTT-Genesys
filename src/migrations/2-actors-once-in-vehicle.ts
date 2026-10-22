import { ActorPlanner } from '@/migrations/ActorMigration';

/** What this migration reads of a vehicle, as it was stored before it. */
type VehicleSource = { passengers?: { list?: { uuid: string }[] }; roles?: { members: string[] }[] };

/**
 * Previously we allowed for an actor to be part of more than one role. This planner removes any actor that is already
 * part of a role from any other role on the vehicle, and from its passengers. Within a role or the passengers, the last
 * of the repeated entries is kept.
 */
export const actorOnlyOnceInCrew: ActorPlanner = (source) => {
	if (source.type !== 'vehicle') {
		return undefined;
	}

	const system = source.system as VehicleSource;
	const crewUuids = new Set<string>();

	// Keep the last of the entries of a list that repeat an actor already seen, from the end of the list.
	const keepUnseen = <T>(list: T[], uuidOf: (entry: T) => string) => {
		const kept: T[] = [];
		for (let k = list.length - 1; k >= 0; k--) {
			const uuid = uuidOf(list[k]);
			if (!crewUuids.has(uuid)) {
				crewUuids.add(uuid);
				kept.unshift(list[k]);
			}
		}
		return kept;
	};

	// Check all the roles first and remove any actor that appears more than once from subsequent roles.
	const roles = system.roles ?? [];
	const migratedRoles = roles.map((role) => ({ ...role, members: keepUnseen(role.members, (member) => member) }));
	const updateRoles = migratedRoles.some((role, index) => role.members.length !== roles[index].members.length);

	// Check the passengers and make sure all of them are not in any role.
	const passengers = system.passengers?.list ?? [];
	const migratedPassengers = keepUnseen(passengers, (passenger) => passenger.uuid);
	const updatePassengers = migratedPassengers.length !== passengers.length;

	// Update the vehicle if we found at least one actor repeated.
	if (!updateRoles && !updatePassengers) {
		return undefined;
	}

	return {
		...(updateRoles && { 'system.roles': migratedRoles }),
		...(updatePassengers && { 'system.passengers.list': migratedPassengers }),
	};
};
