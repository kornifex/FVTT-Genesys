/**
 * @file Effects of equipment apply only while their item is in the right Equipment State: equipped and in no Container for equipable items, and carried for any other equipment but consumables, whose effects never apply.
 */

import { isRelevantToCharacter, isRelevantToVehicle } from '@/actor/data/RelevantTypes';
import { EquipmentState } from '@/item/data/EquipmentState';

/**
 * The relevant-types check of an actor type, limited to the contexts this rule needs.
 */
type IsEquipmentType = (context: 'INVENTORY' | 'EQUIPABLE' | 'CONSUMABLE', type: string) => boolean;

/**
 * What this rule reads of an item: its type and, for equipment, its Equipment State and the Container holding it.
 */
type HeldItem = {
	type: string;
	// The data of an item of any type, which only equipment fills these fields of.
	system: object & { state?: EquipmentState; container?: string };
};

// The relevant-types check of each actor type whose equipment has an Equipment State. Adversaries have none: the
// effects of their equipment always apply.
const EQUIPMENT_TYPES_BY_ACTOR_TYPE: Partial<Record<string, IsEquipmentType>> = {
	character: isRelevantToCharacter,
	vehicle: isRelevantToVehicle,
};

/**
 * Whether the effects of an item must be disabled. Effects of an item that isn't equipment for the actor are always enabled.
 */
function areEffectsDisabled(isEquipmentType: IsEquipmentType, item: HeldItem) {
	if (!isEquipmentType('INVENTORY', item.type)) {
		return false;
	}

	if (isEquipmentType('EQUIPABLE', item.type)) {
		return EquipmentState.Equipped !== item.system.state || !!item.system.container;
	} else if (isEquipmentType('CONSUMABLE', item.type)) {
		// The system has no way to use a consumable (.out-of-scope/using-consumables.md), so its effects never apply.
		return true;
	} else {
		return EquipmentState.Carried !== item.system.state;
	}
}

/**
 * Whether an item of this type is equipment with an Equipment State on an actor of this type.
 */
export function hasEquipmentState(actorType: string, itemType: string) {
	return EQUIPMENT_TYPES_BY_ACTOR_TYPE[actorType]?.('INVENTORY', itemType) ?? false;
}

/**
 * Whether the Equipment State of an item, the Container holding it, or its being a consumable keeps its effects from applying to the actor that
 * holds it.
 */
export function isSuppressedByEquipmentState(actorType: string, item: HeldItem) {
	const isEquipmentType = EQUIPMENT_TYPES_BY_ACTOR_TYPE[actorType];
	return !!isEquipmentType && areEffectsDisabled(isEquipmentType, item);
}

/**
 * Whether the Container holding an item is what keeps its effects from applying: equipment that can be equipped is put away
 * in a Container, whatever the Container's state, as an armor in it isn't worn (CRB p. 92).
 */
export function isSuppressedByContainer(actorType: string, item: HeldItem) {
	const isEquipmentType = EQUIPMENT_TYPES_BY_ACTOR_TYPE[actorType];
	return !!isEquipmentType && isEquipmentType('EQUIPABLE', item.type) && !!item.system.container;
}

/**
 * Whether being a consumable is what keeps an item's effects from applying, whatever its state or Container.
 */
export function isSuppressedAsConsumable(actorType: string, item: HeldItem) {
	return EQUIPMENT_TYPES_BY_ACTOR_TYPE[actorType]?.('CONSUMABLE', item.type) ?? false;
}
