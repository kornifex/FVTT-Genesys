import { GenesysActor } from '@/actor/GenesysActor';
import { AdversaryDataModel } from '@/actor/data/AdversaryDataModel';
import { CombatPool, combatPoolField } from '@/data/schemaFields';
import { HasPreCreate } from '@/data/HasPreCreate';
import { TokenAttributeDetails } from '@/token/GenesysTokenDocument';

/**
 * The data of a nemesis, who suffers wounds and strain.
 */
export abstract class NemesisDataModel extends AdversaryDataModel implements HasPreCreate<GenesysActor<NemesisDataModel>> {
	abstract wounds: CombatPool;
	abstract strain: CombatPool;

	static override readonly tokenAttributes: Record<string, TokenAttributeDetails> = {
		wounds: {
			label: 'Genesys.Labels.Wounds',
			isBar: true,
			editable: true,
			valuePath: 'wounds.value',
			maxPath: 'wounds.max',
		},
		strain: {
			label: 'Genesys.Labels.Strain',
			isBar: true,
			editable: true,
			valuePath: 'strain.value',
			maxPath: 'strain.max',
		},
		...AdversaryDataModel.tokenAttributes,
	};

	async preCreate(
		actor: GenesysActor<NemesisDataModel>,
		_data: unknown,
		_options: DocumentModificationContext<GenesysActor<NemesisDataModel>>,
		_user: foundry.documents.BaseUser,
	) {
		const prototypeToken = {
			bar1: { attribute: 'wounds' },
			bar2: { attribute: 'strain' },
			actorLink: true,
		};

		actor.updateSource({ prototypeToken });
	}

	static override defineSchema() {
		return {
			...super.defineSchema(),
			wounds: combatPoolField(),
			strain: combatPoolField(),
		};
	}
}
