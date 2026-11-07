<script lang="ts" setup>
import { computed, toRef } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import type { AdversaryType } from '@/actor/data/AdversaryDataModel';
import type { GenesysItem } from '@/item/GenesysItem';
import { freeSkillRank, openSheet, rollSkill } from '@/operations/ItemActions';
import Localized from '@/vue/components/Localized.vue';
import ListEmpty from '@/vue/components/ListEmpty.vue';
import RowActions from '@/vue/components/RowActions.vue';
import type { RowAction } from '@/vue/components/RowAction';
import SkillRow from '@/vue/components/SkillRow.vue';

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

// A skill's own actions: its Free Ranks, but in a Minion Group, whose skills roll at the group rank.
function skillActions(skill: GenesysItem<'skill'>): RowAction[] {
	return props.groupRank === undefined
		? [
				{ icon: 'fas fa-circle-up', label: 'Genesys.Labels.FreeRankUp', run: () => freeSkillRank(skill, 1) },
				{ icon: 'fas fa-circle-down', label: 'Genesys.Labels.FreeRankDown', run: () => freeSkillRank(skill, -1) },
			]
		: [];
}
</script>

<template>
	<h3><Localized :label="props.label" /></h3>
	<div class="container">
		<ListEmpty v-if="skills.length === 0" />
		<!-- On a sheet the user can't edit, the menu keeps Edit, which opens the skill's sheet, as the character's skills do (#512). -->
		<RowActions
			v-for="skill in skills"
			:key="skill.id"
			class="skill"
			:document="skill"
			:actions="skillActions(skill)"
			orientation="right"
		>
			<SkillRow
				:name="skill.name"
				:skill="skill.name"
				:image="skill.img"
				:rank="props.groupRank === undefined ? skill.system.rank : undefined"
				:skill-value="props.groupRank ?? skill.system.rank"
				:characteristic-value="characteristics[skill.system.characteristic]"
				@open="openSheet(skill)"
				@roll="rollSkill(actor, skill)"
			/>
		</RowActions>
	</div>
</template>

<style lang="scss" scoped>
// A skill's cells sit on one line of the comma-separated list, the icon as tall as the line, before the name: Foundry
// lays images out as blocks, which would put it above. They are a SkillRow's roots, which :deep() reaches.
.skill {
	display: inline-flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: center;
	gap: 0.25em;

	& > :deep(.skill-icon) {
		display: inline-block;
		width: 1.5em;
		height: 1.5em;
		vertical-align: middle;
	}

	& > :deep(.skill-ranks) {
		margin-left: 0.25em;
	}

	&::after {
		display: block;
		content: ',';
		margin-right: 0.25em;
		margin-left: -0.15em;
	}

	&:last-of-type::after {
		display: none;
	}
}
</style>
