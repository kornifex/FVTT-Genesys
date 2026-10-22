<script lang="ts" setup>
import { computed, inject, toRaw } from 'vue';
import { ActorSheetContext, RootContext } from '@/vue/SheetContext';
import { AdversaryDataModel } from '@/actor/data/AdversaryDataModel';
import { GenesysItem } from '@/item/GenesysItem';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import { DicePrompt } from '@/app/DicePrompt';
import { freeRank } from '@/data/Skills';
import Localized from '@/vue/components/Localized.vue';
import ContextMenu from '@/vue/components/ContextMenu.vue';
import MenuItem from '@/vue/components/MenuItem.vue';
import SkillRanks from '@/vue/components/character/SkillRanks.vue';

const props = defineProps<{
	label: string;
	/**
	 * The rank a Minion Group's skills roll at. Without it, the skills have ranks of their own, shown beside their names
	 * and changed by Free Ranks.
	 */
	groupRank?: number;
}>();

const context = inject<ActorSheetContext<AdversaryDataModel>>(RootContext)!;
const characteristics = computed(() => toRaw(context.data.actor).systemData.characteristics);
const skills = computed(() => toRaw(context.data.actor).skills);

const freeRankUpLabel = game.i18n.localize('Genesys.Labels.FreeRankUp');
const freeRankDownLabel = game.i18n.localize('Genesys.Labels.FreeRankDown');
const editLabel = game.i18n.localize('Genesys.Labels.Edit');
const deleteLabel = game.i18n.localize('Genesys.Labels.Delete');

async function rollSkill(skill: GenesysItem<SkillDataModel>) {
	await DicePrompt.promptForRoll(toRaw(context.data.actor), skill.name);
}

async function freeSkillRank(skill: GenesysItem<SkillDataModel>, step: 1 | -1) {
	await toRaw(skill).update({
		'system.rank': freeRank(skill.systemData.rank, step),
	});
}

async function editItem(skill: GenesysItem<SkillDataModel>) {
	await toRaw(skill).sheet.render(true);
}

async function deleteItem(skill: GenesysItem<SkillDataModel>) {
	await toRaw(skill).delete();
}
</script>

<template>
	<span class="header"><Localized :label="props.label" />:</span>
	<div class="container">
		<Localized v-if="skills.length === 0" label="Genesys.Adversary.None" />
		<ContextMenu v-for="skill in skills" :key="skill.id" class="skill">
			<template v-slot:menu-items>
				<template v-if="props.groupRank === undefined">
					<MenuItem @click="freeSkillRank(skill, 1)">
						<template v-slot:icon><i class="fas fa-circle-up"></i></template>
						{{ freeRankUpLabel }}
					</MenuItem>

					<MenuItem @click="freeSkillRank(skill, -1)">
						<template v-slot:icon><i class="fas fa-circle-down"></i></template>
						{{ freeRankDownLabel }}
					</MenuItem>
				</template>

				<MenuItem @click="editItem(skill)">
					<template v-slot:icon><i class="fas fa-edit"></i></template>
					{{ editLabel }}
				</MenuItem>

				<MenuItem @click="deleteItem(skill)">
					<template v-slot:icon><i class="fas fa-trash"></i></template>
					{{ deleteLabel }}
				</MenuItem>
			</template>

			<a @click="rollSkill(skill)">
				<span>{{ skill.name }}{{ props.groupRank === undefined ? ` ${skill.systemData.rank}` : null }}</span>
				<SkillRanks
					:skill-value="props.groupRank ?? skill.systemData.rank"
					:characteristic-value="characteristics[skill.systemData.characteristic]"
				/>
			</a>
		</ContextMenu>
	</div>
</template>
