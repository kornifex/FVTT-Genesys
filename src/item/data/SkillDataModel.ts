import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { Characteristic } from '@/data/Characteristics';
import type { SkillCategory } from '@/data/Skills';
import type { GenesysItem } from '@/item/GenesysItem';
import type { CareerDataModel } from '@/item/data/CareerDataModel';
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
	 */
	async preCreate(
		skill: GenesysItem<SkillDataModel>,
		_data: unknown,
		_options: DocumentModificationContext<GenesysItem<SkillDataModel>>,
		_user: foundry.documents.BaseUser,
	) {
		if (skill.actor?.type !== 'character') {
			return;
		}

		const career = skill.actor.items.find((item) => item.type === 'career') as GenesysItem<CareerDataModel> | undefined;
		const careerSkills = career?.systemData.careerSkills ?? [];
		skill.updateSource({ 'system.career': createdSkillIsCareer({ name: skill.name, career: skill.systemData.career }, careerSkills) });
	}

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			characteristic: new fields.StringField({
				initial: Characteristic.Brawn,
				choices: ['brawn', 'agility', 'intellect', 'cunning', 'willpower', 'presence'],
			}),
			category: new fields.StringField({
				initial: 'general',
				choices: ['general', 'magic', 'combat', 'social', 'knowledge'],
			}),
			initiative: new fields.BooleanField({ initial: false }),
			career: new fields.BooleanField({ initial: false }),
			rank: new fields.NumberField({ integer: true, initial: 0 }),
		};
	}
}
