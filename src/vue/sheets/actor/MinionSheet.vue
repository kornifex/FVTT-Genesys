<script lang="ts" setup>
import AdversarySheet from '@/vue/sheets/actor/AdversarySheet.vue';
import { computed, inject, toRaw } from 'vue';
import { ActorSheetContext, RootContext } from '@/vue/SheetContext';
import AdversarySkills from '@/vue/components/adversary/AdversarySkills.vue';
import CombatStat from '@/vue/components/character/CombatStat.vue';
import { MinionDataModel } from '@/actor/data/MinionDataModel';

const context = inject<ActorSheetContext<MinionDataModel>>(RootContext)!;
const actor = computed(() => toRaw(context.data.actor));
const system = computed(() => toRaw(context.data.actor).systemData);

const isIndependent = actor.value.getFlag<boolean>('genesys', 'independentMinion');
</script>

<template>
	<AdversarySheet>
		<template v-slot:stats>
			<CombatStat
				v-if="actor.isToken || isIndependent"
				label="Genesys.Labels.GroupSize"
				primary-label="Genesys.Adversary.Base"
				name="system.groupSize"
				:value="system.groupSize"
				:secondary="{ label: 'Genesys.Adversary.Remaining', value: system.remainingMembers }"
			/>

			<CombatStat v-else label="Genesys.Labels.GroupSize" name="system.groupSize" :value="system.groupSize" />

			<CombatStat label="Genesys.Labels.Soak" name="system.soak" :value="system.soak" />

			<CombatStat
				v-if="actor.isToken || isIndependent"
				label="Genesys.Labels.Wounds"
				primary-label="Genesys.Labels.Threshold"
				:value="system.groupWoundThreshold"
				:secondary="{ label: 'Genesys.Labels.Current', value: system.wounds.value, name: 'system.wounds.value' }"
			/>

			<CombatStat v-else label="Genesys.Labels.WoundThreshold" name="system.wounds.threshold" :value="system.wounds.threshold" />

			<CombatStat
				label="Genesys.Labels.Defense"
				primary-label="Genesys.Labels.DefenseRanged"
				:value="system.defense.ranged"
				name="system.defense.ranged"
				:secondary="{ label: 'Genesys.Labels.DefenseMelee', value: system.defense.melee, name: 'system.defense.melee' }"
			/>
		</template>

		<template v-slot:skills>
			<AdversarySkills label="Genesys.Adversary.MinionSkills" :group-rank="system.groupSkillRank" />
		</template>
	</AdversarySheet>
</template>
