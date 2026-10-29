import { BaseWeaponDataModel } from '@/item/data/BaseWeaponDataModel';
import { DAMAGE_CHARACTERISTICS, DamageCharacteristic } from '@/item/Weapons';
import { choiceField } from '@/data/schemaFields';

/**
 * The data of a character's weapon.
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

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			damageCharacteristic: choiceField(DAMAGE_CHARACTERISTICS, '-'),
			attackSkill: new fields.StringField({ initial: '' }),
		};
	}
}
