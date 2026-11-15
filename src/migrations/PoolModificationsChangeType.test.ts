/** @file Tests for the planners of the migration that gives Pool Modifications their own change type. */

import { describe, expect, it } from 'vitest';

import { ActorSource } from '@/migrations/ActorMigration';
import { ItemSource } from '@/migrations/ItemMigration';
import { poolModificationsTypeOfActor, poolModificationsTypeOfItem } from '@/migrations/10-pool-modifications-change-type';
import { POOL_MODIFICATION_TYPE } from '@/effects/PoolModifications';

type Change = { key: string; value: unknown; type: string; phase: string; priority: number | null };

type Effect = { _id: string; name: string; system: { changes: Change[] } };

function change(key: string, value: unknown, type: string): Change {
	return { key, value, type, phase: 'initial', priority: null };
}

function effect(_id: string, changes: Change[]): Effect {
	return { _id, name: _id, system: { changes } };
}

function actor(effects: Effect[], items: ItemSource[] = []): ActorSource {
	return { name: 'Hero', type: 'character', system: {}, items, effects };
}

function item(effects: Effect[]): ItemSource {
	return { _id: 'grit', name: 'Grit', type: 'talent', system: {}, effects };
}

describe('poolModificationsTypeOfActor', () => {
	it("gives the custom Pool Modifications of the actor's effects their own type, keeping their other fields and the other changes", () => {
		const source = actor([
			effect('prone', [
				change('genesys.pool.ranged.target.', 'S', 'custom'),
				change('genesys.pool.melee.self.', 'S', 'custom'),
				change('system.soak', 1, 'add'),
			]),
			effect('blessing', [change('system.wounds.max', 10, 'add')]),
		]);

		expect(poolModificationsTypeOfActor(source)).toEqual({
			effects: [
				{
					_id: 'prone',
					system: {
						changes: [
							change('genesys.pool.ranged.target.', 'S', POOL_MODIFICATION_TYPE),
							change('genesys.pool.melee.self.', 'S', POOL_MODIFICATION_TYPE),
							change('system.soak', 1, 'add'),
						],
					},
				},
			],
		});
	});

	it('leaves a Pool Modification of another type, and the other custom changes, which the system reads by their key', () => {
		const source = actor([
			effect('hand-edited', [change('genesys.pool.check.self.', 'B', 'add')]),
			effect('vicious', [change('genesys.critical.inflicted', 10, 'custom')]),
			effect('keen', [change('genesys.item.critical', -1, 'custom')]),
		]);

		expect(poolModificationsTypeOfActor(source)).toBeUndefined();
	});

	it("leaves the effects of the actor's items to the item planner", () => {
		const source = actor([], [item([effect('grit', [change('genesys.pool.skill.self.Cool', 'B', 'custom')])])]);

		expect(poolModificationsTypeOfActor(source)).toBeUndefined();
	});

	it('changes nothing on a second run', () => {
		const source = actor([effect('aim', [change('genesys.pool.combat.self.', 'BB', POOL_MODIFICATION_TYPE)])]);

		expect(poolModificationsTypeOfActor(source)).toBeUndefined();
	});
});

describe('poolModificationsTypeOfItem', () => {
	it("gives the custom Pool Modifications of the item's effects their own type", () => {
		const source = item([effect('grit', [change('genesys.pool.skill.self.Cool', 'B', 'custom')]), effect('tough', [])]);

		expect(poolModificationsTypeOfItem(source)).toEqual({
			effects: [{ _id: 'grit', system: { changes: [change('genesys.pool.skill.self.Cool', 'B', POOL_MODIFICATION_TYPE)] } }],
		});
	});

	it('changes nothing on a second run', () => {
		const source = item([effect('grit', [change('genesys.pool.skill.self.Cool', 'B', POOL_MODIFICATION_TYPE)])]);

		expect(poolModificationsTypeOfItem(source)).toBeUndefined();
	});
});
