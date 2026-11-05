<script lang="ts" setup>
import { computed } from 'vue';
import { glyphAttributes, glyphLabel, poolModificationLabel, worldGlyphLocalizer } from '@/dice/GenesysPoolModifications';

const props = withDefaults(
	defineProps<{
		/**
		 * The glyphs of dice, symbols and blank faces the element holds, which its label names.
		 */
		glyphs?: string;

		/**
		 * The glyphs of Pool Modifications the element holds, which its label words as operations instead.
		 */
		modifications?: readonly string[];

		/**
		 * The element holding the glyphs.
		 */
		tag?: string;
	}>(),
	{
		glyphs: '',
		modifications: undefined,
		tag: 'span',
	},
);

// The glyphs are letters of the symbol fonts: their label stands in for them, the slot shows them as they look. The
// template holds no comment beside its element: that would make it a fragment, which the parent's attributes (a class,
// a click handler) can't fall through to.
const attributes = computed(() =>
	glyphAttributes(
		props.modifications
			? poolModificationLabel(props.modifications, worldGlyphLocalizer())
			: glyphLabel(props.glyphs, worldGlyphLocalizer()),
	),
);
</script>

<template>
	<component :is="tag" v-bind="attributes">
		<slot>{{ glyphs }}</slot>
	</component>
</template>
