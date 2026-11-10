<script lang="ts" setup>
import { nextTick, ref } from 'vue';
import { vLocalize } from '@/vue/directives';
import { useSheetContext } from '@/vue/SheetContext';
import { StoryPointTracker, StoryPointTrackerContext } from '@/app/StoryPointTracker';
import { typedValue } from '@/data/CounterValue';
import type { StoryPointPool } from '@/data/StoryPoints';
import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';

// The GM pool on the left of the players' pool, each under its short label, the full one in its tooltip and naming its
// count.
const POOLS = [
	{ id: 'gm', label: 'Genesys.StoryPoints.GMShort', name: 'Genesys.StoryPoints.GM' },
	{ id: 'player', label: 'Genesys.StoryPoints.PlayerShort', name: 'Genesys.StoryPoints.Player' },
] as const satisfies { id: StoryPointPool; label: string; name: string }[];

const isGM = game.user.isGM;
const context = useSheetContext<StoryPointTrackerContext>();

// The pool the GM types a count into, one at a time, and the input it shows.
const editing = ref<StoryPointPool>();
const countInputs = ref<HTMLInputElement[]>([]);

/**
 * Whether the user may spend one of a pool's points: anyone from the players' pool, through the Acting GM, and only the
 * GM from the GM pool.
 */
function canSpend(pool: StoryPointPool) {
	return (pool === 'player' || isGM) && context.value[pool] > 0;
}

/**
 * The name of a pool's count, which spends one of its points: the pool and its count, as the count alone would name it
 * "4".
 */
function countName(pool: (typeof POOLS)[number]) {
	return game.i18n.format('Genesys.StoryPoints.PoolCount', {
		pool: game.i18n.localize(pool.name),
		count: String(context.value[pool.id]),
	});
}

// A click on a pool's count spends one of its points, which goes to the other pool, as the table spends a token: the
// gesture of the tracker since before 0.6.0, kept over a counter's − (#580). The tracker changes the pools from those
// stored when its write runs, not from those it rendered: a change made before the previous one rendered still counts.
async function spend(pool: StoryPointPool) {
	await StoryPointTracker.spendStoryPoint(pool);
}

async function add(pool: StoryPointPool) {
	await StoryPointTracker.addStoryPoint(pool);
}

/**
 * Opens the GM's input for a pool's count, on a right-click or the context menu key on the pool.
 */
async function editCount(pool: StoryPointPool, event: MouseEvent) {
	if (!isGM) {
		return;
	}
	event.preventDefault();

	editing.value = pool;
	await nextTick();
	countInputs.value[0]?.focus();
	countInputs.value[0]?.select();
}

/**
 * Closes the GM's input, writing the count it holds when `write` is set: Enter and a blur write it, Escape drops it.
 * Text that is no number, a number below 0 (#263) or the count the pool holds writes nothing; a fraction is rounded.
 */
async function finishEditing(pool: StoryPointPool, event: Event, write: boolean) {
	// Enter or Escape already closed the input: its removal must not write it again.
	if (editing.value !== pool) {
		return;
	}

	const input = event.currentTarget as HTMLInputElement;
	const fromKeyboard = event instanceof KeyboardEvent;
	editing.value = undefined;
	const count = write ? typedValue(input.value, { refuseNegative: true }) : undefined;
	if (count !== undefined && count !== context.value[pool]) {
		await StoryPointTracker.setStoryPointPool(pool, count);
	}

	// The keyboard goes back to the pool's count it opened the input from, rather than to the page.
	if (fromKeyboard) {
		await nextTick();
		document.querySelector<HTMLElement>(`#story-point-tracker .pool.${pool} .points`)?.focus();
	}
}

function countKeydown(pool: StoryPointPool, event: KeyboardEvent) {
	if (event.key === 'Enter' || event.key === 'Escape') {
		event.preventDefault();
		void finishEditing(pool, event, event.key === 'Enter');
	}
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
		<span class="count" @contextmenu="editCount(pool.id, $event)">
			<input
				v-if="editing === pool.id"
				ref="countInputs"
				class="points"
				type="text"
				inputmode="numeric"
				v-localize:aria-label="pool.name"
				:value="context[pool.id]"
				@keydown="countKeydown(pool.id, $event)"
				@blur="finishEditing(pool.id, $event, true)"
			/>
			<ActionButton
				v-else-if="canSpend(pool.id)"
				class="points"
				label="Genesys.StoryPoints.Spend"
				:aria-label="countName(pool)"
				@click="spend(pool.id)"
				>{{ context[pool.id] }}</ActionButton
			>
			<span v-else class="points">{{ context[pool.id] }}</span>
			<ActionButton
				v-if="isGM && editing !== pool.id"
				class="add"
				icon="fas fa-plus"
				label="Genesys.StoryPoints.Add"
				@click="add(pool.id)"
			/>
		</span>
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
	box-shadow: 0 0 6px colors.alpha(colors.$shadow, 0.5);

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
			color: colors.$text-gold;
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
		color: colors.$text-blue;

		.action-button {
			font-size: 0.75em;
		}
	}

	.count {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.points {
		font-family: 'Roboto Serif', serif;
		font-size: 1.75em;
		line-height: 1.2;
		color: inherit;
	}

	// The GM's input takes the count's place and look, a digit or two wide.
	input.points {
		width: 2.5ch;
		height: auto;
		margin: 0;
		padding: 0;
		text-align: center;
		background: none;
		border: none;
		border-bottom: 1px solid currentColor;
		border-radius: 0;
	}

	// The GM's + sits beside the count without moving it, and shows while the pointer is on the count or the focus is in
	// it, as a counter's does.
	.add {
		position: absolute;
		top: 50%;
		left: 100%;
		display: none;
		align-items: center;
		justify-content: center;
		width: 1.25em;
		height: 1.25em;
		margin-left: 0.15em;
		font-size: 0.8em;
		line-height: 1;
		background: colors.$paper;
		color: colors.$dark-blue;
		border: 1px solid colors.$gold;
		border-radius: 50%;
		transform: translateY(-50%);
	}

	.count:is(:hover, :focus-within) .add {
		display: inline-flex;
	}
}
</style>
