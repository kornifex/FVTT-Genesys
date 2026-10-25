import { describe, expect, it } from 'vitest';

import { Characteristic } from '@/data/Characteristics';
import { attackDamage, damageFormula, firingArcLabels, firingArcs, weaponDamage } from '@/item/Weapons';

const characteristics = { brawn: 3, agility: 2, intellect: 1, cunning: 2, willpower: 4, presence: 1 };

describe('weaponDamage', () => {
	it('adds the damage characteristic, Brawn for a "+" damage, to the base damage (CRB p. 86, 90)', () => {
		// The knife of Table I.5–5 (p. 91): +1 damage, in the hands of a character with Brawn 3.
		expect(weaponDamage({ baseDamage: 1, damageCharacteristic: Characteristic.Brawn }, characteristics)).toBe(4);
	});

	it('adds any other damage characteristic the same way', () => {
		expect(weaponDamage({ baseDamage: 2, damageCharacteristic: Characteristic.Willpower }, characteristics)).toBe(6);
	});

	it('gives a weapon without a damage characteristic its base damage (CRB p. 90)', () => {
		// The revolver of Table I.5–5 (p. 91): 6 damage, whoever holds it.
		expect(weaponDamage({ baseDamage: 6, damageCharacteristic: '-' }, characteristics)).toBe(6);
	});

	it("gives a vehicle weapon its base damage, whatever its gunner's characteristics (CRB p. 223)", () => {
		// The 24-pounder cannons of the three-masted frigate (p. 231): damage 6.
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

describe('attackDamage', () => {
	it("adds one damage per Success left to the weapon's damage when the attack hits (CRB p. 90, 102)", () => {
		expect(attackDamage({ baseDamage: 6, damageCharacteristic: '-' }, characteristics, 1)).toBe(7);
		expect(attackDamage({ baseDamage: 2, damageCharacteristic: Characteristic.Brawn }, characteristics, 3)).toBe(8);
	});

	it("adds one damage per Success left to a vehicle weapon's base damage, not its gunner's characteristics (CRB p. 223)", () => {
		// The fighter's air-to-air missiles (p. 231): damage 5, fired with two Successes left.
		expect(attackDamage({ baseDamage: 5 }, characteristics, 2)).toBe(7);
	});

	it("gives the damage a chat card shows on a miss, when the world's setting shows it: the weapon's damage alone", () => {
		expect(attackDamage({ baseDamage: 6, damageCharacteristic: '-' }, characteristics, 0)).toBe(6);
		expect(attackDamage({ baseDamage: 6, damageCharacteristic: '-' }, characteristics, -2)).toBe(6);
	});
});

describe('damageFormula', () => {
	it("gives the base damage and the abbreviation of the damage characteristic, which the sheets write Br+1 for the book's +1 (CRB p. 90)", () => {
		expect(damageFormula({ baseDamage: 1, damageCharacteristic: Characteristic.Brawn })).toEqual({
			baseDamage: 1,
			characteristic: 'Genesys.CharacteristicAbbr.Brawn',
		});
	});

	it('gives the abbreviation of any other damage characteristic', () => {
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
	it("gives a turret, which fires at any target the hull doesn't hide, all arcs (CRB p. 224)", () => {
		expect(firingArcs({ fore: true, aft: true, port: true, starboard: true })).toBe('all');
	});

	it('gives a vehicle weapon that fires in no arc none', () => {
		expect(firingArcs({ fore: false, aft: false, port: false, starboard: false })).toBe('none');
	});

	it.each([
		{
			weapon: "the fighter's rotary cannon, Fire Arc Forward",
			firingArc: { fore: true, aft: false, port: false, starboard: false },
			arcs: ['fore'],
		},
		{
			weapon: "the frigate's cannons, Fire Arc Starboard and Fire Arc Port",
			firingArc: { fore: false, aft: false, port: true, starboard: true },
			arcs: ['port', 'starboard'],
		},
	])('gives $weapon the arcs its mounting fires in (CRB p. 224, 231)', ({ firingArc, arcs }) => {
		expect(firingArcs(firingArc)).toEqual(arcs);
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
