<script lang="ts" setup>
import { computed } from 'vue';
import ActionButton from '@/vue/components/ActionButton.vue';

/**
 * A row's name, which rolls the row's check: a button showing a die before the name, and a "Roll …" tooltip naming the
 * check. The name it shows is the button's name; the die is hidden from screen readers.
 */
const props = defineProps<{
	/**
	 * The localization key of the tooltip, which names the check: `Genesys.Tooltips.RollSkill` and its siblings.
	 */
	label: string;

	/**
	 * The words the tooltip's key takes, such as the skill or the weapon it names.
	 */
	labelData?: Record<string, string>;
}>();

const emit = defineEmits<{
	/**
	 * The name was clicked, or pressed from the keyboard, to roll the check.
	 */
	(e: 'roll'): void;
}>();

const tooltip = computed(() => game.i18n.format(props.label, props.labelData ?? {}));
</script>

<template>
	<ActionButton class="roll-link" icon="fas fa-dice-d20" :localized-label="tooltip" @click="emit('roll')">
		<slot />
	</ActionButton>
</template>
