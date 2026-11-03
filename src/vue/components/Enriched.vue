<script lang="ts" setup>
import { onMounted, onUpdated, ref } from 'vue';
import { enrich } from '@/enrich';
import { usePendingContent } from '@/vue/PendingContent';

const props = defineProps<{
	value: string;
}>();

const enrichedContent = ref(props.value);
const pendingContent = usePendingContent();

async function enrichContent() {
	enrichedContent.value = await enrich(props.value);
}

// The sheet measures its content once the enriched text shows.
onMounted(() => pendingContent(enrichContent()));
onUpdated(enrichContent);
</script>

<template>
	<div class="enriched" v-html="enrichedContent"></div>
</template>

<style lang="scss" scoped>
// Foundry draws a content link or an inline roll with a border and a top padding, 3px taller than a line of the sheets'
// `normal` height, so that the links of two lines overlapped. The text's line height leaves room for them, as the
// editors' does.
.enriched {
	line-height: 1.5;
}
</style>
