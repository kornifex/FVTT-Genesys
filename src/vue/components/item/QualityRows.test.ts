// @vitest-environment happy-dom
/** @file Tests for the qualities of a weapon's profile or of an armor, as their rows edit them. */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type App, h } from 'vue';
import QualityRows from '@/vue/components/item/QualityRows.vue';
import { provideSheetContext } from '@/vue/SheetContext';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { addQualityEffect } from '@/operations/QualityEffects';

vi.mock('@/operations/QualityEffects', () => ({ addQualityEffect: vi.fn(async () => undefined) }));
vi.mock('@/operations/ItemActions', () => ({ confirmDelete: vi.fn() }));
// The description's editor is Foundry's.
vi.mock('@/vue/components/Editor.vue', () => ({ default: { render: () => null } }));

const item = { name: 'Shield' };

beforeEach(() => {
	vi.stubGlobal('game', {
		i18n: {
			localize: (key: string) => key,
			format: (key: string, data: Record<string, string>) => `${key} ${Object.values(data).join(', ')}`,
		},
	});
	vi.stubGlobal('foundry', { utils: { randomID: () => 'newId' } });
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

// Defensive as a weapon stored it before its qualities had ids.
const legacy: ContainedItemQuality = {
	id: '',
	name: 'Defensive',
	description: '',
	activation: 'passive',
	advantageCost: 2,
	isRated: true,
	rating: 1,
};

/** Mounts the rows on a sheet the user can edit, with Defensive's details open. */
async function mountRows(onChange: (qualities: ContainedItemQuality[]) => unknown) {
	const rows = mount(() => h(QualityRows, { qualities: [legacy], path: 'system.qualities', onChange }), {
		global: { plugins: [{ install: (app: App) => void provideSheetContext(app, { sheet: {}, document: item, editable: true }) }] },
	});
	await rows.findAll('.data-rated button').at(-1)!.trigger('click');
	return rows;
}

describe('QualityRows', () => {
	it("saves a quality's first id before adding an effect tagged with it, and adds none on a click meanwhile", async () => {
		let saved!: () => void;
		const onChange = vi.fn(() => new Promise<void>((resolve) => (saved = resolve)));
		const rows = await mountRows(onChange);

		await rows.get('.add-effect').trigger('click');
		await rows.get('.add-effect').trigger('click');
		expect(onChange).toHaveBeenCalledExactlyOnceWith([{ ...legacy, id: 'newId' }]);
		expect(addQualityEffect).not.toHaveBeenCalled();

		saved();
		await flushPromises();
		expect(addQualityEffect).toHaveBeenCalledExactlyOnceWith(item, { ...legacy, id: 'newId' });
	});
});
