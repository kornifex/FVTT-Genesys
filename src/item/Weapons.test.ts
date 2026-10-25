import { describe, expect, it } from 'vitest';

import { Characteristic } from '@/data/Characteristics';
import { damageFormula, firingArcLabels, firingArcs, weaponDamage } from '@/item/Weapons';

const characteristics = { brawn: 3, agility: 2, intellect: 1, cunning: 2, willpower: 4, presence: 1 };

describe('weaponDamage', () => {
	it('adds the damage characteristic to the base damage', () => {
		expect(weaponDamage({ baseDamage: 2, damageCharacteristic: Characteristic.Brawn }, characteristics)).toBe(5);
	});

	it('gives a weapon without a damage characteristic its base damage', () => {
		expect(weaponDamage({ baseDamage: 4, damageCharacteristic: '-' }, characteristics)).toBe(4);
	});

	it('gives a vehicle weapon its base damage', () => {
		expect(weaponDamage({ baseDamage: 6 }, characteristics)).toBe(6);
	});

	it('gives a weapon held by an actor without characteristics, like a vehicle, its base damage', () => {
		expect(weaponDamage({ baseDamage: 2, damageCharacteristic: Characteristic.Brawn }, undefined)).toBe(2);
	});

	it('gives a weapon whose damage was emptied a base damage of 0', () => {
		expect(weaponDamage({ baseDamage: null as unknown as number, damageCharacteristic: Characteristic.Brawn }, characteristics)).toBe(
			3,
		);
		expect(weaponDamage({ baseDamage: null as unknown as number, damageCharacteristic: '-' }, characteristics)).toBe(0);
	});
});

describe('damageFormula', () => {
	it('gives the base damage and the abbreviation of the damage characteristic', () => {
		expect(damageFormula({ baseDamage: 2, damageCharacteristic: Characteristic.Willpower })).toEqual({
			baseDamage: 2,
			characteristic: 'Genesys.CharacteristicAbbr.Willpower',
		});
	});

	it('gives a weapon without a damage characteristic, or a vehicle weapon, its base damage alone', () => {
		expect(damageFormula({ baseDamage: 4, damageCharacteristic: '-' })).toEqual({ baseDamage: 4 });
		expect(damageFormula({ baseDamage: 6 })).toEqual({ baseDamage: 6 });
	});

	it('gives a weapon whose damage was emptied a base damage of 0', () => {
		expect(damageFormula({ baseDamage: null as unknown as number, damageCharacteristic: '-' })).toEqual({ baseDamage: 0 });
	});
});

describe('firingArcs', () => {
	it('gives a vehicle weapon that fires in every arc all arcs', () => {
		expect(firingArcs({ fore: true, aft: true, port: true, starboard: true })).toBe('all');
	});

	it('gives a vehicle weapon that fires in no arc none', () => {
		expect(firingArcs({ fore: false, aft: false, port: false, starboard: false })).toBe('none');
	});

	it('lists the arcs a vehicle weapon fires in, fore to starboard', () => {
		expect(firingArcs({ starboard: true, port: false, aft: true, fore: true })).toEqual(['fore', 'aft', 'starboard']);
	});
});

describe('firingArcLabels', () => {
	it.each([
		[{ fore: true, aft: true, port: true, starboard: true }, ['Genesys.FiringArc.All']],
		[{ fore: false, aft: false, port: false, starboard: false }, ['Genesys.FiringArc.None']],
		[{ fore: false, aft: true, port: true, starboard: false }, ['Genesys.FiringArc.Aft', 'Genesys.FiringArc.Port']],
	])('labels the firing arc %j', (firingArc, labels) => {
		expect(firingArcLabels(firingArc)).toEqual(labels);
	});
});
