<script lang="ts" setup>
import { vLocalize } from '@/vue/directives';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { GenesysItem } from '@/item/GenesysItem';
import Localized from '@/vue/components/Localized.vue';
import Editor from '@/vue/components/Editor.vue';
import Enriched from '@/vue/components/Enriched.vue';
import EffectsView from '@/vue/views/EffectsView.vue';
import { useDocumentEffects } from '@/vue/useDocumentEffects';

defineProps<{
	/**
	 * Whether the item has a decoration field to display.
	 */
	hasDecoration?: boolean;

	/**
	 * Whether to show or hide the ActiveEffects tab
	 */
	showEffectsTab?: boolean;
}>();

const { document: item, system } = useSheetDocument<GenesysItem<BaseItemDataModel>>();

const { effects, addEffect } = useDocumentEffects();
</script>

<template>
	<div class="item-sheet-basic">
		<header :class="hasDecoration ? 'with-decoration' : ''">
			<img :src="item.img" data-edit="img" :title="item.name" :alt="item.name" />
			<input type="text" name="name" :value="item.name" v-localize:placeholder="'Genesys.Labels.Name'" />
			<slot v-if="hasDecoration" name="decoration"></slot>
		</header>

		<nav class="sheet-tabs" data-group="primary">
			<div class="spacer"></div>

			<slot name="tabs">
				<a class="item" data-tab="description">
					<Localized label="Genesys.Tabs.Description" />
				</a>

				<a class="item" data-tab="data">
					<Localized label="Genesys.Tabs.Data" />
				</a>

				<a v-if="showEffectsTab" class="item" data-tab="effects">
					<Localized label="Genesys.Tabs.Effects" />
				</a>
			</slot>

			<div class="spacer"></div>
		</nav>

		<section class="sheet-body">
			<div class="tab" data-group="primary" data-tab="description">
				<slot name="description">
					<section class="description">
						<Editor name="system.description" :content="system.description" button />
						<Enriched class="source" :value="system.source" />
					</section>
				</slot>
			</div>

			<div class="tab" data-group="primary" data-tab="data">
				<slot name="data" />
			</div>

			<div v-if="showEffectsTab" class="tab" data-group="primary" data-tab="effects">
				<EffectsView :effects="[...effects]" @add-effect="addEffect" />
			</div>
		</section>
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
			font-family: 'Bebas Neue', sans-serif;
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

	.tab {
		padding-left: sheet.$padding;
		padding-right: sheet.$padding;
	}
}
</style>
