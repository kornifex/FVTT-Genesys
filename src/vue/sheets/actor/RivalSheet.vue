<script lang="ts" setup>
import AdversarySheet from '@/vue/sheets/actor/AdversarySheet.vue';
import { computed, inject, toRaw } from 'vue';
import { ActorSheetContext, RootContext } from '@/vue/SheetContext';
import CombatStat from '@/vue/components/character/CombatStat.vue';
import { RivalDataModel } from '@/actor/data/RivalDataModel';

const context = inject<ActorSheetContext<RivalDataModel>>(RootContext)!;
const system = computed(() => toRaw(context.data.actor).systemData);
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
