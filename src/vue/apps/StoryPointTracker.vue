<script lang="ts" setup>
import { vLocalize } from '@/vue/directives';
import { useSheetContext } from '@/vue/SheetContext';
import { StoryPointTracker, StoryPointTrackerContext } from '@/app/StoryPointTracker';
import { StoryPointPool, storyPointsAfterSetting } from '@/data/StoryPoints';
import ActionButton from '@/vue/components/ActionButton.vue';
import Counter from '@/vue/components/Counter.vue';
import Localized from '@/vue/components/Localized.vue';

// The GM pool on the left of the players' pool, each under its short label, the full one in its tooltip and naming its
// counter.
const POOLS = [
	{ id: 'gm', label: 'Genesys.StoryPoints.GMShort', name: 'Genesys.StoryPoints.GM' },
	{ id: 'player', label: 'Genesys.StoryPoints.PlayerShort', name: 'Genesys.StoryPoints.Player' },
] as const satisfies { id: StoryPointPool; label: string; name: string }[];

const isGM = game.user.isGM;
const context = useSheetContext<StoryPointTrackerContext>();

/**
 * Whether the user may spend from a pool: anyone from the players' pool, through the Acting GM, and only the GM from the
 * GM pool.
 */
function canSpend(pool: StoryPointPool) {
	return pool === 'player' || isGM;
}

/**
 * A step of a pool's counter: − spends a point, which goes to the other pool; the GM's + adds one to this pool alone.
 */
async function step(pool: StoryPointPool, direction: 1 | -1) {
	if (direction === -1) {
		await StoryPointTracker.spendStoryPoint(pool);
	} else {
		await setPool(pool, context.value[pool] + 1);
	}
}

async function setPool(pool: StoryPointPool, count: number) {
	await StoryPointTracker.resetStoryPoints(storyPointsAfterSetting(context.value, pool, count));
}

async function resetStoryPoints() {
	if (!isGM) {
		return;
	}

	await StoryPointTracker.resetStoryPoints();
}
</script>

<template>
	<div v-for="pool in POOLS" :key="pool.id" class="pool" :class="pool.id" v-localize:data-tooltip="pool.name">
		<header>
			<Localized :label="pool.label" />
			<ActionButton
				v-if="pool.id === 'gm' && isGM"
				icon="fas fa-arrows-rotate"
				label="Genesys.StoryPoints.Reset"
				@click="resetStoryPoints"
			/>
		</header>
		<!-- Only the GM adds a point or types a count (StoryPointTracker.resetStoryPoints refuses a player's write). -->
		<Counter
			class="points"
			:label="pool.name"
			:value="context[pool.id]"
			:can-decrease="canSpend(pool.id)"
			:can-increase="isGM"
			:can-type="isGM"
			decrease-label="Genesys.StoryPoints.Spend"
			increase-label="Genesys.StoryPoints.Add"
			@step="step(pool.id, $event)"
			@type="setPool(pool.id, $event)"
		/>
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
@use '@scss/mixins/headings.scss';
@use '@scss/vars/colors.scss';

.story-point-tracker {
	.pool {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1 1 0;
		min-width: 4.5em;
		// Room for the focus ring (#575), which reaches 4px past a button: the tracker hides what passes its edge.
		padding: 0.3em 0.75em 0.375em;
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

		@include headings.font;
		font-size: 1.1em;
		line-height: 1;
		color: colors.$blue;

		.action-button {
			font-size: 0.75em;
		}
	}

	.points {
		font-family: 'Roboto Serif', serif;
		font-size: 1.75em;
		line-height: 1.2;
		color: inherit;
	}
}
</style>
