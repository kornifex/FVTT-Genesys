<script lang="ts" setup>
import { inject, nextTick, ref } from 'vue';
import { vLocalize } from '@/vue/directives';
import { RootContext } from '@/vue/SheetContext';
import { StoryPointTracker, StoryPointTrackerContext } from '@/app/StoryPointTracker';
import { StoryPointPool, storyPointsAfterEditing } from '@/data/StoryPoints';
import Localized from '@/vue/components/Localized.vue';

// The GM pool above the players' pool.
const POOLS = [
	{ id: 'gm', label: 'Genesys.StoryPoints.GM' },
	{ id: 'player', label: 'Genesys.StoryPoints.Player' },
] as const satisfies { id: StoryPointPool; label: string }[];

const isGM = game.user.isGM;
const context = inject<StoryPointTrackerContext>(RootContext)!;

// The pool the GM types a count into, one at a time.
const editing = ref<StoryPointPool>();
const editInputs = ref<HTMLInputElement[]>([]);

function canSpend(pool: StoryPointPool) {
	// Only the GM spends from the GM pool.
	return (pool === 'player' || isGM) && context[pool] > 0;
}

async function spendStoryPoint(pool: StoryPointPool) {
	if (!canSpend(pool)) {
		return;
	}
	await StoryPointTracker.spendStoryPoint(pool);
}

async function manualStoryPoints(pool: StoryPointPool, event: Event) {
	if (!isGM) {
		return;
	}

	editing.value = undefined;

	const input = (event.currentTarget as HTMLInputElement).value;
	const storyPoints = storyPointsAfterEditing(context, pool, input);
	if (storyPoints) {
		await StoryPointTracker.resetStoryPoints(storyPoints);
	}
}

async function resetStoryPoints() {
	if (!isGM) {
		return;
	}

	await StoryPointTracker.resetStoryPoints();
}

async function toggleEdit(pool: StoryPointPool) {
	if (!isGM) {
		return;
	}

	editing.value = pool;
	await nextTick();

	// Only the edited pool shows an input.
	editInputs.value[0]?.focus();
	editInputs.value[0]?.select();
}
</script>

<template>
	<div v-for="pool in POOLS" :key="pool.id" class="tracker">
		<header>
			<Localized :label="pool.label" />
			<a v-if="pool.id === 'gm' && isGM" @click="resetStoryPoints" v-localize:title="'Genesys.StoryPoints.Reset'"
				><i class="fas fa-arrows-rotate"></i
			></a>
		</header>
		<input
			v-if="editing === pool.id"
			ref="editInputs"
			class="points"
			:value="context[pool.id]"
			@change="manualStoryPoints(pool.id, $event)"
		/>
		<a v-else-if="canSpend(pool.id)" class="points" @click="spendStoryPoint(pool.id)" @contextmenu="toggleEdit(pool.id)">{{
			context[pool.id]
		}}</a>
		<div v-else class="points" @contextmenu="toggleEdit(pool.id)">{{ context[pool.id] }}</div>
	</div>
</template>

<style lang="scss">
// Unscoped: these rules place the tracker's application element, which Foundry renders around the component.
.story-point-tracker {
	position: absolute;
	bottom: 20px;
	right: 320px;
	color: var(--color-dark-1);
	display: flex;
	flex-direction: column;
	gap: 1em;

	&.move-to-left {
		bottom: 15px;
		left: 250px;
		right: auto;
	}
}
</style>

<style lang="scss" scoped>
@use '@scss/mixins/backgrounds.scss';
@use '@scss/vars/colors.scss';

.story-point-tracker {
	.tracker {
		@include backgrounds.crossboxes;

		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25em;

		width: 100%;
		border-radius: 0.5em;
		border: 1px solid colors.$gold;
		padding: 0.5em;
	}

	header {
		display: flex;
		gap: 0.25em;
		align-items: center;

		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.25em;
		color: colors.$blue;

		a {
			font-size: 0.75em;
		}
	}

	input.points {
		width: 1.25em;
		text-align: center;
		border: 1px dashed colors.$gold;
		border-radius: 50%;
		aspect-ratio: 1;
	}

	.points {
		font-family: 'Roboto Serif', serif;
		font-size: 2em;
	}
}
</style>
