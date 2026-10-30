import { AdversaryDataModel } from '@/actor/data/AdversaryDataModel';
import { CombatPool, combatPoolField } from '@/data/schemaFields';
import { TokenAttributeDetails } from '@/token/GenesysTokenDocument';

/**
 * The data of a nemesis, who suffers wounds and strain.
 */
export abstract class NemesisDataModel extends AdversaryDataModel {
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

	/**
	 * Show the wounds and strain on the bars of the nemesis's token, which is linked to the actor.
	 * @inheritDoc
	 */
	protected override async _preCreate() {
		const prototypeToken = {
			bar1: { attribute: 'wounds' },
			bar2: { attribute: 'strain' },
			actorLink: true,
		};

		this.parent.updateSource({ prototypeToken });
	}

	static override defineSchema() {
		return {
			...super.defineSchema(),
			wounds: combatPoolField(),
			strain: combatPoolField(),
		};
	}
}
