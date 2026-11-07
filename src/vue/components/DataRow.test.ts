// @vitest-environment happy-dom
/** @file Tests for a data row's label, which names its own input, the control of its slot, or the list of a group. */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import DataRow from '@/vue/components/DataRow.vue';

beforeEach(() => {
	vi.stubGlobal('game', { i18n: { localize: (key: string) => `localized ${key}` } });
});

/** The text of the element an id points to, in the row. */
function textOf(row: ReturnType<typeof mount>, id: string | undefined) {
	return id ? row.get(`[id="${id}"]`).text() : undefined;
}

describe('DataRow', () => {
	it('ties its label to the input it renders for its field', () => {
		const row = mount(DataRow, { props: { label: 'Genesys.Labels.Source', name: 'system.source', value: 'Core' } });
		const input = row.get('input');

		expect(input.attributes('id')).toBeTruthy();
		expect(row.get('label').attributes('for')).toBe(input.attributes('id'));
		expect(row.get(`label[for="${input.attributes('id')}"]`).text()).toBe('localized Genesys.Labels.Source');
		expect(input.attributes('name')).toBe('system.source');
		expect(row.attributes('role')).toBeUndefined();
	});

	it("hands its slot the id its label is tied to, for the slot's control", () => {
		const row = mount(DataRow, {
			props: { label: 'Genesys.Labels.Severity' },
			slots: { default: ({ id }: { id: string }) => h('select', { id, name: 'system.severity' }) },
		});
		const select = row.get('select');

		expect(select.attributes('id')).toBeTruthy();
		expect(row.get('label').attributes('for')).toBe(select.attributes('id'));
		expect(row.find('input').exists()).toBe(false);
	});

	it("names a group with its label, and hands the label's id to the group's controls", () => {
		const row = mount(DataRow, {
			props: { label: 'Genesys.Labels.Activation', group: true },
			slots: {
				default: ({ labelId }: { labelId: string }) => [
					h('select', { 'aria-labelledby': labelId }),
					h('input', { type: 'text', 'aria-label': 'Detail' }),
				],
			},
		});

		expect(row.attributes('role')).toBe('group');
		expect(textOf(row, row.attributes('aria-labelledby'))).toBe('localized Genesys.Labels.Activation');
		expect(row.get('label').attributes('for')).toBeUndefined();
		expect(textOf(row, row.get('select').attributes('aria-labelledby'))).toBe('localized Genesys.Labels.Activation');
	});

	it('gives each of its rows ids of their own', () => {
		const Rows = defineComponent({
			render: () => [
				h(DataRow, { label: 'Genesys.Labels.Price', name: 'system.price' }),
				h(DataRow, { label: 'Genesys.Labels.Rarity', name: 'system.rarity' }),
			],
		});
		const ids = mount(Rows)
			.findAll('input')
			.map((input) => input.attributes('id'));

		expect(new Set(ids).size).toBe(2);
	});
});
