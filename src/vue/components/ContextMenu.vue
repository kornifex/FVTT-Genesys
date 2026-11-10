<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, useId, useTemplateRef } from 'vue';
import type { ContextMenuHandle } from '@/vue/components/ContextMenuHandle';
import { handOffFocus, leaveFocus, takeFocus } from '@/vue/components/menuFocus';
import { menuAtContainer, menuAtPointer } from '@/vue/components/menuPlacement';
import { isKeyboardClick, isKeyboardContextMenu } from '@/vue/inputSource';
import ActionButton from '@/vue/components/ActionButton.vue';

/**
 * A row's actions menu, as the WAI-ARIA menu button pattern has it: it opens on a right-click on its content, under the
 * pointer when it has a ⋮ button, and from the keyboard (Shift+F10, the context menu key, or the ⋮ button), on its
 * first entry. The arrow keys, Home and End move between its entries; Escape and Tab close it and give the focus back.
 */
const props = withDefaults(
	defineProps<{
		disableMenu?: boolean;

		/**
		 * Whether the menu has a ⋮ button, named Actions, which opens it on a click, Enter, Space or the arrow keys.
		 */
		trigger?: boolean;

		/**
		 * What the menu's row shows, such as its item's uuid: when an entry run from the keyboard moves the row elsewhere
		 * in the sheet, the focus goes on to the ⋮ of the menu with the same key there.
		 */
		focusKey?: string;

		orientation?: 'left' | 'right';
		position?: 'above' | 'below';
	}>(),
	{
		disableMenu: false,
		trigger: false,
		orientation: 'right',
		position: 'below',
	},
);

const showMenu = ref(false);
const container = useTemplateRef<HTMLElement>('container');
const menu = useTemplateRef<HTMLElement>('menu');

// Where the open menu's top-left corner sits from its container's, in the viewport's pixels: it keeps that place as the
// sheet scrolls.
let offset: Point | undefined;

// The control the focus goes back to once the menu closes from the keyboard: its ⋮ button, or the control that had the
// focus when it opened from a row without one.
let opener: HTMLElement | undefined;

// The document the menu listens to while it is open: on v14, a window detached from the main one has a document of its
// own.
let listened: Document | undefined;

type Focus = 'first' | 'last';

type Point = { x: number; y: number };

// Names the menu after its ⋮.
const triggerId = useId();

function triggerButton() {
	return container.value?.querySelector<HTMLElement>(':scope > .menu-trigger') ?? undefined;
}

function entries() {
	return [...(menu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
}

/**
 * Opens the menu, under the pointer when it is given, at its container otherwise, on its first or its last entry.
 */
function showContextMenu(event: Event, focus: Focus = 'first', pointer?: Point) {
	if (props.disableMenu || !container.value) {
		return;
	}

	event.stopImmediatePropagation();
	event.preventDefault();

	// The elements of a detached window are another window's, which `instanceof HTMLElement` doesn't know.
	const ownerDocument = container.value.ownerDocument;
	const focused = ownerDocument.activeElement as HTMLElement | null;
	opener = triggerButton() ?? (focused && focused !== ownerDocument.body && !menu.value?.contains(focused) ? focused : undefined);

	showMenu.value = true;

	if (!listened) {
		listened = ownerDocument;
		listened.addEventListener('click', closeContextMenu, { capture: true });
		listened.addEventListener('contextmenu', closeContextMenu, { capture: true });
		listened.addEventListener('scroll', followContainer, { capture: true });
	}

	void nextTick(() => {
		if (!menu.value || !container.value) {
			return;
		}

		// The menu shows in the top layer, over every element of the page, whatever stacking context its row paints in: a
		// z-index would only win within the row's category, and lose to an ↑ or a category painted after it (#643).
		menu.value.showPopover();
		place(menu.value, container.value, pointer);

		// From the pointer too, as the pattern has it: the focus in the menu keeps Escape from Foundry's keybindings, and a
		// click on an entry or elsewhere leaves no focus behind. The menu is placed where it shows: nothing scrolls to it.
		const shown = entries();
		(focus === 'first' ? shown[0] : shown.at(-1))?.focus({ preventScroll: true });
	});
}

/**
 * Places the menu in the viewport: its top-left corner under the pointer, or at its container. The top layer takes no
 * transform from the sheet's window, which may be scaled: the menu takes the window's scale itself.
 */
function place(menuElement: HTMLElement, containerElement: HTMLElement, pointer: Point | undefined) {
	const box = containerElement.getBoundingClientRect();
	const scale = containerElement.offsetWidth ? box.width / containerElement.offsetWidth : 1;
	const size = { width: menuElement.offsetWidth * scale, height: menuElement.offsetHeight * scale };
	const visible = visibleArea(menuElement);
	const corner = pointer ? menuAtPointer(pointer, size, visible) : menuAtContainer(box, size, visible, props.position, props.orientation);

	offset = { x: corner.x - box.left, y: corner.y - box.top };
	moveTo(menuElement, corner);
	menuElement.style.transform = scale === 1 ? '' : `scale(${scale})`;
}

function moveTo(menuElement: HTMLElement, corner: Point) {
	menuElement.style.left = `${corner.x}px`;
	menuElement.style.top = `${corner.y}px`;
}

function hideMenu() {
	showMenu.value = false;
	removeDocumentListeners();
}

/**
 * Closes the menu and gives the focus back to its opener, after a close from the keyboard.
 */
function closeToOpener() {
	hideMenu();
	if (opener?.isConnected) {
		opener.focus();
	}
}

// It listens to the clicks and right-clicks of the whole document, which are mouse events.
function closeContextMenu(event: MouseEvent) {
	event.preventDefault();

	const target = event.target as Node | null;
	const fromKeyboard = event.type === 'click' && isKeyboardClick(event);
	// A click on the ⋮ of an open menu only closes it, rather than reaching the button, which would open it again; with
	// the mouse, it leaves no focus on the button, as the button's own click handler would have.
	const trigger = triggerButton();
	if (target && trigger?.contains(target)) {
		event.stopPropagation();
		if (!fromKeyboard) {
			trigger.blur();
		}
	}

	// An entry run from the keyboard gives the focus back; one clicked with the mouse leaves none, as its button does.
	if (target && menu.value?.contains(target) && fromKeyboard) {
		closeToOpener();
		// The entry may move the row elsewhere in the sheet, which renders its ⋮ again there, or remove it: the focus then
		// goes to the sheet's content, from where Tab goes on through the sheet, rather than to the page.
		if (props.focusKey && opener?.isConnected) {
			handOffFocus(props.focusKey, opener, opener.closest<HTMLElement>('.window-content'));
		}
	} else {
		hideMenu();
	}
}

// The menu is placed in the viewport: as its sheet scrolls, it follows its row, and closes once the row leaves what the
// sheet shows. Scrolling elsewhere in the page, such as the chat log on a new message, leaves it where it is.
function followContainer(event: Event) {
	const scrolled = event.target as Node | null;
	if (!scrolled || !menu.value || !container.value || !offset || !scrolled.contains(container.value)) {
		return;
	}

	const box = container.value.getBoundingClientRect();
	const visible = visibleArea(menu.value);
	if (box.bottom <= visible.top || box.top >= visible.bottom) {
		hideMenu();
		return;
	}

	moveTo(menu.value, { x: box.left + offset.x, y: box.top + offset.y });
}

function removeDocumentListeners() {
	listened?.removeEventListener('click', closeContextMenu, { capture: true });
	listened?.removeEventListener('contextmenu', closeContextMenu, { capture: true });
	listened?.removeEventListener('scroll', followContainer, { capture: true });
	listened = undefined;
}

// A menu still open when its sheet closes would otherwise swallow the next click anywhere.
onUnmounted(removeDocumentListeners);

// The row of an entry run from the keyboard renders again elsewhere in the sheet: its new ⋮ takes the focus.
onMounted(() => {
	const trigger = triggerButton();
	if (props.focusKey && trigger) {
		takeFocus(props.focusKey, trigger);
	}
});

// The row of an entry run from the keyboard leaves the sheet: the focus goes to the sheet's content.
onBeforeUnmount(() => {
	const trigger = triggerButton();
	if (trigger) {
		leaveFocus(trigger);
	}
});

/**
 * Opens the menu at the pointer of a right-click, or at its ⋮ button for a `contextmenu` from the keyboard, which has
 * no pointer position.
 */
function openAtPointer(event: MouseEvent) {
	if (isKeyboardContextMenu(event)) {
		showContextMenu(event);
		return;
	}

	showContextMenu(event, 'first', { x: event.clientX, y: event.clientY });
}

// A menu with a ⋮ opens under the pointer, like the one its row opens through its handle; one without opens at its
// container, as it always has.
function onContextMenu(event: MouseEvent) {
	if (props.trigger) {
		openAtPointer(event);
	} else {
		showContextMenu(event);
	}
}

// An open menu closes on a click on its ⋮ before the button gets it.
function onTriggerClick(event: MouseEvent) {
	showContextMenu(event);
}

function onTriggerKeydown(event: KeyboardEvent) {
	if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
		showContextMenu(event, event.key === 'ArrowDown' ? 'first' : 'last');
	}
}

function onMenuKeydown(event: KeyboardEvent) {
	const shown = entries();
	const current = shown.indexOf(event.target as HTMLElement);
	const moves: Record<string, () => number> = {
		ArrowDown: () => (current + 1) % shown.length,
		ArrowUp: () => (current - 1 + shown.length) % shown.length,
		Home: () => 0,
		End: () => shown.length - 1,
	};

	const move = moves[event.key];
	if (move) {
		event.preventDefault();
		shown[move()]?.focus();
	} else if (event.key === 'Escape') {
		// Foundry's `core.dismiss` keybinding, on the window, would close every open window, the sheet included.
		event.stopPropagation();
		event.preventDefault();
		closeToOpener();
	} else if (event.key === 'Tab') {
		// The focus goes back to the opener before the browser moves it on, so Tab goes on from there; without an
		// opener, the entry it would move on from leaves with the menu.
		if (!opener?.isConnected) {
			event.preventDefault();
		}
		closeToOpener();
	}
}

// The part of the viewport an element shows in: each ancestor that clips its overflow, such as the sheet's scrolling tab
// and its window, cuts it down.
function visibleArea(element: HTMLElement) {
	const { documentElement, defaultView } = element.ownerDocument;
	const view = defaultView ?? window;
	const area = { left: 0, top: 0, right: documentElement.clientWidth, bottom: documentElement.clientHeight };
	for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
		if (view.getComputedStyle(ancestor).overflow === 'visible') {
			continue;
		}

		const box = ancestor.getBoundingClientRect();
		area.left = Math.max(area.left, box.left);
		area.top = Math.max(area.top, box.top);
		area.right = Math.min(area.right, box.right);
		area.bottom = Math.min(area.bottom, box.bottom);
	}

	return area;
}

defineExpose({ open: openAtPointer } satisfies ContextMenuHandle);
</script>

<template>
	<div ref="container" class="menu-container" @contextmenu="onContextMenu">
		<div
			v-if="showMenu"
			ref="menu"
			role="menu"
			popover="manual"
			class="context-menu"
			:aria-labelledby="trigger ? triggerId : undefined"
			@keydown="onMenuKeydown"
		>
			<slot name="menu-items"></slot>
		</div>
		<slot></slot>
		<!-- A menu that never opens shows no button. -->
		<ActionButton
			v-if="trigger && !disableMenu"
			:id="triggerId"
			class="menu-trigger"
			icon="fas fa-ellipsis-vertical"
			label="Genesys.Labels.Actions"
			aria-haspopup="menu"
			:expanded="showMenu"
			@click="onTriggerClick"
			@keydown="onTriggerKeydown"
		/>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/backgrounds.scss';
@use '@scss/vars/colors.scss';

.menu-container {
	position: relative;
}

.context-menu {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	gap: 0.25em;
	min-width: 100px;
	@include backgrounds.crossboxes;
	border: 1px solid colors.$gold;
	border-radius: 0.5em;
	padding: 0.25em;

	// A popover, placed in the viewport by its script, which sets its left and top: not centred, as the browser's style
	// has it, nor in the browser's colours. The scale the script gives it grows from its placed corner.
	position: fixed;
	inset: auto;
	margin: 0;
	overflow: visible;
	color: inherit;
	transform-origin: top left;

	// The menu's items and separators come from the slot.
	:slotted(hr) {
		width: calc(100% + 0.5em);
		margin: 0;
		margin-left: -0.25em;
		border-bottom: none;
		border-color: colors.alpha(colors.$gold, 0.6);
	}
}
</style>
