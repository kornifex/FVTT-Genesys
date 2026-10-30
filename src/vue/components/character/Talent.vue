<script lang="ts" setup>
import { computed, ref, toRef } from 'vue';
import { useRendered, useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import Localized from '@/vue/components/Localized.vue';
import Enriched from '@/vue/components/Enriched.vue';
import { GenesysItem } from '@/item/GenesysItem';
import { TalentDataModel } from '@/item/data/TalentDataModel';
import { deleteItem, openSheet, sendToChat } from '@/operations/ItemActions';

const props = withDefaults(
	defineProps<{
		item: GenesysItem<'talent' | 'ability'>;
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

const { document: actor, editable } = useSheetDocument<GenesysActor<'character'>>();

const expanded = ref(false);

// Named as the prop, which it shadows in the template: the talent reads the item through `useRendered`.
const item = useRendered(() => props.item);
const talent = toRef(() => (item.value.type === 'talent' ? (item.value.system as TalentDataModel) : undefined));
const ranked = computed(() => talent.value?.ranked === 'yes');
</script>

<template>
	<div class="talent">
		<img :src="item.img ?? undefined" :alt="item.name" />
		<span class="name">
			<a @click="expanded = !expanded">
				{{ item.name }}
				<template v-if="ranked">
					{{ talent?.rank }}
				</template>
			</a>

			<a v-if="ranked && canUpgrade" @click="emit('upgrade')"><i class="fas fa-arrow-circle-up"></i></a>
		</span>
		<div></div>
		<span v-if="canDelete">
			<a @click="deleteItem(item)"><i class="fas fa-trash"></i></a>
		</span>
		<span v-if="editable">
			<a @click="openSheet(item)"><i class="fas fa-edit"></i></a>
		</span>
		<span v-if="editable">
			<a @click="sendToChat(item, actor)"><i class="fas fa-comment"></i></a>
		</span>
		<div :class="`desc-container ${expanded ? 'active' : ''}`">
			<div>
				<div v-if="talent" class="tier-container">
					<span class="tier"><Localized label="Genesys.Labels.Tier" />: {{ talent?.effectiveTier }}</span>
				</div>

				<Enriched class="desc" :value="item.system.description"></Enriched>

				<div v-if="item.system.source" class="source">{{ item.system.source }}</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';
@use '@scss/mixins/expandable.scss';

.talent {
	display: grid;
	grid-template-columns: /* Image */ 2em /* Name */ auto /* Spacer */ 1fr /* Action Buttons */ auto;
	grid-template-rows: repeat(2, auto);
	align-items: center;
	padding: 0.25em;
	column-gap: 0.5em;
	row-gap: 0.1em;

	& > * {
		grid-row: 1 / span 1;
	}

	& + .talent {
		border-top: 1px dashed black;
	}

	img {
		aspect-ratio: 1;
		object-fit: contain;
	}

	.name {
		font-family: 'Roboto Slab', serif;
		font-size: 1.1em;
		display: flex;
		gap: 0.25em;
	}

	.desc-container {
		grid-column: 1 / span all;
		grid-row: 2 / span 1;
		padding-left: 0.5em;
		@include expandable.description;

		.tier-container {
			margin-top: 0.5em;
			margin-bottom: 0.5em;
		}

		.tier {
			border: 1px dotted colors.$gold;
			background: colors.alpha(colors.$gold, 0.5);
			border-radius: 0.5em;
			font-family: 'Bebas Neue', sans-serif;
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
