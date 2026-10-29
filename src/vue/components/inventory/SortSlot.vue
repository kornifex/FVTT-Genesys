<script lang="ts" setup>
import { useDragHover } from '@/vue/useDragHover';

defineProps<{
	/**
	 * Whether the sort slot should be collapsed.
	 */
	active: boolean;
}>();

const emit = defineEmits<{
	/**
	 * Callback when an item is dropped on this sort slot.
	 */
	(e: 'drop', event: DragEvent): void;
}>();

const { isHovered, enter, leave, reset } = useDragHover();

function drop(event: DragEvent) {
	reset();

	emit('drop', event);
}
</script>

<template>
	<div :class="{ sortTarget: true, active, hover: isHovered }" @dragenter="enter" @dragleave="leave" @drop="drop">
		<div class="inner"></div>
	</div>
</template>

<style lang="scss" scoped>
@use 'sass:math';
@use '@scss/vars/colors.scss';

$height: 0.75em;

.sortTarget {
	display: flex;
	align-items: center;
	align-content: center;
	height: 0;
	width: 100%;
	margin-bottom: 0;

	transition: all 0.25s;
	opacity: 20%;

	&.active {
		height: $height;
		margin-bottom: 0.25em;
	}

	&.hover {
		opacity: 100%;
		color: colors.$gold;
	}

	.inner {
		display: block;
		background: colors.$light-blue;
		border-radius: math.div($height, 2);
		width: 80%;
		height: 100%;
		margin: auto;
	}
}
</style>
