<script lang="ts" setup>
import Localized from '@/vue/components/Localized.vue';
import { usePrompt } from '@/vue/usePrompt';

/**
 * How a prompt is answered: its primary button submits the prompt's form, which answers it, and Cancel closes it
 * without an answer. The attributes given to the footer, such as a class, go to its primary button.
 */
defineOptions({ inheritAttrs: false });

withDefaults(
	defineProps<{
		/**
		 * The localization key of the primary button's text.
		 */
		label: string;

		/**
		 * Whether the prompt can't be answered yet: the primary button is disabled, and Enter in a field doesn't answer.
		 */
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const prompt = usePrompt();
</script>

<template>
	<footer class="prompt-footer">
		<button type="submit" class="prompt-submit" v-bind="$attrs" :disabled="disabled"><Localized :label="label" /></button>
		<button type="button" class="prompt-cancel" @click="prompt.cancel()"><Localized label="Genesys.Labels.Cancel" /></button>
	</footer>
</template>

<style lang="scss" scoped>
.prompt-footer {
	display: flex;
	gap: 0.5em;

	button {
		flex: 1;
		margin: 0;
	}
}
</style>
