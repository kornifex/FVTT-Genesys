<script lang="ts" setup>
import { computed, useSlots } from 'vue';
import { useEditable } from '@/vue/SheetContext';

/**
 * An action of a sheet or a prompt: a button the keyboard reaches, with a name. A button that shows no text (an icon, an
 * image, a drawing given through its `icon` slot) is named by its label, which is its tooltip too; one that shows text,
 * through its default slot, is named by it, its label only adding a tooltip.
 */
const props = withDefaults(
	defineProps<{
		/**
		 * The Font Awesome classes of the button's icon.
		 */
		icon?: string;

		/**
		 * The source of an image the button shows, as an icon.
		 */
		image?: string;

		/**
		 * The localization key of the button's name when it shows no text, and of its tooltip.
		 */
		label?: string;

		/**
		 * Whether the action edits the sheet's document: such a button is left out of a sheet the user can't edit.
		 */
		edits?: boolean;

		/**
		 * Whether what the button folds is open, for a button that opens and closes something.
		 */
		expanded?: boolean;

		/**
		 * Whether the button is on, for a button that turns something on and off.
		 */
		pressed?: boolean;
	}>(),
	// Unset, `aria-expanded` and `aria-pressed` stay off the button rather than being false.
	{ edits: false, expanded: undefined, pressed: undefined },
);

const slots = useSlots();
const editable = useEditable();

const showsText = computed(() => !!slots.default);
// A bare `data-tooltip` shows the button's `aria-label`, as Foundry's TooltipManager reads it.
const name = computed(() => (showsText.value || !props.label ? undefined : game.i18n.localize(props.label)));
const tooltip = computed(() => (showsText.value ? props.label : ''));
</script>

<template>
	<button
		v-if="!edits || editable"
		type="button"
		class="action-button"
		:aria-label="name"
		:data-tooltip="tooltip"
		:aria-expanded="expanded"
		:aria-pressed="pressed"
	>
		<i v-if="icon" :class="icon" aria-hidden="true"></i>
		<img v-if="image" :src="image" alt="" />
		<slot name="icon" />
		<!-- A space between the icon and the text, as the links the button replaces held. -->
		<template v-if="(icon || image) && showsText">{{ ' ' }}</template>
		<slot />
	</button>
</template>

<style lang="scss" scoped>
// An image fills the button, which its caller sizes, as the image it replaced was sized.
img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: contain;
	border: none;
}
</style>
