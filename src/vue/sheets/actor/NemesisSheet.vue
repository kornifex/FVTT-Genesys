<script lang="ts" setup>
import AdversarySheet from '@/vue/sheets/actor/AdversarySheet.vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import CombatStat from '@/vue/components/character/CombatStat.vue';

const { system, source } = useSheetDocument<GenesysActor<'nemesis'>>();
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
				label="Genesys.Labels.Strain"
				primary-label="Genesys.Labels.Threshold"
				name="system.strain.max"
				field-label="Genesys.Labels.StrainThreshold"
				:value="system.strain.max"
				:secondary="{
					label: 'Genesys.Labels.Current',
					value: system.strain.value,
					counter: { attribute: 'strain', label: 'Genesys.Counter.CurrentStrain' },
				}"
			/>

			<!-- The stat block's defense as the GM typed it, without the effects that increase it. -->
			<CombatStat
				label="Genesys.Labels.Defense"
				primary-label="Genesys.Labels.DefenseRanged"
				:value="source.defense.ranged"
				name="system.defense.ranged"
				field-label="Genesys.Labels.RangedDefense"
				:secondary="{
					label: 'Genesys.Labels.DefenseMelee',
					value: source.defense.melee,
					name: 'system.defense.melee',
					fieldLabel: 'Genesys.Labels.MeleeDefense',
				}"
			/>
		</template>
	</AdversarySheet>
</template>
