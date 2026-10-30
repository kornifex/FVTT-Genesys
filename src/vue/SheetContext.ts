/**
 * @file The context a sheet hands its Vue app on each render, and how the app receives it.
 */

import { type App, inject, type InjectionKey, type ShallowRef, shallowRef, triggerRef } from 'vue';

/**
 * The key the sheet's context is provided under, read through `useSheetContext`.
 */
const RootContext: InjectionKey<Readonly<ShallowRef<unknown>>> = Symbol('Vue Root Context');

/**
 * What a document sheet hands its Vue app: the sheet, its document, and whether the user can edit it.
 */
export type DocumentSheetContext<DocumentType, SheetType = foundry.applications.api.DocumentSheetV2.Any> = {
	sheet: SheetType;
	document: DocumentType;
	editable: boolean;
};

/**
 * Provide a sheet's context to its Vue app, and return the function that hands the app the context of each later render.
 *
 * The context sits in a shallow ref, so that Vue never wraps the Foundry documents it holds in reactive proxies: Foundry
 * changes them out of Vue's sight. Each render triggers the ref instead, even with the same context, and whatever read it
 * reads again: the ref is the components' one render signal.
 */
export function provideSheetContext<Context>(app: App, context: Context): (context: Context) => void {
	const rendered = shallowRef(context);
	app.provide(RootContext, rendered);

	return (next) => {
		// Assigning another context triggers the ref; the same one doesn't, so it is triggered by hand.
		if (rendered.value === next) {
			triggerRef(rendered);
		} else {
			rendered.value = next;
		}
	};
}

/**
 * The context of the sheet or prompt the component renders in, set again on each of its renders.
 */
export function useSheetContext<Context>(): Readonly<ShallowRef<Context>> {
	const context = inject(RootContext);
	if (!context) {
		throw new Error('This component renders in a Vue sheet, which provides its context');
	}

	return context as Readonly<ShallowRef<Context>>;
}
