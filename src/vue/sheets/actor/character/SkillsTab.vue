<script lang="ts" setup>
import { computed } from 'vue';

import { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import { advance, advancementCharacter, buySkillRank, isAllowed, raiseCharacteristic } from '@/actor/data/character/Advancement';
import { canMarkSuperCharacteristics, toggleSuperCharacteristic } from '@/actor/data/character/CharacterCreation';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import Characteristic from '@/vue/components/character/Characteristic.vue';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import Localized from '@/vue/components/Localized.vue';
import { GenesysItem } from '@/item/GenesysItem';
import SkillRanks from '@/vue/components/character/SkillRanks.vue';
import XPContainer from '@/vue/components/character/XPContainer.vue';
import { DicePrompt } from '@/app/DicePrompt';
import ContextMenu from '@/vue/components/ContextMenu.vue';
import MenuItem from '@/vue/components/MenuItem.vue';
import { CHARACTERISTIC_ABBREVIATIONS, CHARACTERISTICS, Characteristic as CharacteristicType } from '@/data/Characteristics';
import { freeRank, SKILL_CATEGORY_HEADINGS, skillsByCategory } from '@/data/Skills';
import { deleteItem, openSheet } from '@/operations/ItemActions';

const { document: actor, system, editable } = useSheetDocument<GenesysActor<CharacterDataModel>>();
const advancement = computed(() => advancementCharacter(actor.value));

const skillCategories = computed(() => skillsByCategory(actor.value.skills, game.i18n.lang));

const canMarkSuper = computed(() => canMarkSuperCharacteristics(system.value.experienceJournal.entries));

async function rollSkill(skill: GenesysItem<SkillDataModel>) {
	await DicePrompt.promptForRoll(actor.value, skill.name);
}

async function rollCharacteristicCheck(characteristic: CharacteristicType) {
	await DicePrompt.promptForCharacteristicCheck(actor.value, characteristic);
}

async function purchaseCharacteristic(characteristic: CharacteristicType) {
	await advance(actor.value, (character) => raiseCharacteristic(character, characteristic));
}

function canPurchaseCharacteristic(characteristic: CharacteristicType) {
	return isAllowed(raiseCharacteristic(advancement.value, characteristic));
}

async function purchaseSkillRank(skill: GenesysItem<SkillDataModel>) {
	await advance(actor.value, (character) => buySkillRank(character, skill.id));
}

function canPurchaseSkillRank(skill: GenesysItem<SkillDataModel>) {
	return isAllowed(buySkillRank(advancement.value, skill.id));
}

// A skill can be marked as a career skill by hand at any time, whatever the character's Career: a talent or the GM
// may grant one.
async function toggleCareerSkill(skill: GenesysItem<SkillDataModel>) {
	await skill.update({
		'system.career': !skill.systemData.career,
	});
}

async function freeSkillRank(skill: GenesysItem<SkillDataModel>, step: 1 | -1) {
	await skill.update({
		'system.rank': freeRank(skill.systemData.rank, step),
	});
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
		'system.superCharacteristics': superCharacteristics,
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
			<div
				v-for="(skillCategory, index) in skillCategories"
				:key="skillCategory.category"
				class="skill-category"
				:style="{ zIndex: skillCategories.length - index }"
			>
				<div class="header">
					<label><Localized :label="SKILL_CATEGORY_HEADINGS[skillCategory.category]" /></label>
					<div class="blank" />

					<label class="rank-label"><Localized label="Genesys.Labels.Rank" /></label>
					<div class="blank" />
				</div>

				<div class="body">
					<ContextMenu v-for="skill in skillCategory.skills" :key="skill.id" class="skill row">
						<template v-slot:menu-items>
							<MenuItem
								v-if="editable"
								:icon="`${skill.systemData.career ? 'far' : 'fas'} fa-star`"
								:label="skill.systemData.career ? 'Genesys.Labels.UnmarkCareerSkill' : 'Genesys.Labels.MarkCareerSkill'"
								@click="toggleCareerSkill(skill)"
							/>

							<MenuItem
								v-if="editable"
								icon="fas fa-circle-up"
								label="Genesys.Labels.FreeRankUp"
								@click="freeSkillRank(skill, 1)"
							/>

							<MenuItem
								v-if="editable"
								icon="fas fa-circle-down"
								label="Genesys.Labels.FreeRankDown"
								@click="freeSkillRank(skill, -1)"
							/>

							<MenuItem icon="fas fa-edit" label="Genesys.Labels.Edit" @click="openSheet(skill)" />

							<MenuItem v-if="editable" icon="fas fa-trash" label="Genesys.Labels.Delete" @click="deleteItem(skill)" />
						</template>

						<img :src="skill.img" :alt="skill.name" />
						<a class="name" @click="rollSkill(skill)">
							<span
								>{{ skill.name }} (<Localized
									:label="CHARACTERISTIC_ABBREVIATIONS[skill.systemData.characteristic]"
								/>)</span
							>
							<i v-if="skill.systemData.career" class="fas fa-star"></i>
						</a>

						<span class="rank-display">
							{{ skill.systemData.rank }}

							<a v-if="canPurchaseSkillRank(skill)" @click="purchaseSkillRank(skill)">
								<i class="fas fa-arrow-circle-up" />
							</a>
						</span>

						<SkillRanks
							:skill-value="skill.systemData.rank"
							:characteristic-value="system.characteristics[skill.systemData.characteristic]"
						/>
					</ContextMenu>
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
@use 'sass:color';
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
	display: flex;
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
	columns: 300px;
	column-gap: 8px;
	// Each category is one line of the row: a column may start or end with a single one.
	orphans: 1;
	widows: 1;

	.skill-category {
		container: skill-category / inline-size;
		// An inline-block can't be split, so the open context menu of its last skill hangs below it. As a block, Chromium
		// would carry that menu into the next column and rebalance the columns while it is open.
		display: inline-block;
		vertical-align: top;
		width: 100%;
		margin-bottom: 8px;
		white-space: nowrap;
		background: colors.alpha(colors.$light-blue, 0.2);
		padding: 8px;
		// The template gives each category a z-index that falls with its position, so the open context menu of a category's
		// last skill hangs over the categories after it instead of under them.
		position: relative;
	}

	.header,
	.body .row {
		width: 100%;
		display: grid;
		grid-template-columns: /* image */ 1.5rem /* name */ 1fr /* Rank Input */ auto /* Dice Preview */ 80px;
		align-items: center;
		gap: 0.25rem;
	}

	.header {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1em;
		color: colors.$gray;

		// The label sits 3px to the left, so that it lines up over the rank inputs of the rows below.
		.rank-label {
			position: relative;
			left: -3px;
		}
	}

	.body {
		border: 1px solid black;

		&:empty {
			border-style: dashed;
			opacity: 0.25;
			height: 1em;
		}
	}

	.row {
		border-bottom: 1px dashed black;

		// The row is a ContextMenu's root: its open menu keeps its own padding.
		& > :where(:not(.context-menu)) {
			padding: 0.2em;
		}

		img {
			border: none;
			padding: 0;
			margin-left: 0.1em;
		}

		.name {
			text-overflow: ellipsis;
			overflow: hidden;

			span {
				font-family: 'Roboto Slab', serif;
			}

			i {
				position: relative;
				top: -2px;
				left: 3px;
			}
		}

		&:last-of-type {
			border-bottom: none;
		}

		.rank-display {
			background: color.adjust(white, $alpha: -0.5);
			border: 1px dashed black;
			border-radius: 0.75rem;
			text-align: center;
			margin: 0.1em 0.1em 0.1em 0.2em;
			min-width: 1.5rem;
			height: 1.5rem;
		}
	}
}
</style>
