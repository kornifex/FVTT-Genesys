/**
 * @file Base data shared by all Adversaries.
 */

import { isRelevantToAdversary } from '@/actor/data/RelevantTypes';
import { adversaryDefense } from '@/actor/data/Protection';
import { Characteristic, CharacteristicsContainer } from '@/data/Characteristics';
import { Defense } from '@/data/Actors';
import { TokenAttributeDetails } from '@/token/GenesysTokenDocument';

type Motivation = {
	name: string;
	description: string;
};

type Motivations = {
	strength: Motivation;
	flaw: Motivation;
	desire: Motivation;
	fear: Motivation;
};

/**
 * The data that every Adversary shares: minions, rivals and nemeses.
 */
export abstract class AdversaryDataModel extends foundry.abstract.DataModel {
	abstract characteristics: CharacteristicsContainer;
	abstract soak: number;
	abstract defense: Defense;
	abstract description: string;
	abstract source: string;
	abstract motivations: Motivations;
	abstract superCharacteristics: Set<Characteristic>;

	static readonly tokenAttributes: Record<string, TokenAttributeDetails> = {
		soak: {
			label: 'Soak',
			isBar: false,
			editable: false,
			valuePath: 'soak',
		},
	};

	/**
	 * Whether a Document type is relevant to an Adversary actor in a context.
	 */
	static isRelevantTypeForContext(this: void, context: Parameters<typeof isRelevantToAdversary>[0], type: string) {
		return isRelevantToAdversary(context, type);
	}

	/**
	 * Total value for Defense, capped as a character's is.
	 */
	get totalDefense(): Defense {
		return adversaryDefense(this.defense);
	}

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			characteristics: new fields.SchemaField({
				brawn: new fields.NumberField({ integer: true, initial: 0 }),
				agility: new fields.NumberField({ integer: true, initial: 0 }),
				intellect: new fields.NumberField({ integer: true, initial: 0 }),
				cunning: new fields.NumberField({ integer: true, initial: 0 }),
				willpower: new fields.NumberField({ integer: true, initial: 0 }),
				presence: new fields.NumberField({ integer: true, initial: 0 }),
			}),
			soak: new fields.NumberField({ integer: true, initial: 0 }),
			defense: new fields.SchemaField({
				melee: new fields.NumberField({ integer: true, initial: 0 }),
				ranged: new fields.NumberField({ integer: true, initial: 0 }),
			}),
			description: new fields.HTMLField(),
			source: new fields.HTMLField(),
			motivations: new fields.SchemaField({
				strength: new fields.SchemaField({
					name: new fields.StringField(),
					description: new fields.HTMLField(),
				}),
				flaw: new fields.SchemaField({
					name: new fields.StringField(),
					description: new fields.HTMLField(),
				}),
				desire: new fields.SchemaField({
					name: new fields.StringField(),
					description: new fields.HTMLField(),
				}),
				fear: new fields.SchemaField({
					name: new fields.StringField(),
					description: new fields.HTMLField(),
				}),
			}),
			superCharacteristics: new fields.SetField(new fields.StringField()),
		};
	}
}
