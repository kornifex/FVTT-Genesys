<script lang="ts" setup>
import { computed, inject, ref, toRaw } from 'vue';
import { ActorSheetContext, RootContext } from '@/vue/SheetContext';

import { GenesysItem } from '@/item/GenesysItem';
import { ArmorDataModel } from '@/item/data/ArmorDataModel';
import { EquipmentDataModel, EquipmentDamageState, EquipmentState } from '@/item/data/EquipmentDataModel';
import { damageStep } from '@/item/data/EquipmentDamage';
import { BaseWeaponDataModel } from '@/item/data/BaseWeaponDataModel';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';
import { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { constructDragTransferTypeFromData, DragTransferData, extractDataFromDragTransferTypes } from '@/data/DragTransferData';
import { containerContents, equipmentStateUpdates } from '@/actor/data/Inventory';
import { receiveInventoryEvent } from '@/operations/InventoryDrop';

import Localized from '@/vue/components/Localized.vue';
import QualityList from '@/vue/components/QualityList.vue';
import ContextMenu from '@/vue/components/ContextMenu.vue';
import MenuItem from '@/vue/components/MenuItem.vue';
import { DicePrompt, RollType } from '@/app/DicePrompt';
import { attackSkillName } from '@/data/Skills';
import { postChatCard } from '@/item/ChatCards';
import { damageFormula, firingArcLabels, weaponDamage } from '@/item/Weapons';

const props = withDefaults(
	defineProps<{
		item: GenesysItem<EquipmentDataModel>;
		dragging?: boolean;
		mini?: boolean;
		allowEquippedState?: boolean;
		allowDroppedState?: boolean;
		canTypeBeInsideContainer?: (type: string) => boolean;
	}>(),
	{
		dragging: false,
		mini: false,
		allowEquippedState: true,
		allowDroppedState: true,
		canTypeBeInsideContainer: () => false,
	},
);

const emit = defineEmits<{
	(e: 'dragstart', event: DragEvent): void;
	(e: 'dragend', event: DragEvent): void;
}>();

const damageStateToIcon = new Map([
	[EquipmentDamageState.Undamaged, 'fa-face-smile-beam'],
	[EquipmentDamageState.Minor, 'fa-face-meh'],
	[EquipmentDamageState.Moderate, 'fa-face-frown'],
	[EquipmentDamageState.Major, 'fa-face-dizzy'],
]);

const dragCounter = ref(0);
const isBeingDragged = ref(false);

const context = inject<ActorSheetContext<CharacterDataModel | VehicleDataModel>>(RootContext)!;

const isBasicItem = computed(() => ['consumable', 'gear'].includes(props.item.type));

// Foundry updates the item out of Vue's sight, so a computed reading it would lag behind: the row reads the item's data
// on each render of the sheet instead, which replaces the context.
function system() {
	return toRaw(props.item).systemData;
}

function armorData() {
	return system() as ArmorDataModel;
}

function weaponData() {
	return {
		baseWeapon: system() as BaseWeaponDataModel,
		charWeapon: system() as WeaponDataModel,
		vehWeapon: system() as VehicleWeaponDataModel,
	};
}

const dimForDrag = computed(() => props.dragging && props.item.type !== 'container');

const displayContainerContents = ref(false);
const containedItems = computed(() =>
	containerContents(toRaw(context.data.actor).items.contents as GenesysItem<EquipmentDataModel>[], props.item.id),
);

function damage() {
	const weapon = weaponData().charWeapon;
	return {
		...damageFormula(weapon),
		// A vehicle has no characteristics to add to the damage.
		total: weaponDamage(weapon, (context.data.actor.systemData as Partial<CharacterDataModel>).characteristics),
	};
}

async function rollAttack() {
	const skillName = skillForWeapon();
	if (!skillName) {
		return;
	}

	await DicePrompt.promptForRoll(toRaw(context.data.actor), skillName, {
		rollType: RollType.Attack,
		rollData: {
			// An item with a skill to attack with is a weapon.
			weapon: props.item as GenesysItem<WeaponDataModel | VehicleWeaponDataModel>,
		},
	});
}

async function openItem() {
	await toRaw(props.item).sheet?.render(true);
}

async function deleteItem() {
	// A Container's contents are deleted with it.
	await toRaw(props.item).delete();
}

async function sendItemToChat() {
	await postChatCard(toRaw(props.item), toRaw(context.data.actor));
}

async function setItemState(state: EquipmentState) {
	// A Container's contents take its new state with it, and an armor put on takes off the one worn before.
	const actor = toRaw(context.data.actor);
	await actor.updateEmbeddedDocuments('Item', equipmentStateUpdates(actor.items.contents, props.item.id, state));
}

function skillForWeapon() {
	return attackSkillName(toRaw(context.data.actor).skills, weaponData().charWeapon);
}

function isEquipableItem(item: GenesysItem<EquipmentDataModel>) {
	return (context.data.actor.systemData.constructor as typeof VehicleDataModel | typeof CharacterDataModel).isRelevantTypeForContext(
		'EQUIPABLE',
		item.type,
	);
}

function canEquipItem(item: GenesysItem<EquipmentDataModel>) {
	return isEquipableItem(item) && item.systemData.state !== EquipmentState.Equipped;
}

function canUnequipItem(item: GenesysItem<EquipmentDataModel>) {
	return isEquipableItem(item) && item.systemData.state === EquipmentState.Equipped;
}

function canDropItem(item: GenesysItem<EquipmentDataModel>) {
	return context.data.actor.type === 'character' && [EquipmentState.Carried, EquipmentState.Equipped].includes(item.systemData.state);
}

function canPickupItem(item: GenesysItem<EquipmentDataModel>) {
	return context.data.actor.type === 'character' && item.systemData.state === EquipmentState.Dropped;
}

function dragStart(event: DragEvent) {
	isBeingDragged.value = true;
	const transferData: DragTransferData = {
		uuid: props.item.uuid,
		type: props.item.documentName,
		genesysType: props.item.type,
	};
	const genesysTransferType = constructDragTransferTypeFromData(props.item.type, props.item.uuid);

	event.dataTransfer?.setData('text/plain', JSON.stringify(transferData));
	event.dataTransfer?.setData(genesysTransferType, '');

	emit('dragstart', event);
}

function dragEnd(event: DragEvent) {
	isBeingDragged.value = false;

	emit('dragend', event);
}

function dragEnter(event: DragEvent) {
	// Only containers should be highlighted on hover.
	if (props.item.type !== 'container') {
		return;
	}

	const dragDataFromType = extractDataFromDragTransferTypes(event.dataTransfer?.types);
	if (!dragDataFromType || (dragDataFromType.genesysType && !props.canTypeBeInsideContainer(dragDataFromType.genesysType))) {
		return;
	}

	dragCounter.value += 1;
}

function dragLeave() {
	dragCounter.value = Math.max(0, dragCounter.value - 1);
}

async function changeItemQuantity(event: MouseEvent, item: GenesysItem<EquipmentDataModel>, direction: number) {
	const newQuantity = item.systemData.quantity + direction;
	const containerDiv = (event.currentTarget as HTMLAnchorElement | null)?.parentElement?.parentElement;
	let containerScroll = containerDiv?.scrollTop;

	if (newQuantity <= 0) {
		const shouldDeleteItem = await Dialog.confirm({
			title: game.i18n.localize('Genesys.Dialogs.ConfirmDeleteItem.Title'),
			content: game.i18n.localize('Genesys.Dialogs.ConfirmDeleteItem.Content'),
			yes: () => true,
			no: () => false,
			defaultYes: false,
		});

		// Make sure we have the latest for this value since it's possible that it has changed while we waited.
		containerScroll = containerDiv?.scrollTop;

		if (shouldDeleteItem) {
			await toRaw(item).delete();
		}
	} else {
		await toRaw(item).update({
			'system.quantity': newQuantity,
		});
	}

	if (containerDiv && containerScroll !== undefined) {
		containerDiv.scrollTop = containerScroll;
	}
}

async function changeDamageState(event: MouseEvent, item: GenesysItem<EquipmentDataModel>, direction: 1 | -1) {
	const newDamage = damageStep(item.systemData.damage, direction);
	const containerDiv = (event.currentTarget as HTMLAnchorElement | null)?.parentElement?.parentElement;
	let containerScroll = containerDiv?.scrollTop;

	if (!newDamage) {
		return;
	} else if (newDamage === 'destroyed') {
		const shouldDeleteItem = await Dialog.confirm({
			title: game.i18n.localize('Genesys.Dialogs.ConfirmDeleteItem.Title'),
			content: game.i18n.localize('Genesys.Dialogs.ConfirmDeleteItem.Content'),
			yes: () => true,
			no: () => false,
			defaultYes: false,
		});

		// Make sure we have the latest for this value since it's possible that it has changed while we waited.
		containerScroll = containerDiv?.scrollTop;

		if (shouldDeleteItem) {
			await toRaw(item).delete();
		}
	} else {
		await toRaw(item).update({
			'system.damage': newDamage,
		});
	}

	if (containerDiv && containerScroll !== undefined) {
		containerDiv.scrollTop = containerScroll;
	}
}

async function dropInventoryIntoContainer(event: DragEvent) {
	dragCounter.value = 0;

	// Only a Container receives drops: those on other items go on to the sheet.
	if (props.item.type === 'container') {
		await receiveInventoryEvent(toRaw(context.data.actor), event, { kind: 'container', id: props.item.id });
	}
}
</script>

<template>
	<div
		:class="{
			'inventory-item': true,
			mini: props.mini,
			[system().state]: true,
			hover: dragCounter > 0,
			'drag-dim': dimForDrag && !isBeingDragged,
			'drag-source': isBeingDragged,
		}"
		@dragenter="dragEnter"
		@dragleave="dragLeave"
		@dragstart="dragStart"
		@dragend="dragEnd"
		@drop="dropInventoryIntoContainer"
	>
		<img :src="item.img" :alt="item.name" />

		<!-- Basic, single-row item -->
		<span v-if="mini || isBasicItem" class="name" @dragenter="dragEnter" @dragleave="dragLeave">
			<a @click="openItem">{{ item.name }}</a>
		</span>
		<!-- Complex item with additional details row -->
		<div v-else class="details" @dragenter="dragEnter" @dragleave="dragLeave">
			<span class="name">
				<a @click="openItem">{{ item.name }}</a>
				<button
					class="attack"
					v-if="item.type === 'weapon' && system().state === EquipmentState.Equipped && skillForWeapon()"
					@click="rollAttack"
				>
					<Localized label="Genesys.Labels.Attack" />
				</button>
			</span>

			<div :data-item-type="item.type">
				<!-- Weapon Details -->
				<template v-if="item.type === 'weapon' || item.type === 'vehicleWeapon'">
					<!-- Skill -->
					<div>{{ (item.type === 'weapon' ? skillForWeapon() : weaponData().baseWeapon.skills[0]) ?? '-' }}</div>

					<!-- Firing Arc -->
					<!-- prettier-ignore -->
					<div v-if="weaponData().vehWeapon.firingArc" class="firing-arc">
						<Localized label="Genesys.Labels.FiringArc" /> <span v-for="label in firingArcLabels(weaponData().vehWeapon.firingArc)" :key="label"><Localized :label="label" /></span>
					</div>

					<!-- Damage -->
					<!-- prettier-ignore -->
					<div>
						<Localized label="Genesys.Labels.Damage" /> <span v-if="!damage().characteristic">{{ damage().baseDamage }}</span>
						<span v-else-if="damage().baseDamage >= 0">
							<Localized :label="damage().characteristic!" />+{{ damage().baseDamage }} ({{ damage().total }})</span
						>
						<span v-else><Localized :label="damage().characteristic!" />{{ damage().baseDamage }} ({{ damage().total }})</span>
					</div>

					<!-- Critical -->
					<div><Localized label="Genesys.Labels.Critical" /> {{ weaponData().baseWeapon.critical }}</div>

					<!-- Range -->
					<!-- prettier-ignore -->
					<div><Localized label="Genesys.Labels.Range" /> [<Localized :label="`Genesys.Range.${weaponData().baseWeapon.range.capitalize()}`" />]</div>

					<!-- Qualities -->
					<QualityList :qualities="weaponData().baseWeapon.qualities" class="item-qualities" />
				</template>

				<!-- Armor Details -->
				<template v-else-if="item.type === 'armor'">
					<!-- Soak -->
					<div v-if="armorData().soak > 0"><Localized label="Genesys.Labels.Soak" /> +{{ armorData().soak }}</div>
					<div v-else-if="armorData().soak < 0"><Localized label="Genesys.Labels.Soak" /> {{ armorData().soak }}</div>

					<!-- Defense -->
					<div v-if="armorData().defense > 0"><Localized label="Genesys.Labels.Defense" /> +{{ armorData().defense }}</div>
					<div v-else-if="armorData().defense < 0"><Localized label="Genesys.Labels.Defense" /> {{ armorData().defense }}</div>

					<!-- Qualities -->
					<QualityList :qualities="armorData().qualities" class="item-qualities" />
				</template>

				<!-- Container Details -->
				<template v-else-if="item.type === 'container'">
					<a v-if="displayContainerContents" @click="displayContainerContents = false"
						><i class="fas fa-box-open"></i> <Localized label="Genesys.Labels.CloseContainer"
					/></a>
					<a v-else @click="displayContainerContents = true">
						<i class="fas fa-box"></i>
						{{ containedItems.length }}
						<Localized label="Genesys.Labels.Items" v-if="containedItems.length !== 1" />
						<Localized label="Genesys.Labels.Item" v-else />
					</a>
				</template>
			</div>
		</div>

		<a
			v-if="item.type !== 'container'"
			class="quantity"
			@click="changeItemQuantity($event, item, +1)"
			@contextmenu="changeItemQuantity($event, item, -1)"
			data-tooltip="Genesys.Labels.Quantity"
		>
			{{ item.systemData.quantity }}
			<i class="fas fa-suitcase"></i>
		</a>

		<div class="weight" data-tooltip="Genesys.Labels.Encumbrance">
			{{ system().encumbrance < 0 ? '+' : null }}{{ Math.abs(system().encumbrance) }} <i class="fas fa-weight-hanging"></i>
		</div>

		<a
			class="damage"
			@click="changeDamageState($event, item, 1)"
			@contextmenu="changeDamageState($event, item, -1)"
			:data-tooltip="'Genesys.Equipment.DamageState.' + item.systemData.damage.capitalize()"
		>
			<i :class="{ fas: true, [damageStateToIcon.get(item.systemData.damage)!]: true }"></i>
		</a>

		<ContextMenu class="actions" orientation="left" use-primary-click :disable-menu="!context.data.editable || mini">
			<template v-slot:menu-items>
				<MenuItem
					v-if="allowEquippedState && ['weapon', 'vehicleWeapon'].includes(item.type) && canEquipItem(item)"
					@click="setItemState(EquipmentState.Equipped)"
				>
					<template v-slot:icon><i class="fas fa-hand-fist"></i></template>
					<Localized label="Genesys.Equipment.Dropdown.Equip" />
				</MenuItem>

				<MenuItem
					v-if="allowEquippedState && item.type === 'armor' && canEquipItem(item)"
					@click="setItemState(EquipmentState.Equipped)"
				>
					<template v-slot:icon><i class="fas fa-shield"></i></template>
					<Localized label="Genesys.Equipment.Dropdown.Equip" />
				</MenuItem>

				<MenuItem v-if="allowEquippedState && canUnequipItem(item)" @click="setItemState(EquipmentState.Carried)">
					<template v-slot:icon><i class="fas fa-suitcase"></i></template>
					<Localized label="Genesys.Equipment.Dropdown.Unequip" />
				</MenuItem>

				<MenuItem v-if="allowDroppedState && canDropItem(item)" @click="setItemState(EquipmentState.Dropped)">
					<template v-slot:icon><i class="fas fa-box-archive"></i></template>
					<Localized label="Genesys.Equipment.Dropdown.Drop" />
				</MenuItem>

				<MenuItem v-if="allowDroppedState && canPickupItem(item)" @click="setItemState(EquipmentState.Carried)">
					<template v-slot:icon><i class="fas fa-suitcase"></i></template>
					<Localized label="Genesys.Equipment.Dropdown.PickUp" />
				</MenuItem>

				<hr v-if="(allowEquippedState && isEquipableItem(item)) || allowDroppedState" />

				<MenuItem @click="sendItemToChat">
					<template v-slot:icon><i class="fas fa-comment"></i></template>
					<Localized label="Genesys.Equipment.Dropdown.ToChat" />
				</MenuItem>

				<MenuItem @click="openItem">
					<template v-slot:icon><i class="fas fa-edit"></i></template>
					<Localized label="Genesys.Equipment.Dropdown.Edit" />
				</MenuItem>

				<MenuItem @click="deleteItem">
					<template v-slot:icon><i class="fas fa-trash"></i></template>
					<Localized label="Genesys.Equipment.Dropdown.Delete" />
				</MenuItem>
			</template>

			<a>
				<i class="fas fa-ellipsis-vertical"></i>
			</a>
		</ContextMenu>

		<Transition name="container-contents">
			<div v-if="displayContainerContents" class="contents">
				<InventoryItem
					v-for="item in containedItems"
					:item="item"
					:key="item.id"
					mini
					draggable="true"
					:allow-equipped-state="allowEquippedState"
					:allow-dropped-state="allowDroppedState"
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
		</Transition>
	</div>
</template>

<style lang="scss" scoped>
@use 'sass:color';
@use '@scss/vars/colors.scss';

.inventory-item {
	display: grid;
	grid-template-columns: [icon] 2rem [name] auto [spacer] 1fr [quantity] 2.5em [weight] 2.5em [damage] 2em [actions] auto;
	grid-template-rows: auto auto;
	align-items: center;
	column-gap: 0.5em;

	background: colors.alpha(colors.$light-blue, 0.15);
	border: 1px solid colors.alpha(colors.$light-blue, 0.3);
	border-radius: 0.25em;
	padding: 2px;

	user-select: none;
	transition: all 0.25s ease-in-out;

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
			background: color.adjust(#333, $alpha: -0.9);
			border: 1px solid color.adjust(#333, $alpha: -0.85);

			& > :not(.actions) {
				opacity: 65%;
			}

			&:hover {
				background: color.adjust(#333, $alpha: -0.75);
				border: 1px solid color.adjust(#333, $alpha: -0.5);
			}
		}

		&.drag-dim {
			position: relative;

			background: color.adjust(#333, $alpha: -0.85);
			border: 1px solid color.adjust(#333, $alpha: -0.7);

			opacity: 65%;
		}
	}

	&.mini {
		grid-template-columns: [icon] 1.5em [name] auto [spacer] 1fr [quantity] 2.5em [weight] 2.5em [damage] 2em [actions] auto;
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
			color: colors.$blue;
		}
	}

	&:hover {
		background: colors.alpha(colors.$light-blue, 0.25);
		border: 1px solid colors.alpha(colors.$light-blue, 0.5);
	}

	img {
		grid-column: icon / span 1;
		border-radius: 0.25em;
	}

	& > .name {
		grid-column: name / span 1;
	}

	.contents {
		grid-column: icon / span all;
		grid-row: 2 / span all;
		transform-origin: top center;
		max-height: 100px;
		overflow-y: auto;
		padding-right: 0.5em;

		&:empty {
			display: none;
		}
	}

	.name {
		font-family: 'Roboto Serif', serif;
		font-size: 1.15em;
		display: flex;
		align-items: center;
		gap: 0.25em;

		button.attack {
			height: 1.5em;
			padding: 0;
			margin: 0;
			width: auto !important;
			line-height: 1em;
			padding: 2px;

			background: colors.$gold;
			color: white;
		}
	}

	.details {
		display: grid;
		grid-template-rows: auto auto;
		grid-column: name / span 2;
		font-family: 'Roboto Serif', serif;

		& > div {
			grid-row: 2 / span 1;
			display: flex;
			flex-wrap: wrap;
			font-size: 0.9em;
			color: colors.$dark-blue;
			gap: 0.25em;

			&:not([data-item-type='container']) {
				margin-left: 0.5em;
			}

			& > div {
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

	.weight,
	.quantity,
	.damage {
		grid-row: 1 / span 1;
		display: flex;
		align-items: center;
		column-gap: 0.25em;
		font-family: 'Bebas Neue', sans-serif;
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

	.weight {
		grid-column: weight / span 1;
	}

	.quantity {
		grid-column: quantity / span 1;
	}

	.damage {
		grid-column: damage / span 1;
		font-size: 1.5em;
	}

	.actions {
		grid-column: actions / span 1;
		width: 1.25em;
		text-align: center;
	}
}

.container-contents-enter-active {
	animation: expand 0.5s;
}

.container-contents-leave-active {
	animation: expand 0.5s reverse;
}

@keyframes expand {
	0% {
		transform: scaleY(0);
		max-height: 0;
	}
	100% {
		transform: scaleY(1);
		max-height: 100px;
	}
}
</style>
