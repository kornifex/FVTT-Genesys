/** @file Tests for how a sheet's components read its document: never through a proxy, and again on each render of the sheet. */

import { describe, expect, it } from 'vitest';
import { computed, createApp, isProxy, shallowReactive, watch, watchEffect } from 'vue';
import { type DocumentSheetContext, provideSheetContext, useSheetContext } from '@/vue/SheetContext';
import { useRendered, useSheetDocument } from '@/vue/useSheetDocument';

type FakeDocument = { name: string };

/**
 * A sheet's Vue app, with no component mounted: `setup` runs as a component's setup would, with the sheet's context to
 * inject, and `render` is what the sheet calls on each of its later renders.
 */
function sheetApp<Context>(context: Context) {
	const app = createApp({});
	const render = provideSheetContext(app, context);
	return { render, setup: <T>(fn: () => T) => app.runWithContext(fn) };
}

function documentContext<DocumentType>(document: DocumentType, editable = true): DocumentSheetContext<DocumentType, 'sheet'> {
	return { sheet: 'sheet', document, editable };
}

describe('useSheetDocument', () => {
	it('reads the document again on each render of the sheet, after Foundry changed it out of sight', () => {
		const actor: FakeDocument = { name: 'Before' };
		const sheet = sheetApp(documentContext(actor));
		const { document } = sheet.setup(() => useSheetDocument<FakeDocument>());
		const shown: string[] = [];
		watchEffect(() => shown.push(document.value.name), { flush: 'sync' });

		actor.name = 'After';
		expect(shown).toEqual(['Before']);

		sheet.render(documentContext(actor));
		expect(shown).toEqual(['Before', 'After']);
	});

	it('reads the document again when a render hands the same context', () => {
		const actor: FakeDocument = { name: 'Before' };
		const context = documentContext(actor);
		const sheet = sheetApp(context);
		const { document } = sheet.setup(() => useSheetDocument<FakeDocument>());
		const shown: string[] = [];
		watchEffect(() => shown.push(document.value.name), { flush: 'sync' });

		actor.name = 'After';
		sheet.render(context);

		expect(shown).toEqual(['Before', 'After']);
	});

	it('hands the document itself, never a reactive proxy that could write into it', () => {
		const actor: FakeDocument = { name: 'Hero' };
		const { document } = sheetApp(documentContext(actor)).setup(() => useSheetDocument<FakeDocument>());

		expect(document.value).toBe(actor);
		expect(isProxy(document.value)).toBe(false);
	});

	it('recomputes what a computed derives from the document on each render', () => {
		const actor = { items: [{ type: 'talent' }] };
		const sheet = sheetApp(documentContext(actor));
		const talents = sheet.setup(() => {
			const { document } = useSheetDocument<typeof actor>();
			return computed(() => document.value.items.filter((item) => item.type === 'talent').length);
		});
		const shown: number[] = [];
		watchEffect(() => shown.push(talents.value), { flush: 'sync' });

		actor.items.push({ type: 'talent' }, { type: 'weapon' });
		sheet.render(documentContext(actor));

		expect(shown).toEqual([1, 2]);
	});

	it('tells whether the user can edit the document, as the latest render does', () => {
		const actor: FakeDocument = { name: 'Hero' };
		const sheet = sheetApp(documentContext(actor, true));
		const { editable } = sheet.setup(() => useSheetDocument<FakeDocument>());

		sheet.render(documentContext(actor, false));

		expect(editable.value).toBe(false);
	});

	it('hands the sheet the component renders in', () => {
		const { sheet } = sheetApp(documentContext({ name: 'Hero' })).setup(() => useSheetDocument<FakeDocument, string>());

		expect(sheet).toBe('sheet');
	});
});

describe('useRendered', () => {
	it('reads a document a prop passes again on each render of the sheet, though the prop stays the same document', () => {
		const item: FakeDocument = { name: 'Sword' };
		const props = shallowReactive({ item });
		const sheet = sheetApp(documentContext({ name: 'Hero' }));
		const shownItem = sheet.setup(() => useRendered(() => props.item));
		const shown: string[] = [];
		watchEffect(() => shown.push(shownItem.value.name), { flush: 'sync' });

		item.name = 'Broken Sword';
		sheet.render(documentContext({ name: 'Hero' }));

		expect(shown).toEqual(['Sword', 'Broken Sword']);
	});

	it('reads the document another prop passes at once', () => {
		const props = shallowReactive({ item: { name: 'Sword' } });
		const shownItem = sheetApp(documentContext({ name: 'Hero' })).setup(() => useRendered(() => props.item));
		const shown: string[] = [];
		watchEffect(() => shown.push(shownItem.value.name), { flush: 'sync' });

		props.item = { name: 'Axe' };

		expect(shown).toEqual(['Sword', 'Axe']);
	});
});

describe('useSheetContext', () => {
	it("runs a watcher of the context on each render of the sheet, for what reads the sheet's documents asynchronously", () => {
		const sheet = sheetApp({ points: 1 });
		const context = sheet.setup(() => useSheetContext<{ points: number }>());
		let runs = 0;
		watch(context, () => runs++, { flush: 'sync' });

		sheet.render(context.value);
		sheet.render({ points: 2 });

		expect(runs).toBe(2);
	});

	it('refuses a component outside a Vue sheet', () => {
		expect(() => createApp({}).runWithContext(() => useSheetContext())).toThrow();
	});
});
