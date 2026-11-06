<script lang="ts" setup>
import { ref, useId } from 'vue';

import type { AwardData } from '@/app/AwardXPPrompt';
import { usePromptAnswer } from '@/vue/usePrompt';
import Localized from '@/vue/components/Localized.vue';
import PromptFooter from '@/vue/components/PromptFooter.vue';

const amount = ref(0);
const reason = ref('');

const amountId = useId();
const reasonId = useId();

usePromptAnswer<AwardData>(() => ({ amount: amount.value, reason: reason.value }));
</script>

<template>
	<div class="genesys award-xp-prompt">
		<div class="amount">
			<label :for="amountId"><Localized label="Genesys.RewardsPrompt.Amount" /></label>
			<input :id="amountId" type="number" min="0" v-model="amount" />
		</div>

		<div class="reason">
			<label :for="reasonId"><Localized label="Genesys.RewardsPrompt.Reason" /></label>
			<textarea :id="reasonId" v-model="reason"></textarea>
		</div>

		<PromptFooter label="Genesys.Labels.Add" />
	</div>
</template>

<style lang="scss">
// Unscoped: window.prompt styles the Foundry window around the component.
@use '@scss/mixins/window.scss';

.app-award-xp-prompt {
	@include window.prompt(150px, 200px);
}
</style>

<style lang="scss" scoped>
@use '@scss/mixins/headings.scss';

.award-xp-prompt {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	gap: 0.5em;

	label {
		@include headings.font;
		font-size: 1.1em;
	}

	* {
		font-family: 'Roboto Serif', serif;
	}

	div {
		padding: 0.5em;
	}

	input {
		margin: 0;
		text-align: right;
	}

	textarea {
		resize: vertical;
		min-height: 100px;
	}

	.amount {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		align-items: center;
		border-bottom: 1px dashed black;
		gap: 0.5em;
	}

	.reason {
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
	}
}
</style>
