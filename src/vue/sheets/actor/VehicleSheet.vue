<script lang="ts" setup>
import { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import Localized from '@/vue/components/Localized.vue';
import CombatStat from '@/vue/components/character/CombatStat.vue';
import Characteristic from '@/vue/components/character/Characteristic.vue';

import SkillsTab from '@/vue/sheets/actor/vehicle/SkillsTab.vue';
import CombatTab from '@/vue/sheets/actor/vehicle/CombatTab.vue';
import CrewTab from '@/vue/sheets/actor/vehicle/CrewTab.vue';
import InventoryTab from '@/vue/components/inventory/InventoryTab.vue';
import DetailsTab from '@/vue/sheets/actor/vehicle/DetailsTab.vue';
import EffectsView from '@/vue/views/EffectsView.vue';
import { useDocumentEffects } from '@/vue/useDocumentEffects';

const { document: actor, system } = useSheetDocument<GenesysActor<VehicleDataModel>>();

const { effects, addEffect } = useDocumentEffects();
</script>

<template>
	<div class="vehicle-sheet">
		<header>
			<img :src="actor.img" :alt="actor.name" data-edit="img" />
			<input type="text" name="name" :value="actor.name" />
		</header>

		<section class="stats-section">
			<div class="stats-row">
				<Characteristic label="Genesys.Labels.Silhouette" :value="system.silhouette" name="system.silhouette" can-edit />
				<Characteristic label="Genesys.Labels.Speed" :value="system.speed" name="system.speed" can-edit />
				<Characteristic label="Genesys.Labels.Handling" :value="system.handling.signedString()" name="system.handling" can-edit />

				<div class="stats-column">
					<CombatStat label="Genesys.Labels.Defense" name="system.defense" :value="system.defense" />
					<CombatStat label="Genesys.Labels.Armor" name="system.armor" :value="system.armor" />

					<CombatStat
						label="Genesys.Labels.HullTrauma"
						primary-label="Genesys.Labels.Threshold"
						name="system.hullTrauma.max"
						:value="system.hullTrauma.max"
						:secondary="{ label: 'Genesys.Labels.Current', value: system.hullTrauma.value, name: 'system.hullTrauma.value' }"
					/>

					<CombatStat
						label="Genesys.Labels.SystemStrain"
						primary-label="Genesys.Labels.Threshold"
						name="system.systemStrain.max"
						:value="system.systemStrain.max"
						:secondary="{
							label: 'Genesys.Labels.Current',
							value: system.systemStrain.value,
							name: 'system.systemStrain.value',
						}"
					/>
				</div>
			</div>
		</section>

		<nav class="sheet-tabs" data-group="primary">
			<div class="spacer"></div>

			<a class="item" data-tab="skills"><Localized label="Genesys.Tabs.Skills" /></a>
			<a class="item" data-tab="combat"><Localized label="Genesys.Tabs.Combat" /></a>
			<a class="item" data-tab="inventory"><Localized label="Genesys.Tabs.Inventory" /></a>
			<a class="item" data-tab="crew"><Localized label="Genesys.Tabs.Crew" /></a>
			<a class="item" data-tab="effects"><Localized label="Genesys.Tabs.Effects" /></a>
			<a class="item" data-tab="details"><Localized label="Genesys.Tabs.Details" /></a>

			<div class="spacer"></div>
		</nav>

		<section class="sheet-body">
			<div class="tab" data-tab="skills"><SkillsTab /></div>
			<div class="tab" data-tab="combat"><CombatTab /></div>
			<div class="tab" data-tab="inventory"><InventoryTab summary-on-top /></div>
			<div class="tab" data-tab="crew"><CrewTab /></div>

			<div class="tab" data-tab="effects">
				<EffectsView :effects="[...effects]" @add-effect="addEffect" />
			</div>

			<div class="tab" data-tab="details"><DetailsTab /></div>
		</section>
	</div>
</template>

<style lang="scss" scoped>
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
