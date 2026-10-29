<script lang="ts" setup>
import Localized from '@/vue/components/Localized.vue';

defineProps<{
	/**
	 * The Font Awesome classes of the item's icon.
	 */
	icon: string;

	/**
	 * The localization key of the item's label.
	 */
	label: string;
}>();
</script>

<template>
	<a class="menu-item">
		<div class="menu-icon">
			<i :class="icon"></i>
		</div>

		<div class="menu-label">
			<Localized :label="label" />
		</div>
	</a>
</template>

<style lang="scss" scoped>
.menu-item {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: center;
	gap: 0.25em;
	padding-left: 0.25em;
	padding-right: 0.25em;
}

.menu-icon {
	min-width: 1.25em;
}
</style>
