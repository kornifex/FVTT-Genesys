// @vitest-environment happy-dom
/** @file Tests for the chevron that shows or hides a row's description. */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DescriptionToggle from '@/vue/components/DescriptionToggle.vue';

beforeEach(() => {
	// Foundry localizes a key into its text: here, the key marked as localized.
	vi.stubGlobal('game', { i18n: { localize: (key: string) => `localized ${key}` } });
});

describe('DescriptionToggle', () => {
	it('shows no toggle for a description that shows nothing', () => {
		const toggle = mount(DescriptionToggle, { props: { description: '<p>&nbsp;</p>', open: false } });

		expect(toggle.find('.description-toggle').exists()).toBe(false);
	});

	it('points right, named Show and closed, while the description is closed', () => {
		const toggle = mount(DescriptionToggle, { props: { description: '<p>Sharp.</p>', open: false } });
		const button = toggle.get('button.description-toggle');

		expect(button.attributes('aria-label')).toBe('localized Genesys.Tooltips.ShowDescription');
		expect(button.attributes('aria-expanded')).toBe('false');
		expect(toggle.get('i').classes()).toContain('fa-chevron-right');
	});

	it('points down, named Hide and open, while the description is open', () => {
		const toggle = mount(DescriptionToggle, { props: { description: '<p>Sharp.</p>', open: true } });
		const button = toggle.get('button.description-toggle');

		expect(button.attributes('aria-label')).toBe('localized Genesys.Tooltips.HideDescription');
		expect(button.attributes('aria-expanded')).toBe('true');
		expect(toggle.get('i').classes()).toContain('fa-chevron-down');
	});

	it('asks to toggle on a click, leaving the open state to its parent', async () => {
		const toggle = mount(DescriptionToggle, { props: { description: '<p>Sharp.</p>', open: false } });

		await toggle.get('.description-toggle').trigger('click');

		expect(toggle.emitted('toggle')).toHaveLength(1);
		expect(toggle.get('i').classes()).toContain('fa-chevron-right');
	});
});
