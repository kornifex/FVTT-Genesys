/**
 * @file Tests for the equipment states in which the effects of equipment apply.
 */

import { describe, expect, it, vi } from 'vitest';

// `EquipmentState` lives next to a data model, which extends a Foundry class.
vi.hoisted(() => {
	vi.stubGlobal('foundry', { abstract: { DataModel: class {} } });
});

import { areEffectsDisabled, IsEquipmentType } from '@/actor/data/EquipmentEffects';
import { isRelevantType } from '@/actor/data/RelevantTypes';
import { EquipmentState } from '@/item/data/EquipmentDataModel';

const isEquipmentType: IsEquipmentType = (context, type) =>
	isRelevantType(
		{
			INVENTORY: ['weapon', 'consumable', 'gear'],
			EQUIPABLE: ['weapon'],
			CONSUMABLE: ['consumable'],
		},
		context,
		type,
	);

const ALL_STATES = [EquipmentState.Carried, EquipmentState.Dropped, EquipmentState.Equipped, EquipmentState.Used];

function enabledStates(itemType: string) {
	return ALL_STATES.filter((state) => !areEffectsDisabled(isEquipmentType, itemType, state));
}

describe('areEffectsDisabled', () => {
	it('enables the effects of an equipable item only while it is equipped', () => {
		expect(enabledStates('weapon')).toEqual([EquipmentState.Equipped]);
	});

	it('enables the effects of a consumable only while it is used', () => {
		expect(enabledStates('consumable')).toEqual([EquipmentState.Used]);
	});

	it('enables the effects of other equipment only while it is carried', () => {
		expect(enabledStates('gear')).toEqual([EquipmentState.Carried]);
	});

	it('always enables the effects of an item that is not equipment', () => {
		expect(enabledStates('talent')).toEqual(ALL_STATES);
	});
});
