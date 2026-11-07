<script lang="ts" setup>
import type { Stored } from '@/data/Stored';
import { GenesysEffect } from '@/effects/GenesysEffect';
import { EffectCategory } from '@/effects/NewEffect';
import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import { EquipmentState } from '@/item/data/EquipmentState';
import { useSheetDocument } from '@/vue/useSheetDocument';
import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';
import ListEmpty from '@/vue/components/ListEmpty.vue';

defineProps<{
	effects: Stored<GenesysEffect>[];
}>();

const emit = defineEmits<{
	(e: 'addEffect', category: EffectCategory): void;
}>();

const { document: sheetDocument, editable } = useSheetDocument();

type EffectSection = {
	category: EffectCategory;
	label: string;
	filter: (effect: GenesysEffect) => boolean;
};

const sections: EffectSection[] = [
	{ category: 'temporary', label: 'Genesys.ActiveEffects.Temporary', filter: (e) => e.isTemporary && !e.isSuppressed },
	{ category: 'passive', label: 'Genesys.ActiveEffects.Passive', filter: (e) => !e.isTemporary && !e.isSuppressed },
	{ category: 'suppressed', label: 'Genesys.ActiveEffects.Suppressed', filter: (e) => e.isSuppressed },
];

// The label of each Equipment State, for the tooltip of an effect its item's state suppresses.
const STATE_LABELS: Record<EquipmentState, string> = {
	[EquipmentState.Equipped]: 'Genesys.Labels.Equipped',
	[EquipmentState.Carried]: 'Genesys.Labels.Carried',
	[EquipmentState.Dropped]: 'Genesys.Labels.Dropped',
};

// An actor's tab also lists the effects of its items, which live on the item.
function livesOnSheetDocument(effect: GenesysEffect) {
	return effect.parent === sheetDocument.value;
}

function sourceName(effect: GenesysEffect) {
	return livesOnSheetDocument(effect) ? effect.sourceName : effect.parent?.name ?? effect.sourceName;
}

function suppressionReason(effect: GenesysEffect) {
	const item = effect.originItem;
	if (!item || !effect.isSuppressedByEquipmentState) {
		return undefined;
	}

	if (effect.isSuppressedAsConsumable) {
		return game.i18n.format('Genesys.ActiveEffects.SuppressedAsConsumable', { item: item.name });
	}

	const container = effect.suppressingContainer;
	if (container) {
		return game.i18n.format('Genesys.ActiveEffects.SuppressedByContainer', { item: item.name, container: container.name });
	}

	const state = game.i18n.localize(STATE_LABELS[(item.system as EquipmentDataModel).state]);
	return game.i18n.format('Genesys.ActiveEffects.SuppressedByEquipmentState', { item: item.name, state });
}

async function openEffect(effect: GenesysEffect) {
	await effect.sheet?.render(true);
}

async function toggleDisabled(effect: GenesysEffect) {
	await effect.update({
		disabled: !effect.disabled,
	});
}

async function deleteEffect(effect: GenesysEffect) {
	await effect.delete();
}
</script>

<template>
	<section class="effects-view">
		<template v-for="{ category, label, filter } in sections" :key="category">
			<!-- An empty category keeps its heading and its Add button, not the labels of columns it has no row in. -->
			<div class="columns">
				<h3 class="name"><Localized :label="label" /></h3>
				<template v-if="effects.some(filter)">
					<div class="source"><Localized label="Genesys.ActiveEffects.Source" /></div>
					<div class="duration"><Localized label="Genesys.ActiveEffects.Duration" /></div>
				</template>
				<div class="buttons">
					<ActionButton icon="fas fa-plus" edits @click="emit('addEffect', category)"
						><Localized label="Genesys.Labels.Add"
					/></ActionButton>
				</div>
			</div>

			<section class="effects-category">
				<ListEmpty v-if="!effects.some(filter)" />
				<div v-for="effect in effects.filter(filter)" :key="effect.uuid" class="effect" :data-tooltip="suppressionReason(effect)">
					<img :src="effect.img ?? undefined" :alt="effect.name" />
					<div class="name">{{ effect.name }}</div>
					<div class="source">{{ sourceName(effect) }}</div>
					<div class="duration">
						<Localized v-if="effect.isExpired" label="Genesys.ActiveEffects.Expired" />
						<template v-else>{{ effect.duration.label }}</template>
					</div>
					<div v-if="editable" class="buttons">
						<!-- The button names what it does, which says whether the effect is on, besides the row's opacity. -->
						<ActionButton
							:icon="effect.disabled ? 'fas fa-toggle-off' : 'fas fa-toggle-on'"
							:label="effect.disabled ? 'Genesys.ActiveEffects.TurnOn' : 'Genesys.ActiveEffects.TurnOff'"
							:style="effect.disabled ? 'opacity: 25%' : undefined"
							@click="toggleDisabled(effect)"
						/>
						<ActionButton icon="fas fa-edit" label="Genesys.Labels.Edit" @click="openEffect(effect)" />
						<ActionButton
							v-if="livesOnSheetDocument(effect)"
							icon="fas fa-trash"
							label="Genesys.Labels.Delete"
							@click="deleteEffect(effect)"
						/>
					</div>
				</div>
			</section>
		</template>
	</section>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/headings.scss';
@use '@scss/vars/colors.scss';

.effects-view {
	width: 100%;
	height: 100%;

	.buttons {
		display: flex;
		align-items: center;
		gap: 0.25em;
	}

	.effect,
	.columns {
		align-items: center;
		display: grid;
		grid-template-columns: /* Icon */ 1.5rem /* Name */ 1fr /* Source */ 120px /* Duration */ 120px /* Actions */ 60px;
		grid-template-rows: 1.75rem;
		column-gap: 0.5em;

		.buttons {
			text-align: right;
		}
	}

	.effects-category {
		img {
			background: colors.$gold-shade;
			border: 1px solid colors.$gold;
			border-radius: 0.25em;
		}

		.effect {
			border-bottom: 1px dashed colors.$ink;
			padding-left: 0.5em;

			&:last-of-type {
				border-bottom: none;
			}
		}
	}

	.columns {
		@include headings.font;
		margin-top: 1em;

		&:first-of-type {
			margin-top: 0;
		}

		.name {
			grid-column: 1 / span 2;
		}

		.buttons {
			grid-column: 5 / span 1;
		}
	}

	.list-empty {
		padding-left: 0.5em;
	}
}
</style>
