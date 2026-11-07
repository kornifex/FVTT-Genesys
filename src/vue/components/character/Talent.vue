<script lang="ts" setup>
import { computed, toRef, useTemplateRef } from 'vue';
import { useRendered } from '@/vue/useSheetDocument';
import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';
import DescriptionFold from '@/vue/components/DescriptionFold.vue';
import RowActions from '@/vue/components/RowActions.vue';
import type { ContextMenuHandle } from '@/vue/components/ContextMenuHandle';
import { GenesysItem } from '@/item/GenesysItem';
import { TalentDataModel } from '@/item/data/TalentDataModel';
import { openSheet } from '@/operations/ItemActions';

const props = withDefaults(
	defineProps<{
		item: GenesysItem<'talent' | 'ability'>;
		/**
		 * Whether the row's menu offers Delete: an ability its Archetype doesn't grant.
		 */
		canDelete?: boolean;
		canUpgrade?: boolean;
	}>(),
	{
		canDelete: false,
		canUpgrade: false,
	},
);

const emit = defineEmits<{
	(e: 'upgrade'): void;
}>();

const menu = useTemplateRef<ContextMenuHandle>('menu');

// Named as the prop, which it shadows in the template: the talent reads the item through `useRendered`.
const item = useRendered(() => props.item);
const talent = toRef(() => (item.value.type === 'talent' ? (item.value.system as TalentDataModel) : undefined));
const ranked = computed(() => talent.value?.ranked === 'yes');
</script>

<template>
	<!-- A right-click anywhere on the row opens its menu, at the pointer. -->
	<div class="talent" @contextmenu="menu?.open($event)">
		<img :src="item.img ?? undefined" :alt="item.name" />
		<!-- The name opens the talent's sheet, as on any row that can't roll; the chevron opens its tier and source too. -->
		<DescriptionFold class="name" :description="item.system.description">
			<ActionButton @click="openSheet(item)">
				{{ item.name }}
				<template v-if="ranked">
					{{ talent?.rank }}
				</template>
			</ActionButton>

			<template v-if="talent" #fold>
				<div class="tier-container">
					<span class="tier"><Localized label="Genesys.Labels.Tier" />: {{ talent.effectiveTier }}</span>
				</div>
			</template>
			<template v-if="item.system.source" #fold-end>
				<div class="source">{{ item.system.source }}</div>
			</template>
		</DescriptionFold>
		<!-- Its own cell, after the chevron, rendered without its button too, so that the columns don't move. -->
		<span class="upgrade">
			<ActionButton
				v-if="ranked && canUpgrade"
				icon="fas fa-arrow-circle-up"
				label="Genesys.Labels.BuyTalentRank"
				edits
				@click="emit('upgrade')"
			/>
		</span>
		<div></div>
		<!-- A character loses a talent by undoing its Advancement in the Experience Journal: its menu offers no Delete. -->
		<RowActions ref="menu" class="actions" :document="item" :deletable="canDelete" />
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/headings.scss';
@use '@scss/vars/colors.scss';

// The name and the fold are the roots of the row's `DescriptionFold`, which take no scope attribute from the row: :deep()
// reaches them.
.talent {
	display: grid;
	grid-template-columns: /* Image */ 2em /* Name */ auto /* Upgrade */ auto /* Spacer */ 1fr /* Action Buttons */ auto;
	grid-template-rows: repeat(2, auto);
	align-items: center;
	padding: 0.25em;
	column-gap: 0.5em;
	row-gap: 0.1em;

	& > :deep(*) {
		grid-row: 1 / span 1;
	}

	& + .talent {
		border-top: 1px dashed colors.$ink;
	}

	img {
		aspect-ratio: 1;
		object-fit: contain;
	}

	& > :deep(.name) {
		font-family: 'Roboto Slab', serif;
		font-size: 1.1em;
		display: flex;
		gap: 0.25em;
		// The chevron's smaller icon sits on the name's baseline, as it does in the Combat tab's names, which aren't flex rows.
		align-items: baseline;
	}

	.upgrade {
		font-size: 1.1em;
	}

	& > :deep(.description-fold) {
		grid-column: 1 / span all;
		grid-row: 2 / span 1;
		padding-left: 0.5em;

		.tier-container {
			margin-top: 0.5em;
			margin-bottom: 0.5em;
		}

		.tier {
			border: 1px dotted colors.$gold;
			background: colors.alpha(colors.$gold, 0.5);
			border-radius: 0.5em;
			@include headings.font;
			padding: 2px;
		}

		.source {
			text-align: right;
			font-family: 'Roboto', sans-serif;
			font-style: italic;
			font-size: 0.8em;
		}
	}
}
</style>
