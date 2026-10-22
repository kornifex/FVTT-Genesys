/**
 * @file Effects of equipment apply only while their item is in the right Equipment State: equipped for equipable items, used for consumables and carried for any other equipment.
 */

import { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { EquipmentState } from '@/item/data/EquipmentDataModel';

/**
 * The relevant-types check of an actor type, limited to the contexts this rule needs.
 */
type IsEquipmentType = (context: 'INVENTORY' | 'EQUIPABLE' | 'CONSUMABLE', type: string) => boolean;

/**
 * What this rule reads of an item: its type and, for equipment, its Equipment State.
 */
type HeldItem = {
	type: string;
	system: { state?: EquipmentState };
};

// The relevant-types check of each actor type whose equipment has an Equipment State. Adversaries and minions have
// none: the effects of their equipment always apply.
const EQUIPMENT_TYPES_BY_ACTOR_TYPE: Partial<Record<string, IsEquipmentType>> = {
	character: CharacterDataModel.isRelevantTypeForContext,
	vehicle: VehicleDataModel.isRelevantTypeForContext,
};

/**
 * Whether the effects of an item must be disabled. Effects of an item that isn't equipment for the actor are always enabled.
 */
function areEffectsDisabled(isEquipmentType: IsEquipmentType, itemType: string, equipmentState: EquipmentState | undefined) {
	if (!isEquipmentType('INVENTORY', itemType)) {
		return false;
	}

	if (isEquipmentType('EQUIPABLE', itemType)) {
		return EquipmentState.Equipped !== equipmentState;
	} else if (isEquipmentType('CONSUMABLE', itemType)) {
		return EquipmentState.Used !== equipmentState;
	} else {
		return EquipmentState.Carried !== equipmentState;
	}
}

/**
 * Whether an item of this type is equipment with an Equipment State on an actor of this type.
 */
export function hasEquipmentState(actorType: string, itemType: string) {
	return EQUIPMENT_TYPES_BY_ACTOR_TYPE[actorType]?.('INVENTORY', itemType) ?? false;
}

/**
 * Whether the Equipment State of an item keeps its effects from applying to the actor that holds it.
 */
export function isSuppressedByEquipmentState(actorType: string, item: HeldItem) {
	const isEquipmentType = EQUIPMENT_TYPES_BY_ACTOR_TYPE[actorType];
	return !!isEquipmentType && areEffectsDisabled(isEquipmentType, item.type, item.system.state);
}
