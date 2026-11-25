/**
 * @file The equipment an actor can equip: a character its weapons, its armor and its Wearable Gear, a vehicle its vehicle
 * weapons. Adversaries have no Equipment State.
 */

import { isRelevantToCharacter, isRelevantToVehicle } from '@/actor/data/RelevantTypes';

/**
 * What this rule reads of an item: its type and, for gear, whether it is Wearable Gear.
 */
export type EquipableItem = {
	type: string;
	// The data of an item of any type, which only gear fills this field of.
	system: object & { wearable?: boolean };
};

const IS_EQUIPABLE_BY_ACTOR_TYPE: Partial<Record<string, (item: EquipableItem) => boolean>> = {
	character: (item) => isRelevantToCharacter('EQUIPABLE', item.type) || (item.type === 'gear' && !!item.system.wearable),
	vehicle: (item) => isRelevantToVehicle('EQUIPABLE', item.type),
};

/**
 * Whether an actor of this type can equip the item.
 */
export function isEquipable(actorType: string, item: EquipableItem) {
	return IS_EQUIPABLE_BY_ACTOR_TYPE[actorType]?.(item) ?? false;
}
