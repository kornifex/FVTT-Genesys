<script lang="ts" setup>
import Localized from '@/vue/components/Localized.vue';
import Editor from '@/vue/components/Editor.vue';

// The four Motivations of a character or an adversary, in the order the sheets show them.
const MOTIVATIONS = [
	{ motivation: 'strength', label: 'Genesys.Labels.Strength' },
	{ motivation: 'flaw', label: 'Genesys.Labels.Flaw' },
	{ motivation: 'desire', label: 'Genesys.Labels.Desire' },
	{ motivation: 'fear', label: 'Genesys.Labels.Fear' },
] as const;

type Motivation = (typeof MOTIVATIONS)[number]['motivation'];

defineProps<{
	/**
	 * The actor's `system.motivations`.
	 */
	motivations: Record<Motivation, { name: string; description: string }>;
}>();
</script>

<template>
	<div class="container">
		<div v-for="{ motivation, label } in MOTIVATIONS" :key="motivation" class="motivation">
			<div class="header">
				<span><Localized :label="label" /></span>
				<input type="text" :name="`system.motivations.${motivation}.name`" :value="motivations[motivation].name" />
			</div>

			<div class="body">
				<Editor :name="`system.motivations.${motivation}.description`" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/reset.scss';

.container {
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	width: 100%;
	height: 100%;

	// Only the character's Journal tab gives the motivations a size container to lay them out in two columns.
	@container motivations (min-width: 900px) {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}
}

.motivation {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	border: 1px solid black;
	background: white;

	@include reset.input;
	input {
		font-family: 'Roboto', sans-serif;
	}

	.header {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		align-items: center;
		font-family: 'Bebas Neue', sans-serif;
		width: 100%;
		gap: 0.5em;
		padding: 0.25em;
		padding-left: 0.5em;
		border-bottom: 1px solid black;
		clip-path: polygon(0% 0%, 100% 0%, 100% calc(100% - 1px), 80% calc(100% - 1px), 80% 100%, 0% 100%);

		span {
			font-size: 1.1em;
		}
	}

	.body {
		display: flex;
		height: 100%;
		min-height: 120px;
	}
}
</style>
