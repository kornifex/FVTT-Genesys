/**
 * @file Encumbrance of a character's or vehicle's equipment, including the equipment held in containers, and a character's threshold.
 */

import type { EquipmentDataModel, EquipmentState } from '@/item/data/EquipmentDataModel';
import type { GenesysItem } from '@/item/GenesysItem';

export type HeldContainer = {
	/**
	 * The id of the container this one is held in, or an empty string.
	 */
	container: string;
};

/**
 * What this module reads of an item. The Equipment State is read as its value so that this module doesn't load the
 * DataModel, a Foundry class.
 */
export type EncumberingItem = HeldContainer & {
	id: string;
	type: string;
	encumbrance: number;
	quantity: number;
	state: `${EquipmentState}`;
};

/**
 * The encumbrance rules of an actor type.
 */
export type EncumbranceRules = {
	/**
	 * Whether items of a type count towards encumbrance.
	 */
	isRelevant: (type: string) => boolean;
	/**
	 * Whether Dropped equipment, and the contents of a Dropped container, count towards neither the value nor the threshold.
	 */
	ignoresDropped: boolean;
	/**
	 * Whether an Equipped armor counts 3 less, for one of its quantity.
	 */
	reducesEquippedArmor: boolean;
};

/**
 * The outermost container holding a container, the container itself if it isn't held in another one. Undefined when
 * a container it is held in is missing or the containers hold each other.
 */
export function rootContainer<T extends HeldContainer>(containerId: string, getContainer: (id: string) => T | undefined): T | undefined {
	const visited = new Set<string>();
	let id = containerId;
	let container = getContainer(id);

	while (container && container.container !== '') {
		visited.add(id);
		id = container.container;
		if (visited.has(id)) {
			return undefined;
		}

		container = getContainer(id);
	}

	return container;
}

/**
 * The encumbrance an item that doesn't have a negative encumbrance adds to the value.
 */
function addedValue(item: EncumberingItem, rules: EncumbranceRules) {
	// When armor is worn, its encumbrance is reduced by 3, to a minimum of 0. Only one of a stack can be worn.
	if (rules.reducesEquippedArmor && item.type === 'armor' && item.state === 'equipped') {
		return Math.max(0, item.encumbrance - 3) + Math.max(0, item.encumbrance * (item.quantity - 1));
	}

	return item.encumbrance * item.quantity;
}

/**
 * What equipment adds to the encumbrance value, and what its negative encumbrance adds to the threshold.
 */
type EquipmentEncumbrance = {
	value: number;
	thresholdBonus: number;
};

/**
 * The encumbrance value of a list of items, and the bonus their negative encumbrance gives to the threshold.
 */
export function equipmentEncumbrance(items: EncumberingItem[], rules: EncumbranceRules): EquipmentEncumbrance {
	const byId = new Map(items.map((item) => [item.id, item]));

	// The contents of a container share its Equipment State, so they are Dropped when its outermost container is.
	const isDropped = (item: EncumberingItem) =>
		item.state === 'dropped' || (item.container !== '' && rootContainer(item.container, (id) => byId.get(id))?.state === 'dropped');

	return items
		.filter((item) => rules.isRelevant(item.type) && !(rules.ignoresDropped && isDropped(item)))
		.reduce(
			(total, item) => {
				// Negative encumbrance raises the threshold instead of lowering the value.
				if (item.encumbrance < 0) {
					return { value: total.value, thresholdBonus: total.thresholdBonus - item.encumbrance * item.quantity };
				}

				return { value: total.value + addedValue(item, rules), thresholdBonus: total.thresholdBonus };
			},
			{ value: 0, thresholdBonus: 0 },
		);
}

/**
 * An encumbrance value against its threshold.
 */
export type Encumbrance = {
	value: number;
	threshold: number;
};

/**
 * A character's encumbrance: their equipment's value, and a threshold of 5 plus their Brawn raised by the negative
 * encumbrance of their equipment. `own` is what their effects add to the value and the threshold.
 */
export function characterEncumbrance(equipment: EquipmentEncumbrance, own: Encumbrance, brawn: number): Encumbrance {
	return {
		value: Math.max(0, equipment.value + own.value),
		threshold: 5 + brawn + own.threshold + equipment.thresholdBonus,
	};
}

/**
 * Whether an encumbrance value is over its threshold.
 */
export function isEncumbered({ value, threshold }: Encumbrance) {
	return value > threshold;
}

/**
 * What this module reads of an actor's items. The fields of an item that isn't equipment are left undefined, and the
 * item is ignored as its type isn't relevant to encumbrance.
 */
export function encumberingItems(items: Iterable<Item>): EncumberingItem[] {
	return Array.from(items, (item) => {
		const { encumbrance, quantity, state, container } = (<GenesysItem<EquipmentDataModel>>(<unknown>item)).systemData;
		return { id: item.id, type: item.type, encumbrance, quantity, state, container };
	});
}
