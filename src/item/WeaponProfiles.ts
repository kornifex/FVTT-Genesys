/** @file A weapon's Weapon Profiles: its main profile, held by the weapon's own fields, then its extra profiles (ADR 0007). */
import { withoutIndex } from '@/arrays';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import type { DamageCharacteristic, RangeBand } from '@/item/Weapons';

/**
 * What a Weapon Profile holds: one way to attack with a weapon.
 */
export type WeaponProfileData = {
	/** Names of the skills the profile can be attacked with. */
	skills: string[];
	/** Characteristic added to the damage value, or `-` for none. */
	damageCharacteristic: DamageCharacteristic;
	baseDamage: number;
	critical: number;
	range: RangeBand;
	/** The profile's qualities, which replace the main profile's rather than add to them. */
	qualities: ContainedItemQuality[];
	/** The Attack Skill chosen among the profile's skills, empty when none is chosen. */
	attackSkill: string;
};

/**
 * An extra profile of a weapon, which may be named.
 */
export type ExtraWeaponProfile = WeaponProfileData & { name: string };

/**
 * A weapon as its profiles are read from: the fields of its main profile, and its extra profiles.
 */
export type ProfiledWeapon = WeaponProfileData & { extraProfiles: ExtraWeaponProfile[] };

/**
 * One of a weapon's profiles, with its place among them: 0 for the main profile, which has no name of its own, then 1
 * for the first extra profile, and so on.
 */
export type WeaponProfile = ExtraWeaponProfile & { index: number };

/**
 * Every profile of a weapon, the main one first, then its extra profiles in their order.
 */
export function weaponProfiles(weapon: ProfiledWeapon): WeaponProfile[] {
	const { skills, damageCharacteristic, baseDamage, critical, range, qualities, attackSkill } = weapon;

	return [
		{ index: 0, name: '', skills, damageCharacteristic, baseDamage, critical, range, qualities, attackSkill },
		...weapon.extraProfiles.map((profile, position) => ({ ...profile, index: position + 1 })),
	];
}

/**
 * The localization function the row names are written with.
 */
type Formatter = { format(key: string, data: Record<string, string>): string };

/**
 * The name of the row a profile is attacked from: the weapon's name for the main profile, and for an extra profile the
 * weapon's name followed by the profile's name, its first skill when it has none, or else its number among the
 * weapon's profiles.
 */
export function profileRowName(weaponName: string, profile: WeaponProfile, i18n: Formatter) {
	if (profile.index === 0) {
		return weaponName;
	}

	const name =
		profile.name.trim() || profile.skills[0] || i18n.format('Genesys.WeaponProfile.Numbered', { number: String(profile.index + 1) });

	return i18n.format('Genesys.WeaponProfile.RowName', { weapon: weaponName, profile: name });
}

/**
 * The system update that changes a weapon's profile: the weapon's own fields for the main profile, or its list of extra
 * profiles with that one changed. The main profile takes no name: its name is the weapon's.
 */
export function profileUpdate(weapon: ProfiledWeapon, index: number, changes: Partial<ExtraWeaponProfile>) {
	if (index === 0) {
		const { name: _name, ...mainChanges } = changes;
		return mainChanges;
	}

	return {
		extraProfiles: weapon.extraProfiles.map((profile, position) => (position === index - 1 ? { ...profile, ...changes } : profile)),
	};
}

/**
 * The system update that adds an extra profile to a weapon, after the others: unnamed, with the defaults of a new
 * weapon's main profile.
 */
export function withExtraProfileAdded(weapon: ProfiledWeapon) {
	const added: ExtraWeaponProfile = {
		name: '',
		skills: [],
		damageCharacteristic: '-',
		baseDamage: 0,
		critical: 0,
		range: 'engaged',
		qualities: [],
		attackSkill: '',
	};

	return { extraProfiles: [...weapon.extraProfiles, added] };
}

/**
 * The system update that deletes a weapon's extra profile, numbered as {@link weaponProfiles} numbers it.
 */
export function withoutExtraProfile(weapon: ProfiledWeapon, index: number) {
	return { extraProfiles: withoutIndex(weapon.extraProfiles, index - 1) };
}

/**
 * What an attack reads of the profile it is made with, a vehicle weapon's single profile included: the name the attack
 * is described with, the skills it offers first, the range whose defense the target meets, and the damage, Critical
 * rating and qualities its card shows. A vehicle weapon has no damage characteristic.
 */
export type AttackProfile = Pick<WeaponProfileData, 'skills' | 'baseDamage' | 'critical' | 'range' | 'qualities'> &
	Partial<Pick<WeaponProfileData, 'damageCharacteristic'>> & { attackName: string };

/**
 * What an attack with a weapon's profile reads of it, named as the profile's row.
 */
export function attackProfile(weaponName: string, profile: WeaponProfile, i18n: Formatter): AttackProfile {
	const { skills, damageCharacteristic, baseDamage, critical, range, qualities } = profile;

	return { attackName: profileRowName(weaponName, profile, i18n), skills, damageCharacteristic, baseDamage, critical, range, qualities };
}
