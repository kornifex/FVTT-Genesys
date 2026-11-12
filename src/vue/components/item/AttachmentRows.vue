<script lang="ts" setup>
import { computed, ref } from 'vue';
import ActionButton from '@/vue/components/ActionButton.vue';
import Editor from '@/vue/components/Editor.vue';
import type { ContainedAttachment } from '@/item/data/Attachments';
import { hardPointsTaken } from '@/item/data/Attachments';
import { withoutIndex } from '@/arrays';
import { confirmDelete } from '@/operations/ItemActions';

/**
 * The attachments of a weapon or an armor, each with the Hard Points it takes and its removal, which open to show its
 * description, and a warning when they take more Hard Points than the item has. Its effects, base modifiers and
 * modification options, are in the item's Effects tab, where a modification is installed by enabling it.
 */
const props = defineProps<{
	attachments: readonly ContainedAttachment[];
	/**
	 * The Hard Points of the item.
	 */
	hardPoints: number;
	/**
	 * Saves the new list, which `@change` binds.
	 */
	onChange: (attachments: ContainedAttachment[]) => unknown;
}>();

// The attachments shown in full, by their id: the same attachment installed twice is two rows.
const opened = ref(new Set<string>());

function toggle({ id }: ContainedAttachment) {
	if (!opened.value.delete(id)) {
		opened.value.add(id);
	}
}

const taken = computed(() => hardPointsTaken(props.attachments));

// The item holds the attachments it was given, even over its Hard Points (CRB p. 206): the table decides.
const overHardPoints = computed(() =>
	taken.value > props.hardPoints
		? game.i18n.format('Genesys.Labels.HardPointsOver', { taken: String(taken.value), total: String(props.hardPoints) })
		: undefined,
);

function detailsLabel(attachment: string) {
	return game.i18n.format('Genesys.Labels.AttachmentDetails', { attachment });
}

function changeDescription(index: number, description: string) {
	return props.onChange(props.attachments.map((attachment, i) => (i === index ? { ...attachment, description } : attachment)));
}

// Removing an attachment asks first, naming it; its effects go with it.
async function remove(index: number) {
	const { id, name } = props.attachments[index];
	// The list may change while the dialog is open: remove the attachment it named, or nothing.
	if ((await confirmDelete(name)) && props.attachments[index]?.id === id) {
		await props.onChange(withoutIndex(props.attachments, index));
	}
}
</script>

<template>
	<div v-for="(attachment, index) in attachments" :key="attachment.id" class="attachment">
		<div class="row-heading">
			<div>{{ attachment.name }}</div>
			<div class="hard-points-required">{{ attachment.hardPointsRequired }}</div>
			<ActionButton icon="fas fa-trash" label="Genesys.Labels.RemoveAttachment" edits @click="remove(index)" />
			<ActionButton
				:icon="opened.has(attachment.id) ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
				:localized-label="detailsLabel(attachment.name)"
				:expanded="opened.has(attachment.id)"
				@click="toggle(attachment)"
			/>
		</div>

		<div v-if="opened.has(attachment.id)" class="details">
			<Editor
				:name="`system.attachments.${index}.description`"
				:save="(description: string) => changeDescription(index, description)"
			/>
		</div>
	</div>

	<div v-if="overHardPoints" class="over-hard-points" role="status">
		<i class="fas fa-triangle-exclamation" aria-hidden="true"></i> {{ overHardPoints }}
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.attachment {
	border-bottom: 1px dashed colors.$blue;

	&:last-of-type {
		border-bottom: none;
	}
}

.row-heading {
	display: grid;
	grid-template-columns: /* Name */ 2fr /* Hard Points */ 1fr /* Delete Button */ auto /* Details Button */ auto;
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

.over-hard-points {
	color: colors.$red;
	padding: 2px;
}
</style>
