<script lang="ts" setup>
import { nextTick, onUnmounted, ref, useTemplateRef } from 'vue';
import type { ContextMenuHandle } from '@/vue/components/ContextMenuHandle';
import { menuAtPointer } from '@/vue/components/menuPlacement';

const props = withDefaults(
	defineProps<{
		disableMenu?: boolean;
		usePrimaryClick?: boolean;
		orientation?: 'left' | 'right';
		position?: 'above' | 'below';
	}>(),
	{
		disableMenu: false,
		usePrimaryClick: false,
		orientation: 'right',
		position: 'below',
	},
);

const showMenu = ref(false);
const menu = useTemplateRef<HTMLElement>('menu');

// How far a menu opened at the pointer is moved from its place by the container, in the sheet's own pixels.
const shift = ref<{ x: number; y: number }>();

function showContextMenu(event: Event) {
	if (props.disableMenu) {
		return;
	}

	event.stopImmediatePropagation();
	event.preventDefault();

	showMenu.value = true;
	shift.value = undefined;

	document.addEventListener('click', closeContextMenu, { capture: true });
	document.addEventListener('contextmenu', closeContextMenu, { capture: true });
}

function closeContextMenu(event: Event) {
	event.preventDefault();
	showMenu.value = false;

	removeDocumentListeners();
}

function removeDocumentListeners() {
	document.removeEventListener('click', closeContextMenu, { capture: true });
	document.removeEventListener('contextmenu', closeContextMenu, { capture: true });
}

// A menu still open when its sheet closes would otherwise swallow the next click anywhere.
onUnmounted(removeDocumentListeners);

function openAtPointer(event: MouseEvent) {
	showContextMenu(event);
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

// The part of the viewport an element shows in: each ancestor that clips its overflow, such as the sheet's scrolling tab
// and its window, cuts it down.
function visibleArea(element: HTMLElement) {
	const area = { left: 0, top: 0, right: document.documentElement.clientWidth, bottom: document.documentElement.clientHeight };
	for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
		if (getComputedStyle(ancestor).overflow === 'visible') {
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
	<div
		class="menu-container"
		@contextmenu="!usePrimaryClick && showContextMenu($event)"
		@click="usePrimaryClick && showContextMenu($event)"
	>
		<div
			v-if="showMenu"
			ref="menu"
			:style="shift && { transform: `translate(${shift.x}px, ${shift.y}px)` }"
			:class="{
				'context-menu': true,
				[props.orientation]: true,
				[props.position]: true,
			}"
		>
			<slot name="menu-items"></slot>
		</div>
		<slot></slot>
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
