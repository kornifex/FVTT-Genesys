<script lang="ts" setup>
import Localized from '@/vue/components/Localized.vue';

/**
 * What a list shows under its heading when it has no row, in place of a bare heading. The list's call site shows it.
 */
</script>

<template>
	<p class="list-empty"><Localized label="Genesys.Labels.ListEmpty" /></p>
</template>

<style lang="scss" scoped>
.list-empty {
	margin: 0;
}
</style>
