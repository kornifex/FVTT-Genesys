<script lang="ts" setup>
import AdversarySheet from '@/vue/sheets/actor/AdversarySheet.vue';
import { toRef } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import CombatStat from '@/vue/components/character/CombatStat.vue';
import { RivalDataModel } from '@/actor/data/RivalDataModel';

const { document: actor } = useSheetDocument<GenesysActor<RivalDataModel>>();
const system = toRef(() => actor.value.systemData);
</script>

<template>
	<AdversarySheet>
		<template v-slot:stats>
			<CombatStat label="Genesys.Labels.Soak" name="system.soak" :value="system.soak" />

			<CombatStat
				label="Genesys.Labels.Wounds"
				primary-label="Genesys.Labels.Threshold"
				name="system.wounds.max"
				:value="system.wounds.max"
				:secondary="{ label: 'Genesys.Labels.Current', value: system.wounds.value, name: 'system.wounds.value' }"
			/>

			<CombatStat
				label="Genesys.Labels.Defense"
				primary-label="Genesys.Labels.DefenseRanged"
				:value="system.defense.ranged"
				name="system.defense.ranged"
				:secondary="{ label: 'Genesys.Labels.DefenseMelee', value: system.defense.melee, name: 'system.defense.melee' }"
			/>
		</template>
	</AdversarySheet>
</template>
