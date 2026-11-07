<script lang="ts" setup>
import { computed } from 'vue';
import { vLocalize } from '@/vue/directives';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import SheetTabs from '@/vue/components/SheetTabs.vue';
import Editor from '@/vue/components/Editor.vue';
import Enriched from '@/vue/components/Enriched.vue';
import EffectsView from '@/vue/views/EffectsView.vue';
import { useDocumentEffects } from '@/vue/useDocumentEffects';

const props = defineProps<{
	/**
	 * Whether the item has a decoration field to display.
	 */
	hasDecoration?: boolean;

	/**
	 * Whether to show or hide the ActiveEffects tab
	 */
	showEffectsTab?: boolean;
}>();

const { document: item, system } = useSheetDocument<GenesysItem>();

const { effects, addEffect } = useDocumentEffects();

const tabs = computed(() => [
	{ id: 'description', label: 'Genesys.Tabs.Description' },
	{ id: 'data', label: 'Genesys.Tabs.Data' },
	...(props.showEffectsTab ? [{ id: 'effects', label: 'Genesys.Tabs.Effects' }] : []),
]);
</script>

<template>
	<div class="item-sheet-basic">
		<header :class="hasDecoration ? 'with-decoration' : ''">
			<img :src="item.img ?? undefined" data-edit="img" :title="item.name" :alt="item.name" />
			<input
				type="text"
				name="name"
				:value="item.name"
				v-localize:placeholder="'Genesys.Labels.Name'"
				v-localize:aria-label="'Genesys.Labels.Name'"
			/>
			<slot v-if="hasDecoration" name="decoration"></slot>
		</header>

		<SheetTabs :tabs="tabs">
			<template #description>
				<slot name="description">
					<section class="description">
						<Editor name="system.description" />
						<Enriched class="source" :value="system.source" />
					</section>
				</slot>
			</template>

			<template #data>
				<slot name="data" />
			</template>

			<template #effects>
				<EffectsView :effects="[...effects]" @add-effect="addEffect" />
			</template>
		</SheetTabs>
	</div>
</template>

<style lang="scss">
@use '@scss/mixins/data-row.scss';

// Unscoped: the item sheets pass their own description and data sections through the slots, which these rules lay out.
.item-sheet-basic {
	.editor-content {
		font-family: 'Roboto Serif', serif;
		text-align: justify;
	}

	.description {
		display: flex;
		flex-direction: column;

		.source {
			width: 100%;
			font-family: 'Roboto Serif', serif;
			font-style: italic;
			font-size: 0.8em;
			text-align: right;
			padding-top: 0.25rem;
			padding-right: 1.5rem;
			margin-bottom: 0.5rem;
			border-top: 1px dashed black;

			&:empty {
				border-top: none;
			}
		}
	}

	section.data-grid {
		display: flex;
		flex-direction: column;

		.row {
			border-bottom: 1px dashed black;
			@include data-row.grid;
		}
	}
}
</style>

<style lang="scss" scoped>
@use '@scss/mixins/headings.scss';
@use '@scss/mixins/reset.scss';
@use '@scss/vars/colors.scss';
@use '@scss/vars/sheet.scss';

.item-sheet-basic {
	width: calc(100% + #{sheet.$padding * 2});
	height: calc(100% + #{sheet.$padding * 2});

	display: grid;
	grid-template-rows: /* Header & Tabs */ repeat(2, auto) /* Tab Content */ 1fr;

	margin: -1 * sheet.$padding;

	header {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem;
		align-items: center;

		padding: sheet.$padding;

		&.with-decoration {
			grid-template-columns: auto 1fr auto;
		}

		img {
			border: 1px solid colors.$gold;
			background: colors.alpha(colors.$gold, 0.5);
			border-radius: 1em;
			height: 2.5rem;
		}

		@include reset.input;
		input[type='text'] {
			width: 100%;
			@include headings.font;
			font-size: 2rem;
			color: colors.$blue;
			height: 2rem;

			&,
			&:focus {
				border-bottom: 1px solid colors.$dark-blue;
			}

			&:focus {
				font-family: 'Modesto Condensed', sans-serif;
			}
		}
	}

	// The panels are SheetTabs', outside this component's scope.
	:deep(.tab) {
		padding-left: sheet.$padding;
		padding-right: sheet.$padding;
	}
}
</style>
