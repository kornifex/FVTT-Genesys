import type { GenesysCombat } from '@/combat/GenesysCombat';
import type { StoredExtraSlot } from '@/combat/InitiativeSlots';
import type { ClaimData } from '@/combat/TurnOrder';

/**
 * The id of one of the combat's combatants. The Extra Slots and Claims holding it are rewritten, so it isn't read-only,
 * as a document's own id is.
 */
function combatantIdField() {
	return new foundry.data.fields.DocumentIdField({ nullable: false, readonly: false });
}

/**
 * The data of a combat: the Claims on its Initiative Slots and its Extra Slots.
 */
export abstract class CombatDataModel extends foundry.abstract.TypeDataModel<foundry.data.fields.DataSchema, GenesysCombat> {
	/** The Claims on the Initiative Slots, by round, then by slot id: the id of the claimant. */
	abstract claims: ClaimData;
	/** Every Extra Slot the combat stores, whatever round it starts from. */
	abstract extraSlots: StoredExtraSlot[];

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			claims: new fields.TypedObjectField(new fields.TypedObjectField(combatantIdField())),
			extraSlots: new fields.ArrayField(
				new fields.SchemaField({
					activationSource: combatantIdField(),
					initiative: new fields.NumberField({ required: true, nullable: true, initial: null }),
					startingRound: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
				}),
			),
		};
	}
}
