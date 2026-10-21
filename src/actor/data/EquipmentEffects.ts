/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @file Effects of equipment apply only while their item is in the right equipment state: equipped for equipable items, used
 * for consumables and carried for any other equipment.
 */

import type GenesysActor from '@/actor/GenesysActor';
import type GenesysEffect from '@/effects/GenesysEffect';
import type GenesysItem from '@/item/GenesysItem';
import type EquipmentDataModel from '@/item/data/EquipmentDataModel';
import { EquipmentState } from '@/item/data/EquipmentDataModel';

/**
 * The relevant-types check of an actor type, limited to the contexts this rule needs.
 */
export type IsEquipmentType = (context: 'INVENTORY' | 'EQUIPABLE' | 'CONSUMABLE', type: string) => boolean;

/**
 * Whether the effects of an item must be disabled. Effects of an item that isn't equipment for the actor are always enabled.
 */
export function areEffectsDisabled(isEquipmentType: IsEquipmentType, itemType: string, equipmentState: EquipmentState) {
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
 * Enable or disable the effects the items gave to the actor, according to the equipment state of each item, or to the
 * overriding state if there's one.
 */
export async function updateEffectsStatus(actor: GenesysActor, isEquipmentType: IsEquipmentType, items: GenesysItem[], overrides?: { equipmentState: EquipmentState }) {
	const allUpdates = [];
	for (const item of items) {
		const itemEquipmentState = overrides?.equipmentState ? overrides.equipmentState : (item.systemData as EquipmentDataModel).state;
		const effectDisableStatus = areEffectsDisabled(isEquipmentType, item.type, itemEquipmentState);

		allUpdates.push(
			...actor.effects
				.filter((effect) => (effect as GenesysEffect).originItem?.id === item.id && effect.disabled !== effectDisableStatus)
				.map(
					async (effect) =>
						await effect.update({
							disabled: effectDisableStatus,
						}),
				),
		);
	}

	await Promise.all(allUpdates);
}
