// @vitest-environment happy-dom
/** @file Tests for the Additional Effects of a spell, as their rows show and remove them. */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type App, h } from 'vue';
import AdditionalEffectRows from '@/vue/components/item/AdditionalEffectRows.vue';
import { provideSheetContext } from '@/vue/SheetContext';
import type { ContainedAdditionalEffect } from '@/item/data/Spells';
import { confirmDelete } from '@/operations/ItemActions';

vi.mock('@/operations/ItemActions', () => ({ confirmDelete: vi.fn() }));
// The description's editor is Foundry's; the glyphs read the world's dice settings.
vi.mock('@/vue/components/Editor.vue', () => ({ default: { render: () => null } }));
vi.mock('@/vue/components/Glyphs.vue', () => ({
	default: { props: ['glyphs'], render: (self: { glyphs: string }) => h('span', { class: 'glyphs' }, self.glyphs) },
}));

beforeEach(() => {
	vi.stubGlobal('game', {
		i18n: {
			localize: (key: string) => key,
			format: (key: string, data: Record<string, string>) => `${key} ${Object.values(data).join(', ')}`,
		},
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

const range = (id: string, difficulty = 1): ContainedAdditionalEffect => ({
	id,
	name: 'Range',
	description: '',
	difficulty,
	startsChecked: false,
	repeatable: false,
	qualities: [],
	critical: null,
	doublesDamageCharacteristic: false,
});

function mountRows(additionalEffects: ContainedAdditionalEffect[], onChange = vi.fn()) {
	return mount(() => h(AdditionalEffectRows, { additionalEffects, onChange }), {
		global: { plugins: [{ install: (app: App) => void provideSheetContext(app, { sheet: {}, document: {}, editable: true }) }] },
	});
}

describe('AdditionalEffectRows', () => {
	it('lists an effect added twice as two rows, each with the Difficulty dice it adds (CRB p. 215)', () => {
		const rows = mountRows([range('r1'), range('r2', 2)]);
		expect(rows.findAll('.additional-effect').map((row) => [row.get('.name').text(), row.get('.glyphs').text()])).toEqual([
			['Range', 'D'],
			['Range', 'DD'],
		]);
	});

	it('removes the effect the user confirms, leaving its twin on the spell', async () => {
		vi.mocked(confirmDelete).mockResolvedValue(true);
		const onChange = vi.fn();
		const rows = mountRows([range('r1'), range('r2')], onChange);

		await rows.findAll('.additional-effect')[1].get('button').trigger('click');
		await flushPromises();

		expect(confirmDelete).toHaveBeenCalledWith('Range');
		expect(onChange).toHaveBeenCalledExactlyOnceWith([range('r1')]);
	});

	it('lets the copy on the spell be added more than once, from its details, without touching its twin', async () => {
		const onChange = vi.fn();
		const rows = mountRows([range('r1'), range('r2')], onChange);
		const second = rows.findAll('.additional-effect')[1];

		await second.get('button[aria-expanded]').trigger('click');
		const checkbox = second.get<HTMLInputElement>('.repeatable input');
		expect(checkbox.element.checked).toBe(false);
		await checkbox.setValue(true);

		expect(onChange).toHaveBeenCalledExactlyOnceWith([range('r1'), { ...range('r2'), repeatable: true }]);
	});
});
