<script lang="ts" setup>
import { ref } from 'vue';

import { SelectCrewMemberPromptContext } from '@/app/SelectCrewMemberPrompt';
import { useSheetContext } from '@/vue/SheetContext';

import Localized from '@/vue/components/Localized.vue';
import SkillRanks from '@/vue/components/character/SkillRanks.vue';

const context = useSheetContext<SelectCrewMemberPromptContext>();

const selectedIndex = ref(-1);

function selectOption(index: number) {
	selectedIndex.value = index;
}

function submitSelection(event: Event) {
	event.preventDefault();

	context.value.answer(context.value.memberSkills[selectedIndex.value]);
}
</script>

<template>
	<div class="genesys select-crew-member-prompt">
		<div
			v-for="(memberSkill, index) in context.memberSkills"
			:key="memberSkill.member + memberSkill.skillName"
			:class="{
				'member-skill-option': true,
				'selected-option': selectedIndex === index,
			}"
			@click="selectOption(index)"
		>
			<img class="member-image" :src="memberSkill.actor.img ?? undefined" :alt="memberSkill.actor.name" draggable="false" />
			<div class="member-name">{{ memberSkill.actor.name }}</div>

			<div class="skill-name">{{ memberSkill.skill.name }}</div>
			<div class="skill-rank">{{ memberSkill.rank }}</div>
			<SkillRanks :skill-value="memberSkill.rank" :characteristic-value="memberSkill.characteristicValue" />
		</div>

		<button class="submit-button" @click="submitSelection" :disabled="selectedIndex < 0">
			<Localized label="Genesys.Labels.Select" />
		</button>
	</div>
</template>

<style lang="scss">
// Unscoped: window.prompt styles the Foundry window around the component.
@use '@scss/mixins/window.scss';

.app-select-crew-member-prompt {
	@include window.prompt(28rem, 15rem);
}
</style>

<style lang="scss" scoped>
@use 'sass:color';
@use '@scss/vars/colors.scss';

.select-crew-member-prompt {
	.member-skill-option {
		display: grid;
		grid-template-columns: 2rem 1fr auto auto auto;
		gap: 0.3em;
		align-items: center;
		margin-bottom: 0.3rem;
		padding: 0.3em;
		background: colors.alpha(colors.$light-blue, 0.2);
		border-radius: 0.5em;

		&.selected-option {
			background: colors.alpha(colors.$light-blue, 0.5);
			transform: scale(1.01);
			transition: all 0.3s ease-out;
		}

		.member-name {
			font-family: 'Roboto Serif', serif;
			font-size: 1.15em;
		}

		.skill-name {
			font-family: 'Roboto', sans-serif;
		}

		.skill-rank {
			font-family: 'Roboto', sans-serif;
			background: color.adjust(white, $alpha: -0.5);
			border: 1px dashed black;
			border-radius: 0.75rem;
			text-align: center;
			margin: 0.1em;
			width: 1.5em;
			height: 1.5em;
			font-size: 1rem;
			line-height: 1.5em;
		}
	}

	.submit-button {
		float: right;
		margin-top: 1rem;
		width: 50%;
	}
}
</style>
