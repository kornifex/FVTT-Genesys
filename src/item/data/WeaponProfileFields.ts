/** @file The schema fields of a Weapon Profile, which a weapon's own fields and each of its extra profiles hold. */
import { choiceField, qualitiesField } from '@/data/schemaFields';
import { DAMAGE_CHARACTERISTICS, RANGES } from '@/item/Weapons';
import { NEW_PROFILE } from '@/item/WeaponProfiles';

/**
 * The fields of a profile every weapon has, a vehicle weapon's single profile included.
 */
export function baseProfileFields() {
	const fields = foundry.data.fields;

	return {
		baseDamage: new fields.NumberField({ initial: NEW_PROFILE.baseDamage, integer: true }),
		critical: new fields.NumberField({ initial: NEW_PROFILE.critical, integer: true }),
		range: choiceField(RANGES, NEW_PROFILE.range),
		skills: new fields.ArrayField(new fields.StringField()),
		qualities: qualitiesField(),
	};
}

/**
 * The fields of a character's weapon's profile: a vehicle weapon's, with a damage characteristic and an Attack Skill.
 */
export function weaponProfileFields() {
	return {
		...baseProfileFields(),
		damageCharacteristic: choiceField(DAMAGE_CHARACTERISTICS, NEW_PROFILE.damageCharacteristic),
		attackSkill: new foundry.data.fields.StringField({ initial: NEW_PROFILE.attackSkill }),
	};
}
