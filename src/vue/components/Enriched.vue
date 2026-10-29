<script lang="ts" setup>
import { onMounted, onUpdated, ref } from 'vue';
import { enrich } from '@/enrich';

const props = defineProps<{
	value: string;
}>();

const enrichedContent = ref(props.value);

async function enrichContent() {
	enrichedContent.value = await enrich(props.value);
}

onMounted(enrichContent);
onUpdated(enrichContent);
</script>

<template>
	<div v-html="enrichedContent"></div>
</template>
