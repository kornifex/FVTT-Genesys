<script lang="ts" setup>
import { nextTick, onUnmounted, ref, useTemplateRef } from 'vue';
import type { ContextMenuHandle } from '@/vue/components/ContextMenuHandle';
import { menuAtPointer } from '@/vue/components/menuPlacement';
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

// How far a menu opened at the pointer is moved from its place by the container, in the sheet's own pixels.
const shift = ref<{ x: number; y: number }>();

// The control the focus goes back to once the menu closes from the keyboard: its ⋮ button, or the control that had the
// focus when it opened from a row without one.
let opener: HTMLElement | undefined;

// The document the menu listens to while it is open: on v14, a window detached from the main one has a document of its
// own.
let listened: Document | undefined;

type Focus = 'first' | 'last';

/**
 * Whether an event comes from the keyboard rather than a pointer: a click from Enter or Space, a `contextmenu` from
 * Shift+F10 or the context menu key.
 */
function fromKeyboard(event: MouseEvent) {
	const namesNoPointer = 'pointerType' in event && (event as PointerEvent).pointerType === '';
	if (event.type === 'contextmenu') {
		// Chromium's names a mouse but no button (-1, where a right-click's is 2), Firefox marks it with its input source
		// (6, the keyboard), and the Pointer Events spec has it name no pointer.
		return event.button === -1 || (event as { mozInputSource?: number }).mozInputSource === 6 || namesNoPointer;
	}

	// A click names no pointer, or, when it is no PointerEvent, counts no click.
	return 'pointerType' in event ? namesNoPointer : event.detail === 0;
}

function triggerButton() {
	return container.value?.querySelector<HTMLElement>(':scope > .menu-trigger') ?? undefined;
}

function entries() {
	return [...(menu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
}

function showContextMenu(event: Event, focus: Focus = 'first', options: { preventScroll?: boolean } = {}) {
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
	shift.value = undefined;

	if (!listened) {
		listened = ownerDocument;
		listened.addEventListener('click', closeContextMenu, { capture: true });
		listened.addEventListener('contextmenu', closeContextMenu, { capture: true });
	}

	// From the pointer too, as the pattern has it: the focus in the menu keeps Escape from Foundry's keybindings, and a
	// click on an entry or elsewhere leaves no focus behind.
	void nextTick(() => {
		const shown = entries();
		(focus === 'first' ? shown[0] : shown.at(-1))?.focus({ preventScroll: options.preventScroll });
	});
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
	// A click on the ⋮ of an open menu only closes it, rather than reaching the button, which would open it again.
	if (target && triggerButton()?.contains(target)) {
		event.stopPropagation();
	}

	// An entry run from the keyboard gives the focus back; one clicked with the mouse leaves none, as its button does.
	if (target && menu.value?.contains(target) && fromKeyboard(event)) {
		closeToOpener();
	} else {
		hideMenu();
	}
}

function removeDocumentListeners() {
	listened?.removeEventListener('click', closeContextMenu, { capture: true });
	listened?.removeEventListener('contextmenu', closeContextMenu, { capture: true });
	listened = undefined;
}

// A menu still open when its sheet closes would otherwise swallow the next click anywhere.
onUnmounted(removeDocumentListeners);

/**
 * Opens the menu at the pointer of a right-click, or at its ⋮ button for a `contextmenu` from the keyboard, which has
 * no pointer position.
 */
function openAtPointer(event: MouseEvent) {
	if (fromKeyboard(event)) {
		showContextMenu(event);
		return;
	}

	showContextMenu(event, 'first', { preventScroll: true });
	if (!showMenu.value) {
		return;
	}

	// The menu is laid out by its container first, then moved: the move keeps the size the container gives it.
	void nextTick(() => {
		if (!menu.value) {
			return;
		}

		const placed = menu.value.getBoundingClientRect();
		const corner = menuAtPointer({ x: event.clientX, y: event.clientY }, placed, visibleArea(menu.value));
		// A sheet's window may be scaled, while the move is in the sheet's own pixels.
		const scale = placed.width / menu.value.offsetWidth || 1;
		shift.value = { x: (corner.x - placed.left) / scale, y: (corner.y - placed.top) / scale };
	});
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
	showContextMenu(event, 'first', { preventScroll: !fromKeyboard(event) });
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
			:style="shift && { transform: `translate(${shift.x}px, ${shift.y}px)` }"
			:class="{
				'context-menu': true,
				[props.orientation]: true,
				[props.position]: true,
			}"
			@keydown="onMenuKeydown"
		>
			<slot name="menu-items"></slot>
		</div>
		<slot></slot>
		<!-- A menu that never opens shows no button. -->
		<ActionButton
			v-if="trigger && !disableMenu"
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
	position: absolute;
	min-width: 100px;
	@include backgrounds.crossboxes;
	border: 1px solid colors.$gold;
	border-radius: 0.5em;
	padding: 0.25em;
	z-index: 1;

	&.above {
		bottom: 100%;
	}

	&.below {
		top: 100%;
	}

	&.right {
		left: 0;
	}

	&.left {
		right: 0;
	}

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
