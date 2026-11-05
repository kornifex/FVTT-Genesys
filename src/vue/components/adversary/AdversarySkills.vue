<script lang="ts" setup>
import { computed, toRef } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import type { AdversaryType } from '@/actor/data/AdversaryDataModel';
import { GenesysItem } from '@/item/GenesysItem';
import { DicePrompt } from '@/app/DicePrompt';
import { freeRank } from '@/data/Skills';
import { deleteItem, openSheet } from '@/operations/ItemActions';
import ActionButton from '@/vue/components/ActionButton.vue';
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

const { document: actor } = useSheetDocument<GenesysActor<AdversaryType>>();
const characteristics = toRef(() => actor.value.system.characteristics);
const skills = computed(() => actor.value.skills);

async function rollSkill(skill: GenesysItem<'skill'>) {
	await DicePrompt.promptForRoll(actor.value, skill.name);
}

async function freeSkillRank(skill: GenesysItem<'skill'>, step: 1 | -1) {
	await skill.update({
		system: { rank: freeRank(skill.system.rank, step) },
	});
}
</script>

<template>
	<span class="header"><Localized :label="props.label" />:</span>
	<div class="container">
		<Localized v-if="skills.length === 0" label="Genesys.Adversary.None" />
		<ContextMenu v-for="skill in skills" :key="skill.id" class="skill">
			<template v-slot:menu-items>
				<template v-if="props.groupRank === undefined">
					<MenuItem icon="fas fa-circle-up" label="Genesys.Labels.FreeRankUp" @click="freeSkillRank(skill, 1)" />

					<MenuItem icon="fas fa-circle-down" label="Genesys.Labels.FreeRankDown" @click="freeSkillRank(skill, -1)" />
				</template>

				<MenuItem icon="fas fa-edit" label="Genesys.Labels.Edit" @click="openSheet(skill)" />

				<MenuItem icon="fas fa-trash" label="Genesys.Labels.Delete" @click="deleteItem(skill)" />
			</template>

			<ActionButton class="skill-icon" :image="skill.img ?? undefined" label="Genesys.Tooltips.OpenSkill" @click="openSheet(skill)" />
			<ActionButton class="skill-roll" @click="rollSkill(skill)">
				<span>{{ skill.name }}{{ props.groupRank === undefined ? ` ${skill.system.rank}` : null }}</span>
				<SkillRanks
					:skill-value="props.groupRank ?? skill.system.rank"
					:characteristic-value="characteristics[skill.system.characteristic]"
				/>
			</ActionButton>
		</ContextMenu>
	</div>
</template>

<style lang="scss" scoped>
// The icon opens the skill's sheet, to read its description; the name rolls it. It stands as tall as the line, before
// the name: Foundry lays images out as blocks, which would put it above.
.skill-icon {
	display: inline-block;
	width: 1.5em;
	height: 1.5em;
	margin-right: 0.25em;
	vertical-align: middle;
}
</style>
