<script lang="ts" setup>
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { qualityLabel } from '@/item/data/Qualities';
import Tooltip from '@/vue/components/Tooltip.vue';

/**
 * The qualities of a weapon or an armor, each showing its description as a tooltip: as tags, or as a list separated
 * by commas. Renders nothing for an item without qualities.
 *
 * A label of the list keeps no blank around it in the template: inline, as in an adversary's weapon details, a blank
 * would show before its comma.
 */
withDefaults(
	defineProps<{
		qualities: readonly ContainedItemQuality[];
		tags?: boolean;
	}>(),
	{ tags: false },
);
</script>

<template>
	<component :is="tags ? 'div' : 'span'" v-if="qualities.length > 0" :class="tags ? 'tags' : 'list'">
		<Tooltip
			v-for="quality in qualities"
			:key="quality.name"
			:content="quality.description === '' ? 'Genesys.Tooltips.NoDescription' : quality.description"
			:localized="quality.description === ''"
			><div v-if="tags" class="quality">{{ qualityLabel(quality) }}</div>
			<template v-else>{{ qualityLabel(quality) }}</template></Tooltip
		>
	</component>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.tags {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 0.25em;

	.quality {
		background: colors.alpha(colors.$gold, 0.3);
		border: 1px dashed colors.$gold;
		border-radius: 0.25em;
		padding: 0.25em;
		font-family: 'Bebas Neue', sans-serif;
	}
}

// A Tooltip's root is the element that holds a quality of the list, and its comma.
.list > div {
	cursor: help;
	white-space: nowrap;

	&::after {
		display: inline;
		content: ',';
		margin-right: 0.25em;
	}

	&:last-child::after {
		display: none;
	}
}
</style>
