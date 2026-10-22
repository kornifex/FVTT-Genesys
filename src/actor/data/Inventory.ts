/** @file An actor's inventory: the drops it receives, and its Containers, whose contents share their Equipment State. */

import { AdversaryDataModel } from '@/actor/data/AdversaryDataModel';
import { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import { hasEquipmentState } from '@/actor/data/EquipmentEffects';
import { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { EquipmentState } from '@/item/data/EquipmentDataModel';

/**
 * What this module reads of a piece of equipment.
 */
export type InventoryItem = {
	id: string;
	type: string;
	sort: number;
	system: { state: EquipmentState; container: string };
};

/**
 * The actor receiving a drop.
 */
type Receiver = {
	uuid: string;
	type: string;
	items: InventoryItem[];
};

/**
 * Where a dropped item lands: in a section, after the item at index `after` of the section (-1 for the top), into a
 * Container, or anywhere else on the sheet.
 */
export type DropTarget = { kind: 'section'; state: EquipmentState; after: number } | { kind: 'container'; id: string } | { kind: 'sheet' };

/**
 * An item dropped on an inventory.
 */
type Drop = {
	item: InventoryItem;
	/**
	 * The actor holding the item, unless it comes from a compendium or the sidebar.
	 */
	from?: Holder;
	at: DropTarget;
};

/**
 * The actor a dropped item comes from.
 */
type Holder = {
	uuid: string;
	isOwner: boolean;
	items: InventoryItem[];
};

/**
 * An item created on the receiver from the source item `sourceId`.
 */
type CreatedItem = {
	sourceId: string;
	_id: string;
	sort: number;
	system: { state: EquipmentState; container: string };
};

/**
 * A change to an item of the receiver.
 */
type ItemUpdate = { _id: string; sort?: number; system?: { state: EquipmentState; container?: string } };

/**
 * What a drop does: refused, or the items it creates and updates on the receiver and deletes from the actor it comes from.
 */
type DropDecision = { action: 'refuse' } | { action: 'copy' | 'move'; create: CreatedItem[]; update: ItemUpdate[]; delete: string[] };

/**
 * The item types an actor type keeps in its inventory, and those of them it can equip.
 */
type InventoryTypes = {
	isInventory(type: string): boolean;
	isEquipable(type: string): boolean;
};

const ADVERSARY_INVENTORY_TYPES: InventoryTypes = {
	isInventory: (type) => AdversaryDataModel.isRelevantTypeForContext('INVENTORY', type),
	isEquipable: () => false,
};

const INVENTORY_TYPES_BY_ACTOR_TYPE: Partial<Record<string, InventoryTypes>> = {
	character: {
		isInventory: (type) => CharacterDataModel.isRelevantTypeForContext('INVENTORY', type),
		isEquipable: (type) => CharacterDataModel.isRelevantTypeForContext('EQUIPABLE', type),
	},
	vehicle: {
		isInventory: (type) => VehicleDataModel.isRelevantTypeForContext('INVENTORY', type),
		isEquipable: (type) => VehicleDataModel.isRelevantTypeForContext('EQUIPABLE', type),
	},
	minion: ADVERSARY_INVENTORY_TYPES,
	rival: ADVERSARY_INVENTORY_TYPES,
	nemesis: ADVERSARY_INVENTORY_TYPES,
};

// The gap Foundry leaves between the sort values of neighbouring documents.
const SORT_DENSITY = 100000;

/**
 * Whether an actor of this type keeps items of this type in its inventory.
 */
export function isInventoryType(actorType: string, itemType: string) {
	return INVENTORY_TYPES_BY_ACTOR_TYPE[actorType]?.isInventory(itemType) ?? false;
}

/**
 * The items of an inventory section: those in an Equipment State and in no Container, in sort order.
 */
export function sectionItems<T extends InventoryItem>(items: T[], state: EquipmentState) {
	return items
		.filter((item) => item.system.state === state && item.system.container === '')
		.sort((left, right) => left.sort - right.sort);
}

/**
 * The contents of a Container, in item order.
 */
export function containerContents<T extends InventoryItem>(items: T[], containerId: string) {
	return items.filter((item) => item.system.container === containerId);
}

/**
 * The items a Container holds, directly or in the Containers it holds, which older data may have. Each comes once, after
 * the Container holding it, even when Containers hold each other.
 */
function heldItems<T extends InventoryItem>(items: T[], containerId: string, visited = new Set([containerId])): T[] {
	return containerContents(items, containerId).flatMap((content) => {
		if (visited.has(content.id)) {
			return [];
		}

		visited.add(content.id);
		return [content, ...heldItems(items, content.id, visited)];
	});
}

/**
 * The updates that give the Equipment State of a Container to all it holds, for the Containers among the changed items,
 * and to the changed items held in a Container.
 */
export function containerStateUpdates(items: InventoryItem[], changedIds: string[]): ItemUpdate[] {
	const states = new Map<string, EquipmentState>();
	for (const changed of items.filter((item) => changedIds.includes(item.id))) {
		if (changed.type === 'container') {
			for (const held of heldItems(items, changed.id)) {
				states.set(held.id, changed.system.state);
			}
		}

		const container = items.find((item) => item.type === 'container' && item.id === changed.system.container);
		if (container && !states.has(changed.id)) {
			states.set(changed.id, container.system.state);
		}
	}

	return items.flatMap((item) => {
		const state = states.get(item.id);
		return state && state !== item.system.state ? [{ _id: item.id, system: { state } }] : [];
	});
}

/**
 * The ids of the items left behind by deleted Containers, which are deleted with them.
 */
export function heldByDeletedContainers(items: InventoryItem[], deletedIds: string[]) {
	const visited = new Set(deletedIds);
	return deletedIds.flatMap((id) => heldItems(items, id, visited)).map((held) => held.id);
}

/**
 * The sort value of an item placed in a section, after the item at index `after` of the section or at its end, and the
 * sort updates of the section's other items.
 */
function sortInSection(section: InventoryItem[], item: InventoryItem, after?: number) {
	if (after === undefined) {
		return { sort: (section.at(-1)?.sort ?? 0) + SORT_DENSITY, update: [] };
	}

	// The section is sorted again from scratch, which keeps the gaps between items even.
	const sorted = section.filter((sectionItem) => sectionItem.id !== item.id);
	const index = section.slice(0, after + 1).filter((sectionItem) => sectionItem.id !== item.id).length;
	sorted.splice(index, 0, item);

	const update: ItemUpdate[] = [];
	for (const [position, sectionItem] of sorted.entries()) {
		const sort = (position + 1) * SORT_DENSITY;
		if (sectionItem !== item && sectionItem.sort !== sort) {
			update.push({ _id: sectionItem.id, sort });
		}
	}

	return { sort: (index + 1) * SORT_DENSITY, update };
}

/**
 * Where a dropped item lands on the receiver, and the sort updates of its new neighbours. Undefined when it can't land
 * there.
 */
function placement(receiver: Receiver, types: InventoryTypes, item: InventoryItem, at: DropTarget) {
	// Adversaries and minions have no Equipment State: their equipment stays Carried.
	const hasState = hasEquipmentState(receiver.type, item.type);
	if (at.kind === 'container') {
		const container = receiver.items.find((receiverItem) => receiverItem.id === at.id);
		if (container?.type !== 'container' || item.type === 'container') {
			return undefined;
		}

		const state = hasState ? container.system.state : EquipmentState.Carried;
		return { state, container: container.id, sort: item.sort, update: [] };
	}

	const state = at.kind === 'section' && hasState ? at.state : EquipmentState.Carried;
	if (state === EquipmentState.Equipped && !types.isEquipable(item.type)) {
		return undefined;
	}

	const sorting = sortInSection(sectionItems(receiver.items, state), item, at.kind === 'section' ? at.after : undefined);
	return { state, container: '', ...sorting };
}

/**
 * Whether a drop leaves an item of the receiver where it is: elsewhere on the sheet, into its own Container, or on a slot
 * next to itself.
 */
function staysInPlace(receiver: Receiver, item: InventoryItem, at: DropTarget) {
	switch (at.kind) {
		case 'sheet':
			return true;
		case 'container':
			return item.system.container === at.id;
		case 'section': {
			const position = sectionItems(receiver.items, at.state).findIndex((sectionItem) => sectionItem.id === item.id);
			return position >= 0 && (at.after === position - 1 || at.after === position);
		}
	}
}

/**
 * Decide what dropping an item on an actor's inventory does. `newId` gives the id of each created item.
 */
export function decideDrop(receiver: Receiver, { item, from, at }: Drop, newId: () => string): DropDecision {
	const types = INVENTORY_TYPES_BY_ACTOR_TYPE[receiver.type];
	if (!types?.isInventory(item.type) || (from && !from.isOwner)) {
		return { action: 'refuse' };
	}

	// A Container's contents go wherever it goes. One copied from a compendium or the sidebar holds nothing.
	const contents = from && item.type === 'container' ? heldItems(from.items, item.id) : [];
	const place = placement(receiver, types, item, at);
	if (!place || !contents.every((content) => types.isInventory(content.type))) {
		return { action: 'refuse' };
	}

	const { state, container, sort, update } = place;
	if (from?.uuid === receiver.uuid) {
		if (staysInPlace(receiver, item, at)) {
			return { action: 'move', create: [], update: [], delete: [] };
		}

		const contentUpdates = contents
			.filter((content) => content.system.state !== state)
			.map((content) => ({ _id: content.id, system: { state } }));
		return {
			action: 'move',
			create: [],
			update: [{ _id: item.id, sort, system: { state, container } }, ...update, ...contentUpdates],
			delete: [],
		};
	}

	// The created Containers get new ids, which their contents must hold.
	const createdIds = new Map([item, ...contents].map((created) => [created.id, newId()]));
	const createdId = (id: string) => createdIds.get(id) ?? '';
	const create = [
		{ sourceId: item.id, _id: createdId(item.id), sort, system: { state, container } },
		...contents.map((content) => ({
			sourceId: content.id,
			_id: createdId(content.id),
			sort: content.sort,
			system: { state, container: createdId(content.system.container) },
		})),
	];

	return {
		action: from ? 'move' : 'copy',
		create,
		update,
		delete: from ? [item, ...contents].map((moved) => moved.id) : [],
	};
}
