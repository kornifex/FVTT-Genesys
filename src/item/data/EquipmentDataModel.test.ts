/**
 * @file Tests for how equipment's data is read: the Used Equipment State, dropped in #205, reads as Carried.
 */

import { describe, expect, it, vi } from 'vitest';

// The data model extends a Foundry class, whose own migration leaves the source as it is.
vi.hoisted(() => {
	vi.stubGlobal('foundry', { abstract: { DataModel: class {} } });
	Object.assign(globalThis.foundry.abstract.DataModel, { migrateData: (source: object) => source });
});

import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';

describe('EquipmentDataModel.migrateData', () => {
	it('reads an item saved in the Used state, which nothing sets any longer, as Carried', () => {
		expect(EquipmentDataModel.migrateData({ state: 'used' }).state).toBe('carried');
	});

	it('leaves the other states as they are', () => {
		for (const state of ['carried', 'dropped', 'equipped']) {
			expect(EquipmentDataModel.migrateData({ state }).state).toBe(state);
		}
	});

	it('leaves a source with no state without one', () => {
		expect(EquipmentDataModel.migrateData({})).toEqual({});
	});
});
