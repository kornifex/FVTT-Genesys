import { BaseWeaponDataModel } from '@/item/data/BaseWeaponDataModel';
import { Characteristic } from '@/data/Characteristics';
import { choiceField } from '@/data/schemaFields';

/**
 * The data of a character's weapon.
 */
export abstract class WeaponDataModel extends BaseWeaponDataModel {
	/**
	 * Characteristic that is added to the damage value.
	 */
	abstract damageCharacteristic: Characteristic | '-';

	/**
	 * Attack Skill chosen by the actor wielding the weapon, among the skills it lists. Empty when none is chosen.
	 */
	abstract attackSkill: string;

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			damageCharacteristic: choiceField(['-', ...Object.values(Characteristic)], '-'),
			attackSkill: new fields.StringField({ initial: '' }),
		};
	}
}
