<script lang="ts" setup>
import { computed, useTemplateRef } from 'vue';
import type { GenesysActor } from '@/actor/GenesysActor';
import { hasChatCard } from '@/item/ChatCards';
import { canOpenSheet, deleteDocument, openSheet, type RowDocument, sendToChat } from '@/operations/ItemActions';
import { useSheetDocument } from '@/vue/useSheetDocument';
import type { ContextMenuHandle } from '@/vue/components/ContextMenuHandle';
import type { RowAction, RowRemoval } from '@/vue/components/RowAction';
import ContextMenu from '@/vue/components/ContextMenu.vue';
import MenuItem from '@/vue/components/MenuItem.vue';

/**
 * A row's ⋮ menu, as every row of the sheets has it: the row's own actions, a separator, then Send to chat, Edit and
 * Delete. On a sheet the user can't edit, it keeps the entries that edit nothing: Send to chat, Edit, which opens the
 * row's sheet, and the own actions marked as editing nothing. Delete asks first, in the dialog that names what it
 * deletes. The menu opens from its ⋮, or under the pointer on a right-click on its content, or on the row through
 * `open`.
 */
const props = withDefaults(
	defineProps<{
		/**
		 * The row's document, which Edit opens, Send to chat posts when it is an item with a card, and Delete deletes.
		 */
		document?: RowDocument;

		/**
		 * The row's own actions, in their order.
		 */
		actions?: RowAction[];

		/**
		 * Whether the row offers Delete: a character's talent doesn't, nor an ability its Archetype grants.
		 */
		deletable?: boolean;

		/**
		 * What the last entry does in Delete's place, for a row whose removal is no deletion of its document, or that has
		 * none.
		 */
		removal?: RowRemoval;

		/**
		 * What the ⋮ is known by once an entry moves the row elsewhere in the sheet: the document's uuid by default.
		 */
		focusKey?: string;

		orientation?: 'left' | 'right';
		position?: 'above' | 'below';
	}>(),
	{ actions: () => [], deletable: true, orientation: 'left', position: 'below' },
);

const { document: sheetDocument, editable } = useSheetDocument();
const menu = useTemplateRef<ContextMenuHandle>('menu');

const ownActions = computed(() => props.actions.filter((action) => action.edits === false || editable.value));

// A card is spoken by the actor whose sheet posts it.
const chatItem = computed(() => {
	const document = props.document;
	return document?.documentName === 'Item' && hasChatCard(document.type) && sheetDocument.value.documentName === 'Actor'
		? document
		: undefined;
});
const canEdit = computed(() => !!props.document && canOpenSheet(props.document));
const canRemove = computed(() => editable.value && props.deletable && (!!props.removal || !!props.document));

const shownTail = computed(() => !!chatItem.value || canEdit.value || canRemove.value);

async function remove() {
	if (props.removal) {
		await props.removal.run();
	} else if (props.document) {
		await deleteDocument(props.document);
	}
}

defineExpose({ open: (event: MouseEvent) => menu.value?.open(event) } satisfies ContextMenuHandle);
</script>

<template>
	<ContextMenu
		ref="menu"
		class="row-actions"
		trigger
		:focus-key="focusKey ?? document?.uuid ?? undefined"
		:disable-menu="ownActions.length === 0 && !shownTail"
		:orientation="orientation"
		:position="position"
	>
		<template #menu-items>
			<MenuItem
				v-for="(action, index) in ownActions"
				:key="index"
				:icon="action.icon"
				:label="action.label"
				:label-data="action.labelData"
				@click="action.run()"
			/>

			<hr v-if="ownActions.length > 0 && shownTail" />

			<MenuItem
				v-if="chatItem"
				icon="fas fa-comment"
				label="Genesys.Labels.SendToChat"
				@click="sendToChat(chatItem, sheetDocument as GenesysActor)"
			/>

			<MenuItem v-if="canEdit && document" icon="fas fa-edit" label="Genesys.Labels.Edit" @click="openSheet(document)" />

			<MenuItem
				v-if="canRemove"
				:icon="removal?.icon ?? 'fas fa-trash'"
				:label="removal?.label ?? 'Genesys.Labels.Delete'"
				@click="remove"
			/>
		</template>

		<slot />
	</ContextMenu>
</template>
