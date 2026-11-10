<script lang="ts" setup>
import { computed } from 'vue';
import ActionButton from '@/vue/components/ActionButton.vue';

/**
 * A row's name, which rolls the row's check: a button showing the name alone, which glows under the pointer as every
 * action button does, with a "Roll …" tooltip naming the check. It shows no die: one before every name of a list was
 * noise, and one shown on hover had no room beside the row's icon (#638).
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
	<ActionButton class="roll-link" :localized-label="tooltip" @click="emit('roll')">
		<slot />
	</ActionButton>
</template>
