/** @file Tests for how a drag's data is read, and how a drag from the sidebar or a compendium is marked with its type. */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { addGenesysDragType, dragData, extractDataFromDragTransferTypes } from '@/data/DragTransferData';

/** A drag's DataTransfer, holding text and the types set on it. */
function transfer(text: string) {
	const types: string[] = [];
	return {
		types,
		getData: (format: string) => (format === 'text/plain' ? text : ''),
		setData: (format: string) => void types.push(format),
	};
}

function dragEvent(text: string) {
	const dataTransfer = transfer(text);
	return { event: { dataTransfer } as unknown as DragEvent, types: dataTransfer.types };
}

describe('dragData', () => {
	it("reads the JSON a drag carries as text, Foundry's or the system's", () => {
		expect(dragData(transfer('{"type":"Item","uuid":"Item.abc","genesysType":"weapon"}'))).toEqual({
			type: 'Item',
			uuid: 'Item.abc',
			genesysType: 'weapon',
		});
	});

	it('is empty when the drag carries no text, or no DataTransfer at all', () => {
		expect(dragData(transfer(''))).toEqual({});
		expect(dragData(null)).toEqual({});
		expect(dragData(undefined)).toEqual({});
	});

	it("is empty when the drag's text isn't a JSON object, like text dragged from a web page", () => {
		expect(dragData(transfer('Some selected text'))).toEqual({});
		expect(dragData(transfer('null'))).toEqual({});
		expect(dragData(transfer('42'))).toEqual({});
		expect(dragData(transfer('["Item"]'))).toEqual({});
	});
});

describe('addGenesysDragType', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function documents(byUuid: Record<string, { type: string }>) {
		vi.stubGlobal('fromUuidSync', (uuid: string) => byUuid[uuid] ?? null);
	}

	it('marks the drag of a document of an accepted type with its Genesys type and uuid', () => {
		documents({ 'Compendium.world.gear.Item.AbC': { type: 'weapon' } });
		const { event, types } = dragEvent('{"type":"Item","uuid":"Compendium.world.gear.Item.AbC"}');

		addGenesysDragType(event, ['Actor', 'Item']);

		expect(extractDataFromDragTransferTypes(types)).toEqual({ genesysType: 'weapon', uuid: 'Compendium.world.gear.Item.AbC' });
	});

	it('leaves the drag of a document of another type unmarked', () => {
		documents({ 'Actor.abc': { type: 'character' } });
		const { event, types } = dragEvent('{"type":"Actor","uuid":"Actor.abc"}');

		addGenesysDragType(event, ['Item']);

		expect(types).toEqual([]);
	});

	it('leaves a drag unmarked when it names no document, or one that is gone', () => {
		documents({});
		const withoutUuid = dragEvent('{"type":"Item"}');
		const gone = dragEvent('{"type":"Item","uuid":"Item.gone"}');
		const notJson = dragEvent('Some selected text');

		addGenesysDragType(withoutUuid.event, ['Item']);
		addGenesysDragType(gone.event, ['Item']);
		addGenesysDragType(notJson.event, ['Item']);

		expect([withoutUuid.types, gone.types, notJson.types]).toEqual([[], [], []]);
	});
});
