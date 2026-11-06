<script lang="ts" setup>
import { Comment, Fragment, Text, useId, useSlots, type VNode } from 'vue';
import { isEmptyDescription } from '@/data/Descriptions';
import ActionButton from '@/vue/components/ActionButton.vue';
import Enriched from '@/vue/components/Enriched.vue';

/**
 * A fold: a chevron that opens and closes it, and the fold, showing a description and what its slots add. It renders two
 * roots, so that the chevron sits in a row's name and the fold spans the row below it: a head, which holds the default
 * slot then the chevron, and the fold after it; with no default slot, the chevron is the head itself. The `summary` slot is
 * the chevron's text, such as the Pool Modifications' title. The attributes given to the component go to the head; the
 * row places the fold, whose class is `description-fold`.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	/**
	 * The enriched text the fold shows: an empty one shows nothing.
	 */
	description?: string;
}>();

/**
 * Whether the fold is open. A fold starts closed, and keeps its state for as long as it is rendered: a keyed row keeps it
 * through a re-render, and a sheet opens with its folds closed again.
 */
const open = defineModel<boolean>('open', { default: false });

const slots = useSlots();
const foldId = useId();

// Whether some of these nodes show something: a slot whose content is all `v-if`s that failed, or blank text, shows nothing.
function rendersSomething(nodes: VNode[] | undefined): boolean {
	return (nodes ?? []).some((node) => {
		if (node.type === Fragment) {
			return Array.isArray(node.children) && rendersSomething(node.children as VNode[]);
		}
		if (node.type === Text) {
			return typeof node.children === 'string' && node.children.trim() !== '';
		}
		return node.type !== Comment;
	});
}

const chevronIcon = () => `fas ${open.value ? 'fa-chevron-down' : 'fa-chevron-right'}`;

// A summary is the chevron's text, which names it, and needs no tooltip; without one, it shows its icon alone, named
// Details whether the fold is open or not, as `aria-expanded` tells which.
const chevronLabel = () => (slots.summary ? undefined : 'Genesys.Tooltips.Details');

// The chevron shows while the fold has something to show: a description, or what its slots add, such as a talent's tier.
function hasContent() {
	return !isEmptyDescription(props.description ?? '') || rendersSomething(slots.fold?.()) || rendersSomething(slots['fold-end']?.());
}
</script>

<template>
	<!-- Reading a fold edits nothing: the chevron shows on a sheet the user can't edit too. -->
	<span v-if="$slots.default" class="description-fold-head" v-bind="$attrs">
		<slot />
		<ActionButton
			v-if="hasContent()"
			:class="['description-toggle', { 'icon-only': !$slots.summary }]"
			:icon="chevronIcon()"
			:label="chevronLabel()"
			:expanded="open"
			:aria-controls="foldId"
			@click="open = !open"
		>
			<template v-if="$slots.summary" #default><slot name="summary" /></template>
		</ActionButton>
	</span>
	<ActionButton
		v-else-if="hasContent()"
		v-bind="$attrs"
		:class="['description-toggle', { 'icon-only': !$slots.summary }]"
		:icon="chevronIcon()"
		:label="chevronLabel()"
		:expanded="open"
		:aria-controls="foldId"
		@click="open = !open"
	>
		<template v-if="$slots.summary" #default><slot name="summary" /></template>
	</ActionButton>

	<!-- The closed fold stays rendered, for it to close over its content. -->
	<div :id="foldId" :class="['description-fold', { open }]">
		<div class="description-fold-content">
			<slot name="fold" />
			<Enriched v-if="!isEmptyDescription(description ?? '')" class="description" :value="description!" />
			<slot name="fold-end" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/expandable.scss';

// An icon after a name: smaller than the name, and apart from it.
.description-toggle.icon-only {
	margin-left: 0.5em;
	font-size: 0.8em;
}

.description-fold {
	@include expandable.description($open: open);
}
</style>
