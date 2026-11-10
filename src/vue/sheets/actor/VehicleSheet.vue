<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import SheetTabs from '@/vue/components/SheetTabs.vue';
import CombatStat from '@/vue/components/character/CombatStat.vue';
import Characteristic from '@/vue/components/character/Characteristic.vue';

import SkillsTab from '@/vue/sheets/actor/vehicle/SkillsTab.vue';
import CombatTab from '@/vue/sheets/actor/vehicle/CombatTab.vue';
import CrewTab from '@/vue/sheets/actor/vehicle/CrewTab.vue';
import InventoryTab from '@/vue/components/inventory/InventoryTab.vue';
import DetailsTab from '@/vue/sheets/actor/vehicle/DetailsTab.vue';
import EffectsView from '@/vue/views/EffectsView.vue';
import { useDocumentEffects } from '@/vue/useDocumentEffects';
import { vLocalize } from '@/vue/directives';

const { document: actor, system } = useSheetDocument<GenesysActor<'vehicle'>>();

const { effects, addEffect } = useDocumentEffects();

const TABS = [
	{ id: 'skills', label: 'Genesys.Tabs.Skills' },
	{ id: 'combat', label: 'Genesys.Tabs.Combat' },
	{ id: 'inventory', label: 'Genesys.Tabs.Inventory' },
	{ id: 'crew', label: 'Genesys.Tabs.Crew' },
	{ id: 'effects', label: 'Genesys.Tabs.Effects' },
	{ id: 'details', label: 'Genesys.Tabs.Details' },
];
</script>

<template>
	<div class="vehicle-sheet">
		<header>
			<img :src="actor.img ?? undefined" :alt="actor.name" data-edit="img" />
			<input type="text" name="name" :value="actor.name" v-localize:aria-label="'Genesys.Labels.Name'" />
		</header>

		<section class="stats-section">
			<div class="stats-row">
				<div class="characteristics">
					<Characteristic label="Genesys.Labels.Silhouette" :value="system.silhouette" name="system.silhouette" can-edit />
					<Characteristic label="Genesys.Labels.Speed" :value="system.speed" name="system.speed" can-edit />
					<Characteristic
						label="Genesys.Labels.Handling"
						:value="system.handling.signedString()"
						name="system.handling"
						can-edit
					/>
				</div>

				<div class="stats-column">
					<!-- The total counts the Pilot's Piloted Vehicle Defense, which the vehicle's own defense doesn't. -->
					<CombatStat
						label="Genesys.Labels.Defense"
						primary-label="Genesys.Labels.DefenseTotal"
						:value="system.totalDefense.ranged"
						:secondary="{ label: 'Genesys.Labels.DefenseVehicle', value: system.defense, name: 'system.defense' }"
					/>
					<CombatStat label="Genesys.Labels.Armor" name="system.armor" :value="system.armor" />

					<CombatStat
						label="Genesys.Labels.HullTrauma"
						primary-label="Genesys.Labels.Threshold"
						name="system.hullTrauma.max"
						field-label="Genesys.Labels.HullTraumaThreshold"
						:value="system.hullTrauma.max"
						:secondary="{
							label: 'Genesys.Labels.Current',
							value: system.hullTrauma.value,
							counter: { attribute: 'trauma', label: 'Genesys.Counter.CurrentHullTrauma' },
						}"
					/>

					<CombatStat
						label="Genesys.Labels.SystemStrain"
						primary-label="Genesys.Labels.Threshold"
						name="system.systemStrain.max"
						field-label="Genesys.Labels.SystemStrainThreshold"
						:value="system.systemStrain.max"
						:secondary="{
							label: 'Genesys.Labels.Current',
							value: system.systemStrain.value,
							counter: { attribute: 'strain', label: 'Genesys.Counter.CurrentSystemStrain' },
						}"
					/>
				</div>
			</div>
		</section>

		<SheetTabs :tabs="TABS">
			<template #skills><SkillsTab /></template>
			<template #combat><CombatTab /></template>
			<template #inventory><InventoryTab summary-on-top /></template>
			<template #crew><CrewTab /></template>
			<template #effects><EffectsView :effects="[...effects]" @add-effect="addEffect" /></template>
			<template #details><DetailsTab /></template>
		</SheetTabs>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/headings.scss';
@use '@scss/mixins/reset.scss';
@use '@scss/vars/colors.scss';

.vehicle-sheet {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	width: 100%;
	height: 100%;

	header {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem;
		align-items: center;

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
			color: colors.$text-blue;
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

	.stats-section {
		display: flex;
		gap: 1em;
		align-items: center;
		justify-content: space-around;

		.stats-row {
			position: relative;
			display: flex;
			justify-content: center;
			gap: 3em;
			align-items: center;
			padding-bottom: 0.25rem;

			&::after {
				display: block;
				content: '';
				position: absolute;
				top: 25%;
				left: -1.5rem;
				width: calc(100% + 3rem);
				height: 50%;
				background: colors.$gold;
				border-radius: 4rem;

				clip-path: polygon(0% 50%, 100% 50%, 100% 100%, 0% 100%);
			}

			// One column per characteristic, each as wide as the widest (#621), spaced as the row spaces them from the stats.
			.characteristics {
				display: grid;
				grid-auto-flow: column;
				grid-auto-columns: 1fr;
				gap: 3em;
			}

			.characteristic-field {
				z-index: 1;
			}

			.stats-column {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 1em;
				z-index: 2;
			}
		}
	}
}
</style>
