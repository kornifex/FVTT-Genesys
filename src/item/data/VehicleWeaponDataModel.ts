import { BaseWeaponDataModel } from '@/item/data/BaseWeaponDataModel';

type FiringArc = {
	fore: boolean;
	aft: boolean;
	port: boolean;
	starboard: boolean;
};

/**
 * The data of a vehicle weapon, with its firing arcs.
 */
export abstract class VehicleWeaponDataModel extends BaseWeaponDataModel {
	/**
	 * Directions a weapon can be fired, based on its mounting.
	 */
	abstract firingArc: FiringArc;

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			...super.defineSchema(),
			firingArc: new fields.SchemaField({
				fore: new fields.BooleanField({ initial: false }),
				aft: new fields.BooleanField({ initial: false }),
				port: new fields.BooleanField({ initial: false }),
				starboard: new fields.BooleanField({ initial: false }),
			}),
		};
	}
}
