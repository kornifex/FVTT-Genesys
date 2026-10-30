import { AdversaryDataModel } from '@/actor/data/AdversaryDataModel';
import { GenesysActor } from '@/actor/GenesysActor';
import { groupSkillRank, groupWoundThreshold, remainingMembers } from '@/actor/data/MinionGroup';
import { HasPreCreate } from '@/data/HasPreCreate';
import { TokenAttributeDetails } from '@/token/GenesysTokenDocument';
import { ValueWithThreshold, valueWithThresholdField } from '@/data/schemaFields';

/**
 * The data of a Minion Group.
 */
export abstract class MinionDataModel extends AdversaryDataModel implements HasPreCreate<GenesysActor<MinionDataModel>> {
	abstract groupSize: number;
	abstract wounds: ValueWithThreshold;

	static override readonly tokenAttributes: Record<string, TokenAttributeDetails> = {
		wounds: {
			label: 'Genesys.Labels.Wounds',
			isBar: true,
			editable: true,
			valuePath: 'wounds.value',
			maxPath: 'groupWoundThreshold',
		},
		members: {
			label: 'Genesys.Labels.RemainingMembers',
			isBar: false,
			editable: false,
			valuePath: 'remainingMembers',
		},
		...AdversaryDataModel.tokenAttributes,
	};

	/**
	 * The Minion Group's wound threshold, which its token's wounds bar reaches.
	 */
	get groupWoundThreshold() {
		return groupWoundThreshold(this);
	}

	/**
	 * How many of the Minion Group's members are still standing.
	 */
	get remainingMembers() {
		return remainingMembers(this);
	}

	/**
	 * The rank the Minion Group rolls each of its skills at.
	 */
	get groupSkillRank() {
		return groupSkillRank(this);
	}

	async preCreate(actor: GenesysActor<MinionDataModel>, _data: unknown, _options: unknown, _user: User.Stored) {
		const prototypeToken = {
			bar1: { attribute: 'wounds' },
			bar2: { attribute: 'members' },
		};

		actor.updateSource({ prototypeToken });
	}

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			groupSize: new fields.NumberField({ initial: 4, integer: true }),
			wounds: valueWithThresholdField(),
		};
	}
}
