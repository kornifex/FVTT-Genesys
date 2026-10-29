<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import CharacterMeta from '@/vue/sheets/actor/character/CharacterMeta.vue';
import CombatStat from '@/vue/components/character/CombatStat.vue';
import Localized from '@/vue/components/Localized.vue';
import EffectsView from '@/vue/views/EffectsView.vue';
import { useDocumentEffects } from '@/vue/useDocumentEffects';

import JournalTab from '@/vue/sheets/actor/character/JournalTab.vue';
import SkillsTab from '@/vue/sheets/actor/character/SkillsTab.vue';
import TalentsTab from '@/vue/sheets/actor/character/TalentsTab.vue';
import InventoryTab from '@/vue/components/inventory/InventoryTab.vue';
import CombatTab from '@/vue/sheets/actor/character/CombatTab.vue';

const { system } = useSheetDocument<GenesysActor<CharacterDataModel>>();

const { effects, addEffect } = useDocumentEffects();
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
				:secondary="{ label: 'Genesys.Labels.Current', value: system.wounds.value, name: 'system.wounds.value' }"
			/>

			<CombatStat
				label="Genesys.Labels.Strain"
				primary-label="Genesys.Labels.Threshold"
				:value="system.strain.max"
				:secondary="{ label: 'Genesys.Labels.Current', value: system.strain.value, name: 'system.strain.value' }"
			/>

			<CombatStat
				label="Genesys.Labels.Defense"
				primary-label="Genesys.Labels.DefenseRanged"
				:value="system.totalDefense.ranged"
				:secondary="{ label: 'Genesys.Labels.DefenseMelee', value: system.totalDefense.melee }"
			/>
		</section>

		<nav class="sheet-tabs" data-group="primary">
			<div class="spacer"></div>

			<a class="item" data-tab="skills"><Localized label="Genesys.Tabs.Skills" /></a>
			<a class="item" data-tab="combat"><Localized label="Genesys.Tabs.Combat" /></a>
			<a class="item" data-tab="talents"><Localized label="Genesys.Tabs.Talents" /></a>
			<a class="item" data-tab="inventory"><Localized label="Genesys.Tabs.Inventory" /></a>
			<a class="item" data-tab="effects"><Localized label="Genesys.Tabs.Effects" /></a>
			<a class="item" data-tab="journal"><Localized label="Genesys.Tabs.Journal" /></a>

			<div class="spacer"></div>
		</nav>

		<section class="sheet-body">
			<div class="tab" data-tab="skills"><SkillsTab /></div>

			<div class="tab" data-tab="combat"><CombatTab /></div>

			<div class="tab" data-tab="talents"><TalentsTab /></div>

			<div class="tab" data-tab="inventory"><InventoryTab allow-dropped-state /></div>

			<div class="tab" data-tab="effects">
				<EffectsView :effects="[...effects]" @add-effect="addEffect" />
			</div>

			<div class="tab" data-tab="journal">
				<JournalTab />
			</div>
		</section>
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
