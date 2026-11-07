<script lang="ts" setup>
import { computed, ref, toRef, useTemplateRef } from 'vue';
import type { Stored } from '@/data/Stored';
import { useRendered, useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';

import { GenesysItem } from '@/item/GenesysItem';
import { EQUIPMENT_TYPES, itemsOfType, type EquipmentType } from '@/item/ItemTypes';
import { ArmorDataModel } from '@/item/data/ArmorDataModel';
import { EquipmentState } from '@/item/data/EquipmentState';
import { damageLevel, EQUIPMENT_DAMAGE_LABELS, EquipmentDamageState } from '@/item/data/EquipmentDamage';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';
import { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import { draggedGenesysType, startDocumentDrag } from '@/data/DragTransferData';
import {
	containerContents,
	equipmentStateMoves,
	equipmentStateUpdates,
	rowEdge,
	type RowEdge,
	sectionItems,
	StepDirection,
	SteppedValue,
} from '@/actor/data/Inventory';
import { receiveInventoryDrop, receiveInventoryEvent } from '@/operations/InventoryDrop';
import { attackSkill, attackWith, openSheet, setEquipmentQuantity, stepEquipment } from '@/operations/ItemActions';
import { useDragHover } from '@/vue/useDragHover';
import type { ContextMenuHandle } from '@/vue/components/ContextMenuHandle';
import type { RowAction } from '@/vue/components/RowAction';
import { signed } from '@/vue/format';

import ActionButton from '@/vue/components/ActionButton.vue';
import Counter from '@/vue/components/Counter.vue';
import DescriptionFold from '@/vue/components/DescriptionFold.vue';
import Localized from '@/vue/components/Localized.vue';
import QualityList from '@/vue/components/QualityList.vue';
import RowActions from '@/vue/components/RowActions.vue';
import RollLink from '@/vue/components/RollLink.vue';
import WeaponProfileStats from '@/vue/components/WeaponProfileStats.vue';
import { firingArcLabels } from '@/item/Weapons';
import { weaponProfiles } from '@/item/WeaponProfiles';

const props = withDefaults(
	defineProps<{
		item: Stored<GenesysItem<EquipmentType>>;
		dragging?: boolean;
		/**
		 * Whether a drag the row's section takes is over the inventory: the row then shows the edge the item would land
		 * next to.
		 */
		sectionTakesDrag?: boolean;
		mini?: boolean;
		canTypeBeInsideContainer?: (type: string) => boolean;
	}>(),
	{
		dragging: false,
		sectionTakesDrag: false,
		mini: false,
		canTypeBeInsideContainer: () => false,
	},
);

const emit = defineEmits<{
	(e: 'dragstart', event: DragEvent): void;
	(e: 'dragend', event: DragEvent): void;
	/**
	 * An item dropped on the row of an item that is no Container, next to one of its edges.
	 */
	(e: 'drop-on-row', event: DragEvent, edge: RowEdge): void;
}>();

const damageStateToIcon = new Map([
	[EquipmentDamageState.Undamaged, 'fa-face-smile-beam'],
	[EquipmentDamageState.Minor, 'fa-face-meh'],
	[EquipmentDamageState.Moderate, 'fa-face-frown'],
	[EquipmentDamageState.Major, 'fa-face-dizzy'],
]);

// The menu entry of each Equipment State move. Equipping is drawn as a fist for weapons, and as a shield for armor.
const MOVE_ENTRIES = {
	equip: { icon: 'fas fa-hand-fist', label: 'Genesys.Equipment.Dropdown.Equip' },
	unequip: { icon: 'fas fa-suitcase', label: 'Genesys.Equipment.Dropdown.Unequip' },
	drop: { icon: 'fas fa-box-archive', label: 'Genesys.Equipment.Dropdown.Drop' },
	pickUp: { icon: 'fas fa-suitcase', label: 'Genesys.Equipment.Dropdown.PickUp' },
} as const;

// Only a Container lights up under a drag, and only for an item it can hold.
const containerDrag = useDragHover((event) => {
	if (props.item.type !== 'container') {
		return false;
	}

	const type = draggedGenesysType(event);
	return type !== undefined && (!type || props.canTypeBeInsideContainer(type));
});
const isBeingDragged = ref(false);

// The row of an item that is no Container places a drop next to its item, before or after it as the drag points at.
const takesSortDrop = computed(() => props.item.type !== 'container' && !props.mini);
const sortDrag = useDragHover(() => takesSortDrop.value);
const sortEdge = ref<RowEdge>();
const shownEdge = computed(() =>
	props.sectionTakesDrag && sortDrag.isHovered.value && !isBeingDragged.value ? sortEdge.value : undefined,
);

const menu = useTemplateRef<ContextMenuHandle>('menu');

const { document: actor } = useSheetDocument<GenesysActor<'character' | 'vehicle'>>();

const isBasicItem = computed(() => ['consumable', 'gear'].includes(props.item.type));

// Named as the prop, which it shadows in the template: the row reads the item through `useRendered`.
const item = useRendered(() => props.item);
const system = toRef(() => item.value.system);

function armorData() {
	return system.value as ArmorDataModel;
}

// The rows that read a weapon's data are those of a character's or a vehicle's weapon.
function weaponData() {
	return system.value as WeaponDataModel | VehicleWeaponDataModel;
}

// The profile a weapon's row shows, and attacks with: a character's weapon's main Weapon Profile, or a vehicle weapon's
// single one, its own fields.
function weaponProfile() {
	const weapon = weaponData();
	return 'extraProfiles' in weapon ? weaponProfiles(weapon)[0] : weapon;
}

// The labels of a vehicle weapon's firing arc: a character's weapon has none.
function firingArcs() {
	const weapon = weaponData();
	return 'firingArc' in weapon ? firingArcLabels(weapon.firingArc) : undefined;
}

const dimForDrag = computed(() => props.dragging && props.item.type !== 'container' && !shownEdge.value);

const displayContainerContents = ref(false);
const containedItems = computed(() => containerContents(itemsOfType(actor.value, EQUIPMENT_TYPES), props.item.id));

// The Attack Skill of a character's weapon's main profile, which offers an attack when it has one.
function skillForWeapon() {
	return attackSkill(actor.value, weaponProfiles((item.value as GenesysItem<'weapon'>).system)[0]);
}

// Whether the row's name attacks: a character's weapon attacks while it is Equipped, with an Attack Skill.
function attacks() {
	return item.value.type === 'weapon' && system.value.state === EquipmentState.Equipped && !!skillForWeapon();
}

// The Equipment State moves the row's menu offers.
function stateMoves() {
	return equipmentStateMoves(actor.value.type, item.value);
}

function moveIcon(action: keyof typeof MOVE_ENTRIES) {
	return action === 'equip' && props.item.type === 'armor' ? 'fas fa-shield' : MOVE_ENTRIES[action].icon;
}

// The Containers the row's item can be put in, which the drag onto a Container did alone: the actor's others, for an
// item that is no Container.
function otherContainers() {
	return props.item.type === 'container'
		? []
		: itemsOfType(actor.value, 'container').filter((container) => container.id !== system.value.container);
}

// The Container that holds the row's item, which it can be taken out of to the end of the Container's section.
function holdingContainer() {
	return system.value.container === '' ? undefined : actor.value.items.get(system.value.container);
}

async function takeOut() {
	const { state } = system.value;
	const after = sectionItems(itemsOfType(actor.value, EQUIPMENT_TYPES), state).length - 1;
	await receiveInventoryDrop(actor.value, props.item, { kind: 'section', state, after });
}

// The row's own actions: its Equipment State moves, then putting it in a Container or taking it out of its own.
function rowActions(): RowAction[] {
	const holder = holdingContainer();
	return [
		...stateMoves().map((move) => ({
			icon: moveIcon(move.action),
			label: MOVE_ENTRIES[move.action].label,
			run: () => setItemState(move.state),
		})),
		...otherContainers().map((container) => ({
			icon: 'fas fa-box-open',
			label: 'Genesys.Labels.PutInContainer',
			labelData: { container: container.name },
			run: () => receiveInventoryDrop(actor.value, props.item, { kind: 'container', id: container.id }),
		})),
		...(holder
			? [
					{
						icon: 'fas fa-arrow-right-from-bracket',
						label: 'Genesys.Labels.TakeOutOfContainer',
						labelData: { container: holder.name },
						run: takeOut,
					},
				]
			: []),
	];
}

async function setItemState(state: EquipmentState) {
	// A Container's contents take its new state with it, and an armor put on takes off the one worn before.
	await actor.value.updateEmbeddedDocuments(
		'Item',
		equipmentStateUpdates(itemsOfType(actor.value, EQUIPMENT_TYPES), props.item.id, state),
	);
}

function dragStart(event: DragEvent) {
	isBeingDragged.value = true;
	startDocumentDrag(event, props.item);

	emit('dragstart', event);
}

function dragEnd(event: DragEvent) {
	isBeingDragged.value = false;

	emit('dragend', event);
}

function step(kind: SteppedValue, direction: StepDirection) {
	return stepEquipment(props.item, kind, direction);
}

function edgeOf(event: DragEvent) {
	return rowEdge(event.clientY, (event.currentTarget as HTMLElement).getBoundingClientRect());
}

function dragEnter(event: DragEvent) {
	containerDrag.enter(event);
	sortDrag.enter(event);
}

function dragLeave(event: DragEvent) {
	containerDrag.leave(event);
	sortDrag.leave(event);

	// A drag entering the row again shows no edge until it points at one.
	if (!sortDrag.isHovered.value) {
		sortEdge.value = undefined;
	}
}

function dragOver(event: DragEvent) {
	if (takesSortDrop.value) {
		sortEdge.value = edgeOf(event);
	}
}

async function drop(event: DragEvent) {
	containerDrag.reset();
	sortDrag.reset();
	sortEdge.value = undefined;

	// A Container receives the drop. The inventory tab places one on another row in the row's section, and the row of a
	// Container's contents lets it go on to the Container.
	if (props.item.type === 'container') {
		await receiveInventoryEvent(actor.value, event, { kind: 'container', id: props.item.id });
	} else if (takesSortDrop.value) {
		emit('drop-on-row', event, edgeOf(event));
	}
}

// A right-click anywhere on the row opens its menu at the pointer, as Foundry's context menus open; Shift+F10 or the
// context menu key, on any control of the row, at its ⋮. The row of a Container's contents opens its own menu, not the
// Container's.
function openMenu(event: MouseEvent) {
	menu.value?.open(event);
}
</script>

<template>
	<div
		:class="{
			'inventory-item': true,
			mini: props.mini,
			[system.state]: true,
			hover: containerDrag.isHovered.value,
			'drag-dim': dimForDrag && !isBeingDragged,
			'drag-source': isBeingDragged,
			'drop-before': shownEdge === 'before',
			'drop-after': shownEdge === 'after',
		}"
		@dragenter="dragEnter"
		@dragleave="dragLeave"
		@dragover="dragOver"
		@dragstart="dragStart"
		@dragend="dragEnd"
		@drop="drop"
		@contextmenu="openMenu"
	>
		<!-- The icon opens the item's sheet; the name attacks with an equipped weapon, and opens the sheet otherwise. The row's
		drag starts on the icon's wrapper too, since Firefox starts none from a button: the dragstart reaches the row. -->
		<span class="item-icon" draggable="true"
			><ActionButton :image="item.img ?? undefined" label="Genesys.Tooltips.OpenItem" @click="openSheet(item)"
		/></span>

		<span v-if="mini || isBasicItem" class="name" @dragenter="containerDrag.enter" @dragleave="containerDrag.leave">
			<ActionButton @click="openSheet(item)">{{ item.name }}</ActionButton>
		</span>
		<!-- A Container's details are the count of its contents, which opens them, in a fold below the row. -->
		<DescriptionFold
			v-else-if="item.type === 'container'"
			v-model:open="displayContainerContents"
			class="details"
			@dragenter="containerDrag.enter"
			@dragleave="containerDrag.leave"
		>
			<span class="name">
				<ActionButton @click="openSheet(item)">{{ item.name }}</ActionButton>
			</span>

			<template #summary>
				{{ containedItems.length }}
				<Localized label="Genesys.Labels.Items" v-if="containedItems.length !== 1" />
				<Localized label="Genesys.Labels.Item" v-else />
			</template>

			<!-- Always rendered, as the count is: an empty Container opens on nothing. -->
			<template #fold>
				<div class="contents">
					<InventoryItem
						v-for="item in containedItems"
						:item="item"
						:key="item.id"
						mini
						draggable="true"
						@dragstart="
							$event.stopPropagation();
							emit('dragstart', $event);
						"
						@dragend="
							$event.stopPropagation();
							emit('dragend', $event);
						"
					/>
				</div>
			</template>
		</DescriptionFold>
		<div v-else class="details" @dragenter="containerDrag.enter" @dragleave="containerDrag.leave">
			<span class="name">
				<RollLink
					v-if="attacks()"
					label="Genesys.Tooltips.RollAttack"
					:label-data="{ weapon: item.name }"
					@roll="attackWith(actor, item as GenesysItem<'weapon'>)"
					>{{ item.name }}</RollLink
				>
				<ActionButton v-else @click="openSheet(item)">{{ item.name }}</ActionButton>
			</span>

			<div :data-item-type="item.type">
				<template v-if="item.type === 'weapon' || item.type === 'vehicleWeapon'">
					<div>{{ (item.type === 'weapon' ? skillForWeapon() : weaponProfile().skills[0]) ?? '-' }}</div>

					<!-- prettier-ignore -->
					<div v-if="firingArcs()" class="firing-arc">
						<Localized label="Genesys.Labels.FiringArc" /> <span v-for="label in firingArcs()" :key="label"><Localized :label="label" /></span>
					</div>

					<!-- A vehicle has no characteristics to add to the damage. -->
					<WeaponProfileStats
						layout="inline"
						:profile="weaponProfile()"
						:characteristics="(actor.system as Partial<CharacterDataModel>).characteristics"
					/>

					<QualityList :qualities="weaponProfile().qualities" class="item-qualities" />
				</template>

				<template v-else-if="item.type === 'armor'">
					<div v-if="armorData().soak !== 0"><Localized label="Genesys.Labels.Soak" /> {{ signed(armorData().soak) }}</div>

					<div v-if="armorData().defense !== 0">
						<Localized label="Genesys.Labels.Defense" /> {{ signed(armorData().defense) }}
					</div>

					<QualityList :qualities="armorData().qualities" class="item-qualities" />
				</template>
			</div>
		</div>

		<Counter
			v-if="item.type !== 'container'"
			class="quantity"
			label="Genesys.Labels.Quantity"
			:value="item.system.quantity"
			@step="step('quantity', $event)"
			@type="setEquipmentQuantity(item, $event)"
			><i class="fas fa-suitcase"></i
		></Counter>

		<div class="weight" data-tooltip="Genesys.Labels.Encumbrance">
			{{ system.encumbrance < 0 ? '+' : null }}{{ Math.abs(system.encumbrance) }} <i class="fas fa-weight-hanging"></i>
		</div>

		<!-- A damage past Major destroys the item: the counter has no cap, and its owner asks before deleting it. -->
		<Counter
			class="damage"
			label="Genesys.Counter.Damage"
			:value="damageLevel(item.system.damage)"
			:value-label="EQUIPMENT_DAMAGE_LABELS[item.system.damage]"
			:can-type="false"
			@step="step('damage', $event)"
			><i :class="{ fas: true, [damageStateToIcon.get(item.system.damage)!]: true }"></i
		></Counter>

		<RowActions ref="menu" class="actions" :document="item" :actions="rowActions()" />
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';
@use '@scss/mixins/headings.scss';

// The details of a row that has some: its name, and below it what it is.
@mixin details {
	display: grid;
	grid-template-rows: auto auto;
	grid-column: name / span 2;
	font-family: 'Roboto Serif', serif;
}

.inventory-item {
	display: grid;
	grid-template-columns: [icon] 2rem [name] auto [spacer] 1fr [quantity] 2.5em [weight] 2.5em [damage] 8.5em [actions] auto;
	grid-template-rows: auto auto;
	align-items: center;
	column-gap: 0.5em;

	background: colors.alpha(colors.$light-blue, 0.15);
	border: 1px solid colors.alpha(colors.$light-blue, 0.3);
	border-radius: 0.25em;
	padding: 2px;

	user-select: none;
	// What a hover or a drag changes, and nothing else: a transition of every property would animate whatever a re-render
	// changes too (#516).
	transition:
		background-color 0.25s ease-in-out,
		border-color 0.25s ease-in-out,
		opacity 0.25s ease-in-out;

	margin-bottom: 0.25em;

	&:not(.mini) {
		&.hover {
			background: colors.alpha(colors.$light-blue, 0.6) !important;
			border: 1px solid colors.alpha(colors.$light-blue, 0.8) !important;
		}

		&.drag-source {
			background: colors.alpha(colors.$light-blue, 0.4) !important;
			border: 1px solid colors.alpha(colors.$light-blue, 0.6) !important;
		}

		&.dropped {
			background: colors.alpha(colors.$shadow, 0.1);
			border: 1px solid colors.alpha(colors.$shadow, 0.15);

			& > :not(.actions) {
				opacity: 65%;
			}

			&:hover {
				background: colors.alpha(colors.$shadow, 0.25);
				border: 1px solid colors.alpha(colors.$shadow, 0.5);
			}
		}

		// The edge a drop on the row lands next to.
		&.drop-before {
			box-shadow: 0 -3px 0 0 colors.$gold;
		}

		&.drop-after {
			box-shadow: 0 3px 0 0 colors.$gold;
		}

		&.drag-dim {
			position: relative;

			background: colors.alpha(colors.$shadow, 0.15);
			border: 1px solid colors.alpha(colors.$shadow, 0.3);

			opacity: 65%;
		}
	}

	&.mini {
		grid-template-columns: [icon] 1.5em [name] auto [spacer] 1fr [quantity] 2.5em [weight] 2.5em [damage] 8.5em [actions] auto;
		height: 2em;
		overflow: hidden;
		font-size: 0.8em;
		margin-left: 1.5em;

		background: colors.alpha(colors.$blue, 0.2);
		border: 1px solid colors.alpha(colors.$blue, 0.5);

		&:hover {
			background: colors.alpha(colors.$blue, 0.4);
			border: 1px solid colors.alpha(colors.$blue, 0.5);
		}

		.quantity,
		.weight {
			color: colors.$text-blue;
		}
	}

	&:hover {
		background: colors.alpha(colors.$light-blue, 0.25);
		border: 1px solid colors.alpha(colors.$light-blue, 0.5);
	}

	> .item-icon {
		grid-column: icon / span 1;
		display: block;

		.action-button {
			display: block;
			width: 100%;
		}

		:deep(img) {
			border-radius: 0.25em;
		}
	}

	& > .name {
		grid-column: name / span 1;
	}

	// Open, a Container shows all its contents: a cap of their own, with its own scrollbar, hid some and nested a scroll
	// inside the sheet's (#516). The fold, and the details that open it, are the roots of a `DescriptionFold`, which take no
	// scope attribute from the row: :deep() reaches them.
	& > :deep(.description-fold) {
		grid-column: icon / span all;
		grid-row: 2 / span all;
		padding-right: 0.5em;
	}

	& > :deep(.details) {
		@include details;

		// The count of the Container's contents, under its name.
		& > .description-toggle {
			grid-row: 2 / span 1;
			justify-self: start;
			font-size: 0.9em;
			color: colors.$dark-blue;
		}
	}

	.name {
		font-family: 'Roboto Serif', serif;
		font-size: 1.15em;
		display: flex;
		align-items: center;
		gap: 0.25em;
	}

	.details {
		@include details;

		& > div {
			grid-row: 2 / span 1;
			display: flex;
			flex-wrap: wrap;
			font-size: 0.9em;
			color: colors.$dark-blue;
			gap: 0.25em;
			margin-left: 0.5em;

			// The details, separated by semicolons. A Weapon Profile's stats are among them, the roots of a component with
			// several, which take no scope attribute from the row: :deep() reaches them.
			& > :deep(:is(div, span)) {
				&:after {
					display: inline;
					content: ';';
				}

				&:last-child:after {
					display: none;
				}
			}
		}

		.firing-arc {
			text-align: center;

			& > span {
				display: inline-flex;
				flex-direction: row;
				flex-wrap: nowrap;
				gap: 0.5em;

				&::after {
					content: ',';
					margin-right: 0.25em;
					margin-left: -0.4em;
				}

				&:last-of-type::after {
					display: none;
				}
			}
		}
	}

	// The commas of the qualities space them out on a line.
	.item-qualities {
		display: flex;
		flex-wrap: wrap;
		row-gap: 0.25em;
	}

	// The row's own cells: the damage of a weapon's stats, in its details, is not its damage state.
	> .weight,
	> .quantity,
	> .damage {
		grid-row: 1 / span 1;
		display: flex;
		align-items: center;
		column-gap: 0.25em;
		@include headings.font;
		font-size: 1.25em;
		text-align: center;
		color: colors.$dark-blue;
		width: 100%;
		justify-content: flex-end;

		i {
			position: relative;
			top: -1px;
			font-size: 0.75em;
		}
	}

	// A counter keeps to its content at the end of its column, so that its − and + sit beside its value.
	> .quantity,
	> .damage {
		width: auto;
		justify-self: end;
	}

	.weight {
		grid-column: weight / span 1;
	}

	.quantity {
		grid-column: quantity / span 1;
	}

	// The damage reads its name beside its icon, so that it doesn't rest on the icon alone.
	> .damage {
		grid-column: damage / span 1;
		font-size: 1.1em;
		white-space: nowrap;
	}

	.actions {
		grid-column: actions / span 1;
		width: 1.25em;
		text-align: center;
	}
}
</style>
