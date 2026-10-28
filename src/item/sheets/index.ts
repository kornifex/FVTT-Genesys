import AbilitySheet from '@/vue/sheets/item/AbilitySheet.vue';
import { ArmorSheet } from '@/item/sheets/ArmorSheet';
import EquipmentSheet from '@/vue/sheets/item/EquipmentSheet.vue';
import InjurySheet from '@/vue/sheets/item/InjurySheet.vue';
import ItemQualitySheet from '@/vue/sheets/item/ItemQualitySheet.vue';
import SkillSheet from '@/vue/sheets/item/SkillSheet.vue';
import TalentSheet from '@/vue/sheets/item/TalentSheet.vue';
import { BaseWeaponSheet } from '@/item/sheets/BaseWeaponSheet';
import WeaponSheet from '@/vue/sheets/item/WeaponSheet.vue';
import VehicleWeaponSheet from '@/vue/sheets/item/VehicleWeaponSheet.vue';
import { ArchetypeSheet } from '@/item/sheets/ArchetypeSheet';
import { CareerSheet } from '@/item/sheets/CareerSheet';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import type { Component } from 'vue';

/**
 * Constructs a vue-based ItemSheet subclass with little extra processing.
 * @param vueComponent Vue component to use for the sheet.
 * @param sheetType Base class to use for the sheet.
 */
function basicSheet(vueComponent: Component, sheetType: typeof GenesysItemSheet<BaseItemDataModel> = GenesysItemSheet) {
	return class extends sheetType {
		override get vueComponent() {
			return vueComponent;
		}
	};
}

/**
 * Registers an item sheet of the system. The Foundry types we have only register AppV1 sheets, though Foundry takes ApplicationV2
 * ones (ADR 0005).
 */
function registerSheet(sheetClass: ConstructorOf<GenesysItemSheet>, options: RegisterSheetOptions) {
	Items.registerSheet('genesys', sheetClass as unknown as ConstructorOf<ItemSheet>, options);
}

/**
 * Registers Item sheets used by the system.
 */
export function register() {
	Items.unregisterSheet('core', ItemSheet);

	registerSheet(basicSheet(AbilitySheet), {
		types: ['ability'],
		makeDefault: true,
	});

	registerSheet(ArmorSheet, {
		types: ['armor'],
		makeDefault: true,
	});

	registerSheet(basicSheet(EquipmentSheet), {
		types: ['consumable', 'container', 'gear'],
		makeDefault: true,
	});

	registerSheet(basicSheet(InjurySheet), {
		types: ['injury'],
		makeDefault: true,
	});

	registerSheet(basicSheet(ItemQualitySheet), {
		types: ['quality'],
		makeDefault: true,
	});

	registerSheet(basicSheet(SkillSheet), {
		types: ['skill'],
		makeDefault: true,
	});

	registerSheet(basicSheet(TalentSheet), {
		types: ['talent'],
		makeDefault: true,
	});

	registerSheet(basicSheet(WeaponSheet, BaseWeaponSheet), {
		types: ['weapon'],
		makeDefault: true,
	});

	registerSheet(basicSheet(VehicleWeaponSheet, BaseWeaponSheet), {
		types: ['vehicleWeapon'],
		makeDefault: true,
	});

	registerSheet(ArchetypeSheet, {
		types: ['archetype'],
		makeDefault: true,
	});

	registerSheet(CareerSheet, {
		types: ['career'],
		makeDefault: true,
	});
}
