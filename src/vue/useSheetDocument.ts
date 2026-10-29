/**
 * @file How a sheet's components read what they show from Foundry: through the sheet's context, which each render of the
 * sheet sets again.
 */

import { computed, type Ref, toRef } from 'vue';
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
 * The sheet's document, whether the user can edit it, and the sheet itself.
 */
type SheetDocument<DocumentType, SheetType> = {
	sheet: SheetType;
	/**
	 * The document itself, never a reactive proxy, read again on each render of the sheet.
	 */
	document: Readonly<Ref<DocumentType>>;
	editable: Readonly<Ref<boolean>>;
};

/**
 * The document of the sheet the component renders in. A component reads it through `document`, which reads it again
 * on each render of the sheet: Foundry changes it out of Vue's sight.
 *
 * A part of the document (its system data, an item) is read through a getter, `toRef(() => document.value.system)`,
 * not a `computed`: a computed only tells its readers when its value is another one, and a part keeps its identity
 * while Foundry changes it.
 */
export function useSheetDocument<DocumentType, SheetType = foundry.applications.api.DocumentSheetV2>(): SheetDocument<
	DocumentType,
	SheetType
> {
	const context = useSheetContext<DocumentSheetContext<DocumentType, SheetType>>();

	return {
		sheet: context.value.sheet,
		document: toRef(() => context.value.document),
		editable: computed(() => context.value.editable),
	};
}
