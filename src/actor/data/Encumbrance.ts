/**
 * @file Encumbrance of a character's or vehicle's equipment, including the equipment held in containers, and a character's threshold.
 */

import { EquipmentState } from '@/item/data/EquipmentState';
import type { GenesysItem } from '@/item/GenesysItem';
import type { EquipmentType } from '@/item/ItemTypes';

/**
 * How much less a worn armor's encumbrance counts, to a minimum of 0 (CRB p. 84, 92).
 */
const WORN_ARMOR_ENCUMBRANCE_REDUCTION = 3;

/**
 * A character's encumbrance threshold before their Brawn is added (CRB p. 85).
 */
const BASE_ENCUMBRANCE_THRESHOLD = 5;

/**
 * What this module reads of an item to tell the Container it is held in.
 */
export type HeldContainer = {
	/**
	 * The id of the container this one is held in, or an empty string.
	 */
	container: string;
};

/**
 * What this module reads of an item.
 */
export type EncumberingItem = HeldContainer & {
	id: string;
	type: string;
	encumbrance: number;
	quantity: number;
	state: EquipmentState;
	/**
	 * Whether the item is Wearable Gear. Only gear can be.
	 */
	wearable: boolean;
	/**
	 * The encumbrance Wearable Gear counts for one of its quantity while it is worn, or null when it counts its encumbrance.
	 */
	wornEncumbrance: number | null;
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
	 * Whether the actor wears the equipment it equips, so that an Equipped armor counts 3 less, for one of its quantity.
	 */
	wearsEquipment: boolean;
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
 * The encumbrance a worn item counts instead of its own: an Equipped armor's, 3 less to a minimum of 0, and Worn Gear's
 * worn encumbrance. Undefined when the item isn't worn, or counts its own encumbrance while worn.
 */
function wornEncumbrance(item: EncumberingItem) {
	if (item.state !== EquipmentState.Equipped) {
		return undefined;
	}

	// An armor's negative encumbrance raises the threshold by all of it, worn or not.
	if (item.type === 'armor' && item.encumbrance >= 0) {
		return Math.max(0, item.encumbrance - WORN_ARMOR_ENCUMBRANCE_REDUCTION);
	}

	// Wearable Gear in a Container isn't worn, whatever its state.
	return item.wearable && item.container === '' ? item.wornEncumbrance ?? undefined : undefined;
}

/**
 * The encumbrance the items of a stack count, in groups of items that count the same: only one of a stack is worn.
 */
function stackEncumbrance(item: EncumberingItem, rules: EncumbranceRules) {
	const worn = rules.wearsEquipment && item.quantity > 0 ? wornEncumbrance(item) : undefined;
	if (worn === undefined) {
		return [{ encumbrance: item.encumbrance, count: item.quantity }];
	}

	return [
		{ encumbrance: worn, count: 1 },
		{ encumbrance: item.encumbrance, count: item.quantity - 1 },
	];
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
		item.state === EquipmentState.Dropped ||
		(item.container !== '' && rootContainer(item.container, (id) => byId.get(id))?.state === EquipmentState.Dropped);

	return items
		.filter((item) => rules.isRelevant(item.type) && !(rules.ignoresDropped && isDropped(item)))
		.flatMap((item) => stackEncumbrance(item, rules))
		.reduce(
			(total, { encumbrance, count }) => {
				// Negative encumbrance raises the threshold instead of lowering the value.
				if (encumbrance < 0) {
					return { value: total.value, thresholdBonus: total.thresholdBonus - encumbrance * count };
				}

				return { value: total.value + encumbrance * count, thresholdBonus: total.thresholdBonus };
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
		threshold: BASE_ENCUMBRANCE_THRESHOLD + brawn + own.threshold + equipment.thresholdBonus,
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
export function encumberingItems(items: Iterable<Item.Stored>): EncumberingItem[] {
	return Array.from(items, (item) => {
		const { encumbrance, quantity, state, container } = (item as GenesysItem<EquipmentType>).system;
		// Only gear can be Wearable Gear.
		const { wearable, wornEncumbrance } =
			item.type === 'gear' ? (item as GenesysItem<'gear'>).system : { wearable: false, wornEncumbrance: null };
		return { id: item.id, type: item.type, encumbrance, quantity, state, container, wearable, wornEncumbrance };
	});
}
