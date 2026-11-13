/**
 * @file Base data shared by all Adversaries.
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import { isRelevantToAdversary } from '@/actor/data/RelevantTypes';
import { adversaryDefense } from '@/actor/data/Protection';
import { Characteristic, CharacteristicsContainer } from '@/data/Characteristics';
import { Defense } from '@/data/Actors';
import { TokenAttributeDetails } from '@/token/GenesysTokenDocument';
import {
	characteristicsField,
	defenseField,
	Motivations,
	motivationsField,
	pilotedVehicleDefenseField,
	silhouetteField,
} from '@/data/schemaFields';

/**
 * The actor types of the Adversaries.
 */
export type AdversaryType = 'minion' | 'rival' | 'nemesis';

/**
 * The data that every Adversary shares: Minion Groups, Rivals and Nemeses.
 */
export abstract class AdversaryDataModel extends foundry.abstract.TypeDataModel<
	foundry.data.fields.DataSchema,
	GenesysActor<AdversaryType>
> {
	abstract characteristics: CharacteristicsContainer;
	abstract soak: number;
	abstract defense: Defense;
	abstract description: string;
	abstract source: string;
	abstract motivations: Motivations;
	abstract superCharacteristics: Set<Characteristic>;
	abstract silhouette: number;
	abstract pilotedVehicleDefense: number;

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
	 * The defense that sources such as cover and Guarded Stance provide, which effects write with Foundry's Upgrade mode
	 * so that the best one is kept (CRB p. 106). It is derived, never stored, and reset to none before effects apply.
	 */
	declare providedDefense: Defense;

	override prepareBaseData() {
		super.prepareBaseData();
		this.providedDefense = { melee: 0, ranged: 0 };
	}

	/**
	 * The adversary's defense: the best of their stat block's and the provided one, increased by the effects that add to
	 * `system.defense`, up to 4.
	 */
	get totalDefense(): Defense {
		// The stat block is the defense the GM typed, stored before effects: what they add to it is an increase, which
		// stacks with cover rather than vying with it (CRB p. 106). The class's schema type is the generic one, so
		// `_source` doesn't know its fields.
		const statBlock = (this._source as { defense: Defense }).defense;
		return adversaryDefense(statBlock, this.providedDefense, {
			melee: this.defense.melee - statBlock.melee,
			ranged: this.defense.ranged - statBlock.ranged,
		});
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
			silhouette: silhouetteField(),
			pilotedVehicleDefense: pilotedVehicleDefenseField(),
		};
	}
}
