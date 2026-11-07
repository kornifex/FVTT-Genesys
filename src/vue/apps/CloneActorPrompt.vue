<script lang="ts" setup>
import { ref, useId } from 'vue';
import type { CloneActorPromptContext, Instantiation, InstantiationMethod } from '@/app/CloneActorPrompt';
import { useSheetContext } from '@/vue/SheetContext';
import { usePromptAnswer } from '@/vue/usePrompt';
import Localized from '@/vue/components/Localized.vue';
import PromptFooter from '@/vue/components/PromptFooter.vue';

const METHOD_DESCRIPTIONS: Record<InstantiationMethod, string> = {
	Original: 'Genesys.CloneActorPrompt.OriginalMethod.Description',
	Clone: 'Genesys.CloneActorPrompt.CloneMethod.Description',
};

const context = useSheetContext<CloneActorPromptContext>();
const actorName = ref(context.value.targetActor.name);
const instantiationMethod = ref<InstantiationMethod>('Original');
const methodId = useId();
const nameId = useId();

// The prompt answers with the choice; its caller makes the clone.
usePromptAnswer<Instantiation>(() => ({ method: instantiationMethod.value, name: actorName.value }));
</script>

<template>
	<div class="genesys clone-actor-prompt">
		<fieldset class="instantiation-method">
			<legend><Localized label="Genesys.CloneActorPrompt.Method" /></legend>
			<div class="instantiation-method-choice">
				<input :id="`${methodId}-original`" type="radio" value="Original" v-model="instantiationMethod" />
				<label :for="`${methodId}-original`"><Localized label="Genesys.CloneActorPrompt.OriginalMethod.Label" /></label>
			</div>

			<div class="instantiation-method-choice">
				<input :id="`${methodId}-clone`" type="radio" value="Clone" v-model="instantiationMethod" />
				<label :for="`${methodId}-clone`"><Localized label="Genesys.CloneActorPrompt.CloneMethod.Label" /></label>
			</div>
		</fieldset>
		<div class="instantiation-description">
			<Localized :label="METHOD_DESCRIPTIONS[instantiationMethod]" />
		</div>
		<div :class="{ 'clone-name': true, hidden: instantiationMethod !== 'Clone' }">
			<label :for="nameId"><Localized label="Genesys.CloneActorPrompt.CloneMethod.ActorNameLabel" /></label>
			<input :id="nameId" type="text" v-model="actorName" />
		</div>

		<PromptFooter class="submit-button" label="Genesys.Labels.Select" />
	</div>
</template>

<style lang="scss">
// Unscoped: window.prompt styles the Foundry window around the component.
@use '@scss/mixins/window.scss';

.app-clone-actor-prompt {
	@include window.prompt(28rem, 15rem);
}
</style>

<style lang="scss" scoped>
@use '@scss/mixins/hidden.scss';

.clone-actor-prompt {
	.instantiation-method {
		// A fieldset groups the choices for a screen reader, which its legend names; they show as they did without it.
		margin: 0;
		border: none;
		min-width: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.3em;
		text-align: center;
		padding: 0.3em;
		font-family: 'Roboto Serif', serif;
		font-size: 1.15em;

		legend {
			@include hidden.visually-hidden;
		}

		.instantiation-method-choice {
			input {
				vertical-align: top;
			}
			label {
				padding-left: 0.5rem;
			}
		}
	}

	.instantiation-description {
		font-family: 'Roboto', serif;
		font-size: 0.9rem;
		padding: 0.1rem;
		min-height: 4rem;
		text-align: justify;
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.clone-name {
		display: grid;
		grid-template-columns: auto 1rem 1fr;
		gap: 0.3em;
		align-items: center;

		&.hidden {
			visibility: hidden;
		}

		input {
			grid-column: 3 / span 1;
		}
	}

	.prompt-footer {
		margin-top: 1rem;
	}
}
</style>
