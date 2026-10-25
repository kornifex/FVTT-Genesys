/** @file The damage and firing arcs of weapons and vehicle weapons. */
import type { Characteristic, CharacteristicsContainer } from '@/data/Characteristics';
import type { BaseWeaponDataModel } from '@/item/data/BaseWeaponDataModel';
import type { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';
import type { WeaponDataModel } from '@/item/data/WeaponDataModel';

/**
 * The abbreviation of each characteristic a weapon adds to its damage.
 */
const CHARACTERISTIC_ABBREVIATIONS: Record<Characteristic, string> = {
	brawn: 'Genesys.CharacteristicAbbr.Brawn',
	agility: 'Genesys.CharacteristicAbbr.Agility',
	intellect: 'Genesys.CharacteristicAbbr.Intellect',
	cunning: 'Genesys.CharacteristicAbbr.Cunning',
	willpower: 'Genesys.CharacteristicAbbr.Willpower',
	presence: 'Genesys.CharacteristicAbbr.Presence',
};

/**
 * What a weapon's damage is read from. A vehicle weapon has no damage characteristic.
 */
type DamageSource = Pick<BaseWeaponDataModel, 'baseDamage'> & Partial<Pick<WeaponDataModel, 'damageCharacteristic'>>;

/**
 * The damage a weapon deals in the hands of an actor with these characteristics. An actor without characteristics,
 * like a vehicle, deals the weapon's base damage.
 */
export function weaponDamage(weapon: DamageSource, characteristics: CharacteristicsContainer | undefined) {
	const baseDamage = baseDamageOf(weapon);

	if (!weapon.damageCharacteristic || weapon.damageCharacteristic === '-' || !characteristics) {
		return baseDamage;
	}

	return baseDamage + characteristics[weapon.damageCharacteristic];
}

/**
 * The parts a weapon's damage is written with: its base damage, and the localization key of its damage
 * characteristic's abbreviation when it has one.
 */
export function damageFormula(weapon: DamageSource): { baseDamage: number; characteristic?: string } {
	const baseDamage = baseDamageOf(weapon);

	if (!weapon.damageCharacteristic || weapon.damageCharacteristic === '-') {
		return { baseDamage };
	}

	return { baseDamage, characteristic: CHARACTERISTIC_ABBREVIATIONS[weapon.damageCharacteristic] };
}

/**
 * An arc a vehicle weapon can fire in.
 */
type Arc = keyof VehicleWeaponDataModel['firingArc'];

/**
 * The label of each arc a vehicle weapon can fire in, from fore to starboard.
 */
const FIRING_ARC_LABELS: Record<Arc, string> = {
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

function baseDamageOf(weapon: DamageSource) {
	// The weapon sheets save an emptied damage field as null.
	return weapon.baseDamage ?? 0;
}
