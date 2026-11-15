<script lang="ts" setup>
import { enrich } from '@/enrich';

const props = withDefaults(
	defineProps<{
		/**
		 * Either a Localization key (if localized === true), or the string to use as the tooltip.
		 *
		 * Either way, this will be Enriched.
		 */
		content: string;
		localized?: boolean;
		direction?: foundry.helpers.interaction.TooltipManager.TOOLTIP_DIRECTIONS;
		cssClass?: string;
	}>(),
	{
		localized: false,
		direction: 'DOWN',
	},
);

async function showTooltip(event: Event) {
	// Read before the enrichment: the event loses its current target once dispatched.
	const target = event.currentTarget as HTMLElement;
	const sourceText = props.localized ? game.i18n.localize(props.content) : props.content;
	const enriched = await enrich(sourceText);
	const content = document.createRange().createContextualFragment(enriched);

	game.tooltip.activate(target, {
		// Foundry appends a fragment as it does an element, which the types don't take.
		html: content as unknown as HTMLElement,
		direction: props.direction,
		cssClass: props.cssClass ? `${props.cssClass} genesys` : 'genesys',
	});
}

async function hideTooltip() {
	game.tooltip.deactivate();
}
</script>

<template>
	<div @mouseover="showTooltip" @mouseleave="hideTooltip">
		<slot></slot>
	</div>
</template>

<style lang="scss" scoped>
div {
	display: inline;
}
</style>
