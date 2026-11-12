import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { additionalEffectFields } from '@/data/schemaFields';
import type { SpellQuality } from '@/item/data/Spells';

/**
 * The data of an Additional Effect, which spells copy when it is dropped on them (Tables III.2–5 to III.2–11, CRB
 * pp. 215–218).
 */
export abstract class AdditionalEffectDataModel extends BaseItemDataModel {
	/**
	 * The Difficulty dice the effect adds to the check.
	 */
	abstract difficulty: number;

	/**
	 * Whether the effect starts checked when the spell is cast.
	 */
	abstract startsChecked: boolean;

	/**
	 * The qualities the effect gives an attack.
	 */
	abstract qualities: SpellQuality[];

	/**
	 * The Critical rating the effect gives an attack, or `null` when it gives none.
	 */
	abstract critical: number | null;

	/**
	 * Whether an attack deals damage equal to twice the characteristic linked to its skill.
	 */
	abstract doublesDamageCharacteristic: boolean;

	static override defineSchema() {
		return {
			...super.defineSchema(),
			...additionalEffectFields(),
		};
	}
}
