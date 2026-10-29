<script lang="ts" setup>
import { computed, ref, toRef } from 'vue';
import { useRendered, useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import Localized from '@/vue/components/Localized.vue';
import Enriched from '@/vue/components/Enriched.vue';
import { GenesysItem } from '@/item/GenesysItem';
import { AbilityDataModel } from '@/item/data/AbilityDataModel';
import { TalentDataModel } from '@/item/data/TalentDataModel';
import { postChatCard } from '@/item/ChatCards';

const props = withDefaults(
	defineProps<{
		item: GenesysItem<TalentDataModel | AbilityDataModel>;
		canDelete?: boolean;
		canUpgrade?: boolean;
	}>(),
	{
		canDelete: false,
		canUpgrade: false,
	},
);

const emit = defineEmits<{
	(e: 'open'): void;
	(e: 'upgrade'): void;
	(e: 'delete'): void;
}>();

const { document: actor, editable } = useSheetDocument<GenesysActor<CharacterDataModel>>();

const expanded = ref(false);

// Named as the prop, which it shadows in the template: the talent reads the item through `useRendered`.
const item = useRendered(() => props.item);
const talent = toRef(() => (item.value.type === 'talent' ? (item.value.systemData as TalentDataModel) : undefined));
const ranked = computed(() => talent.value?.ranked === 'yes');

async function sendToChat() {
	await postChatCard(props.item, actor.value);
}
</script>

<template>
	<div class="talent">
		<img :src="item.img" :alt="item.name" />
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
			<a @click="emit('delete')"><i class="fas fa-trash"></i></a>
		</span>
		<span v-if="editable">
			<a @click="emit('open')"><i class="fas fa-edit"></i></a>
		</span>
		<span v-if="editable">
			<a @click="sendToChat()"><i class="fas fa-comment"></i></a>
		</span>
		<div :class="`desc-container ${expanded ? 'active' : ''}`">
			<div v-if="talent" class="tier-container">
				<span class="tier"><Localized label="Genesys.Labels.Tier" />: {{ talent?.effectiveTier }}</span>
			</div>

			<Enriched class="desc" :value="item.systemData.description"></Enriched>

			<div v-if="item.systemData.source" class="source">{{ item.systemData.source }}</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

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
		transition: max-height 0.5s ease-out;
		max-height: 0;
		transform-origin: 50% 0;
		overflow: hidden;
		padding-left: 0.5em;

		&.active {
			max-height: 500px;
			transition: max-height 1s ease-in;
		}

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
