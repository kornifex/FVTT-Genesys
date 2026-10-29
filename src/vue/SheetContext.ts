/**
 * @file Provides typing data for RootContext injected into Vue apps.
 */

import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysItem } from '@/item/GenesysItem';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysActorSheet } from '@/actor/GenesysActorSheet';

/**
 * This symbol is used by Vue apps in the system to inject sheet data.
 */
export const RootContext = Symbol('Vue Root Context');

/**
 * Typing for context data injected into Vue sheets.
 */
export type BaseSheetContext = {
	/**
	 * A reference to the Sheet instance the vue app is rendering.
	 */
	sheet: foundry.applications.api.DocumentSheetV2;

	/**
	 * Rendering data of the sheet.
	 */
	data: {
		/**
		 * Whether the user can edit the sheet's document.
		 */
		editable: boolean;
	};
};

/**
 * Typing for context data injected into Vue Actor sheets.
 */
export type ActorSheetContext<
	ActorDataModel extends foundry.abstract.DataModel = foundry.abstract.DataModel,
	SheetType extends GenesysActorSheet<ActorDataModel> = GenesysActorSheet<ActorDataModel>,
> = BaseSheetContext & {
	sheet: SheetType;

	data: {
		actor: GenesysActor<ActorDataModel>;
	};
};

/**
 * Typing for context data injected into Vue Item sheets.
 */
export type ItemSheetContext<
	ItemDataModel extends BaseItemDataModel = BaseItemDataModel,
	SheetType extends GenesysItemSheet<ItemDataModel> = GenesysItemSheet<ItemDataModel>,
> = BaseSheetContext & {
	sheet: SheetType;

	data: {
		item: GenesysItem<ItemDataModel>;
	};
};
