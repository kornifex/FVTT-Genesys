<script lang="ts" setup>
import ActionButton from '@/vue/components/ActionButton.vue';
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
	<!-- A button holds phrasing content only: the parts are spans, laid out by the entry's flex row. Tab leaves the entries
	out: the menu moves the focus between them with the arrow keys. -->
	<ActionButton class="menu-item" role="menuitem" tabindex="-1">
		<span class="menu-icon">
			<i :class="icon"></i>
		</span>

		<span class="menu-label">
			<Localized :label="label" />
		</span>
	</ActionButton>
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
