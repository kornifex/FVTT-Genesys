<script lang="ts" setup>
import Localized from '@/vue/components/Localized.vue';

withDefaults(
	defineProps<{
		/**
		 * The localization key of the row's label.
		 */
		label: string;

		/**
		 * The field the row's input edits, when the row has no content of its own.
		 */
		name?: string;
		value?: string | number;
		type?: 'text' | 'number';
	}>(),
	{
		type: 'text',
	},
);
</script>

<template>
	<div class="row">
		<label><Localized :label="label" /></label>
		<slot>
			<input :type="type" :name="name" :value="value" />
		</slot>
	</div>
</template>
