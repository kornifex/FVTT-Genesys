import { BaseWeaponDataModel } from '@/item/data/BaseWeaponDataModel';
import { weaponProfileFields } from '@/item/data/WeaponProfileFields';
import { attachmentsField, hardPointsField } from '@/data/schemaFields';
import type { ContainedAttachment } from '@/item/data/Attachments';
import type { DamageCharacteristic } from '@/item/Weapons';
import type { ExtraWeaponProfile } from '@/item/WeaponProfiles';

/**
 * The data of a character's weapon. Its own attack fields are its main Weapon Profile, and `extraProfiles` holds the
 * others (ADR 0007): read them all with `weaponProfiles`.
 */
export abstract class WeaponDataModel extends BaseWeaponDataModel {
	/**
	 * Characteristic that is added to the damage value.
	 */
	abstract damageCharacteristic: DamageCharacteristic;

	/**
	 * Attack Skill chosen by the actor wielding the weapon, among the skills it lists. Empty when none is chosen.
	 */
	abstract attackSkill: string;

	/**
	 * The weapon's Weapon Profiles besides its main one, such as a dagger's thrown profile. Empty for most weapons.
	 */
	abstract extraProfiles: ExtraWeaponProfile[];

	/**
	 * The Hard Points the weapon sets as an exception, `null` while it gets them from its encumbrance: read them with
	 * `hardPoints`. A vehicle weapon has none.
	 */
	abstract hardPoints: number | null;

	/**
	 * The attachments installed on the weapon, which change it with every Weapon Profile. A vehicle weapon has none.
	 */
	abstract attachments: ContainedAttachment[];

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			...weaponProfileFields(),
			hardPoints: hardPointsField(),
			attachments: attachmentsField(),
			// An extra profile holds the fields of the main profile, with the same defaults, and a name of its own.
			extraProfiles: new fields.ArrayField(
				new fields.SchemaField({ name: new fields.StringField({ initial: '' }), ...weaponProfileFields() }),
			),
		};
	}
}
