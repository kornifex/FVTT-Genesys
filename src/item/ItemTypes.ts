/** @file The item types of the system and their DataModels, and an actor's items read by type. */

import type { GenesysItem } from '@/item/GenesysItem';
import type { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import type { AbilityDataModel } from '@/item/data/AbilityDataModel';
import type { ArchetypeDataModel } from '@/item/data/ArchetypeDataModel';
import type { ArmorDataModel } from '@/item/data/ArmorDataModel';
import type { CareerDataModel } from '@/item/data/CareerDataModel';
import type { ContainerDataModel } from '@/item/data/ContainerDataModel';
import type { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import type { InjuryDataModel } from '@/item/data/InjuryDataModel';
import type { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';
import type { SkillDataModel } from '@/item/data/SkillDataModel';
import type { TalentDataModel } from '@/item/data/TalentDataModel';
import type { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';
import type { WeaponDataModel } from '@/item/data/WeaponDataModel';

/**
 * The DataModel of each item type, as `src/item/index.ts` registers it.
 */
export type ItemDataModels = {
	ability: AbilityDataModel;
	archetype: ArchetypeDataModel;
	armor: ArmorDataModel;
	career: CareerDataModel;
	consumable: EquipmentDataModel;
	container: ContainerDataModel;
	gear: EquipmentDataModel;
	injury: InjuryDataModel;
	quality: ItemQualityDataModel;
	skill: SkillDataModel;
	talent: TalentDataModel;
	vehicleWeapon: VehicleWeaponDataModel;
	weapon: WeaponDataModel;
};

/**
 * An item type of the system.
 */
export type ItemType = keyof ItemDataModels;

// Whether a member of a type is read-only. A DataModel's getters are, having no setter, and its stored fields never are.
type IsReadonly<O, K extends keyof O> =
	(<V>() => V extends Pick<O, K> ? 1 : 2) extends <V>() => V extends { -readonly [P in K]: O[P] } ? 1 : 2 ? false : true;

/**
 * The data a DataModel stores: its fields, without its methods, the values its getters derive from the fields, and the
 * members every DataModel has. A getter is told from a field by being read-only, so a DataModel declares no read-only
 * field.
 */
export type SystemSource<DataModel extends foundry.abstract.DataModel> = Omit<
	{
		[K in keyof DataModel as DataModel[K] extends (...args: never[]) => unknown
			? never
			: IsReadonly<DataModel, K> extends true
				? never
				: K]: DataModel[K];
	},
	keyof foundry.abstract.DataModel
>;

/**
 * An item stored in another item's data, such as an Archetype's granted items or a Career's skills: the plain source
 * the dropped item gave, with none of a document's methods.
 */
export type StoredItem<System = SystemSource<BaseItemDataModel>> = {
	name: string;
	type: string;
	img: string;
	system: System;
	flags?: Record<string, Record<string, unknown> | undefined>;
};

/**
 * An item type whose DataModel is a piece of equipment, with an Equipment State.
 */
type EquipmentType = { [T in ItemType]: ItemDataModels[T] extends EquipmentDataModel ? T : never }[ItemType];

/**
 * The item types whose DataModel is a piece of equipment.
 */
export const EQUIPMENT_TYPES = [
	'weapon',
	'vehicleWeapon',
	'armor',
	'consumable',
	'gear',
	'container',
] as const satisfies readonly EquipmentType[];

/**
 * The items of a type, or of any of several types, among items read as plain data, in item order: each keeps its own
 * members, and its `system` holds the data of its type's DataModel.
 */
export function ofType<I extends { type: string }, T extends ItemType>(items: Iterable<I>, type: T | readonly T[]) {
	const types: readonly string[] = typeof type === 'string' ? [type] : type;

	// Foundry builds each item's data with the DataModel registered for its type, so the type tells the data.
	return Array.from(items).filter((item) => types.includes(item.type)) as (I & { system: SystemSource<ItemDataModels[T]> })[];
}

/**
 * The items an actor holds of a type, or of any of several types, in item order.
 */
export function itemsOfType<T extends ItemType>(actor: { items: Iterable<Item> }, type: T | readonly T[]) {
	// Foundry builds each item's data with the DataModel registered for its type, so the type tells the DataModel.
	return ofType(actor.items, type) as unknown as GenesysItem<ItemDataModels[T]>[];
}
