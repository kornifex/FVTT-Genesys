/**
 * @file Tests for the relevant types of an actor.
 */

import { describe, expect, it } from 'vitest';
import {
	isRelevantToAdversary,
	isRelevantToCharacter,
	isRelevantToVehicle,
	isRelevantType,
	RelevantTypes,
} from '@/actor/data/RelevantTypes';

const relevantTypes: RelevantTypes<'INVENTORY' | 'EQUIPABLE'> = {
	INVENTORY: ['weapon', 'gear'],
	EQUIPABLE: ['weapon'],
};

describe('isRelevantType', () => {
	it('tells whether a type is listed for a context', () => {
		expect(isRelevantType(relevantTypes, 'INVENTORY', 'gear')).toBe(true);
		expect(isRelevantType(relevantTypes, 'EQUIPABLE', 'gear')).toBe(false);
	});

	it('never finds an empty type relevant', () => {
		expect(isRelevantType({ INVENTORY: [''] }, 'INVENTORY', '')).toBe(false);
	});

	it('never finds a type relevant to an unknown context', () => {
		expect(isRelevantType(relevantTypes, 'CONSUMABLE' as 'INVENTORY', 'weapon')).toBe(false);
	});
});

describe('the relevant types of each actor', () => {
	it('lets a character equip weapons and armor, and a vehicle its vehicle weapons only', () => {
		expect(['weapon', 'armor', 'vehicleWeapon'].filter((type) => isRelevantToCharacter('EQUIPABLE', type))).toEqual([
			'weapon',
			'armor',
		]);
		expect(['weapon', 'armor', 'vehicleWeapon'].filter((type) => isRelevantToVehicle('EQUIPABLE', type))).toEqual(['vehicleWeapon']);
	});

	it("lists the same equipment in the inventory of a character and of an Adversary, and vehicle weapons in a vehicle's", () => {
		const types = ['weapon', 'armor', 'consumable', 'gear', 'container', 'vehicleWeapon', 'talent'];

		expect(types.filter((type) => isRelevantToCharacter('INVENTORY', type))).toEqual([
			'weapon',
			'armor',
			'consumable',
			'gear',
			'container',
		]);
		expect(types.filter((type) => isRelevantToAdversary('INVENTORY', type))).toEqual([
			'weapon',
			'armor',
			'consumable',
			'gear',
			'container',
		]);
		expect(types.filter((type) => isRelevantToVehicle('INVENTORY', type))).toEqual(types.slice(0, 6));
	});

	it("takes characters and Adversaries as a vehicle's passengers, and skills as well on its roles", () => {
		const types = ['character', 'minion', 'rival', 'nemesis', 'vehicle', 'skill'];

		expect(types.filter((type) => isRelevantToVehicle('PASSENGER', type))).toEqual(['character', 'minion', 'rival', 'nemesis']);
		expect(types.filter((type) => isRelevantToVehicle('ROLE', type))).toEqual(['character', 'minion', 'rival', 'nemesis', 'skill']);
	});
});
