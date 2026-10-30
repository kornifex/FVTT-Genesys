/**
 * @file Base data shared by all Adversaries.
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import { isRelevantToAdversary } from '@/actor/data/RelevantTypes';
import { adversaryDefense } from '@/actor/data/Protection';
import { Characteristic, CharacteristicsContainer } from '@/data/Characteristics';
import { Defense } from '@/data/Actors';
import { TokenAttributeDetails } from '@/token/GenesysTokenDocument';
import { characteristicsField, defenseField, Motivations, motivationsField } from '@/data/schemaFields';

/**
 * The data that every Adversary shares: Minion Groups, Rivals and Nemeses.
 */
export abstract class AdversaryDataModel extends foundry.abstract.TypeDataModel<foundry.data.fields.DataSchema, GenesysActor> {
	abstract characteristics: CharacteristicsContainer;
	abstract soak: number;
	abstract defense: Defense;
	abstract description: string;
	abstract source: string;
	abstract motivations: Motivations;
	abstract superCharacteristics: Set<Characteristic>;

	static readonly tokenAttributes: Record<string, TokenAttributeDetails> = {
		soak: {
			label: 'Genesys.Labels.Soak',
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
			characteristics: characteristicsField(0),
			soak: new fields.NumberField({ integer: true, initial: 0 }),
			defense: defenseField(),
			description: new fields.HTMLField(),
			source: new fields.HTMLField(),
			motivations: motivationsField(),
			superCharacteristics: new fields.SetField(new fields.StringField()),
		};
	}
}
