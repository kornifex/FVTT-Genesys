<script lang="ts" setup>
import { computed } from 'vue';
import { GenesysPoolModifications } from '@/dice/GenesysPoolModifications';
import Glyphs from '@/vue/components/Glyphs.vue';

const props = defineProps<{
	/**
	 * Glyph of the pool modification.
	 */
	glyph: string;
}>();

const icon = computed(() => GenesysPoolModifications[props.glyph].icon);
</script>

<template>
	<!-- It shows a modification only: where a click applies or removes one, the Dice Prompt wraps it in a button. -->
	<!-- prettier-ignore -->
	<Glyphs class="pool-modification" :data-pool-entity="icon.baseName" :modifications="[glyph]">{{ icon.baseGlyph }}<i :class="`fas ${icon.operator}`"></i></Glyphs>
</template>

<style lang="scss" scoped>
// The glyph and its operator icon, side by side and lined up at their top.
.pool-modification {
	display: inline-flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: flex-start;
}
</style>
