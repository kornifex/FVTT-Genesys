import { describe, expect, it } from 'vitest';

import { Characteristic } from '@/data/Characteristics';
import {
	attackProfile,
	profileRowName,
	profileUpdate,
	weaponProfiles,
	withExtraProfileAdded,
	withoutExtraProfile,
} from '@/item/WeaponProfiles';

const accurate = { name: 'Accurate', description: '', isRated: true, rating: 1 };
const limitedAmmo = { name: 'Limited Ammo', description: '', isRated: true, rating: 1 };

// The dagger of Realms of Terrinoth (pp. 92–96): a melee weapon that is also thrown.
const dagger = () => ({
	skills: ['Melee (Light)'],
	damageCharacteristic: Characteristic.Brawn,
	baseDamage: 1,
	critical: 3,
	range: 'engaged' as const,
	qualities: [],
	attackSkill: '',
	extraProfiles: [
		{
			name: 'Thrown',
			skills: ['Ranged'],
			damageCharacteristic: Characteristic.Brawn,
			baseDamage: 2,
			critical: 4,
			range: 'short' as const,
			qualities: [accurate, limitedAmmo],
			attackSkill: '',
		},
	],
});

describe('weaponProfiles', () => {
	it("reads a weapon without extra profiles as its main profile alone, from the weapon's own fields", () => {
		expect(weaponProfiles({ ...dagger(), extraProfiles: [] })).toEqual([
			{
				index: 0,
				name: '',
				skills: ['Melee (Light)'],
				damageCharacteristic: 'brawn',
				baseDamage: 1,
				critical: 3,
				range: 'engaged',
				qualities: [],
				attackSkill: '',
			},
		]);
	});

	it('reads the main profile first, then each extra profile in its order, numbered after it', () => {
		expect(weaponProfiles(dagger())).toEqual([
			{
				index: 0,
				name: '',
				skills: ['Melee (Light)'],
				damageCharacteristic: 'brawn',
				baseDamage: 1,
				critical: 3,
				range: 'engaged',
				qualities: [],
				attackSkill: '',
			},
			{
				index: 1,
				name: 'Thrown',
				skills: ['Ranged'],
				damageCharacteristic: 'brawn',
				baseDamage: 2,
				critical: 4,
				range: 'short',
				qualities: [accurate, limitedAmmo],
				attackSkill: '',
			},
		]);
	});
});

// The English texts of the keys the row names are written with.
const ENGLISH: Record<string, string> = {
	'Genesys.WeaponProfile.RowName': '{weapon} ({profile})',
	'Genesys.WeaponProfile.Numbered': 'Profile {number}',
};
const i18n = {
	format: (key: string, data: Record<string, string>) => ENGLISH[key].replace(/\{(\w+)\}/g, (_match, name: string) => data[name]),
};

describe('profileRowName', () => {
	const [main, thrown] = weaponProfiles(dagger());

	it("names the main profile's row after the weapon", () => {
		expect(profileRowName('Dagger', main, i18n)).toBe('Dagger');
	});

	it("names an extra profile's row after the weapon and the profile's name", () => {
		expect(profileRowName('Dagger', thrown, i18n)).toBe('Dagger (Thrown)');
	});

	it("names an unnamed extra profile's row after its first skill", () => {
		expect(profileRowName('Dagger', { ...thrown, name: '', skills: ['Ranged', 'Athletics'] }, i18n)).toBe('Dagger (Ranged)');
	});

	it("names an extra profile's row with neither name nor skill after its number among the weapon's profiles", () => {
		expect(profileRowName('Dagger', { ...thrown, name: '', skills: [] }, i18n)).toBe('Dagger (Profile 2)');
	});
});

describe('profileUpdate', () => {
	it("writes a change of the main profile to the weapon's own fields", () => {
		expect(profileUpdate(dagger(), 0, { attackSkill: 'Melee (Light)', critical: 2 })).toEqual({
			attackSkill: 'Melee (Light)',
			critical: 2,
		});
	});

	it("leaves out a name given to the main profile, whose name is the weapon's", () => {
		expect(profileUpdate(dagger(), 0, { name: 'Stab', range: 'short' })).toEqual({ range: 'short' });
	});

	it('writes a change of an extra profile to that profile alone, keeping its other fields and the other profiles', () => {
		const weapon = { ...dagger(), extraProfiles: [...dagger().extraProfiles, { ...dagger().extraProfiles[0], name: 'Lunge' }] };

		expect(profileUpdate(weapon, 2, { attackSkill: 'Ranged', name: 'Throw' })).toEqual({
			extraProfiles: [dagger().extraProfiles[0], { ...dagger().extraProfiles[0], name: 'Throw', attackSkill: 'Ranged' }],
		});
	});
});

describe('withExtraProfileAdded', () => {
	it("adds an extra profile after the others, with the main profile's defaults and no name", () => {
		expect(withExtraProfileAdded(dagger())).toEqual({
			extraProfiles: [
				dagger().extraProfiles[0],
				{
					name: '',
					skills: [],
					damageCharacteristic: '-',
					baseDamage: 0,
					critical: 0,
					range: 'engaged',
					qualities: [],
					attackSkill: '',
				},
			],
		});
	});
});

describe('withoutExtraProfile', () => {
	it('deletes an extra profile, the others keeping their order', () => {
		const lunge = { ...dagger().extraProfiles[0], name: 'Lunge' };
		const weapon = { ...dagger(), extraProfiles: [...dagger().extraProfiles, lunge] };

		expect(withoutExtraProfile(weapon, 1)).toEqual({ extraProfiles: [lunge] });
	});
});

describe('attackProfile', () => {
	it("gives an attack with an extra profile that profile's skills, range, damage, Critical rating and qualities, named as its row", () => {
		expect(attackProfile('Dagger', weaponProfiles(dagger())[1], i18n)).toEqual({
			attackName: 'Dagger (Thrown)',
			skills: ['Ranged'],
			damageCharacteristic: 'brawn',
			baseDamage: 2,
			critical: 4,
			range: 'short',
			qualities: [accurate, limitedAmmo],
		});
	});

	it("gives an attack with the main profile the weapon's own fields and name", () => {
		expect(attackProfile('Dagger', weaponProfiles(dagger())[0], i18n)).toEqual({
			attackName: 'Dagger',
			skills: ['Melee (Light)'],
			damageCharacteristic: 'brawn',
			baseDamage: 1,
			critical: 3,
			range: 'engaged',
			qualities: [],
		});
	});
});
