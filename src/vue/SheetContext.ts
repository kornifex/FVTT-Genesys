/**
 * @file Provides typing data for RootContext injected into Vue apps.
 */

import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysItem } from '@/item/GenesysItem';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysActorSheet } from '@/actor/GenesysActorSheet';

export type ContextBase = object;

/**
 * This symbol is used by Vue apps in the system to inject sheet data.
 */
export const RootContext = Symbol('Vue Root Context');

/**
 * Typing for context data injected into Vue sheets.
 */
export interface BaseSheetContext extends ContextBase {
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
}

/**
 * Typing for context data injected into Vue Actor sheets.
 */
export interface ActorSheetContext<
	ActorDataModel extends foundry.abstract.DataModel = foundry.abstract.DataModel,
	SheetType extends GenesysActorSheet<ActorDataModel> = GenesysActorSheet<ActorDataModel>,
> extends BaseSheetContext {
	sheet: SheetType;

	data: BaseSheetContext['data'] & {
		actor: GenesysActor<ActorDataModel>;
	};
}

/**
 * Typing for context data injected into Vue Item sheets.
 */
export interface ItemSheetContext<
	ItemDataModel extends BaseItemDataModel = BaseItemDataModel,
	SheetType extends GenesysItemSheet<ItemDataModel> = GenesysItemSheet<ItemDataModel>,
> extends BaseSheetContext {
	sheet: SheetType;

	data: BaseSheetContext['data'] & {
		item: GenesysItem<ItemDataModel>;
	};
}
