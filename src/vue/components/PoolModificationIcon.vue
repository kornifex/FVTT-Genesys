<script lang="ts" setup>
import { computed } from 'vue';
import { GenesysPoolModifications } from '@/dice/GenesysPoolModifications';

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
	<span class="pool-modification" :data-pool-entity="icon.baseName">{{ icon.baseGlyph }}<i :class="`fas ${icon.operator}`"></i></span>
</template>
