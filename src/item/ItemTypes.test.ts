import { describe, expect, it } from 'vitest';

import { itemsOfType } from '@/item/ItemTypes';

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
