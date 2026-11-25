import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import { EquipmentState } from '@/item/data/EquipmentState';

/**
 * The data of gear, which may be Wearable Gear (GLOSSARY: Wearable Gear, Worn Gear).
 */
export abstract class GearDataModel extends EquipmentDataModel {
	/**
	 * Whether a character can wear the gear: Equip it, any number of pieces at once.
	 */
	abstract wearable: boolean;

	/**
	 * The encumbrance the gear counts for one of its quantity while it is worn, or null when it counts its encumbrance.
	 */
	abstract wornEncumbrance: number | null;

	/**
	 * Put the gear back to Carried in the update that leaves it Equipped but no longer wearable: only Wearable Gear can be
	 * Equipped.
	 * @inheritDoc
	 */
	protected override async _preUpdate(...[changes, options, user]: Parameters<EquipmentDataModel['_preUpdate']>) {
		const allowed = await super._preUpdate(changes, options, user);
		// Foundry cleans the changes with the item's schema first, so their `system` holds the gear's fields, expanded.
		const system: { wearable?: boolean; state?: EquipmentState } | undefined = changes.system;
		if (allowed !== false && system?.wearable === false && (system.state ?? this.state) === EquipmentState.Equipped) {
			system.state = EquipmentState.Carried;
		}

		return allowed;
	}

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			wearable: new fields.BooleanField({ initial: false }),
			wornEncumbrance: new fields.NumberField({
				required: true,
				nullable: true,
				integer: true,
				initial: null,
				// A `min` would clamp a negative value to 0 as Foundry cleans it: it is refused instead.
				validate: (value: unknown) => value === null || (typeof value === 'number' && value >= 0),
				// Foundry reports it after the field's path, among its own field errors, which it doesn't localize either.
				validationError: 'must be 0 or more',
			}),
		};
	}
}
