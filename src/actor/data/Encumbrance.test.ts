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
	it('adds the encumbrance of each item a character carries to the value (CRB p. 84)', () => {
		const items = [item('rope', { encumbrance: 1, quantity: 3 }), item('sword', { type: 'weapon', encumbrance: 2 })];

		expect(equipmentEncumbrance(items, CHARACTER)).toEqual({ value: 5, thresholdBonus: 0 });
	});

	it("adds the encumbrance of each item of a vehicle's stack to the value", () => {
		const items = [item('rope', { encumbrance: 1, quantity: 3 }), item('sword', { type: 'weapon', encumbrance: 2 })];

		expect(equipmentEncumbrance(items, VEHICLE)).toEqual({ value: 5, thresholdBonus: 0 });
	});

	it('ignores the item types that are not relevant to encumbrance', () => {
		const items = [item('talent', { type: 'talent', encumbrance: 4 }), item('ability', { type: 'ability', encumbrance: -2 })];

		expect(equipmentEncumbrance(items, CHARACTER)).toEqual({ value: 0, thresholdBonus: 0 });
	});

	it("raises a character's threshold by a negative encumbrance instead of lowering the value, like a backpack's +4 (CRB p. 94)", () => {
		const backpack = item('backpack', { type: 'container', encumbrance: -4 });

		expect(equipmentEncumbrance([backpack], CHARACTER)).toEqual({ value: 0, thresholdBonus: 4 });
	});

	it('raises the threshold by the negative encumbrance of each item of a stack, instead of lowering the value', () => {
		const saddlebag = item('saddlebag', { encumbrance: -2 });
		const saddlebags = item('saddlebags', { encumbrance: -2, quantity: 2 });

		expect(equipmentEncumbrance([saddlebag], CHARACTER)).toEqual({ value: 0, thresholdBonus: 2 });
		expect(equipmentEncumbrance([saddlebag], VEHICLE)).toEqual({ value: 0, thresholdBonus: 2 });
		expect(equipmentEncumbrance([saddlebags], CHARACTER)).toEqual({ value: 0, thresholdBonus: 4 });
		expect(equipmentEncumbrance([saddlebags], VEHICLE)).toEqual({ value: 0, thresholdBonus: 4 });
	});

	it("leaves a character's Dropped equipment out of both the value and the threshold, as it isn't carried (CRB p. 84)", () => {
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

	it("leaves the contents of a character's Dropped container out of both the value and the threshold (CRB p. 84)", () => {
		// A container can't hold another one any more, but older worlds may still have a pouch in a backpack.
		const items = [
			item('backpack', { type: 'container', state: 'dropped' }),
			item('pouch', { type: 'container', container: 'backpack' }),
			item('rope', { encumbrance: 1, container: 'backpack' }),
			item('saddlebags', { encumbrance: -2, quantity: 2, container: 'backpack' }),
			item('saddlebag', { encumbrance: -2, container: 'pouch' }),
		];

		expect(equipmentEncumbrance(items, CHARACTER)).toEqual({ value: 0, thresholdBonus: 0 });
	});

	it("still counts the contents of a vehicle's Dropped container", () => {
		const items = [
			item('backpack', { type: 'container', state: 'dropped' }),
			item('pouch', { type: 'container', container: 'backpack' }),
			item('rope', { encumbrance: 1, container: 'backpack' }),
			item('saddlebags', { encumbrance: -2, quantity: 2, container: 'backpack' }),
			item('saddlebag', { encumbrance: -2, container: 'pouch' }),
		];

		expect(equipmentEncumbrance(items, VEHICLE)).toEqual({ value: 1, thresholdBonus: 6 });
	});

	it("counts the contents of a character's container that is not Dropped (CRB p. 84)", () => {
		const items = [
			item('backpack', { type: 'container' }),
			item('pouch', { type: 'container', container: 'backpack' }),
			item('rope', { encumbrance: 1, container: 'backpack' }),
			item('saddlebag', { encumbrance: -2, container: 'pouch' }),
		];

		expect(equipmentEncumbrance(items, CHARACTER)).toEqual({ value: 1, thresholdBonus: 2 });
	});

	it("counts a character's Equipped armor 3 less, to a minimum of 0, for one of its quantity (CRB p. 84, 92)", () => {
		const plate = item('plate', { type: 'armor', encumbrance: 4, state: 'equipped' });
		const leather = item('leather', { type: 'armor', encumbrance: 2, state: 'equipped' });
		const plates = item('plates', { type: 'armor', encumbrance: 4, quantity: 3, state: 'equipped' });

		expect(equipmentEncumbrance([plate], CHARACTER)).toEqual({ value: 1, thresholdBonus: 0 });
		expect(equipmentEncumbrance([leather], CHARACTER)).toEqual({ value: 0, thresholdBonus: 0 });
		expect(equipmentEncumbrance([plates], CHARACTER)).toEqual({ value: 9, thresholdBonus: 0 });
	});

	it("counts a character's armor in full when it is carried instead of worn (CRB p. 92)", () => {
		const plate = item('plate', { type: 'armor', encumbrance: 4 });

		expect(equipmentEncumbrance([plate], CHARACTER)).toEqual({ value: 4, thresholdBonus: 0 });
	});

	it("counts a vehicle's armor in full, Equipped or not", () => {
		const equippedPlate = item('equippedPlate', { type: 'armor', encumbrance: 4, state: 'equipped' });

		expect(equipmentEncumbrance([equippedPlate], VEHICLE)).toEqual({ value: 4, thresholdBonus: 0 });
	});
});

describe('characterEncumbrance', () => {
	it("sets the threshold at 5 plus Brawn, raised by the effects' threshold and the negative encumbrance (CRB p. 85, 94)", () => {
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
	it('is true only when the value is over the threshold (CRB p. 85)', () => {
		expect(isEncumbered({ value: 8, threshold: 7 })).toBe(true);
		expect(isEncumbered({ value: 7, threshold: 7 })).toBe(false);
		expect(isEncumbered({ value: 0, threshold: 7 })).toBe(false);
	});

	it("puts the book's example over the threshold: a box, a shovel and a pistol on a character with Brawn 2 (CRB p. 85)", () => {
		const items = [
			item('box', { encumbrance: 5 }),
			item('shovel', { encumbrance: 3 }),
			item('pistol', { type: 'weapon', encumbrance: 2 }),
		];
		const encumbrance = characterEncumbrance(equipmentEncumbrance(items, CHARACTER), { value: 0, threshold: 0 }, 2);

		expect(encumbrance).toEqual({ value: 10, threshold: 7 });
		expect(isEncumbered(encumbrance)).toBe(true);
	});
});
