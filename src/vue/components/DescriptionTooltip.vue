<script lang="ts" setup>
import Tooltip from '@/vue/components/Tooltip.vue';

/**
 * Shows a description as the tooltip of what it describes: the text of "no description" when it is empty.
 */
defineProps<{ description: string }>();
</script>

<template>
	<Tooltip :content="description === '' ? 'Genesys.Tooltips.NoDescription' : description" :localized="description === ''"
		><slot
	/></Tooltip>
</template>
