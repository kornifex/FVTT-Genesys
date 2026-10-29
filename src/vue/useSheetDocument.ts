/**
 * @file How a sheet's components read what they show from Foundry: through the sheet's context, which each render of the
 * sheet sets again.
 */

import { computed, type Ref, toRef } from 'vue';
import type { GenesysActor } from '@/actor/GenesysActor';
import type { GenesysItem } from '@/item/GenesysItem';
import { type DocumentSheetContext, useSheetContext } from '@/vue/SheetContext';

/**
 * A Foundry value the component shows, read again on each render of its sheet: a document a prop passes, which stays
 * the same document while Foundry changes it out of Vue's sight, so that Vue wouldn't render the component again.
 */
export function useRendered<T>(read: () => T): Readonly<Ref<T>> {
	const context = useSheetContext();

	return toRef(() => {
		// Reading the context subscribes the reader to the sheet's renders.
		void context.value;
		return read();
	});
}

/**
 * What a sheet reads of its document. The refs read it again on each render of the sheet; the sheet itself never
 * changes, so it is a plain value.
 */
type SheetDocument<DocumentType extends SheetDocumentType, SheetType> = {
	sheet: SheetType;
	/**
	 * The document itself, never a reactive proxy.
	 */
	document: Readonly<Ref<DocumentType>>;
	/**
	 * The document's system data.
	 */
	system: Readonly<Ref<DocumentType['systemData']>>;
	editable: Readonly<Ref<boolean>>;
};

/**
 * A document a sheet shows: an actor or an item, with its typed system data.
 */
type SheetDocumentType = { systemData: object };

/**
 * The document of the sheet the component renders in. A component reads it through `document` and `system`, which read
 * it again on each render of the sheet: Foundry changes it out of Vue's sight.
 *
 * Another part of the document (an item, a field of its system data) is read through a getter as well,
 * `toRef(() => document.value.items.get(id))`, not a `computed`: a computed only tells its readers when its value is
 * another one, and a part keeps its identity while Foundry changes it.
 */
export function useSheetDocument<
	DocumentType extends SheetDocumentType = GenesysActor | GenesysItem,
	SheetType = foundry.applications.api.DocumentSheetV2,
>(): SheetDocument<DocumentType, SheetType> {
	const context = useSheetContext<DocumentSheetContext<DocumentType, SheetType>>();

	return {
		sheet: context.value.sheet,
		document: toRef(() => context.value.document),
		system: toRef(() => context.value.document.systemData),
		editable: computed(() => context.value.editable),
	};
}
