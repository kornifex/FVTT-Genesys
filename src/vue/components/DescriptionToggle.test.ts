// @vitest-environment happy-dom
/** @file Tests for the chevron that shows or hides a row's description. */

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import DescriptionToggle from '@/vue/components/DescriptionToggle.vue';

describe('DescriptionToggle', () => {
	it('shows no toggle for a description that shows nothing', () => {
		const toggle = mount(DescriptionToggle, { props: { description: '<p>&nbsp;</p>', open: false } });

		expect(toggle.find('.description-toggle').exists()).toBe(false);
	});

	it('points right with a Show tooltip while the description is closed', () => {
		const toggle = mount(DescriptionToggle, { props: { description: '<p>Sharp.</p>', open: false } });

		expect(toggle.get('.description-toggle').attributes('data-tooltip')).toBe('Genesys.Tooltips.ShowDescription');
		expect(toggle.get('i').classes()).toContain('fa-chevron-right');
	});

	it('points down with a Hide tooltip while the description is open', () => {
		const toggle = mount(DescriptionToggle, { props: { description: '<p>Sharp.</p>', open: true } });

		expect(toggle.get('.description-toggle').attributes('data-tooltip')).toBe('Genesys.Tooltips.HideDescription');
		expect(toggle.get('i').classes()).toContain('fa-chevron-down');
	});

	it('asks to toggle on a click, leaving the open state to its parent', async () => {
		const toggle = mount(DescriptionToggle, { props: { description: '<p>Sharp.</p>', open: false } });

		await toggle.get('.description-toggle').trigger('click');

		expect(toggle.emitted('toggle')).toHaveLength(1);
		expect(toggle.get('i').classes()).toContain('fa-chevron-right');
	});
});
