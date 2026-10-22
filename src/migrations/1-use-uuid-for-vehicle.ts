import { ActorPlanner } from '@/migrations/ActorMigration';

/** What this migration reads of a vehicle, as it was stored before it. */
type VehicleSource = { passengers?: { list?: { uuid: string; sort: number }[] }; roles?: { members: string[] }[] };

/**
 * Migration planner for vehicles that are using an actor's id instead of the actor's uuid. The former is not completly
 * unique and limits the type of actors it can refer to.
 *
 * An id names a world actor: it becomes that actor's uuid, and an id that names no world actor is dropped. A reference
 * that is already a uuid is kept.
 */
export function useUuidForVehicles(worldActorUuid: (id: string) => string | undefined): ActorPlanner {
	const toUuid = (reference: string) => (reference.includes('.') ? reference : worldActorUuid(reference));

	return (source) => {
		if (source.type !== 'vehicle') {
			return undefined;
		}

		const system = source.system as VehicleSource;
		const changes: Record<string, unknown> = {};

		// If the vehicle has passengers on them then we need to update their references from id's to UUID's.
		const passengersList = system.passengers?.list ?? [];
		const passengers = passengersList.flatMap((passenger) => {
			const uuid = toUuid(passenger.uuid);
			return uuid ? [{ ...passenger, uuid }] : [];
		});
		if (passengers.map((passenger) => passenger.uuid).join() !== passengersList.map((passenger) => passenger.uuid).join()) {
			changes['system.passengers.list'] = passengers;
		}

		// If a role has any members then we need to update their references from id's to UUID's.
		const roles = system.roles ?? [];
		const migratedRoles = roles.map((role) => ({ ...role, members: role.members.flatMap((member) => toUuid(member) ?? []) }));
		if (migratedRoles.some((role, index) => role.members.join() !== roles[index].members.join())) {
			changes['system.roles'] = migratedRoles;
		}

		return Object.keys(changes).length > 0 ? { update: changes } : undefined;
	};
}
