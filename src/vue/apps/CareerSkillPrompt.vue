<script lang="ts" setup>
import { computed, ref } from 'vue';

import type { Stored } from '@/data/Stored';
import { CareerSkillPromptContext } from '@/app/CareerSkillPrompt';
import { toggledFreeRankChoice } from '@/actor/data/character/Career';
import { CHARACTERISTIC_ABBREVIATIONS } from '@/data/Characteristics';
import { useSheetContext } from '@/vue/SheetContext';
import Localized from '@/vue/components/Localized.vue';
import { GenesysItem } from '@/item/GenesysItem';

const context = useSheetContext<CareerSkillPromptContext>();

const selectedSkillIDs = ref<string[]>([]);
const remaining = computed(() => CONFIG.genesys.settings.freeCareerSkillRanks - selectedSkillIDs.value.length);

function selectSkill(event: Event, skill: Stored<GenesysItem<'skill'>>) {
	event.preventDefault();

	selectedSkillIDs.value = toggledFreeRankChoice(selectedSkillIDs.value, skill.id, CONFIG.genesys.settings.freeCareerSkillRanks);
}

function confirm(event: Event) {
	event.preventDefault();

	context.value.answer(selectedSkillIDs.value);
}
</script>

<template>
	<div class="genesys career-skill-prompt">
		<div class="career-skills-hint"><Localized label="Genesys.CareerSkillPrompt.Hint" /></div>

		<div class="selections">
			<button
				v-for="skill in context.skills"
				:key="skill.id"
				:class="`select-skill ${selectedSkillIDs.includes(skill.id) ? 'selected' : ''}`"
				@click="(ev) => selectSkill(ev, skill)"
			>
				<i v-if="selectedSkillIDs.includes(skill.id)" class="fas fa-check-circle" />
				<img :src="skill.img ?? undefined" :alt="skill.name" />
				<span>{{ skill.name }} (<Localized :label="CHARACTERISTIC_ABBREVIATIONS[skill.system.characteristic]" />)</span>
			</button>
		</div>

		<div class="remaining"><Localized label="Genesys.CareerSkillPrompt.RemainingChoices" />: {{ remaining }}</div>

		<footer>
			<button @click="confirm" :disabled="remaining > 0"><Localized label="Genesys.CareerSkillPrompt.Confirm" /></button>
		</footer>
	</div>
</template>

<style lang="scss">
// Unscoped: window.prompt styles the Foundry window around the component.
@use '@scss/mixins/window.scss';

.app-career-skill-prompt {
	@include window.prompt(150px, 200px);
}
</style>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.career-skill-prompt {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	gap: 0.5em;
	font-family: 'Roboto Serif', serif;

	button {
		font-family: 'Roboto Serif', serif;
	}

	.career-skills-hint {
		font-size: 0.9em;
		color: colors.$hint;
	}

	.selections {
		.select-skill {
			display: grid;
			grid-template-columns: /* Selected Checkbox */ 1rem /* Icon */ 1.5rem /* Name */ 1fr;
			gap: 0.5em;
			padding: 0.25em 0.25em 0.25em 0.5em;
			align-items: center;
			justify-items: left;
			background: colors.$blue;
			border: 1px solid colors.$light-blue;
			color: white;
			border-radius: 0.5em;

			&.selected {
				background: colors.$light-blue;
				border: 1px solid colors.$blue;
				color: colors.$dark-blue;
			}

			i {
				grid-column: 1 / span 1;
			}
			img {
				grid-column: 2 / span 1;
				border: none;
				border-radius: 0.25em;
			}
			span {
				grid-column: 3 / span 1;
			}
		}
	}
}
</style>
