import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { additionalEffectsField, choiceField } from '@/data/schemaFields';
import { type ContainedAdditionalEffect, DEFAULT_RATING_SKILL, SPELL_ACTIONS, type SpellAction } from '@/item/data/Spells';
import { FORMIDABLE } from '@/dice/Difficulty';
import { withSpellRatingSkill } from '@/migrations/11-spells-name-their-rating-skill';

/**
 * The data of a spell: a magic action a character casts with a magic skill, at a base difficulty to which its Additional
 * Effects add (CRB pp. 210–219). A new spell is Custom, at Easy: picking an action fills the rest.
 */
export abstract class SpellDataModel extends BaseItemDataModel {
	abstract action: SpellAction;

	/**
	 * The base difficulty, in Difficulty dice.
	 */
	abstract difficulty: number;

	abstract isAttack: boolean;

	/**
	 * The names of the magic skills that may cast the spell.
	 */
	abstract skills: string[];

	/**
	 * The damage an attack adds to the characteristic linked to its skill: an implement's bonus, which the table enters.
	 */
	abstract baseDamage: number;

	abstract additionalEffects: ContainedAdditionalEffect[];

	/**
	 * The skill whose ranks the qualities its Additional Effects rate by the caster's ranks count.
	 */
	abstract ratingSkill: string;

	/**
	 * Gives a spell stored up to 0.7.1, whose Additional Effects named the skill each of their qualities counted, the skill
	 * they counted.
	 * @inheritDoc
	 */
	static override migrateData(source: Parameters<typeof withSpellRatingSkill>[0]) {
		withSpellRatingSkill(source);
		return super.migrateData(source) as typeof source;
	}

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			action: choiceField(SPELL_ACTIONS, 'custom'),
			difficulty: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, max: FORMIDABLE, initial: 1 }),
			isAttack: new fields.BooleanField({ initial: false }),
			skills: new fields.ArrayField(new fields.StringField()),
			baseDamage: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
			additionalEffects: additionalEffectsField(),
			ratingSkill: new fields.StringField({ required: true, nullable: false, initial: DEFAULT_RATING_SKILL }),
		};
	}
}
