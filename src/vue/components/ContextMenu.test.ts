// @vitest-environment happy-dom
/** @file Tests for a row's actions menu: opening it with the mouse or the keyboard, moving between its entries, running one, and closing it. */

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, nextTick } from 'vue';
import ContextMenu from '@/vue/components/ContextMenu.vue';
import type { ContextMenuHandle } from '@/vue/components/ContextMenuHandle';
import MenuItem from '@/vue/components/MenuItem.vue';

type Props = InstanceType<typeof ContextMenu>['$props'];

beforeEach(() => {
	// Foundry localizes a key into its text: here, the key marked as localized.
	vi.stubGlobal('game', { i18n: { localize: (key: string) => `localized ${key}` } });
	// happy-dom lays nothing out: the viewport, which a menu stays inside, gets a size.
	vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1024);
	vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(768);
});

// A menu left open keeps its listeners on the document, which would take the next test's first click.
enableAutoUnmount(afterEach);

// The layout a test gives happy-dom stays in that test.
afterEach(() => {
	vi.restoreAllMocks();
});

/**
 * Mounts a menu around a row holding a button, with three entries, a separator between the first and the others: each
 * entry's action records its label in `ran`.
 */
function mountMenu(props: Props = {}, attachTo: Element = document.body) {
	const ran: string[] = [];
	const entry = (label: string) => h(MenuItem, { icon: 'fas fa-edit', label, onClick: () => ran.push(label) });
	const menu = mount(ContextMenu, {
		props,
		slots: {
			default: () => h('button', { type: 'button', class: 'row' }, 'E2E Sword'),
			'menu-items': () => [entry('Equip'), h('hr'), entry('Edit'), entry('Delete')],
		},
		// Attached to the document, which closes the menu on a click anywhere, and holds the focus.
		attachTo,
	});
	return { menu, ran };
}

const isOpen = (menu: ReturnType<typeof mountMenu>['menu']) => menu.find('[role="menu"]').exists();
/** Where the open menu's top-left corner is placed in the viewport. */
const placed = (menu: ReturnType<typeof mountMenu>['menu']) => {
	const { left, top } = menu.get<HTMLElement>('[role="menu"]').element.style;
	return { left, top };
};
const trigger = (menu: ReturnType<typeof mountMenu>['menu']) => menu.get<HTMLButtonElement>('button.menu-trigger').element;
const entries = (menu: ReturnType<typeof mountMenu>['menu']) =>
	menu.findAll<HTMLButtonElement>('[role="menuitem"]').map((entry) => entry.element);
/** The label of the entry that has the focus, or what else has it. */
const focused = (menu: ReturnType<typeof mountMenu>['menu']) => {
	const active = document.activeElement;
	if (active?.matches('button.menu-trigger') && (menu.element as HTMLElement).contains(active)) return 'trigger';
	return active?.closest('[role="menuitem"]')?.textContent?.trim() ?? active?.tagName;
};

/** A click with the mouse, which names its pointer. */
const pointerClick = () => new PointerEvent('click', { bubbles: true, cancelable: true, pointerType: 'mouse', detail: 1 });
/** The click a browser gives a focused button on Enter or Space, which names no pointer. */
const keyboardClick = () => new PointerEvent('click', { bubbles: true, cancelable: true, pointerType: '' });
/**
 * The `contextmenu` of Shift+F10 or the context menu key, which gives no pointer position: Chromium's names a mouse and
 * no button, where a right-click's names the right button; the Pointer Events spec's names no pointer.
 */
const keyboardContextMenus = () => [
	new PointerEvent('contextmenu', { bubbles: true, cancelable: true, pointerType: 'mouse', button: -1, clientX: 10, clientY: 20 }),
	new PointerEvent('contextmenu', { bubbles: true, cancelable: true, pointerType: '' }),
];
const keyboardContextMenu = () => keyboardContextMenus()[0];

/** Presses a key on an element, and tells whether the menu kept it from its default action. */
function press(element: Element, key: string) {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
	element.dispatchEvent(event);
	return event.defaultPrevented;
}

/** Clicks somewhere else in the document, and tells whether the menu kept the click from doing anything. */
function clickElsewhere(type: 'click' | 'contextmenu' = 'click', target: Element = document.body) {
	const event = new MouseEvent(type, { bubbles: true, cancelable: true });
	target.dispatchEvent(event);
	return event.defaultPrevented;
}

describe('ContextMenu', () => {
	describe('with the mouse', () => {
		it('shows its content, without its menu, and no ⋮ unless it has one', () => {
			const { menu } = mountMenu();

			expect(menu.find('.row').exists()).toBe(true);
			expect(isOpen(menu)).toBe(false);
			expect(menu.find('.menu-trigger').exists()).toBe(false);
		});

		it('opens on a right-click, which shows no browser menu, on its first entry', async () => {
			const { menu } = mountMenu();
			const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });

			menu.get('.row').element.dispatchEvent(event);
			await nextTick();

			expect(isOpen(menu)).toBe(true);
			expect(event.defaultPrevented).toBe(true);
			expect(focused(menu)).toBe('localized Equip');
		});

		it('opens on a click on its ⋮, on its first entry', async () => {
			const { menu } = mountMenu({ trigger: true });

			trigger(menu).dispatchEvent(pointerClick());
			await nextTick();

			expect(isOpen(menu)).toBe(true);
			expect(focused(menu)).toBe('localized Equip');
		});

		it('closes on a click on its ⋮ while it is open, leaving no focus on it', async () => {
			const { menu } = mountMenu({ trigger: true });
			trigger(menu).dispatchEvent(pointerClick());
			await nextTick();

			// The press of the mouse button focuses the ⋮ before its click.
			trigger(menu).focus();
			trigger(menu).dispatchEvent(pointerClick());
			await nextTick();

			expect(isOpen(menu)).toBe(false);
			expect(focused(menu)).toBe('BODY');
		});

		it('runs an entry clicked, then stays closed, leaving the focus on no button', async () => {
			const { menu, ran } = mountMenu({ trigger: true });
			trigger(menu).dispatchEvent(pointerClick());
			await nextTick();

			entries(menu)[2]?.dispatchEvent(pointerClick());
			await nextTick();

			expect(ran).toEqual(['Delete']);
			expect(isOpen(menu)).toBe(false);
			expect(focused(menu)).toBe('BODY');
		});

		it('never opens while disabled, and shows no ⋮ then', async () => {
			const { menu } = mountMenu({ disableMenu: true, trigger: true });

			await menu.get('.row').trigger('contextmenu');

			expect(isOpen(menu)).toBe(false);
			expect(menu.find('.menu-trigger').exists()).toBe(false);
		});

		it('closes on the next click or right-click anywhere, which does nothing else', async () => {
			for (const type of ['click', 'contextmenu'] as const) {
				const { menu } = mountMenu();
				await menu.get('.row').trigger('contextmenu');

				const prevented = clickElsewhere(type);
				await nextTick();

				expect(isOpen(menu)).toBe(false);
				expect(prevented).toBe(true);
				menu.unmount();
			}
		});

		it('lets the clicks after the one that closed it through', async () => {
			const { menu } = mountMenu();
			await menu.get('.row').trigger('contextmenu');
			clickElsewhere();

			expect(clickElsewhere()).toBe(false);
		});

		it('lets the clicks through once its sheet closes with the menu open', async () => {
			const { menu } = mountMenu();
			await menu.get('.row').trigger('contextmenu');

			menu.unmount();

			expect(clickElsewhere()).toBe(false);
		});

		it('opens under the pointer from another element through its handle, as a row does on a right-click', async () => {
			const { menu } = mountMenu({ trigger: true });

			(menu.vm as unknown as ContextMenuHandle).open(new MouseEvent('contextmenu', { clientX: 10, clientY: 20 }));
			await nextTick();

			expect(isOpen(menu)).toBe(true);
			expect(placed(menu)).toEqual({ left: '10px', top: '20px' });
		});

		it('shows in the top layer, as a popover, where nothing of its sheet paints over it', async () => {
			const showPopover = vi.spyOn(HTMLElement.prototype, 'showPopover');
			const { menu } = mountMenu({ trigger: true });

			trigger(menu).dispatchEvent(pointerClick());
			await nextTick();

			const shown = menu.get('[role="menu"]').element;
			expect(shown.getAttribute('popover')).toBe('manual');
			expect(showPopover.mock.contexts).toEqual([shown]);
		});

		it('follows its row as its sheet scrolls, stays put while something else scrolls, and closes once the row is gone from view', async () => {
			const sheet = document.body.appendChild(document.createElement('div'));
			const elsewhere = document.body.appendChild(document.createElement('div'));
			const { menu } = mountMenu({ trigger: true }, sheet);
			const row = vi
				.spyOn(menu.element as HTMLElement, 'getBoundingClientRect')
				.mockReturnValue(DOMRect.fromRect({ x: 30, y: 40, width: 200, height: 20 }));
			trigger(menu).dispatchEvent(pointerClick());
			await nextTick();
			expect(placed(menu)).toEqual({ left: '30px', top: '60px' });

			// The sheet scrolls by 25 pixels.
			row.mockReturnValue(DOMRect.fromRect({ x: 30, y: 15, width: 200, height: 20 }));
			elsewhere.dispatchEvent(new Event('scroll'));
			expect(placed(menu)).toEqual({ left: '30px', top: '60px' });
			sheet.dispatchEvent(new Event('scroll'));
			expect(placed(menu)).toEqual({ left: '30px', top: '35px' });

			row.mockReturnValue(DOMRect.fromRect({ x: 30, y: -40, width: 200, height: 20 }));
			sheet.dispatchEvent(new Event('scroll'));
			await nextTick();
			expect(isOpen(menu)).toBe(false);
			sheet.remove();
			elsewhere.remove();
		});

		it('opens at the box around its content when its container has none of its own, as one laid out as display: contents', async () => {
			const { menu } = mountMenu({ trigger: true });
			const container = menu.element as HTMLElement;
			vi.spyOn(container, 'getClientRects').mockReturnValue([] as unknown as DOMRectList);
			const at = (element: Element, box: DOMRect) => {
				vi.spyOn(element, 'getClientRects').mockReturnValue([box] as unknown as DOMRectList);
				vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(box);
			};
			at(menu.get('.row').element, DOMRect.fromRect({ x: 300, y: 200, width: 80, height: 20 }));
			at(trigger(menu), DOMRect.fromRect({ x: 390, y: 180, width: 15, height: 15 }));

			trigger(menu).dispatchEvent(keyboardClick());
			await nextTick();

			// Below the row and its ⋮, its left edge on the row's.
			expect(placed(menu)).toEqual({ left: '300px', top: '220px' });
		});

		it('opens for a row that shows nothing, on a tab not shown, and stays open as the page scrolls', async () => {
			const { menu } = mountMenu({ trigger: true });
			vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([] as unknown as DOMRectList);

			trigger(menu).dispatchEvent(keyboardClick());
			await nextTick();
			document.dispatchEvent(new Event('scroll'));
			await nextTick();

			expect(isOpen(menu)).toBe(true);
			expect(focused(menu)).toBe('localized Equip');
		});

		it("listens to its own document's clicks, which a window detached from the main one has", async () => {
			const detached = document.implementation.createHTMLDocument();
			const host = detached.body.appendChild(detached.createElement('div'));
			const { menu } = mountMenu({}, host);
			await menu.get('.row').trigger('contextmenu');

			clickElsewhere('click', document.body);
			await nextTick();
			expect(isOpen(menu)).toBe(true);

			expect(clickElsewhere('click', detached.body)).toBe(true);
			await nextTick();
			expect(isOpen(menu)).toBe(false);
		});
	});

	describe('from the keyboard', () => {
		it('has a ⋮ named Actions, which says it opens a menu, and whether it is open', async () => {
			const { menu } = mountMenu({ trigger: true });
			const button = menu.get('button.menu-trigger');

			expect(button.attributes('aria-label')).toBe('localized Genesys.Labels.Actions');
			expect(button.attributes('aria-haspopup')).toBe('menu');
			expect(button.attributes('aria-expanded')).toBe('false');

			trigger(menu).dispatchEvent(keyboardClick());
			await nextTick();

			expect(button.attributes('aria-expanded')).toBe('true');
		});

		it('is a menu of entries, which Tab leaves out', async () => {
			const { menu } = mountMenu({ trigger: true });
			trigger(menu).dispatchEvent(keyboardClick());
			await nextTick();

			expect(entries(menu)).toHaveLength(3);
			expect(entries(menu).map((entry) => [entry.tagName, entry.getAttribute('tabindex')])).toEqual([
				['BUTTON', '-1'],
				['BUTTON', '-1'],
				['BUTTON', '-1'],
			]);
		});

		it('opens on its first entry on Enter or Space, and on ArrowDown', async () => {
			for (const open of [
				(button: HTMLElement) => button.dispatchEvent(keyboardClick()),
				(button: HTMLElement) => press(button, 'ArrowDown'),
			]) {
				const { menu } = mountMenu({ trigger: true });
				trigger(menu).focus();

				open(trigger(menu));
				await nextTick();

				expect(focused(menu)).toBe('localized Equip');
				menu.unmount();
			}
		});

		it('opens on its last entry on ArrowUp', async () => {
			const { menu } = mountMenu({ trigger: true });
			trigger(menu).focus();

			expect(press(trigger(menu), 'ArrowUp')).toBe(true);
			await nextTick();

			expect(focused(menu)).toBe('localized Delete');
		});

		it('moves between its entries with the arrow keys, around from one end to the other, and with Home and End', async () => {
			const { menu } = mountMenu({ trigger: true });
			trigger(menu).dispatchEvent(keyboardClick());
			await nextTick();
			const steps: string[] = [];

			for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'End', 'Home']) {
				press(document.activeElement!, key);
				steps.push(`${key} ${focused(menu)}`);
			}

			expect(steps).toEqual([
				'ArrowDown localized Edit',
				'ArrowDown localized Delete',
				'ArrowDown localized Equip',
				'ArrowUp localized Delete',
				'End localized Delete',
				'Home localized Equip',
			]);
		});

		it('runs an entry on Enter or Space, closes, and gives the focus back to its ⋮', async () => {
			const { menu, ran } = mountMenu({ trigger: true });
			trigger(menu).dispatchEvent(keyboardClick());
			await nextTick();
			press(document.activeElement!, 'ArrowDown');

			document.activeElement!.dispatchEvent(keyboardClick());
			await nextTick();

			expect(ran).toEqual(['Edit']);
			expect(isOpen(menu)).toBe(false);
			expect(focused(menu)).toBe('trigger');
		});

		it('closes on Escape, which never reaches the window, and gives the focus back to its ⋮', async () => {
			const { menu, ran } = mountMenu({ trigger: true });
			// Foundry's keybindings listen on the window: `core.dismiss` closes every window on Escape.
			const onWindowKeydown = vi.fn();
			window.addEventListener('keydown', onWindowKeydown);
			trigger(menu).dispatchEvent(keyboardClick());
			await nextTick();

			press(document.activeElement!, 'Escape');
			await nextTick();
			window.removeEventListener('keydown', onWindowKeydown);

			expect(onWindowKeydown).not.toHaveBeenCalled();
			expect(ran).toEqual([]);
			expect(isOpen(menu)).toBe(false);
			expect(focused(menu)).toBe('trigger');
		});

		it('gives the focus back to its ⋮ once its row scrolls out of view', async () => {
			const sheet = document.body.appendChild(document.createElement('div'));
			const { menu } = mountMenu({ trigger: true }, sheet);
			const row = vi
				.spyOn(menu.element as HTMLElement, 'getBoundingClientRect')
				.mockReturnValue(DOMRect.fromRect({ x: 30, y: 40, width: 200, height: 20 }));
			trigger(menu).dispatchEvent(keyboardClick());
			await nextTick();
			expect(focused(menu)).toBe('localized Equip');

			row.mockReturnValue(DOMRect.fromRect({ x: 30, y: -40, width: 200, height: 20 }));
			sheet.dispatchEvent(new Event('scroll'));
			await nextTick();

			expect(isOpen(menu)).toBe(false);
			expect(focused(menu)).toBe('trigger');
			sheet.remove();
		});

		it('closes on Tab, which goes on from its ⋮', async () => {
			const { menu } = mountMenu({ trigger: true });
			trigger(menu).dispatchEvent(keyboardClick());
			await nextTick();

			// The browser then moves the focus from where the menu put it.
			const prevented = press(document.activeElement!, 'Tab');
			await nextTick();

			expect(prevented).toBe(false);
			expect(isOpen(menu)).toBe(false);
			expect(focused(menu)).toBe('trigger');
		});

		it('opens at its ⋮ on Shift+F10 or the context menu key, which give no pointer position', async () => {
			for (const event of keyboardContextMenus()) {
				const { menu } = mountMenu({ trigger: true });
				vi.spyOn(menu.element as HTMLElement, 'getBoundingClientRect').mockReturnValue(
					DOMRect.fromRect({ x: 30, y: 40, width: 200, height: 20 }),
				);
				trigger(menu).focus();

				trigger(menu).dispatchEvent(event);
				await nextTick();

				expect(focused(menu)).toBe('localized Equip');
				// Under its container, its left edge on the container's, rather than at the event's position.
				expect(placed(menu)).toEqual({ left: '30px', top: '60px' });
				menu.unmount();
			}
		});

		it('opens under the pointer on a right-click on its ⋮', async () => {
			const { menu } = mountMenu({ trigger: true });

			trigger(menu).dispatchEvent(
				new PointerEvent('contextmenu', {
					bubbles: true,
					cancelable: true,
					pointerType: 'mouse',
					button: 2,
					clientX: 10,
					clientY: 20,
				}),
			);
			await nextTick();

			expect(placed(menu)).toEqual({ left: '10px', top: '20px' });
		});

		it('opens on Shift+F10 on a control of a row without a ⋮, and gives the focus back to it on Escape', async () => {
			const { menu } = mountMenu();
			const row = menu.get<HTMLButtonElement>('.row').element;
			row.focus();

			row.dispatchEvent(keyboardContextMenu());
			await nextTick();
			expect(focused(menu)).toBe('localized Equip');

			press(document.activeElement!, 'Escape');
			await nextTick();
			expect(document.activeElement).toBe(row);
		});

		it('is named after its ⋮', async () => {
			const { menu } = mountMenu({ trigger: true });
			trigger(menu).dispatchEvent(keyboardClick());
			await nextTick();

			expect(menu.get('[role="menu"]').attributes('aria-labelledby')).toBe(trigger(menu).id);
			expect(trigger(menu).id).not.toBe('');
		});
	});

	describe('after an entry run from the keyboard moves or removes its row', () => {
		/** Runs the second entry of a menu from the keyboard, which gives the focus back to its ⋮. */
		async function runFromKeyboard(menu: ReturnType<typeof mountMenu>['menu']) {
			trigger(menu).dispatchEvent(keyboardClick());
			await nextTick();
			entries(menu)[1]?.dispatchEvent(keyboardClick());
			await nextTick();
		}
		const afterTheRender = () => new Promise((resolve) => setTimeout(resolve));

		it('gives the focus to the ⋮ of the menu with the same key, rendered again elsewhere', async () => {
			const { menu: before } = mountMenu({ trigger: true, focusKey: 'Item.sword' });
			await runFromKeyboard(before);
			expect(focused(before)).toBe('trigger');

			before.unmount();
			const { menu: after } = mountMenu({ trigger: true, focusKey: 'Item.sword' });
			await afterTheRender();

			expect(focused(after)).toBe('trigger');
		});

		it("leaves another key's menu alone, and gives the focus to the sheet's content once the row is gone", async () => {
			const content = document.body.appendChild(document.createElement('div'));
			content.className = 'window-content';
			const { menu: before } = mountMenu({ trigger: true, focusKey: 'Item.sword' }, content);
			await runFromKeyboard(before);

			before.unmount();
			const { menu: other } = mountMenu({ trigger: true, focusKey: 'Item.shield' }, content);
			await afterTheRender();

			expect(focused(other)).not.toBe('trigger');
			expect(document.activeElement).toBe(content);
			content.remove();
		});

		it('takes no focus once the user moved it elsewhere', async () => {
			const { menu: before } = mountMenu({ trigger: true, focusKey: 'Item.sword' });
			await runFromKeyboard(before);
			const elsewhere = document.body.appendChild(document.createElement('button'));
			elsewhere.focus();

			before.unmount();
			mountMenu({ trigger: true, focusKey: 'Item.sword' });
			await afterTheRender();

			expect(document.activeElement).toBe(elsewhere);
			elsewhere.remove();
		});
	});
});
