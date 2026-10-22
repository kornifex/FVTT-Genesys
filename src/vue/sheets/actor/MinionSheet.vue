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
				has-secondary
				secondary-read-only
				secondary-label="Genesys.Adversary.Remaining"
				:secondary-value="system.remainingMembers"
				edit-primary
			/>

			<CombatStat v-else label="Genesys.Labels.GroupSize" name="system.groupSize" :value="system.groupSize" edit-primary />

			<CombatStat label="Genesys.Labels.Soak" name="system.soak" :value="system.soak" edit-primary />

			<CombatStat
				v-if="actor.isToken || isIndependent"
				label="Genesys.Labels.Wounds"
				primary-label="Genesys.Labels.Threshold"
				:value="system.groupWoundThreshold"
				has-secondary
				secondary-label="Genesys.Labels.Current"
				secondary-name="system.wounds.value"
				:secondary-value="system.wounds.value"
			/>

			<CombatStat
				v-else
				label="Genesys.Labels.WoundThreshold"
				name="system.wounds.threshold"
				:value="system.wounds.threshold"
				edit-primary
			/>

			<CombatStat
				label="Genesys.Labels.Defense"
				primary-label="Genesys.Labels.DefenseRanged"
				:value="system.defense.ranged"
				name="system.defense.ranged"
				has-secondary
				secondary-name="system.defense.melee"
				secondary-label="Genesys.Labels.DefenseMelee"
				:secondary-value="system.defense.melee"
				edit-primary
			/>
		</template>

		<template v-slot:skills>
			<AdversarySkills label="Genesys.Adversary.MinionSkills" :group-rank="system.groupSkillRank" />
		</template>
	</AdversarySheet>
</template>
