<script lang="ts" setup>
import { ref, useId } from 'vue';

import type { SelectPatientPromptContext } from '@/app/SelectPatientPrompt';
import { useSheetContext } from '@/vue/SheetContext';
import { usePromptAnswer } from '@/vue/usePrompt';

import Localized from '@/vue/components/Localized.vue';
import PromptFooter from '@/vue/components/PromptFooter.vue';

const context = useSheetContext<SelectPatientPromptContext>();

const selected = ref<string>();
// The radios' group, apart from those of another prompt open at the same time.
const groupName = useId();

usePromptAnswer<string | undefined>(() => selected.value);
</script>

<template>
	<div class="genesys select-patient-prompt">
		<fieldset>
			<legend><Localized label="Genesys.Recovery.PatientPrompt" /></legend>
			<label
				v-for="patient in context.patients"
				:key="patient.uuid"
				:class="{
					'patient-option': true,
					'selected-option': selected === patient.uuid,
				}"
			>
				<input type="radio" :name="groupName" :value="patient.uuid" v-model="selected" />
				<!-- The radio is hidden: the check mark shows the choice, besides the tint. -->
				<i :class="selected === patient.uuid ? 'fas fa-check-circle' : 'far fa-circle'" aria-hidden="true"></i>
				<img class="patient-image" :src="patient.img ?? undefined" alt="" draggable="false" />
				<span class="patient-name">{{ patient.name }}</span>
			</label>
		</fieldset>

		<PromptFooter label="Genesys.Labels.Select" :disabled="selected === undefined" />
	</div>
</template>

<style lang="scss">
// Unscoped: window.prompt styles the Foundry window around the component.
@use '@scss/mixins/window.scss';

.app-select-patient-prompt {
	@include window.prompt(20rem, 15rem);
}
</style>

<style lang="scss" scoped>
@use '@scss/mixins/hidden.scss';
@use '@scss/vars/colors.scss';

.select-patient-prompt {
	fieldset {
		margin: 0;
		padding: 0;
		border: none;
		min-width: 0;
	}

	legend {
		@include hidden.visually-hidden;
	}

	.patient-option {
		display: grid;
		grid-template-columns: 1rem 2rem 1fr;
		gap: 0.3em;
		align-items: center;
		margin-bottom: 0.3rem;
		padding: 0.3em;
		background: colors.alpha(colors.$light-blue, 0.2);
		border-radius: 0.5em;
		cursor: pointer;

		&.selected-option {
			background: colors.alpha(colors.$light-blue, 0.5);
		}

		// The radio is hidden, so the row shows its focus.
		&:has(input:focus-visible) {
			outline: 2px solid colors.$blue;
			outline-offset: 1px;
		}

		input {
			@include hidden.visually-hidden;
		}

		.patient-name {
			font-family: 'Roboto Serif', serif;
			font-size: 1.15em;
		}
	}

	.prompt-footer {
		margin-top: 1rem;
	}
}
</style>
