/**
 * @file Tests for the Equipment States in which the effects of equipment apply.
 */

import { describe, expect, it, vi } from 'vitest';

// `EquipmentState` and the relevant types live in data models, which extend a Foundry class.
vi.hoisted(() => {
	vi.stubGlobal('foundry', { abstract: { DataModel: class {} } });
});

import { isSuppressedByEquipmentState } from '@/actor/data/EquipmentEffects';
import { EquipmentState } from '@/item/data/EquipmentDataModel';

const ALL_STATES = [EquipmentState.Carried, EquipmentState.Dropped, EquipmentState.Equipped, EquipmentState.Used];

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

	it("applies a character's consumables only while they are used", () => {
		expect(applyingStates('character', 'consumable')).toEqual([EquipmentState.Used]);
	});

	it("applies a character's other equipment only while it is carried, like a backpack while worn (CRB p. 94)", () => {
		expect(applyingStates('character', 'gear')).toEqual([EquipmentState.Carried]);
		expect(applyingStates('character', 'container')).toEqual([EquipmentState.Carried]);
	});

	it("applies a vehicle's vehicle weapons only while they are equipped", () => {
		expect(applyingStates('vehicle', 'vehicleWeapon')).toEqual([EquipmentState.Equipped]);
	});

	it("applies a vehicle's consumables only while they are used", () => {
		expect(applyingStates('vehicle', 'consumable')).toEqual([EquipmentState.Used]);
	});

	it("applies a vehicle's other equipment, weapons and armor included, only while it is carried", () => {
		expect(applyingStates('vehicle', 'weapon')).toEqual([EquipmentState.Carried]);
		expect(applyingStates('vehicle', 'armor')).toEqual([EquipmentState.Carried]);
		expect(applyingStates('vehicle', 'gear')).toEqual([EquipmentState.Carried]);
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
