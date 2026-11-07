<script lang="ts" setup>
import { useId } from 'vue';
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
	motivations: Record<Motivation, { name: string }>;
}>();

const headingId = useId();
</script>

<template>
	<div class="container">
		<div v-for="{ motivation, label } in MOTIVATIONS" :key="motivation" class="motivation">
			<!-- The heading names the motivation's name. -->
			<div class="name-row">
				<h4 :id="`${headingId}-${motivation}`"><Localized :label="label" /></h4>
				<input
					type="text"
					:name="`system.motivations.${motivation}.name`"
					:value="motivations[motivation].name"
					:aria-labelledby="`${headingId}-${motivation}`"
				/>
			</div>

			<div class="body">
				<Editor :name="`system.motivations.${motivation}.description`" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/reset.scss';
@use '@scss/vars/colors.scss';

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
	border: 1px solid colors.$ink;
	background: colors.$field;

	@include reset.input;
	input {
		font-family: 'Roboto', sans-serif;
	}

	// The motivation's heading, then its name.
	.name-row {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		align-items: center;
		width: 100%;
		gap: 0.5em;
		padding: 0.25em;
		padding-left: 0.5em;
		border-bottom: 1px solid colors.$ink;
		clip-path: polygon(0% 0%, 100% 0%, 100% calc(100% - 1px), 80% calc(100% - 1px), 80% 100%, 0% 100%);
	}

	.body {
		display: flex;
		height: 100%;
		min-height: 120px;
	}
}
</style>
