/**
 * @file Tests for the Equipment States in which the effects of equipment apply.
 */

import { describe, expect, it, vi } from 'vitest';

// `EquipmentState` and the relevant types live in data models, which extend a Foundry class.
vi.hoisted(() => {
	vi.stubGlobal('foundry', { abstract: { DataModel: class {} } });
});

import { isSuppressedAsConsumable, isSuppressedByContainer, isSuppressedByEquipmentState } from '@/actor/data/EquipmentEffects';
import { EquipmentState } from '@/item/data/EquipmentDataModel';

const ALL_STATES = [EquipmentState.Carried, EquipmentState.Dropped, EquipmentState.Equipped];

// The states in which an item's effects apply to an actor.
function applyingStates(actorType: string, itemType: string) {
	return ALL_STATES.filter((state) => !isSuppressedByEquipmentState(actorType, { type: itemType, system: { state } }));
}

describe('isSuppressedByEquipmentState', () => {
	it("applies a character's armor only while it is equipped, as armor protects while worn (CRB p. 92)", () => {
		expect(applyingStates('character', 'armor')).toEqual([EquipmentState.Equipped]);
	});

	it("applies a character's weapons only while they are equipped", () => {
		expect(applyingStates('character', 'weapon')).toEqual([EquipmentState.Equipped]);
	});

	it("never applies a character's consumables, which have no way to be used (#205)", () => {
		expect(applyingStates('character', 'consumable')).toEqual([]);
	});

	it("applies a character's other equipment only while it is carried, like a backpack while worn (CRB p. 94)", () => {
		expect(applyingStates('character', 'gear')).toEqual([EquipmentState.Carried]);
		expect(applyingStates('character', 'container')).toEqual([EquipmentState.Carried]);
	});

	it("applies a vehicle's vehicle weapons only while they are equipped", () => {
		expect(applyingStates('vehicle', 'vehicleWeapon')).toEqual([EquipmentState.Equipped]);
	});

	it("never applies a vehicle's consumables", () => {
		expect(applyingStates('vehicle', 'consumable')).toEqual([]);
	});

	it("applies a vehicle's other equipment, weapons and armor included, only while it is carried", () => {
		expect(applyingStates('vehicle', 'weapon')).toEqual([EquipmentState.Carried]);
		expect(applyingStates('vehicle', 'armor')).toEqual([EquipmentState.Carried]);
		expect(applyingStates('vehicle', 'gear')).toEqual([EquipmentState.Carried]);
	});

	it("suppresses a character's armor held in a Container, whatever its state, as it isn't worn (CRB p. 92)", () => {
		for (const state of ALL_STATES) {
			expect(isSuppressedByEquipmentState('character', { type: 'armor', system: { state, container: 'box' } })).toBe(true);
		}
	});

	it("suppresses a character's weapon and a vehicle's vehicle weapon held in a Container, though Equipped", () => {
		expect(
			isSuppressedByEquipmentState('character', { type: 'weapon', system: { state: EquipmentState.Equipped, container: 'box' } }),
		).toBe(true);
		expect(
			isSuppressedByEquipmentState('vehicle', {
				type: 'vehicleWeapon',
				system: { state: EquipmentState.Equipped, container: 'hold' },
			}),
		).toBe(true);
	});

	it('applies equipment that can be equipped while it is Equipped in no Container', () => {
		expect(
			isSuppressedByEquipmentState('character', { type: 'weapon', system: { state: EquipmentState.Equipped, container: '' } }),
		).toBe(false);
		expect(
			isSuppressedByEquipmentState('character', { type: 'armor', system: { state: EquipmentState.Equipped, container: '' } }),
		).toBe(false);
		expect(
			isSuppressedByEquipmentState('vehicle', { type: 'vehicleWeapon', system: { state: EquipmentState.Equipped, container: '' } }),
		).toBe(false);
	});

	it("applies other equipment held in a Carried Container, as it takes the Container's state", () => {
		expect(
			isSuppressedByEquipmentState('character', { type: 'gear', system: { state: EquipmentState.Carried, container: 'box' } }),
		).toBe(false);
	});

	it('never applies a consumable held in a Container, whatever its state', () => {
		for (const actorType of ['character', 'vehicle']) {
			for (const state of ALL_STATES) {
				expect(isSuppressedByEquipmentState(actorType, { type: 'consumable', system: { state, container: 'box' } })).toBe(true);
			}
		}
	});

	it('always applies the equipment of adversaries', () => {
		for (const actorType of ['minion', 'rival', 'nemesis']) {
			for (const itemType of ['weapon', 'armor', 'consumable', 'gear', 'container']) {
				expect(applyingStates(actorType, itemType)).toEqual(ALL_STATES);
			}
		}
	});

	it('always applies the effects of items that are not equipment', () => {
		expect(isSuppressedByEquipmentState('character', { type: 'talent', system: {} })).toBe(false);
		expect(isSuppressedByEquipmentState('vehicle', { type: 'injury', system: {} })).toBe(false);
	});
});

describe('isSuppressedByContainer', () => {
	it('tells when the Container holding equipment that can be equipped is what suppresses its effects', () => {
		expect(isSuppressedByContainer('character', { type: 'armor', system: { state: EquipmentState.Equipped, container: 'box' } })).toBe(
			true,
		);
		expect(isSuppressedByContainer('character', { type: 'armor', system: { state: EquipmentState.Equipped, container: '' } })).toBe(
			false,
		);
	});

	it("leaves other equipment to its state, and adversaries' equipment alone", () => {
		expect(isSuppressedByContainer('character', { type: 'gear', system: { state: EquipmentState.Dropped, container: 'box' } })).toBe(
			false,
		);
		expect(isSuppressedByContainer('rival', { type: 'armor', system: { state: EquipmentState.Equipped, container: 'box' } })).toBe(
			false,
		);
	});
});

describe('isSuppressedAsConsumable', () => {
	it("tells when being a consumable is what suppresses an item's effects, on characters and vehicles", () => {
		for (const actorType of ['character', 'vehicle']) {
			expect(
				isSuppressedAsConsumable(actorType, { type: 'consumable', system: { state: EquipmentState.Carried, container: '' } }),
			).toBe(true);
			expect(isSuppressedAsConsumable(actorType, { type: 'gear', system: { state: EquipmentState.Dropped, container: '' } })).toBe(
				false,
			);
		}
	});

	it("leaves adversaries' consumables alone", () => {
		expect(isSuppressedAsConsumable('minion', { type: 'consumable', system: { state: EquipmentState.Carried, container: '' } })).toBe(
			false,
		);
	});
});
