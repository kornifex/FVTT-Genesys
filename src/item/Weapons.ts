/** @file The damage and range of weapons and their attacks, and the firing arcs of vehicle weapons. */
import { Characteristic, CHARACTERISTIC_ABBREVIATIONS, type CharacteristicsContainer } from '@/data/Characteristics';
import type { BaseWeaponDataModel } from '@/item/data/BaseWeaponDataModel';
import type { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';
import type { WeaponDataModel } from '@/item/data/WeaponDataModel';

/**
 * What a weapon's damage is read from. A vehicle weapon has no damage characteristic.
 */
type WeaponDamageData = Pick<BaseWeaponDataModel, 'baseDamage'> & Partial<Pick<WeaponDataModel, 'damageCharacteristic'>>;

/**
 * The damage a weapon deals in the hands of an actor with these characteristics. An actor without characteristics,
 * like a vehicle, deals the weapon's base damage.
 */
export function weaponDamage(weapon: WeaponDamageData, characteristics: CharacteristicsContainer | undefined) {
	const characteristic = damageCharacteristicOf(weapon);

	return baseDamageOf(weapon) + (characteristic && characteristics ? characteristics[characteristic] : 0);
}

/**
 * The damage of an attack with a weapon: the weapon's damage, plus one per Success left when the attack hits.
 */
export function attackDamage(weapon: WeaponDamageData, characteristics: CharacteristicsContainer | undefined, netSuccess: number) {
	return weaponDamage(weapon, characteristics) + Math.max(0, netSuccess);
}

/**
 * The parts a weapon's damage is written with: its base damage, and the localization key of its damage
 * characteristic's abbreviation when it has one.
 */
export function damageFormula(weapon: WeaponDamageData): { baseDamage: number; characteristic?: string } {
	const baseDamage = baseDamageOf(weapon);
	const characteristic = damageCharacteristicOf(weapon);

	return characteristic ? { baseDamage, characteristic: CHARACTERISTIC_ABBREVIATIONS[characteristic] } : { baseDamage };
}

/**
 * The range bands a weapon can reach, from engaged to strategic.
 */
export const RANGES = ['engaged', 'short', 'medium', 'long', 'extreme', 'strategic'] as const;

/**
 * A range band.
 */
export type RangeBand = (typeof RANGES)[number];

/**
 * The characteristics a weapon's damage can add, or `-` for none.
 */
export const DAMAGE_CHARACTERISTICS = ['-', ...Object.values(Characteristic)] as const;

/**
 * The characteristic a weapon's damage adds, or `-` for none.
 */
export type DamageCharacteristic = (typeof DAMAGE_CHARACTERISTICS)[number];

/**
 * The localization key of each range band a weapon can reach.
 */
export const RANGE_LABELS: Record<RangeBand, string> = {
	engaged: 'Genesys.Range.Engaged',
	short: 'Genesys.Range.Short',
	medium: 'Genesys.Range.Medium',
	long: 'Genesys.Range.Long',
	extreme: 'Genesys.Range.Extreme',
	strategic: 'Genesys.Range.Strategic',
};

/**
 * An arc a vehicle weapon can fire in.
 */
type Arc = keyof VehicleWeaponDataModel['firingArc'];

/**
 * The localization key of each arc a vehicle weapon can fire in, from fore to starboard.
 */
export const FIRING_ARC_LABELS: Record<Arc, string> = {
	fore: 'Genesys.FiringArc.Fore',
	aft: 'Genesys.FiringArc.Aft',
	port: 'Genesys.FiringArc.Port',
	starboard: 'Genesys.FiringArc.Starboard',
};

const ARCS = Object.keys(FIRING_ARC_LABELS) as Arc[];

/**
 * The arcs a vehicle weapon fires in: all, none, or each of them from fore to starboard.
 */
export function firingArcs(firingArc: VehicleWeaponDataModel['firingArc']): 'all' | 'none' | Arc[] {
	const arcs = ARCS.filter((arc) => firingArc[arc]);

	if (arcs.length === ARCS.length) {
		return 'all';
	} else if (arcs.length === 0) {
		return 'none';
	} else {
		return arcs;
	}
}

/**
 * The localization keys of a vehicle weapon's firing arc: all, none, or each arc it fires in.
 */
export function firingArcLabels(firingArc: VehicleWeaponDataModel['firingArc']) {
	const arcs = firingArcs(firingArc);

	if (arcs === 'all') {
		return ['Genesys.FiringArc.All'];
	} else if (arcs === 'none') {
		return ['Genesys.FiringArc.None'];
	} else {
		return arcs.map((arc) => FIRING_ARC_LABELS[arc]);
	}
}

function damageCharacteristicOf(weapon: WeaponDamageData) {
	// A vehicle weapon has no damage characteristic, and a weapon saves its absence as '-'.
	return weapon.damageCharacteristic === '-' ? undefined : weapon.damageCharacteristic;
}

function baseDamageOf(weapon: WeaponDamageData) {
	// The weapon sheets save an emptied damage field as null.
	return weapon.baseDamage ?? 0;
}
