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
	<Glyphs :class="['pool-modification', icon.baseType === 'dice' && ['die', `die-${icon.baseName}`]]" :data-pool-entity="icon.baseName" :modifications="[glyph]">{{ icon.baseGlyph }}<i :class="`fas ${icon.operator}`"></i></Glyphs>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

// The glyph and its operator icon, side by side and lined up at their top. The global die classes give a die its colour;
// its outline is thinner than a die's in the text, and the operator is a small superscript with none.
.pool-modification {
	display: inline-flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: flex-start;
	font-family: 'Genesys Symbols', sans-serif;

	&.die {
		-webkit-text-stroke: 0.5px colors.$die-outline;
		text-stroke: 0.5px colors.$die-outline;
	}

	& > i {
		-webkit-text-stroke: 0 transparent;
		text-stroke: 0 transparent;
		color: colors.$ink;
		position: relative;
		font-size: 0.5em;
		top: -0.25em;
	}
}
</style>
