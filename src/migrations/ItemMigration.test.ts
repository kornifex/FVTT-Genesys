/** @file Tests for the item planners applied to actors' items, and the walk over the world's items. */

import { describe, expect, it, vi } from 'vitest';

import { ActorSource } from '@/migrations/ActorMigration';
import {
	actorItemsPlanner,
	isWorldItemPack,
	ItemChanges,
	ItemPack,
	ItemPlanner,
	ItemSource,
	migrateItems,
	WalkedItem,
} from '@/migrations/ItemMigration';

vi.mock('@/log', () => ({ error: vi.fn() }));

function source(_id: string, type = 'weapon'): ItemSource {
	return { _id, name: _id, type, system: {}, effects: [] };
}

// Renames each weapon and gives it an effect; leaves the other items alone.
const plan: ItemPlanner = (item) =>
	item.type === 'weapon' ? { update: { name: `${item.name}!` }, createdEffects: [{ name: item.name }] } : undefined;

describe('actorItemsPlanner', () => {
	const actor = (items: ItemSource[]): ActorSource => ({ name: 'Hero', type: 'character', system: {}, items, effects: [] });

	it("gathers the changes of an actor's items by item id", () => {
		expect(actorItemsPlanner(plan)(actor([source('axe'), source('rope', 'gear'), source('bow')]))).toEqual({
			items: [
				{ _id: 'axe', name: 'axe!' },
				{ _id: 'bow', name: 'bow!' },
			],
			createdItemEffects: { axe: [{ name: 'axe' }], bow: [{ name: 'bow' }] },
		});
	});

	it('leaves out what an item planner leaves out', () => {
		const effectOnly: ItemPlanner = (item) => ({ createdEffects: [{ name: item.name }] });

		expect(actorItemsPlanner(effectOnly)(actor([source('axe')]))).toEqual({ createdItemEffects: { axe: [{ name: 'axe' }] } });
	});

	it('plans nothing for an actor whose items need nothing', () => {
		expect(actorItemsPlanner(plan)(actor([source('rope', 'gear')]))).toBeUndefined();
		expect(actorItemsPlanner(plan)(actor([]))).toBeUndefined();
	});
});

function fakeItem(uuid: string, log: string[], type = 'weapon'): WalkedItem {
	return {
		uuid,
		source: source(uuid, type),
		apply: async (changes: ItemChanges) => {
			log.push(`apply ${uuid} ${JSON.stringify(changes.update)}`);
		},
	};
}

function fakePack(locked: boolean, items: WalkedItem[], log: string[]): ItemPack {
	const pack: ItemPack = {
		locked,
		setLocked: async (value) => {
			log.push(value ? 'lock' : 'unlock');
			pack.locked = value;
		},
		items: async () => {
			log.push(`open pack (locked: ${pack.locked})`);
			return items;
		},
	};
	return pack;
}

describe('migrateItems', () => {
	it("applies a planner to the world's items, then to those of its item packs, a locked one unlocked for it and locked again", async () => {
		const log: string[] = [];
		const locked = fakePack(true, [fakeItem('Compendium.world.arms.Item.bow', log)], log);
		const unlocked = fakePack(false, [fakeItem('Compendium.world.gear.Item.rope', log, 'gear')], log);

		const failures = await migrateItems(
			{ worldItems: () => [fakeItem('Item.axe', log), fakeItem('Item.rope', log, 'gear')], itemPacks: () => [locked, unlocked] },
			plan,
		);

		expect(log).toEqual([
			'apply Item.axe {"name":"Item.axe!"}',
			'unlock',
			'open pack (locked: false)',
			'apply Compendium.world.arms.Item.bow {"name":"Compendium.world.arms.Item.bow!"}',
			'lock',
			'open pack (locked: false)',
		]);
		expect([failures, locked.locked, unlocked.locked]).toEqual([[], true, false]);
	});

	it('goes on past an item that fails, and returns its uuid', async () => {
		const log: string[] = [];
		const failing = { ...fakeItem('Item.broken', log), apply: () => Promise.reject(new Error('refused')) };
		const pack = fakePack(true, [failing], log);

		const failures = await migrateItems({ worldItems: () => [failing, fakeItem('Item.axe', log)], itemPacks: () => [pack] }, plan);

		expect(failures).toEqual(['Item.broken', 'Item.broken']);
		expect(log).toContain('apply Item.axe {"name":"Item.axe!"}');
		expect(pack.locked).toBe(true);
	});
});

describe('isWorldItemPack', () => {
	it("is true for the world's own item compendiums only", () => {
		expect(isWorldItemPack({ type: 'Item', packageType: 'world' })).toBe(true);
		expect(isWorldItemPack({ type: 'Item', packageType: 'system' })).toBe(false);
		expect(isWorldItemPack({ type: 'Actor', packageType: 'world' })).toBe(false);
	});
});
