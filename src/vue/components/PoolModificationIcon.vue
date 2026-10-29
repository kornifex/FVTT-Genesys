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
	<a :data-pool-entity="icon.baseName">{{ icon.baseGlyph }}<i :class="`fas ${icon.operator}`"></i></a>
</template>
