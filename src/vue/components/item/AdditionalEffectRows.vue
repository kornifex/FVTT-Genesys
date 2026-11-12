<script lang="ts" setup>
import { ref } from 'vue';
import ActionButton from '@/vue/components/ActionButton.vue';
import Editor from '@/vue/components/Editor.vue';
import Glyphs from '@/vue/components/Glyphs.vue';
import type { ContainedAdditionalEffect } from '@/item/data/Spells';
import { DIE_GLYPHS } from '@/dice/GenesysPoolModifications';
import { withoutIndex } from '@/arrays';
import { confirmDelete } from '@/operations/ItemActions';

/**
 * The Additional Effects of a spell, each with the Difficulty dice it adds and its removal, which open to show its
 * description.
 */
const props = defineProps<{
	additionalEffects: readonly ContainedAdditionalEffect[];
	/**
	 * Saves the new list, which `@change` binds.
	 */
	onChange: (additionalEffects: ContainedAdditionalEffect[]) => unknown;
}>();

// The effects shown in full, by their id: the same effect added twice is two rows.
const opened = ref(new Set<string>());

function toggle({ id }: ContainedAdditionalEffect) {
	if (!opened.value.delete(id)) {
		opened.value.add(id);
	}
}

function detailsLabel(effect: string) {
	return game.i18n.format('Genesys.Labels.AdditionalEffectDetails', { effect });
}

function changeDescription(index: number, description: string) {
	return props.onChange(props.additionalEffects.map((effect, i) => (i === index ? { ...effect, description } : effect)));
}

// Removing an effect asks first, naming it.
async function remove(index: number) {
	const { id, name } = props.additionalEffects[index];
	// The list may change while the dialog is open: remove the effect it named, or nothing.
	if ((await confirmDelete(name)) && props.additionalEffects[index]?.id === id) {
		await props.onChange(withoutIndex(props.additionalEffects, index));
	}
}
</script>

<template>
	<div v-for="(effect, index) in additionalEffects" :key="effect.id" class="additional-effect">
		<div class="row-heading">
			<div class="name">{{ effect.name }}</div>
			<Glyphs class="difficulty" :glyphs="DIE_GLYPHS.Difficulty.repeat(effect.difficulty)" />
			<ActionButton icon="fas fa-trash" label="Genesys.Labels.RemoveAdditionalEffect" edits @click="remove(index)" />
			<ActionButton
				:icon="opened.has(effect.id) ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
				:localized-label="detailsLabel(effect.name)"
				:expanded="opened.has(effect.id)"
				@click="toggle(effect)"
			/>
		</div>

		<div v-if="opened.has(effect.id)" class="details">
			<Editor
				:name="`system.additionalEffects.${index}.description`"
				:save="(description: string) => changeDescription(index, description)"
			/>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.additional-effect {
	border-bottom: 1px dashed colors.$blue;

	&:last-of-type {
		border-bottom: none;
	}
}

.row-heading {
	display: grid;
	grid-template-columns: /* Name */ 2fr /* Difficulty */ 1fr /* Delete Button */ auto /* Details Button */ auto;
	align-items: center;
	gap: 0 0.5rem;
	padding: 2px;
}

.details {
	padding: 0.25rem 0 0.5rem 0.5rem;

	.editor {
		min-height: 6rem;
	}
}
</style>
