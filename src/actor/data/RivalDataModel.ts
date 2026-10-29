import { GenesysActor } from '@/actor/GenesysActor';
import { AdversaryDataModel } from '@/actor/data/AdversaryDataModel';
import { HasPreCreate } from '@/data/HasPreCreate';
import { TokenAttributeDetails } from '@/token/GenesysTokenDocument';
import { CombatPool, combatPoolField } from '@/data/schemaFields';

/**
 * The data of a rival, who suffers wounds but no strain.
 */
export abstract class RivalDataModel extends AdversaryDataModel implements HasPreCreate<GenesysActor<RivalDataModel>> {
	abstract wounds: CombatPool;

	static override readonly tokenAttributes: Record<string, TokenAttributeDetails> = {
		wounds: {
			label: 'Genesys.Labels.Wounds',
			isBar: true,
			editable: true,
			valuePath: 'wounds.value',
			maxPath: 'wounds.max',
		},
		...AdversaryDataModel.tokenAttributes,
	};

	async preCreate(
		actor: GenesysActor<RivalDataModel>,
		_data: unknown,
		_options: DocumentModificationContext<GenesysActor<RivalDataModel>>,
		_user: foundry.documents.BaseUser,
	) {
		const prototypeToken = {
			bar1: { attribute: 'wounds' },
		};

		actor.updateSource({ prototypeToken });
	}

	static override defineSchema() {
		return {
			...super.defineSchema(),
			wounds: combatPoolField(),
		};
	}
}
