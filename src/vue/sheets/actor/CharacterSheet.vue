<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import CharacterMeta from '@/vue/sheets/actor/character/CharacterMeta.vue';
import CombatStat from '@/vue/components/character/CombatStat.vue';
import SheetTabs from '@/vue/components/SheetTabs.vue';
import EffectsView from '@/vue/views/EffectsView.vue';
import { useDocumentEffects } from '@/vue/useDocumentEffects';

import JournalTab from '@/vue/sheets/actor/character/JournalTab.vue';
import SkillsTab from '@/vue/sheets/actor/character/SkillsTab.vue';
import TalentsTab from '@/vue/sheets/actor/character/TalentsTab.vue';
import InventoryTab from '@/vue/components/inventory/InventoryTab.vue';
import CombatTab from '@/vue/sheets/actor/character/CombatTab.vue';

const { system } = useSheetDocument<GenesysActor<'character'>>();

const { effects, addEffect } = useDocumentEffects();

const TABS = [
	{ id: 'skills', label: 'Genesys.Tabs.Skills' },
	{ id: 'combat', label: 'Genesys.Tabs.Combat' },
	{ id: 'talents', label: 'Genesys.Tabs.Talents' },
	{ id: 'inventory', label: 'Genesys.Tabs.Inventory' },
	{ id: 'effects', label: 'Genesys.Tabs.Effects' },
	{ id: 'journal', label: 'Genesys.Tabs.Journal' },
];
</script>

<template>
	<div class="character-sheet">
		<CharacterMeta />

		<section class="combat-stat-row">
			<CombatStat label="Genesys.Labels.SoakValue" :value="system.totalSoak" />

			<CombatStat
				label="Genesys.Labels.Wounds"
				primary-label="Genesys.Labels.Threshold"
				:value="system.wounds.max"
				:secondary="{
					label: 'Genesys.Labels.Current',
					value: system.wounds.value,
					counter: { attribute: 'wounds', label: 'Genesys.Counter.CurrentWounds' },
				}"
			/>

			<CombatStat
				label="Genesys.Labels.Strain"
				primary-label="Genesys.Labels.Threshold"
				:value="system.strain.max"
				:secondary="{
					label: 'Genesys.Labels.Current',
					value: system.strain.value,
					counter: { attribute: 'strain', label: 'Genesys.Counter.CurrentStrain' },
				}"
			/>

			<CombatStat
				label="Genesys.Labels.Defense"
				primary-label="Genesys.Labels.DefenseRanged"
				:value="system.totalDefense.ranged"
				:secondary="{ label: 'Genesys.Labels.DefenseMelee', value: system.totalDefense.melee }"
			/>
		</section>

		<SheetTabs :tabs="TABS">
			<template #skills><SkillsTab /></template>
			<template #combat><CombatTab /></template>
			<template #talents><TalentsTab /></template>
			<template #inventory><InventoryTab allow-dropped-state /></template>
			<template #effects><EffectsView :effects="[...effects]" @add-effect="addEffect" /></template>
			<template #journal><JournalTab /></template>
		</SheetTabs>
	</div>
</template>

<style lang="scss" scoped>
.character-sheet {
	width: 100%;
	height: 100%;

	display: grid;
	// Meta, Combat Stats, Tabs, tab content
	grid-template-rows: repeat(3, auto) 1fr;
	gap: 0.5em;
}

// Container for the character's secondary combat stats (wounds, strain, etc.)
.combat-stat-row {
	// By default, evenly space the items across the full sheet width.
	display: flex;
	gap: 1em;
	align-items: center;
	justify-content: space-around;

	// When the sheet is wider than 700px, simply center the stat boxes.
	@container sheet (min-width: 700px) {
		display: flex;
		justify-content: center;

		.combat-stat {
			width: 165px;
		}
	}
}
</style>
