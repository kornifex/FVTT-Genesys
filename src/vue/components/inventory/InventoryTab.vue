<script lang="ts" setup>
import { computed, ref, toRef } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';

import { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import { EquipmentState } from '@/item/data/EquipmentState';
import { GenesysItem } from '@/item/GenesysItem';
import { draggedGenesysType } from '@/data/DragTransferData';
import { sectionItems } from '@/actor/data/Inventory';
import { receiveInventoryEvent } from '@/operations/InventoryDrop';
import { useDragHover } from '@/vue/useDragHover';

import Localized from '@/vue/components/Localized.vue';
import InventoryItem from '@/vue/components/inventory/InventoryItem.vue';
import SortSlot from '@/vue/components/inventory/SortSlot.vue';

const props = defineProps<{
	/**
	 * Whether items can be dropped, which adds the `Dropped` section and the drop/pick up actions.
	 */
	allowDroppedState?: boolean;

	/**
	 * Whether the currency and encumbrance row goes above the item sections instead of below them.
	 */
	summaryOnTop?: boolean;
}>();

const CURRENCY_LABEL = CONFIG.genesys.settings.currencyName;

const { document: actor } = useSheetDocument<GenesysActor<CharacterDataModel | VehicleDataModel>>();
const system = toRef(() => actor.value.systemData);

// The actor's data model tells which item types belong to the inventory and which of them can be equipped.
const dataModel = actor.value.systemData.constructor as typeof CharacterDataModel | typeof VehicleDataModel;

const isDraggable = ref(actor.value.isOwner);

// A drag over the tab opens the sort slots of the sections that take the dragged item: the Equipped section those the
// actor can equip, the others any item of its inventory.
const equipableDrag = useDragHover((event) => dataModel.isRelevantTypeForContext('EQUIPABLE', draggedGenesysType(event) ?? ''));
const inventoryDrag = useDragHover((event) => dataModel.isRelevantTypeForContext('INVENTORY', draggedGenesysType(event) ?? ''));

const inventory = computed(
	() => actor.value.items.filter((i) => dataModel.isRelevantTypeForContext('INVENTORY', i.type)) as GenesysItem<EquipmentDataModel>[],
);
const equippedItems = computed(() => sectionItems(inventory.value, EquipmentState.Equipped));
const carriedItems = computed(() => sectionItems(inventory.value, EquipmentState.Carried));
const droppedItems = computed(() => sectionItems(inventory.value, EquipmentState.Dropped));

type ItemSection = {
	state: EquipmentState;
	label: string;
	items: GenesysItem<EquipmentDataModel>[];
};

// The item sections in display order.
const itemSections = computed(() => {
	const sections: ItemSection[] = [
		{ state: EquipmentState.Equipped, label: 'Genesys.Labels.Equipped', items: equippedItems.value },
		{ state: EquipmentState.Carried, label: 'Genesys.Labels.Carried', items: carriedItems.value },
	];

	if (props.allowDroppedState) {
		sections.push({ state: EquipmentState.Dropped, label: 'Genesys.Labels.Dropped', items: droppedItems.value });
	}

	return sections;
});

// The order of the tab's parts: the item sections and the currency and encumbrance row.
const layout = computed(() => (props.summaryOnTop ? ['summary', 'items'] : ['items', 'summary']));

function canTypeBeInsideContainer(type: string) {
	return type !== 'container' && dataModel.isRelevantTypeForContext('INVENTORY', type);
}

async function dropInventoryToSortSlot(event: DragEvent, state: EquipmentState, after: number) {
	await receiveInventoryEvent(actor.value, event, { kind: 'section', state, after });
}

function isSectionDragged(state: EquipmentState) {
	return (state === EquipmentState.Equipped ? equipableDrag : inventoryDrag).isHovered.value;
}

function dragEnter(event: DragEvent) {
	equipableDrag.enter(event);
	inventoryDrag.enter(event);
}

function dragLeave(event: DragEvent) {
	equipableDrag.leave(event);
	inventoryDrag.leave(event);
}

function resetDrags() {
	equipableDrag.reset();
	inventoryDrag.reset();
}
</script>

<template>
	<section class="tab-inventory" @drop.capture="resetDrags" @dragenter="dragEnter" @dragleave="dragLeave">
		<template v-for="part in layout" :key="part">
			<div v-if="part === 'summary'" class="encumbrance-currency-row">
				<div class="currency-row">
					<label><i class="fas fa-coins"></i> {{ CURRENCY_LABEL }}:</label>
					<input type="text" name="system.currency" :value="system.currency" />
				</div>

				<div :class="`encumbrance-row ${system.isEncumbered ? 'encumbered' : ''}`">
					<span v-if="system.isEncumbered"><Localized label="Genesys.Labels.Encumbered" /></span>
					<span><i class="fas fa-weight-hanging"></i></span>
					<span>{{ system.currentEncumbrance.value }}/{{ system.currentEncumbrance.threshold }}</span>
				</div>
			</div>

			<template v-else>
				<template v-for="section in itemSections" :key="section.state">
					<div class="section-header">
						<span><Localized :label="section.label" /></span>
					</div>

					<SortSlot :active="isSectionDragged(section.state)" @drop="dropInventoryToSortSlot($event, section.state, -1)" />

					<TransitionGroup name="inv">
						<template v-for="(item, index) in section.items" :key="item.id">
							<InventoryItem
								:item="item"
								:draggable="isDraggable"
								:dragging="inventoryDrag.isHovered.value"
								:can-type-be-inside-container="canTypeBeInsideContainer"
								:allow-dropped-state="allowDroppedState"
							/>

							<SortSlot
								:active="isSectionDragged(section.state)"
								@drop="dropInventoryToSortSlot($event, section.state, index)"
							/>
						</template>
					</TransitionGroup>
				</template>
			</template>
		</template>
	</section>
</template>

<style lang="scss" scoped>
@use 'sass:color';
@use '@scss/mixins/reset.scss';
@use '@scss/vars/colors.scss';

.tab-inventory {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	padding: 0.5em;

	.inv-move,
	.inv-enter-active,
	.inv-leave-active {
		transition: all 0.5s ease;
	}

	.inv-enter-from,
	.inv-leave-to {
		height: 0;
		opacity: 0;
		transform: translateY(50px);
	}

	.encumbrance-currency-row {
		display: grid;
		align-items: center;
		grid-template-columns: 1fr auto auto;

		.currency-row,
		.encumbrance-row {
			background: colors.$dark-blue;
			padding-left: 0.5em;
			height: 100%;
			color: white;
		}

		.currency-row {
			grid-column: 2 / span 1;
			border-top-left-radius: 0.5rem;
			border-bottom-left-radius: 0.5rem;
		}

		.encumbrance-row {
			grid-column: 3 / span 1;
			padding-right: 0.5em;
			border-top-right-radius: 0.5rem;
			border-bottom-right-radius: 0.5rem;
		}
	}

	.currency-row {
		display: flex;
		align-items: center;
		gap: 0.5em;

		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.1em;

		@include reset.input;
		input {
			background: color.adjust(white, $alpha: -0.8);
			padding: 3px;
			text-align: right;
			width: 100px;
			font-size: 1.1em;
			color: white;
		}
	}

	.encumbrance-row {
		width: 100%;
		display: flex;
		flex-wrap: nowrap;
		gap: 0.25em;
		font-family: 'Bebas Neue', sans-serif;
		align-items: center;

		span {
			margin-left: 0.5em;
		}

		&.encumbered {
			color: colors.$alert;
		}
	}

	.section-header {
		display: flex;
		font-size: 1.25em;
		font-family: 'Bebas Neue', sans-serif;
	}
}
</style>
