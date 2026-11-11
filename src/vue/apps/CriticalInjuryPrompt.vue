<script lang="ts" setup>
import { computed, ref, useId } from 'vue';

import type { CriticalInjuryAnswer, CriticalInjuryPromptContext } from '@/app/CriticalInjuryPrompt';
import {
	type CriticalInjuryLine,
	criticalInjuryFormula,
	criticalInjuryLines,
	criticalModifier,
	extraTriggersBonus,
} from '@/dice/CriticalInjuryRoll';
import { useSheetContext } from '@/vue/SheetContext';
import { usePromptAnswer } from '@/vue/usePrompt';
import Localized from '@/vue/components/Localized.vue';
import PromptFooter from '@/vue/components/PromptFooter.vue';

const context = useSheetContext<CriticalInjuryPromptContext>();
const { actor, attack } = context.value.request;

// Each line keeps the value the roller types in, which starts at the one the rules give.
const lines = ref(criticalInjuryLines(context.value.request, context.value.viciousNames));
const spent = ref(1);
const modifier = computed(() => criticalModifier(lines.value.map(({ value }) => ({ value: Number(value) }))));
const formula = computed(() => criticalInjuryFormula(modifier.value));

// Spending another trigger sets the line of the extra triggers back to what the rules give for them.
function onSpentChange() {
	const triggers = Math.min(Math.max(Math.trunc(Number(spent.value)) || 1, 1), attack?.triggers ?? 1);
	const line = lines.value.find(({ kind }) => kind === 'triggers');
	if (line) {
		line.value = extraTriggersBonus(triggers);
	}
}

/**
 * What a line's value comes from, in words.
 */
function lineLabel(line: CriticalInjuryLine) {
	switch (line.kind) {
		case 'triggers':
			return game.i18n.localize('Genesys.CriticalInjuryPrompt.Lines.Triggers');
		case 'vicious':
			return game.i18n.format('Genesys.CriticalInjuryPrompt.Lines.Vicious', { rating: String(line.count) });
		case 'injuries':
			return game.i18n.format('Genesys.CriticalInjuryPrompt.Lines.Injuries', { count: String(line.count) });
		case 'inflicted':
		case 'suffered': {
			const { name, item } = line.source;
			const source = item && item.name !== name ? `${name} (${item.name})` : name;
			return line.kind === 'inflicted'
				? game.i18n.format('Genesys.CriticalInjuryPrompt.Lines.Inflicted', { source })
				: game.i18n.format('Genesys.CriticalInjuryPrompt.Lines.Suffered', { source });
		}
		case 'free':
			return game.i18n.localize('Genesys.CriticalInjuryPrompt.Lines.Free');
	}
}

const id = useId();

usePromptAnswer<CriticalInjuryAnswer>(() => ({ modifier: modifier.value }));
</script>

<template>
	<div class="genesys critical-injury-prompt">
		<header>
			<div v-if="actor" class="actor">
				<Localized label="Genesys.CriticalInjuryPrompt.For" :format-args="{ actor: actor.name }" />
			</div>
			<div v-if="attack?.weapon" class="attack">
				<Localized label="Genesys.CriticalInjuryPrompt.Attack" :format-args="{ weapon: attack.weapon.name }" />
			</div>
			<div class="table"><Localized label="Genesys.CriticalInjuryPrompt.Table" :format-args="{ table: context.tableName }" /></div>
		</header>

		<div v-if="attack" class="spent">
			<label :for="`${id}-spent`"
				><Localized label="Genesys.CriticalInjuryPrompt.Spent" :format-args="{ triggers: attack.triggers }"
			/></label>
			<input
				:id="`${id}-spent`"
				name="spent"
				type="number"
				min="1"
				:max="attack.triggers"
				step="1"
				v-model="spent"
				@change="onSpentChange"
			/>
		</div>

		<ol class="lines">
			<li v-for="(line, index) in lines" :key="index" :class="['line', line.kind]">
				<label :for="`${id}-${index}`">{{ lineLabel(line) }}</label>
				<input :id="`${id}-${index}`" :name="`line-${line.kind}`" type="number" step="1" v-model="line.value" />
			</li>
		</ol>

		<div class="formula">
			<Localized label="Genesys.CriticalInjuryPrompt.Formula" />
			<output :for="lines.map((_line, index) => `${id}-${index}`).join(' ')">{{ formula }}</output>
		</div>

		<PromptFooter class="roll-button" label="Genesys.CriticalInjuryPrompt.Roll" />
	</div>
</template>

<style lang="scss">
// Unscoped: window.prompt styles the Foundry window around the component.
@use '@scss/mixins/window.scss';

.app-critical-injury-prompt {
	@include window.prompt(24rem, 12rem);
}
</style>

<style lang="scss" scoped>
@use '@scss/mixins/headings.scss';
@use '@scss/vars/colors.scss';

.critical-injury-prompt {
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	font-family: 'Roboto Serif', serif;

	header {
		display: flex;
		flex-direction: column;
		gap: 0.25em;

		.actor {
			@include headings.font;
			font-size: 1.1em;
		}
	}

	.spent,
	.line,
	.formula {
		display: grid;
		grid-template-columns: 1fr 5em;
		align-items: center;
		gap: 0.5em;
	}

	.lines {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.line {
		padding: 0.25em 0;
		border-bottom: 1px dashed colors.$ink;

		&:last-child {
			border-bottom: none;
		}
	}

	input {
		margin: 0;
		text-align: right;
	}

	.formula {
		@include headings.font;

		output {
			text-align: right;
			white-space: nowrap;
		}
	}
}
</style>
