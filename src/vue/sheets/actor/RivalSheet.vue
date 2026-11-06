<script lang="ts" setup>
import AdversarySheet from '@/vue/sheets/actor/AdversarySheet.vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import CombatStat from '@/vue/components/character/CombatStat.vue';

const { system } = useSheetDocument<GenesysActor<'rival'>>();
</script>

<template>
	<AdversarySheet>
		<template v-slot:stats>
			<CombatStat label="Genesys.Labels.Soak" name="system.soak" :value="system.soak" />

			<CombatStat
				label="Genesys.Labels.Wounds"
				primary-label="Genesys.Labels.Threshold"
				name="system.wounds.max"
				field-label="Genesys.Labels.WoundThreshold"
				:value="system.wounds.max"
				:secondary="{
					label: 'Genesys.Labels.Current',
					value: system.wounds.value,
					counter: { attribute: 'wounds', label: 'Genesys.Counter.CurrentWounds' },
				}"
			/>

			<CombatStat
				label="Genesys.Labels.Defense"
				primary-label="Genesys.Labels.DefenseRanged"
				:value="system.defense.ranged"
				name="system.defense.ranged"
				field-label="Genesys.Labels.RangedDefense"
				:secondary="{
					label: 'Genesys.Labels.DefenseMelee',
					value: system.defense.melee,
					name: 'system.defense.melee',
					fieldLabel: 'Genesys.Labels.MeleeDefense',
				}"
			/>
		</template>
	</AdversarySheet>
</template>
