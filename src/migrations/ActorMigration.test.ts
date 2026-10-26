/**
 * @file Tests for the actor walk and the migration chain.
 */

import { describe, expect, it, vi } from 'vitest';
import {
	ActorChanges,
	ActorPack,
	ActorWorld,
	isWorldActorPack,
	migrateActors,
	runMigrationChain,
	walkActors,
	WalkedActor,
} from '@/migrations/ActorMigration';

function fakeActor(uuid: string, log: string[]): WalkedActor & { updates: ActorChanges[] } {
	const updates: ActorChanges[] = [];
	return {
		uuid,
		source: { name: uuid, type: 'vehicle', system: { name: uuid }, items: [], effects: [] },
		updates,
		apply: async (changes) => {
			log.push(`update ${uuid}`);
			updates.push(changes);
		},
	};
}

function fakePack(locked: boolean, actors: WalkedActor[], log: string[]): ActorPack {
	const pack: ActorPack = {
		locked,
		setLocked: async (value) => {
			log.push(value ? 'lock' : 'unlock');
			pack.locked = value;
		},
		actors: async () => {
			log.push(`open pack (locked: ${pack.locked})`);
			return actors;
		},
	};
	return pack;
}

function fakeWorld(log: string[]) {
	const world = fakeActor('Actor.world', log);
	const token = fakeActor('Scene.s.Token.t.Actor.world', log);
	const packed = fakeActor('Compendium.world.vehicles.Actor.packed', log);
	const pack = fakePack(true, [packed], log);
	const actorWorld: ActorWorld = { worldActors: () => [world], tokenActors: () => [token], actorPacks: () => [pack] };

	return { actorWorld, world, token, packed, pack };
}

describe('walkActors', () => {
	it('visits world actors, then token actors, then the actors of an unlocked pack, which it locks again', async () => {
		const log: string[] = [];
		const { actorWorld, pack } = fakeWorld(log);

		await walkActors(actorWorld, async (actor) => {
			log.push(`visit ${actor.uuid}`);
		});

		expect(log).toEqual([
			'visit Actor.world',
			'visit Scene.s.Token.t.Actor.world',
			'unlock',
			'open pack (locked: false)',
			'visit Compendium.world.vehicles.Actor.packed',
			'lock',
		]);
		expect(pack.locked).toBe(true);
	});

	it('locks a pack again when a visit throws', async () => {
		const log: string[] = [];
		const { actorWorld, pack } = fakeWorld(log);

		await expect(
			walkActors(actorWorld, async (actor) => {
				if (actor.uuid.startsWith('Compendium')) throw new Error('boom');
			}),
		).rejects.toThrow('boom');
		expect(pack.locked).toBe(true);
	});

	it('leaves an unlocked pack unlocked', async () => {
		const log: string[] = [];
		const pack = fakePack(false, [], log);

		await walkActors({ worldActors: () => [], tokenActors: () => [], actorPacks: () => [pack] }, async () => {});

		expect(log).toEqual(['open pack (locked: false)']);
	});
});

describe('isWorldActorPack', () => {
	it("visits the world's own actor compendiums", () => {
		expect(isWorldActorPack({ type: 'Actor', packageType: 'world' })).toBe(true);
	});

	it('leaves alone the actor compendiums of modules and of the system, and the compendiums of other documents', () => {
		expect(isWorldActorPack({ type: 'Actor', packageType: 'module' })).toBe(false);
		expect(isWorldActorPack({ type: 'Actor', packageType: 'system' })).toBe(false);
		expect(isWorldActorPack({ type: 'Item', packageType: 'world' })).toBe(false);
	});
});

describe('migrateActors', () => {
	it('updates the actors a planner changes, with its changes', async () => {
		const log: string[] = [];
		const { actorWorld, world, token, packed } = fakeWorld(log);

		const failures = await migrateActors(actorWorld, (source) =>
			source.system.name === 'Actor.world' ? undefined : { update: { 'system.migrated': true } },
		);

		expect(failures).toEqual([]);
		expect(world.updates).toEqual([]);
		expect(token.updates).toEqual([{ update: { 'system.migrated': true } }]);
		expect(packed.updates).toEqual([{ update: { 'system.migrated': true } }]);
	});

	it('reports the actors it could not migrate, migrates the others, and locks the pack again', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const log: string[] = [];
		const { actorWorld, token, pack } = fakeWorld(log);

		const failures = await migrateActors(actorWorld, (source) => {
			if (source.system.name !== 'Scene.s.Token.t.Actor.world') throw new Error('boom');
			return { update: { 'system.migrated': true } };
		});

		expect(failures).toEqual(['Actor.world', 'Compendium.world.vehicles.Actor.packed']);
		expect(token.updates).toEqual([{ update: { 'system.migrated': true } }]);
		expect(pack.locked).toBe(true);
	});
});

describe('runMigrationChain', () => {
	function reporter(log: string[]) {
		return {
			starting: (id: number) => log.push(`start ${id}`),
			completed: (id: number) => log.push(`done ${id}`),
			stopped: (id: number) => log.push(`stop ${id}`),
		};
	}

	it('runs the migrations after the version reached, in order', async () => {
		const log: string[] = [];
		const version = await runMigrationChain([async () => true, async () => true, async () => true], 1, reporter(log));

		expect(version).toBe(3);
		expect(log).toEqual(['start 2', 'done 2', 'start 3', 'done 3']);
	});

	it('stops at the first migration that fails or throws', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const log: string[] = [];
		const third = vi.fn(async () => true);

		expect(await runMigrationChain([async () => true, async () => false, third], 0, reporter(log))).toBe(1);
		expect(
			await runMigrationChain(
				[
					async () => {
						throw new Error('boom');
					},
					third,
				],
				0,
				reporter([]),
			),
		).toBe(0);
		expect(log).toEqual(['start 1', 'done 1', 'start 2', 'stop 2']);
		expect(third).not.toHaveBeenCalled();
	});
});
