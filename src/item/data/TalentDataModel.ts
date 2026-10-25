import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import * as Talents from '@/item/data/Talents';

interface AbilityActivation {
	type: 'passive' | 'active';
	detail: string;
}

export abstract class TalentDataModel extends BaseItemDataModel {
	abstract tier: number;
	abstract activation: AbilityActivation;
	abstract ranked: 'yes' | 'no';
	abstract scalesWithRank: 'yes' | 'no';
	abstract rank: number;

	/**
	 * The tier the talent's latest rank was bought at.
	 */
	get effectiveTier() {
		return Talents.effectiveTier(this);
	}

	/**
	 * The tier the talent's next rank is bought at.
	 */
	get effectiveNextTier() {
		return Talents.effectiveNextTier(this);
	}

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			tier: new fields.NumberField({ integer: true, initial: 1, min: 1 }),
			activation: new fields.SchemaField({
				type: new fields.StringField({
					initial: 'passive',
					choices: ['active', 'passive'],
				}),
				detail: new fields.StringField(),
			}),
			ranked: new fields.StringField({
				initial: 'no',
				choices: ['yes', 'no'],
			}),
			scalesWithRank: new fields.StringField({
				initial: 'no',
				choices: ['yes', 'no'],
			}),
			rank: new fields.NumberField({ integer: true, initial: 1, min: 1 }),
		};
	}
}
