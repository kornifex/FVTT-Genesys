/**
 * @file Tests for the encumbrance of a character's or vehicle's equipment.
 */

import { describe, expect, it } from 'vitest';
import {
	characterEncumbrance,
	EncumberingItem,
	EncumbranceRules,
	equipmentEncumbrance,
	HeldContainer,
	isEncumbered,
	rootContainer,
} from '@/actor/data/Encumbrance';

type Container = HeldContainer & { id: string };

function containers(...held: [string, string][]) {
	const byId = new Map<string, Container>(held.map(([id, container]) => [id, { id, container }]));
	return (id: string) => byId.get(id);
}

describe('rootContainer', () => {
	it('is the container itself when it is not held in another one', () => {
		expect(rootContainer('backpack', containers(['backpack', '']))?.id).toBe('backpack');
	});

	it('walks up to the outermost container', () => {
		const getContainer = containers(['pouch', 'satchel'], ['satchel', 'backpack'], ['backpack', '']);

		expect(rootContainer('pouch', getContainer)?.id).toBe('backpack');
	});

	it('is undefined when a container is missing', () => {
		expect(rootContainer('pouch', containers(['pouch', 'gone']))).toBeUndefined();
		expect(rootContainer('gone', containers())).toBeUndefined();
	});

	it('is undefined when the containers hold each other', () => {
		expect(rootContainer('pouch', containers(['pouch', 'satchel'], ['satchel', 'pouch']))).toBeUndefined();
		expect(rootContainer('pouch', containers(['pouch', 'pouch']))).toBeUndefined();
	});
});

const CHARACTER: EncumbranceRules = {
	isRelevant: (type) => ['weapon', 'armor', 'consumable', 'gear', 'container'].includes(type),
	ignoresDropped: true,
	reducesEquippedArmor: true,
};

const VEHICLE: EncumbranceRules = {
	isRelevant: (type) => ['vehicleWeapon', 'weapon', 'armor', 'consumable', 'gear', 'container'].includes(type),
	ignoresDropped: false,
	reducesEquippedArmor: false,
};

function item(id: string, fields: Partial<EncumberingItem> = {}): EncumberingItem {
	return { id, type: 'gear', encumbrance: 0, quantity: 1, state: 'carried', container: '', ...fields };
}

describe('equipmentEncumbrance', () => {
	it('adds the encumbrance of each item of a stack to the value', () => {
		const items = [item('rope', { encumbrance: 1, quantity: 3 }), item('sword', { type: 'weapon', encumbrance: 2 })];

		expect(equipmentEncumbrance(items, CHARACTER)).toEqual({ value: 5, thresholdBonus: 0 });
		expect(equipmentEncumbrance(items, VEHICLE)).toEqual({ value: 5, thresholdBonus: 0 });
	});

	it('ignores the item types that are not relevant to encumbrance', () => {
		const items = [item('talent', { type: 'talent', encumbrance: 4 }), item('ability', { type: 'ability', encumbrance: -2 })];

		expect(equipmentEncumbrance(items, CHARACTER)).toEqual({ value: 0, thresholdBonus: 0 });
	});

	it('raises the threshold by the negative encumbrance of each item of a stack, instead of lowering the value', () => {
		const saddlebag = item('saddlebag', { encumbrance: -2 });
		const saddlebags = item('saddlebags', { encumbrance: -2, quantity: 2 });

		expect(equipmentEncumbrance([saddlebag], CHARACTER)).toEqual({ value: 0, thresholdBonus: 2 });
		expect(equipmentEncumbrance([saddlebag], VEHICLE)).toEqual({ value: 0, thresholdBonus: 2 });
		expect(equipmentEncumbrance([saddlebags], CHARACTER)).toEqual({ value: 0, thresholdBonus: 4 });
		expect(equipmentEncumbrance([saddlebags], VEHICLE)).toEqual({ value: 0, thresholdBonus: 4 });
	});

	it("leaves a character's Dropped equipment out of both the value and the threshold", () => {
		const items = [
			item('anvil', { encumbrance: 5, state: 'dropped' }),
			item('saddlebags', { encumbrance: -2, quantity: 2, state: 'dropped' }),
		];

		expect(equipmentEncumbrance(items, CHARACTER)).toEqual({ value: 0, thresholdBonus: 0 });
	});

	it("still counts a vehicle's Dropped equipment, as vehicles ignore Equipment State", () => {
		const items = [
			item('anvil', { encumbrance: 5, state: 'dropped' }),
			item('saddlebags', { encumbrance: -2, quantity: 2, state: 'dropped' }),
		];

		expect(equipmentEncumbrance(items, VEHICLE)).toEqual({ value: 5, thresholdBonus: 4 });
	});

	it("leaves the contents of a character's Dropped container out of both the value and the threshold", () => {
		// A container can't hold another one any more, but older worlds may still have a pouch in a backpack.
		const items = [
			item('backpack', { type: 'container', state: 'dropped' }),
			item('pouch', { type: 'container', container: 'backpack' }),
			item('rope', { encumbrance: 1, container: 'backpack' }),
			item('saddlebags', { encumbrance: -2, quantity: 2, container: 'backpack' }),
			item('saddlebag', { encumbrance: -2, container: 'pouch' }),
		];

		expect(equipmentEncumbrance(items, CHARACTER)).toEqual({ value: 0, thresholdBonus: 0 });
		expect(equipmentEncumbrance(items, VEHICLE)).toEqual({ value: 1, thresholdBonus: 6 });
	});

	it("counts the contents of a character's container that is not Dropped", () => {
		const items = [
			item('backpack', { type: 'container' }),
			item('pouch', { type: 'container', container: 'backpack' }),
			item('rope', { encumbrance: 1, container: 'backpack' }),
			item('saddlebag', { encumbrance: -2, container: 'pouch' }),
		];

		expect(equipmentEncumbrance(items, CHARACTER)).toEqual({ value: 1, thresholdBonus: 2 });
	});

	it("counts a character's Equipped armor 3 less, to a minimum of 0, for one of its quantity", () => {
		const plate = item('plate', { type: 'armor', encumbrance: 4, state: 'equipped' });
		const leather = item('leather', { type: 'armor', encumbrance: 2, state: 'equipped' });
		const plates = item('plates', { type: 'armor', encumbrance: 4, quantity: 3, state: 'equipped' });

		expect(equipmentEncumbrance([plate], CHARACTER)).toEqual({ value: 1, thresholdBonus: 0 });
		expect(equipmentEncumbrance([leather], CHARACTER)).toEqual({ value: 0, thresholdBonus: 0 });
		expect(equipmentEncumbrance([plates], CHARACTER)).toEqual({ value: 9, thresholdBonus: 0 });
	});

	it('counts armor in full when it is not Equipped, or on a vehicle', () => {
		const plate = item('plate', { type: 'armor', encumbrance: 4 });
		const equippedPlate = item('equippedPlate', { type: 'armor', encumbrance: 4, state: 'equipped' });

		expect(equipmentEncumbrance([plate], CHARACTER)).toEqual({ value: 4, thresholdBonus: 0 });
		expect(equipmentEncumbrance([equippedPlate], VEHICLE)).toEqual({ value: 4, thresholdBonus: 0 });
	});
});

describe('characterEncumbrance', () => {
	it("sets the threshold at 5 plus Brawn, raised by the effects' threshold and the negative encumbrance", () => {
		const equipment = { value: 6, thresholdBonus: 4 };

		expect(characterEncumbrance(equipment, { value: 0, threshold: 0 }, 2)).toEqual({ value: 6, threshold: 11 });
		expect(characterEncumbrance(equipment, { value: 0, threshold: 1 }, 3)).toEqual({ value: 6, threshold: 13 });
	});

	it("adds the effects' value to the equipment's, to a minimum of 0", () => {
		const equipment = { value: 3, thresholdBonus: 0 };

		expect(characterEncumbrance(equipment, { value: 2, threshold: 0 }, 2)).toEqual({ value: 5, threshold: 7 });
		expect(characterEncumbrance(equipment, { value: -5, threshold: 0 }, 2)).toEqual({ value: 0, threshold: 7 });
	});
});

describe('isEncumbered', () => {
	it('is true only when the value is over the threshold', () => {
		expect(isEncumbered({ value: 8, threshold: 7 })).toBe(true);
		expect(isEncumbered({ value: 7, threshold: 7 })).toBe(false);
		expect(isEncumbered({ value: 0, threshold: 7 })).toBe(false);
	});
});
