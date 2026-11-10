<script lang="ts" setup>
import { computed } from 'vue';

import type { Stored } from '@/data/Stored';
import { advance, advancementCharacter, buySkillRank, isAllowed, raiseCharacteristic } from '@/actor/data/character/Advancement';
import { canMarkSuperCharacteristics, toggleSuperCharacteristic } from '@/actor/data/character/CharacterCreation';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import Characteristic from '@/vue/components/character/Characteristic.vue';
import Localized from '@/vue/components/Localized.vue';
import { GenesysItem } from '@/item/GenesysItem';
import SkillRow from '@/vue/components/SkillRow.vue';
import XPContainer from '@/vue/components/character/XPContainer.vue';
import { DicePrompt } from '@/app/DicePrompt';
import RowActions from '@/vue/components/RowActions.vue';
import type { RowAction } from '@/vue/components/RowAction';
import { CHARACTERISTICS, Characteristic as CharacteristicType } from '@/data/Characteristics';
import { SKILL_CATEGORY_HEADINGS, skillsByCategory } from '@/data/Skills';
import { freeSkillRank, openSheet, rollSkill } from '@/operations/ItemActions';

const { document: actor, system } = useSheetDocument<GenesysActor<'character'>>();
const advancement = computed(() => advancementCharacter(actor.value));

const skillCategories = computed(() => skillsByCategory(actor.value.skills, game.i18n.lang));

const canMarkSuper = computed(() => canMarkSuperCharacteristics(system.value.experienceJournal.entries));

async function rollCharacteristicCheck(characteristic: CharacteristicType) {
	await DicePrompt.promptForCharacteristicCheck(actor.value, characteristic);
}

async function purchaseCharacteristic(characteristic: CharacteristicType) {
	await advance(actor.value, (character) => raiseCharacteristic(character, characteristic));
}

function canPurchaseCharacteristic(characteristic: CharacteristicType) {
	return isAllowed(raiseCharacteristic(advancement.value, characteristic));
}

async function purchaseSkillRank(skill: Stored<GenesysItem<'skill'>>) {
	await advance(actor.value, (character) => buySkillRank(character, skill.id));
}

function canPurchaseSkillRank(skill: Stored<GenesysItem<'skill'>>) {
	return isAllowed(buySkillRank(advancement.value, skill.id));
}

// A skill can be marked as a career skill by hand at any time, whatever the character's Career: a talent or the GM
// may grant one.
async function toggleCareerSkill(skill: Stored<GenesysItem<'skill'>>) {
	await skill.update({
		system: { career: !skill.system.career },
	});
}

// A skill's own actions: marking it as a career skill or not, and its Free Ranks.
function skillActions(skill: Stored<GenesysItem<'skill'>>): RowAction[] {
	return [
		{
			icon: `${skill.system.career ? 'far' : 'fas'} fa-star`,
			label: skill.system.career ? 'Genesys.Labels.UnmarkCareerSkill' : 'Genesys.Labels.MarkCareerSkill',
			run: () => toggleCareerSkill(skill),
		},
		{ icon: 'fas fa-circle-up', label: 'Genesys.Labels.FreeRankUp', run: () => freeSkillRank(skill, 1) },
		{ icon: 'fas fa-circle-down', label: 'Genesys.Labels.FreeRankDown', run: () => freeSkillRank(skill, -1) },
	];
}

async function toggleSuper(characteristic: CharacteristicType) {
	const superCharacteristics = toggleSuperCharacteristic(
		system.value.experienceJournal.entries,
		system.value.superCharacteristics,
		characteristic,
	);
	if (!superCharacteristics) {
		// Outside Character Creation the menu is locked, so the warning is for the cap of two.
		if (canMarkSuper.value) {
			ui.notifications.warn('Genesys.Notifications.TooManySuperCharacteristics', { localize: true });
		}
		return;
	}

	await actor.value.update({
		system: { superCharacteristics },
	});
}
</script>

<template>
	<section class="tab-skills">
		<div class="characteristics-row">
			<Characteristic
				v-for="{ characteristic, label } in CHARACTERISTICS"
				:key="characteristic"
				:label="label"
				:value="system.characteristics[characteristic]"
				:can-upgrade="canPurchaseCharacteristic(characteristic)"
				@upgrade="purchaseCharacteristic(characteristic)"
				can-roll-characteristic-check
				@rollCharacteristicCheck="rollCharacteristicCheck(characteristic)"
				:is-super="system.superCharacteristics.has(characteristic)"
				:can-mark-super="canMarkSuper"
				@toggle-super="toggleSuper(characteristic)"
			/>
		</div>

		<div class="skills-row">
			<div v-for="skillCategory in skillCategories" :key="skillCategory.category" class="skill-category">
				<div class="columns">
					<h3><Localized :label="SKILL_CATEGORY_HEADINGS[skillCategory.category]" /></h3>

					<label class="rank-label"><Localized label="Genesys.Labels.Rank" /></label>
					<div class="blank" />
				</div>

				<div class="body">
					<RowActions
						v-for="skill in skillCategory.skills"
						:key="skill.id"
						class="skill row"
						:document="skill"
						:actions="skillActions(skill)"
					>
						<SkillRow
							:name="skill.name"
							:skill="skill.name"
							:characteristic="skill.system.characteristic"
							:career="skill.system.career"
							:image="skill.img"
							:rank="skill.system.rank"
							:can-buy-rank="canPurchaseSkillRank(skill)"
							:skill-value="skill.system.rank"
							:characteristic-value="system.characteristics[skill.system.characteristic]"
							@open="openSheet(skill)"
							@roll="rollSkill(actor, skill)"
							@buy-rank="purchaseSkillRank(skill)"
						/>
					</RowActions>
				</div>
			</div>
		</div>

		<section class="experience">
			<XPContainer label="Genesys.Labels.TotalXP" :value="system.totalXP" />
			<XPContainer label="Genesys.Labels.AvailableXP" :value="system.availableXP" />
		</section>
	</section>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/headings.scss';
@use '@scss/vars/colors.scss';

.tab-skills {
	display: grid;
	grid-template-rows: /* Characteristics */ auto /* Skills */ auto /* Experience */ auto /* Filler */ 1fr;
	grid-template-columns: 1fr auto 1fr;
	gap: 0.5em;

	.experience {
		grid-column: 1 / span all;
		padding: 0.5em;
		display: grid;
		grid-template-columns: auto 1fr auto;
		width: 100%;
	}

	.skills-row {
		grid-column: 1 / span all;
	}
}

.characteristics-row {
	position: relative;
	// One column per characteristic, each as wide as the widest (#621).
	display: grid;
	grid-auto-flow: column;
	grid-auto-columns: 1fr;
	justify-content: center;
	gap: 3em;
	align-items: center;
	padding-bottom: 0.25rem;
	grid-column: 2 / span 1;

	&::after {
		display: block;
		content: '';
		position: absolute;
		top: 0;
		left: -1.5rem;
		width: calc(100% + 3rem);
		height: 100%;
		background: colors.$gold;
		border-radius: 4rem;

		clip-path: polygon(0% 50%, 100% 50%, 100% 100%, 0% 100%);
	}

	.characteristic-field {
		z-index: 2;
	}
}

.skills-row {
	position: relative;
	z-index: 1;
	width: 100%;
	padding-left: 0.5em;
	padding-right: 0.5em;
	// Wide enough for a long name beside its career star, rank, dice and ⋮ (#620); the sheet opens at two columns.
	columns: 340px;
	column-gap: 8px;
	// Each category is one line of the row: a column may start or end with a single one.
	orphans: 1;
	widows: 1;

	.skill-category {
		container: skill-category / inline-size;
		// An inline-block can't be split: a category stays whole in its column.
		display: inline-block;
		vertical-align: top;
		width: 100%;
		margin-bottom: 8px;
		white-space: nowrap;
		background: colors.alpha(colors.$light-blue, 0.2);
		padding: 8px;
	}

	.columns,
	.body .row {
		width: 100%;
		display: grid;
		grid-template-columns: /* image */ 1.5rem /* name */ 1fr /* Rank Input */ auto /* Dice Preview */ 80px /* Actions */ 1.25em;
		align-items: center;
		gap: 0.25rem;
	}

	// The category's heading, over the icon and name columns, then the label of the rank column.
	.columns {
		@include headings.font;

		h3 {
			grid-column: 1 / span 2;
		}

		// The label sits 3px to the left, so that it lines up over the rank inputs of the rows below.
		.rank-label {
			position: relative;
			left: -3px;
		}
	}

	.body {
		border: 1px solid colors.$ink;

		&:empty {
			border-style: dashed;
			opacity: 0.25;
			height: 1em;
		}
	}

	// The row is a RowActions' root, its ⋮ its own, and the skill's cells are a SkillRow's roots, which take no scope
	// attribute from the tab: :deep() reaches them.
	.row {
		border-bottom: 1px dashed colors.$ink;

		// The open menu keeps its own padding.
		& > :deep(:where(:not(.context-menu))) {
			padding: 0.2em;
		}

		// The icon opens the skill's sheet, to read its description; the name rolls it.
		& > :deep(.skill-icon) {
			width: 100%;
			padding: 0;
			margin-left: 0.1em;
		}

		& > :deep(.skill-name) {
			text-overflow: ellipsis;
			overflow: hidden;

			span {
				font-family: 'Roboto Slab', serif;
			}

			.career-skill {
				position: relative;
				top: -2px;
				left: 3px;
			}
		}

		&:last-of-type {
			border-bottom: none;
		}

		& > :deep(.skill-rank) {
			background: colors.alpha(colors.$field, 0.5);
			border: 1px dashed colors.$ink;
			border-radius: 0.75rem;
			text-align: center;
			margin: 0.1em 0.1em 0.1em 0.2em;
			min-width: 1.5rem;
			height: 1.5rem;
		}
	}
}
</style>
