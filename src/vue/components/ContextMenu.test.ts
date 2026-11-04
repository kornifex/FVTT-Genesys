// @vitest-environment happy-dom
/** @file Tests for the menu a row opens on a right-click, or on a click on its actions button. */

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import ContextMenu from '@/vue/components/ContextMenu.vue';
import type { ContextMenuHandle } from '@/vue/components/ContextMenuHandle';

const slots = { default: '<span class="row">E2E Sword</span>', 'menu-items': '<a class="entry">Delete</a>' };

function mountMenu(props: InstanceType<typeof ContextMenu>['$props'] = {}) {
	// Attached to the document, which closes the menu on a click anywhere.
	return mount(ContextMenu, { props, slots, attachTo: document.body });
}

/** Clicks somewhere else in the document, and tells whether the menu kept the click from doing anything. */
function clickElsewhere(type: 'click' | 'contextmenu' = 'click') {
	const event = new MouseEvent(type, { bubbles: true, cancelable: true });
	document.body.dispatchEvent(event);
	return event.defaultPrevented;
}

// A menu left open keeps its listeners on the document, which would take the next test's first click.
enableAutoUnmount(afterEach);

describe('ContextMenu', () => {
	it('shows its content, without its menu', () => {
		const menu = mountMenu();

		expect(menu.find('.row').exists()).toBe(true);
		expect(menu.find('.entry').exists()).toBe(false);
	});

	it('opens on a right-click, which shows no browser menu', async () => {
		const menu = mountMenu();
		const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });

		menu.get('.row').element.dispatchEvent(event);
		await menu.vm.$nextTick();

		expect(menu.find('.entry').exists()).toBe(true);
		expect(event.defaultPrevented).toBe(true);
	});

	it('opens on a click instead of a right-click when it uses the primary click', async () => {
		const menu = mountMenu({ usePrimaryClick: true });

		await menu.get('.row').trigger('contextmenu');
		expect(menu.find('.entry').exists()).toBe(false);

		await menu.get('.row').trigger('click');
		expect(menu.find('.entry').exists()).toBe(true);
	});

	it('never opens while disabled', async () => {
		const menu = mountMenu({ disableMenu: true });

		await menu.get('.row').trigger('contextmenu');

		expect(menu.find('.entry').exists()).toBe(false);
	});

	it('closes on the next click or right-click anywhere, which does nothing else', async () => {
		for (const type of ['click', 'contextmenu'] as const) {
			const menu = mountMenu();
			await menu.get('.row').trigger('contextmenu');

			const prevented = clickElsewhere(type);
			await menu.vm.$nextTick();

			expect(menu.find('.entry').exists()).toBe(false);
			expect(prevented).toBe(true);
			menu.unmount();
		}
	});

	it('lets the clicks after the one that closed it through', async () => {
		const menu = mountMenu();
		await menu.get('.row').trigger('contextmenu');
		clickElsewhere();

		expect(clickElsewhere()).toBe(false);
	});

	it('lets the clicks through once its sheet closes with the menu open', async () => {
		const menu = mountMenu();
		await menu.get('.row').trigger('contextmenu');

		menu.unmount();

		expect(clickElsewhere()).toBe(false);
	});

	it('opens from another element through its handle, as a row does on a right-click', async () => {
		const menu = mountMenu();

		(menu.vm as unknown as ContextMenuHandle).open(new MouseEvent('contextmenu', { clientX: 10, clientY: 20 }));
		await menu.vm.$nextTick();

		expect(menu.find('.entry').exists()).toBe(true);
	});
});
