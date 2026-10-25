/** @file The steps of an item's damage, from undamaged to destroyed. */

import type { EquipmentDamageState } from '@/item/data/EquipmentDataModel';

/**
 * An item's damage, read as its value so that this module doesn't load the DataModel, a Foundry class.
 */
type DamageState = `${EquipmentDamageState}`;

// An item's damage goes one step at a time, and an item with major damage is destroyed by the next step.
const DAMAGE_STEPS: DamageState[] = ['undamaged', 'minor', 'moderate', 'major'];

/**
 * The damage an item has one step up or down from its damage: destroyed past major damage, and undefined below
 * undamaged or from a damage this module doesn't know.
 */
export function damageStep(damage: DamageState, direction: 1 | -1): DamageState | 'destroyed' | undefined {
	const index = DAMAGE_STEPS.indexOf(damage);
	if (index === -1) {
		return undefined;
	}

	return index + direction === DAMAGE_STEPS.length ? 'destroyed' : DAMAGE_STEPS[index + direction];
}
