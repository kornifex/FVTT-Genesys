/**
 * @file Tests for gear that stops being Wearable Gear while Equipped, which goes back to Carried.
 */

import { describe, expect, it, vi } from 'vitest';

// The data model extends a Foundry class, whose own pre-update hook lets every update through.
vi.hoisted(() => {
	vi.stubGlobal('foundry', { abstract: { TypeDataModel: class {} } });
	Object.assign(globalThis.foundry.abstract.TypeDataModel.prototype, { _preUpdate: async () => undefined });
});

import { GearDataModel } from '@/item/data/GearDataModel';
import { EquipmentState } from '@/item/data/EquipmentState';

type Changes = { system?: { wearable?: boolean; state?: EquipmentState } };

// The changes an update of gear in a state makes once its pre-update hook ran.
async function preUpdated(state: EquipmentState, changes: Changes) {
	const gear = Object.assign(Object.create(GearDataModel.prototype), { state }) as GearDataModel;
	// The hook is protected: Foundry calls it before each update of the item.
	await (gear as unknown as { _preUpdate(changes: Changes): Promise<unknown> })._preUpdate(changes);
	return changes;
}

describe('GearDataModel._preUpdate', () => {
	it('puts Equipped gear back to Carried in the update that turns Wearable off', async () => {
		expect(await preUpdated(EquipmentState.Equipped, { system: { wearable: false } })).toEqual({
			system: { wearable: false, state: EquipmentState.Carried },
		});
	});

	it('leaves gear that is not Equipped in its state, and Equipped gear that stays wearable', async () => {
		expect(await preUpdated(EquipmentState.Dropped, { system: { wearable: false } })).toEqual({ system: { wearable: false } });
		expect(await preUpdated(EquipmentState.Equipped, { system: { wearable: true } })).toEqual({ system: { wearable: true } });
		expect(await preUpdated(EquipmentState.Equipped, {})).toEqual({});
	});

	it('puts gear back to Carried when the same update equips it and turns Wearable off', async () => {
		expect(await preUpdated(EquipmentState.Carried, { system: { wearable: false, state: EquipmentState.Equipped } })).toEqual({
			system: { wearable: false, state: EquipmentState.Carried },
		});
	});
});
