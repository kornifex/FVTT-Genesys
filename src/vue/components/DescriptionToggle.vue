<script lang="ts" setup>
import { isEmptyDescription } from '@/data/Descriptions';

defineProps<{
	/**
	 * The description the toggle opens: an empty one has nothing to show, and no toggle.
	 */
	description: string;
	open: boolean;
}>();

const emit = defineEmits<{
	(e: 'toggle'): void;
}>();
</script>

<template>
	<!-- Reading a description edits nothing: the toggle shows on a sheet the user can't edit too. -->
	<a
		v-if="!isEmptyDescription(description)"
		class="description-toggle"
		:data-tooltip="open ? 'Genesys.Tooltips.HideDescription' : 'Genesys.Tooltips.ShowDescription'"
		@click="emit('toggle')"
		><i :class="['fas', open ? 'fa-chevron-down' : 'fa-chevron-right']"></i
	></a>
</template>

<style lang="scss" scoped>
.description-toggle {
	margin-left: 0.5em;
	font-size: 0.8em;
}
</style>
