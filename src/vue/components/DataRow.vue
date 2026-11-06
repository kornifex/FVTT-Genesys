<script lang="ts" setup>
import { useId } from 'vue';
import Localized from '@/vue/components/Localized.vue';

/**
 * A labelled row of a data section. Its label names its field in one of three ways: the input it renders itself, when
 * given a `name`; the control its slot renders, which binds the slot's `id`; or, as a `group`, every control of the list
 * its slot renders, each of which can take the label's `labelId` in its own name.
 */
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

		/**
		 * Whether the row holds a list or several controls, which its label names as a group.
		 */
		group?: boolean;
	}>(),
	{
		type: 'text',
		group: false,
	},
);

defineSlots<{
	default?(props: { id: string; labelId: string }): unknown;
}>();

const id = useId();
const labelId = useId();
</script>

<template>
	<div v-if="group" class="row" role="group" :aria-labelledby="labelId">
		<label :id="labelId"><Localized :label="label" /></label>
		<slot v-bind="{ id, labelId }" />
	</div>
	<div v-else class="row">
		<label :id="labelId" :for="id"><Localized :label="label" /></label>
		<slot v-bind="{ id, labelId }">
			<input :id="id" :type="type" :name="name" :value="value" />
		</slot>
	</div>
</template>
