// @vitest-environment happy-dom
/** @file Tests for what a list shows under its heading when it has no row. */

import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ListEmpty from '@/vue/components/ListEmpty.vue';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('ListEmpty', () => {
	it('says the list has nothing, in a paragraph of its own', () => {
		vi.stubGlobal('game', { i18n: { localize: (key: string) => ({ 'Genesys.Labels.ListEmpty': 'None.' })[key] ?? key } });

		const empty = mount(ListEmpty);

		expect(empty.find('p.list-empty').exists()).toBe(true);
		expect(empty.text()).toBe('None.');
	});
});
