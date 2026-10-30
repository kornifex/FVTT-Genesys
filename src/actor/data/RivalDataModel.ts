import { AdversaryDataModel } from '@/actor/data/AdversaryDataModel';
import { TokenAttributeDetails } from '@/token/GenesysTokenDocument';
import { CombatPool, combatPoolField } from '@/data/schemaFields';

/**
 * The data of a rival, who suffers wounds but no strain.
 */
export abstract class RivalDataModel extends AdversaryDataModel {
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

	/**
	 * Show the wounds on the first bar of the rival's token.
	 * @inheritDoc
	 */
	protected override async _preCreate() {
		const prototypeToken = {
			bar1: { attribute: 'wounds' },
		};

		this.parent.updateSource({ prototypeToken });
	}

	static override defineSchema() {
		return {
			...super.defineSchema(),
			wounds: combatPoolField(),
		};
	}
}
