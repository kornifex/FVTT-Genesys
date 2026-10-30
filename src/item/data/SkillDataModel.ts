import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { Characteristic } from '@/data/Characteristics';
import { SKILL_CATEGORIES, type SkillCategory } from '@/data/Skills';
import { choiceField } from '@/data/schemaFields';
import { itemsOfType } from '@/item/ItemTypes';
import { createdSkillIsCareer } from '@/actor/data/character/Career';

/**
 * The data of a skill.
 */
export abstract class SkillDataModel extends BaseItemDataModel {
	/**
	 * Characteristic tied to the skill.
	 */
	abstract characteristic: Characteristic;

	/**
	 * Skill category
	 */
	abstract category: SkillCategory;

	/**
	 * Whether the skill can be used for initiative.
	 */
	abstract initiative: boolean;

	/**
	 * (Owned Only) Whether the skill is a career skill for the character.
	 */
	abstract career: boolean;

	/**
	 * (Owned Only) Number of Ranks the player has taken in the skill.
	 */
	abstract rank: number;

	/**
	 * Make a skill added to a character a Career skill when their Career lists it, whether it is dropped on the sheet or
	 * created by a macro. Foundry runs no item `preCreate` for the skills created with their actor.
	 * @inheritDoc
	 */
	protected override async _preCreate() {
		const skill = this.parent;
		if (skill.actor?.type !== 'character') {
			return;
		}

		const [career] = itemsOfType(skill.actor, 'career');
		const careerSkills = career?.system.careerSkills ?? [];
		skill.updateSource({
			system: { career: createdSkillIsCareer({ name: skill.name, career: this.career }, careerSkills) },
		});
	}

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			characteristic: choiceField(Object.values(Characteristic), Characteristic.Brawn),
			category: choiceField(SKILL_CATEGORIES, 'general'),
			initiative: new fields.BooleanField({ initial: false }),
			career: new fields.BooleanField({ initial: false }),
			rank: new fields.NumberField({ integer: true, initial: 0 }),
		};
	}
}
