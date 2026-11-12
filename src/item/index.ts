import { GenesysItem } from '@/item/GenesysItem';
import { register as registerSheets } from '@/item/sheets';
import type { ItemDataModels, ItemType } from '@/item/ItemTypes';

import { AbilityDataModel } from '@/item/data/AbilityDataModel';
import { AdditionalEffectDataModel } from '@/item/data/AdditionalEffectDataModel';
import { ArchetypeDataModel } from '@/item/data/ArchetypeDataModel';
import { ArmorDataModel } from '@/item/data/ArmorDataModel';
import { AttachmentDataModel } from '@/item/data/AttachmentDataModel';
import { CareerDataModel } from '@/item/data/CareerDataModel';
import { ContainerDataModel } from '@/item/data/ContainerDataModel';
import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import { InjuryDataModel } from '@/item/data/InjuryDataModel';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import { SpellDataModel } from '@/item/data/SpellDataModel';
import { TalentDataModel } from '@/item/data/TalentDataModel';
import { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';

/**
 * Register the item document, its data models and its sheets with Foundry.
 */
export function register() {
	CONFIG.Item.documentClass = GenesysItem;

	registerDataModels();
	registerSheets();
}

// Typed by the item type → DataModel map that `itemsOfType` reads items with: an item type left out here, or registered
// with a DataModel that lacks the data the map promises, fails to compile.
const DATA_MODELS: { [T in ItemType]: abstract new (...args: never[]) => ItemDataModels[T] } = {
	ability: AbilityDataModel,
	additionalEffect: AdditionalEffectDataModel,
	archetype: ArchetypeDataModel,
	armor: ArmorDataModel,
	attachment: AttachmentDataModel,
	career: CareerDataModel,
	consumable: EquipmentDataModel,
	container: ContainerDataModel,
	injury: InjuryDataModel,
	gear: EquipmentDataModel,
	skill: SkillDataModel,
	spell: SpellDataModel,
	talent: TalentDataModel,
	quality: ItemQualityDataModel,
	weapon: WeaponDataModel,
	vehicleWeapon: VehicleWeaponDataModel,
};

function registerDataModels() {
	Object.assign(CONFIG.Item.dataModels, DATA_MODELS);
}
