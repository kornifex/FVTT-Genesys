import type { GenesysCombatant } from '@/combat/GenesysCombatant';

/**
 * The data of a combatant: the Initiative Skill chosen for it.
 */
export abstract class CombatantDataModel extends foundry.abstract.TypeDataModel<foundry.data.fields.DataSchema, GenesysCombatant> {
	/** The name of the Initiative Skill chosen for the combatant, if one was. */
	abstract initiativeSkill: string | null;

	static override defineSchema() {
		return {
			initiativeSkill: new foundry.data.fields.StringField({ required: true, nullable: true, blank: false, initial: null }),
		};
	}
}
