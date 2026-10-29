import { describe, expect, expectTypeOf, it } from 'vitest';

import { itemsOfType, ofType, SystemSource } from '@/item/ItemTypes';
import type { TalentDataModel } from '@/item/data/TalentDataModel';

/**
 * An actor holding items of these types, in this order, each named after its type and position.
 */
function actorWith(...types: string[]) {
	return { items: types.map((type, index) => ({ type, name: `${type} ${index}` })) as unknown as Item[] };
}

describe('itemsOfType', () => {
	it("returns the actor's items of a type, in item order", () => {
		const actor = actorWith('talent', 'skill', 'talent', 'ability');

		expect(itemsOfType(actor, 'talent').map((item) => item.name)).toEqual(['talent 0', 'talent 2']);
	});

	it('returns the items of any of several types, in item order', () => {
		const actor = actorWith('weapon', 'talent', 'armor', 'gear');

		expect(itemsOfType(actor, ['armor', 'weapon']).map((item) => item.name)).toEqual(['weapon 0', 'armor 2']);
	});

	it('returns none when the actor holds no item of the type', () => {
		expect(itemsOfType(actorWith('skill'), 'career')).toEqual([]);
	});

	it('reads a Foundry collection, which iterates over the items rather than their ids', () => {
		const items = new Map([
			['a', { type: 'injury', name: 'Bleeding' }],
			['b', { type: 'skill', name: 'Cool' }],
		]);
		const collection = { [Symbol.iterator]: () => items.values() } as unknown as Iterable<Item>;

		expect(itemsOfType({ items: collection }, 'injury').map((item) => item.name)).toEqual(['Bleeding']);
	});
});

describe('ofType', () => {
	it('returns the items of a type among items read as plain data, in item order, keeping their own members', () => {
		const items = [
			{ id: 'a', type: 'skill', name: 'Cool', system: { rank: 1 } },
			{ id: 'b', type: 'talent', name: 'Grit', system: { rank: 2 } },
			{ id: 'c', type: 'skill', name: 'Brawl', system: { rank: 3 } },
		];

		expect(ofType(items, 'skill').map((skill) => `${skill.id} ${skill.name} ${skill.system.rank}`)).toEqual(['a Cool 1', 'c Brawl 3']);
	});
});

describe('SystemSource', () => {
	it("holds a DataModel's stored fields, but none of the values its getters derive from them", () => {
		expectTypeOf<SystemSource<TalentDataModel>>().toHaveProperty('tier');
		expectTypeOf<SystemSource<TalentDataModel>>().not.toHaveProperty('effectiveTier');
		expectTypeOf<SystemSource<TalentDataModel>>().not.toHaveProperty('migrateData');
	});
});
