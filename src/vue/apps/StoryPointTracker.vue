<script lang="ts" setup>
import { nextTick, ref } from 'vue';
import { vLocalize } from '@/vue/directives';
import { useSheetContext } from '@/vue/SheetContext';
import { StoryPointTracker, StoryPointTrackerContext } from '@/app/StoryPointTracker';
import { StoryPointPool, storyPointsAfterEditing } from '@/data/StoryPoints';
import Localized from '@/vue/components/Localized.vue';

// The GM pool on the left of the players' pool, each under its short label, the full one in its tooltip.
const POOLS = [
	{ id: 'gm', label: 'Genesys.StoryPoints.GMShort', tooltip: 'Genesys.StoryPoints.GM' },
	{ id: 'player', label: 'Genesys.StoryPoints.PlayerShort', tooltip: 'Genesys.StoryPoints.Player' },
] as const satisfies { id: StoryPointPool; label: string; tooltip: string }[];

const isGM = game.user.isGM;
const context = useSheetContext<StoryPointTrackerContext>();

// The pool the GM types a count into, one at a time.
const editing = ref<StoryPointPool>();
const editInputs = ref<HTMLInputElement[]>([]);

function canSpend(pool: StoryPointPool) {
	// Only the GM spends from the GM pool.
	return (pool === 'player' || isGM) && context.value[pool] > 0;
}

async function spendStoryPoint(pool: StoryPointPool) {
	if (!canSpend(pool)) {
		return;
	}
	await StoryPointTracker.spendStoryPoint(pool);
}

/**
 * Closes the GM's input, writing the count it holds when `write` is set. Enter and a blur both confirm, since the
 * input's `change` event only fires on a different value and would leave it open on the same count (#528).
 */
async function finishEditing(pool: StoryPointPool, event: Event, write: boolean) {
	// Enter or Escape already closed the input: its removal must not confirm it again.
	if (!isGM || editing.value !== pool) {
		return;
	}

	editing.value = undefined;
	if (!write) {
		return;
	}

	const input = (event.currentTarget as HTMLInputElement).value;
	const storyPoints = storyPointsAfterEditing(context.value, pool, input);
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
	<div v-for="pool in POOLS" :key="pool.id" class="pool" :class="pool.id" v-localize:data-tooltip="pool.tooltip">
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
			@keydown.enter="finishEditing(pool.id, $event, true)"
			@keydown.escape="finishEditing(pool.id, $event, false)"
			@blur="finishEditing(pool.id, $event, true)"
		/>
		<a v-else-if="canSpend(pool.id)" class="points" @click="spendStoryPoint(pool.id)" @contextmenu="toggleEdit(pool.id)">{{
			context[pool.id]
		}}</a>
		<div v-else class="points" @contextmenu="toggleEdit(pool.id)">{{ context[pool.id] }}</div>
	</div>
</template>

<style lang="scss">
@use '@scss/vars/colors.scss';

// Unscoped: these rules place the tracker's application element, which Foundry renders around the component.
.story-point-tracker {
	// The column beside the sidebar holds nothing else above the chat notifications (order 99), whose input and
	// messages stay at the bottom: the tracker keeps to the top, on the sidebar's side, clear of them and of the hotbar.
	order: 1;
	align-self: flex-end;
	// Foundry's right-hand interface lets clicks through to the canvas.
	pointer-events: all;
	overflow: hidden;
	border: 1px solid colors.$gold;
	border-radius: 0.5em;
	box-shadow: 0 0 6px rgb(0 0 0 / 50%);

	// The element VueSheet mounts the component in, which lays the pools out side by side.
	> .vue-app {
		display: flex;
	}
}
</style>

<style lang="scss" scoped>
@use '@scss/mixins/backgrounds.scss';
@use '@scss/vars/colors.scss';

.story-point-tracker {
	.pool {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1 1 0;
		min-width: 4.5em;
		padding: 0.25em 0.75em 0.125em;
	}

	// The two sides of Genesys' Story Point token: the GM's dark, the players' light.
	.gm {
		background: colors.$dark-blue;
		color: colors.$paper;

		header {
			color: colors.$gold;
		}
	}

	.player {
		@include backgrounds.crossboxes;

		border-left: 1px solid colors.$gold;
		color: var(--color-dark-1);
	}

	header {
		display: flex;
		gap: 0.25em;
		align-items: center;

		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.1em;
		line-height: 1;
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
		color: inherit;
	}

	.points {
		font-family: 'Roboto Serif', serif;
		font-size: 1.75em;
		line-height: 1.2;
		color: inherit;
	}
}
</style>
