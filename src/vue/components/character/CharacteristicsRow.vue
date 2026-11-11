<script lang="ts" setup>
/**
 * The row of characteristic boxes of a character, an adversary, a vehicle or an archetype: each box as wide as its own
 * name and ↑ (#644), the row as wide as its boxes, for its sheet to centre.
 */
withDefaults(
	defineProps<{
		/**
		 * Whether the row draws the gold band behind its boxes. A vehicle's band runs behind its combat stats too, so its
		 * sheet draws it.
		 */
		band?: boolean;
	}>(),
	{ band: true },
);
</script>

<template>
	<div class="characteristics-row" :class="{ band }">
		<slot />
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.characteristics-row {
	display: grid;
	grid-auto-flow: column;
	// Each box fitted to its own name, rather than all at the width of the widest (#644): a short name doesn't look lost
	// in a box sized for « Intelligence ».
	grid-auto-columns: max-content;
	// Each box reaches 0.5em past its column on each side, which leaves 1em between two boxes.
	gap: 2em;
	align-items: center;

	// A stacking context of its own, so that the band, at -1 in it, stays behind the boxes yet over the sheet's
	// background. The band is placed from the row's edges.
	position: relative;
	isolation: isolate;

	// The band shows below the boxes too.
	&.band {
		padding-bottom: 0.25rem;
	}

	&.band::after {
		display: block;
		content: '';
		position: absolute;
		z-index: -1;
		top: 0;
		left: -1.5rem;
		width: calc(100% + 3rem);
		height: 100%;
		background: colors.$gold;
		border-radius: 4rem;

		clip-path: polygon(0% 50%, 100% 50%, 100% 100%, 0% 100%);
	}
}
</style>
