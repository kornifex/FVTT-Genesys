<script lang="ts" setup>
import { ref, useId } from 'vue';

import { SelectCrewMemberPromptContext } from '@/app/SelectCrewMemberPrompt';
import type { ActorCrewMemberSkill } from '@/operations/CrewRoll';
import { useSheetContext } from '@/vue/SheetContext';
import { usePromptAnswer } from '@/vue/usePrompt';

import Localized from '@/vue/components/Localized.vue';
import PromptFooter from '@/vue/components/PromptFooter.vue';
import SkillRanks from '@/vue/components/character/SkillRanks.vue';

const context = useSheetContext<SelectCrewMemberPromptContext>();

const selectedIndex = ref(-1);
// The radios' group, apart from those of another prompt open at the same time.
const groupName = useId();

usePromptAnswer<ActorCrewMemberSkill | undefined>(() => context.value.memberSkills[selectedIndex.value]);
</script>

<template>
	<div class="genesys select-crew-member-prompt">
		<fieldset>
			<legend><Localized label="Genesys.CrewMemberPrompt.Title" /></legend>
			<label
				v-for="(memberSkill, index) in context.memberSkills"
				:key="memberSkill.member + memberSkill.skillName"
				:class="{
					'member-skill-option': true,
					'selected-option': selectedIndex === index,
				}"
			>
				<input type="radio" :name="groupName" :value="index" v-model="selectedIndex" />
				<!-- The radio is hidden: the check mark shows the choice, besides the tint. -->
				<i :class="selectedIndex === index ? 'fas fa-check-circle' : 'far fa-circle'" aria-hidden="true"></i>
				<img class="member-image" :src="memberSkill.actor.img ?? undefined" alt="" draggable="false" />
				<span class="member-name">{{ memberSkill.actor.name }}</span>

				<span class="skill-name">{{ memberSkill.skill.name }}</span>
				<span class="skill-rank">{{ memberSkill.rank }}</span>
				<SkillRanks :skill-value="memberSkill.rank" :characteristic-value="memberSkill.characteristicValue" />
			</label>
		</fieldset>

		<PromptFooter class="submit-button" label="Genesys.Labels.Select" :disabled="selectedIndex < 0" />
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
@use '@scss/mixins/hidden.scss';
@use '@scss/vars/colors.scss';

.select-crew-member-prompt {
	fieldset {
		margin: 0;
		padding: 0;
		border: none;
		min-width: 0;
	}

	legend {
		@include hidden.visually-hidden;
	}

	.member-skill-option {
		position: relative;
		display: grid;
		grid-template-columns: 1rem 2rem 1fr auto auto auto;
		gap: 0.3em;
		align-items: center;
		margin-bottom: 0.3rem;
		padding: 0.3em;
		background: colors.alpha(colors.$light-blue, 0.2);
		border-radius: 0.5em;
		cursor: pointer;

		&.selected-option {
			background: colors.alpha(colors.$light-blue, 0.5);
			transform: scale(1.01);
			transition: all 0.3s ease-out;
		}

		// The radio is hidden, so the row shows its focus.
		&:has(input:focus-visible) {
			outline: 2px solid colors.$blue;
			outline-offset: 1px;
		}

		input {
			@include hidden.visually-hidden;
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

	.prompt-footer {
		margin-top: 1rem;
	}
}
</style>
