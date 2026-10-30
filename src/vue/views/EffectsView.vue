<script lang="ts" setup>
import { GenesysEffect } from '@/effects/GenesysEffect';
import { EffectCategory } from '@/effects/NewEffect';
import { EquipmentDataModel, EquipmentState } from '@/item/data/EquipmentDataModel';
import { inject, toRaw } from 'vue';
import { BaseSheetContext, RootContext } from '@/vue/SheetContext';
import Localized from '@/vue/components/Localized.vue';

defineProps<{
	effects: GenesysEffect[];
}>();

const emit = defineEmits<{
	(e: 'addEffect', category: EffectCategory): void;
}>();

const rootContext = inject<BaseSheetContext>(RootContext)!;

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
	return toRaw(effect).parent === toRaw(rootContext.sheet).document;
}

function sourceName(effect: GenesysEffect) {
	return livesOnSheetDocument(effect) ? effect.sourceName : toRaw(effect).parent?.name ?? effect.sourceName;
}

function suppressionReason(effect: GenesysEffect) {
	const item = toRaw(effect).originItem;
	if (!item || !effect.isSuppressedByEquipmentState) {
		return undefined;
	}

	if (toRaw(effect).isSuppressedAsConsumable) {
		return game.i18n.format('Genesys.ActiveEffects.SuppressedAsConsumable', { item: item.name });
	}

	const container = toRaw(effect).suppressingContainer;
	if (container) {
		return game.i18n.format('Genesys.ActiveEffects.SuppressedByContainer', { item: item.name, container: container.name });
	}

	const state = game.i18n.localize(STATE_LABELS[(item.systemData as EquipmentDataModel).state]);
	return game.i18n.format('Genesys.ActiveEffects.SuppressedByEquipmentState', { item: item.name, state });
}

async function openEffect(effect: GenesysEffect) {
	await toRaw(effect).sheet.render(true);
}

async function toggleDisabled(effect: GenesysEffect) {
	await toRaw(effect).update({
		disabled: !effect.disabled,
	});
}

async function deleteEffect(effect: GenesysEffect) {
	await toRaw(effect).delete();
}
</script>

<template>
	<section class="effects-view">
		<template v-for="{ category, label, filter } in sections" :key="category">
			<div class="effects-header">
				<div class="name"><Localized :label="label" /></div>
				<div class="source"><Localized label="Genesys.ActiveEffects.Source" /></div>
				<div class="duration"><Localized label="Genesys.ActiveEffects.Duration" /></div>
				<div class="buttons">
					<a @click="emit('addEffect', category)"><i class="fas fa-plus"></i> <Localized label="Genesys.Labels.Add" /></a>
				</div>
			</div>

			<section class="effects-category">
				<div v-for="effect in effects.filter(filter)" :key="effect.uuid" class="effect" :data-tooltip="suppressionReason(effect)">
					<img :src="effect.img" :alt="effect.name" />
					<div class="name">{{ effect.name }}</div>
					<div class="source">{{ sourceName(effect) }}</div>
					<div class="duration">
						<Localized v-if="effect.isExpired" label="Genesys.ActiveEffects.Expired" />
						<template v-else>{{ effect.duration.label }}</template>
					</div>
					<div v-if="rootContext.data.editable" class="buttons">
						<a @click="toggleDisabled(effect)" :style="effect.disabled ? 'opacity: 25%' : undefined"
							><i class="fas fa-power-off"></i
						></a>
						<a @click="openEffect(effect)"><i class="fas fa-edit"></i></a>
						<a v-if="livesOnSheetDocument(effect)" @click="deleteEffect(effect)"><i class="fas fa-trash"></i></a>
					</div>
				</div>
			</section>
		</template>
	</section>
</template>

<style lang="scss">
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
	.effects-header {
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

		.separator {
			height: 1px;
			border-top: 1px dashed black;
			grid-column: 1 / span all;
			grid-row: 1 / span 1;
			margin-top: 0.25em;
			margin-bottom: 0.25em;
		}

		.effect {
			border-bottom: 1px dashed black;
			padding-left: 0.5em;

			&:last-of-type {
				border-bottom: none;
			}
		}
	}

	.effects-header {
		font-family: 'Bebas Neue', sans-serif;
		text-transform: uppercase;
		margin-top: 1em;

		&:first-of-type {
			margin-top: 0;
		}

		.name {
			grid-column: 1 / span 2;
		}
	}
}
</style>
