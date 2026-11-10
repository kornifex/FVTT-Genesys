// @vitest-environment happy-dom
/** @file Tests for a row's name that rolls its check: its name, its tooltip and its roll. */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RollLink from '@/vue/components/RollLink.vue';

beforeEach(() => {
	// A formatted key followed by its data, so that the test reads what was asked for.
	vi.stubGlobal('game', {
		i18n: {
			localize: (key: string) => key,
			format: (key: string, data: Record<string, string>) => [key, ...Object.values(data)].join(' '),
		},
	});
});

function mountLink(onRoll = vi.fn()) {
	return mount(RollLink, {
		props: { label: 'Genesys.Tooltips.RollAttack', labelData: { weapon: 'E2E Sword' }, onRoll },
		slots: { default: 'E2E Sword' },
		attachTo: document.body,
	});
}

describe('RollLink', () => {
	it('is a button named by the name it shows', () => {
		const link = mountLink();

		expect((link.element as HTMLElement).tagName).toBe('BUTTON');
		expect(link.attributes('type')).toBe('button');
		expect(link.text()).toBe('E2E Sword');
		expect(link.attributes('aria-label')).toBeUndefined();
		link.unmount();
	});

	it('shows the name alone, with no die (#638)', () => {
		const link = mountLink();

		expect(link.find('i').exists()).toBe(false);
		expect(link.html()).not.toContain('fa-dice-d20');
		expect((link.element as HTMLElement).textContent).toBe('E2E Sword');
		link.unmount();
	});

	it('names the check in its tooltip', () => {
		const link = mountLink();

		expect(link.attributes('data-tooltip-text')).toBe('Genesys.Tooltips.RollAttack E2E Sword');
		link.unmount();
	});

	it('rolls on a click, and from the keyboard, keeping the focus there', async () => {
		const onRoll = vi.fn();
		const link = mountLink(onRoll);
		const element = link.element as HTMLButtonElement;

		await link.trigger('click');
		element.focus();
		// Enter or Space on a focused button clicks it with no pointer.
		element.dispatchEvent(new PointerEvent('click', { bubbles: true, pointerType: '' }));

		expect(onRoll).toHaveBeenCalledTimes(2);
		expect(document.activeElement).toBe(element);
		link.unmount();
	});
});
