/**
 * @file Tests for the planners of the vehicle migrations.
 */

import { describe, expect, it } from 'vitest';
import { useUuidForVehicles } from '@/migrations/1-use-uuid-for-vehicle';
import { actorOnlyOnceInCrew } from '@/migrations/2-actors-once-in-vehicle';

function actor(type: string, system: Record<string, unknown>) {
	return { name: 'Actor', type, system, items: [], effects: [] };
}

function vehicle(roles: string[][], passengers: string[] = []) {
	return actor('vehicle', {
		roles: roles.map((members, index) => ({ id: `role${index}`, name: `Role ${index}`, skills: [], members })),
		passengers: { value: 0, threshold: 0, list: passengers.map((uuid, index) => ({ uuid, sort: index })) },
	});
}

describe('useUuidForVehicles', () => {
	const worldActors: Record<string, string> = { hero: 'Actor.hero', ally: 'Actor.ally' };
	const plan = useUuidForVehicles((id) => worldActors[id]);

	it('turns the ids of world actors into their uuids, and drops the ids that name none', () => {
		expect(plan(vehicle([['hero', 'gone'], []], ['ally']))).toEqual({
			update: {
				'system.passengers.list': [{ uuid: 'Actor.ally', sort: 0 }],
				'system.roles': [
					{ id: 'role0', name: 'Role 0', skills: [], members: ['Actor.hero'] },
					{ id: 'role1', name: 'Role 1', skills: [], members: [] },
				],
			},
		});
	});

	it('leaves a vehicle already migrated alone', () => {
		expect(plan(vehicle([['Actor.hero', 'Scene.s.Token.t.Actor.a']], ['Compendium.world.npcs.Actor.x']))).toBeUndefined();
	});

	it('only changes the list that holds ids', () => {
		expect(plan(vehicle([['Actor.hero']], ['ally']))).toEqual({
			update: { 'system.passengers.list': [{ uuid: 'Actor.ally', sort: 0 }] },
		});
	});

	it('leaves other actors alone', () => {
		expect(plan(actor('character', {}))).toBeUndefined();
	});
});

describe('actorOnlyOnceInCrew', () => {
	it('keeps each actor in its first role, then out of the passengers', () => {
		expect(
			actorOnlyOnceInCrew(
				vehicle(
					[
						['a', 'b'],
						['b', 'c'],
					],
					['c', 'd'],
				),
			),
		).toEqual({
			update: {
				'system.roles': [
					{ id: 'role0', name: 'Role 0', skills: [], members: ['a', 'b'] },
					{ id: 'role1', name: 'Role 1', skills: [], members: ['c'] },
				],
				'system.passengers.list': [{ uuid: 'd', sort: 1 }],
			},
		});
	});

	it('keeps the last of the entries repeated within a role or the passengers', () => {
		expect(actorOnlyOnceInCrew(vehicle([['a', 'b', 'a']], ['c', 'c']))).toEqual({
			update: {
				'system.roles': [{ id: 'role0', name: 'Role 0', skills: [], members: ['b', 'a'] }],
				'system.passengers.list': [{ uuid: 'c', sort: 1 }],
			},
		});
	});

	it('leaves a vehicle without repeated actors alone', () => {
		expect(actorOnlyOnceInCrew(vehicle([['a'], ['b']], ['c']))).toBeUndefined();
	});

	it('leaves other actors alone', () => {
		expect(actorOnlyOnceInCrew(actor('character', {}))).toBeUndefined();
	});
});
