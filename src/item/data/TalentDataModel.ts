import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import * as Talents from '@/item/data/Talents';
import { AbilityActivation, activationField, choiceField } from '@/data/schemaFields';

// Whether a talent is ranked, and whether its effects scale with its rank, are stored as words.
const YES_NO = ['yes', 'no'] as const;

type YesNo = (typeof YES_NO)[number];

/**
 * The data of a talent.
 */
export abstract class TalentDataModel extends BaseItemDataModel {
	abstract tier: number;
	abstract activation: AbilityActivation;
	abstract ranked: YesNo;
	abstract scalesWithRank: YesNo;
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

	/**
	 * Read a tier saved above tier 5, before the field had a maximum, as tier 5. Foundry also clamps it when it cleans
	 * the field, but that cleaning isn't meant to fix old data, and an out-of-range value could fail
	 * validation instead.
	 * @inheritDoc
	 */
	static override migrateData(source: { tier?: unknown }) {
		if (typeof source.tier === 'number' && source.tier > Talents.MAX_TIER) {
			source.tier = Talents.MAX_TIER;
		}

		return super.migrateData(source) as typeof source;
	}

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			tier: new fields.NumberField({ integer: true, initial: 1, min: 1, max: Talents.MAX_TIER }),
			activation: activationField(),
			ranked: choiceField(YES_NO, 'no'),
			scalesWithRank: choiceField(YES_NO, 'no'),
			rank: new fields.NumberField({ integer: true, initial: 1, min: 1 }),
		};
	}
}
