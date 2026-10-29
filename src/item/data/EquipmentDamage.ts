/** @file The steps of an item's damage, from undamaged to destroyed. */

/**
 * An item's damage, listed in order from undamaged to major.
 */
export const EquipmentDamageState = {
	Undamaged: 'undamaged',
	Minor: 'minor',
	Moderate: 'moderate',
	Major: 'major',
} as const;

export type EquipmentDamageState = (typeof EquipmentDamageState)[keyof typeof EquipmentDamageState];

/**
 * The localization key of each damage an item can have.
 */
export const EQUIPMENT_DAMAGE_LABELS: Record<EquipmentDamageState, string> = {
	undamaged: 'Genesys.Equipment.DamageState.Undamaged',
	minor: 'Genesys.Equipment.DamageState.Minor',
	moderate: 'Genesys.Equipment.DamageState.Moderate',
	major: 'Genesys.Equipment.DamageState.Major',
};

// An item's damage goes one step at a time, and an item with major damage is destroyed by the next step.
const DAMAGE_STEPS: EquipmentDamageState[] = Object.values(EquipmentDamageState);

/**
 * The damage an item has one step up or down from its damage: destroyed past major damage, and undefined below
 * undamaged or from a damage this module doesn't know.
 */
export function damageStep(damage: EquipmentDamageState, direction: 1 | -1): EquipmentDamageState | 'destroyed' | undefined {
	const index = DAMAGE_STEPS.indexOf(damage);
	if (index === -1) {
		return undefined;
	}

	return index + direction === DAMAGE_STEPS.length ? 'destroyed' : DAMAGE_STEPS[index + direction];
}
