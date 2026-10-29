/** @file Tests for how a drag's data is read, and how a drag from the sidebar or a compendium is marked with its type. */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	addGenesysDragType,
	constructDragTransferTypeFromData,
	dragData,
	draggedGenesysType,
	extractDataFromDragTransferTypes,
	startDocumentDrag,
} from '@/data/DragTransferData';

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

	function stubDocuments(byUuid: Record<string, { type: string }>) {
		vi.stubGlobal('fromUuidSync', (uuid: string) => byUuid[uuid] ?? null);
	}

	it('marks the drag of a document of an accepted type with its Genesys type and uuid', () => {
		stubDocuments({ 'Compendium.world.gear.Item.AbC': { type: 'weapon' } });
		const { event, types } = dragEvent('{"type":"Item","uuid":"Compendium.world.gear.Item.AbC"}');

		addGenesysDragType(event, ['Actor', 'Item']);

		expect(extractDataFromDragTransferTypes(types)).toEqual({ genesysType: 'weapon', uuid: 'Compendium.world.gear.Item.AbC' });
	});

	it('leaves the drag of a document of another type unmarked', () => {
		stubDocuments({ 'Actor.abc': { type: 'character' } });
		const { event, types } = dragEvent('{"type":"Actor","uuid":"Actor.abc"}');

		addGenesysDragType(event, ['Item']);

		expect(types).toEqual([]);
	});

	it('leaves a drag unmarked when it names no document, or one that is gone', () => {
		stubDocuments({});
		const withoutUuid = dragEvent('{"type":"Item"}');
		const gone = dragEvent('{"type":"Item","uuid":"Item.gone"}');
		const notJson = dragEvent('Some selected text');

		addGenesysDragType(withoutUuid.event, ['Item']);
		addGenesysDragType(gone.event, ['Item']);
		addGenesysDragType(notJson.event, ['Item']);

		expect([withoutUuid.types, gone.types, notJson.types]).toEqual([[], [], []]);
	});
});

describe('draggedGenesysType', () => {
	it("reads the Genesys type of a drag's document from its formats, and nothing from a drag of no Genesys document", () => {
		const types = (...formats: string[]) => ({ dataTransfer: { types: formats } }) as unknown as DragEvent;

		expect(draggedGenesysType(types('text/plain', constructDragTransferTypeFromData('vehicleWeapon', 'Item.abc')))).toBe(
			'vehicleWeapon',
		);
		expect(draggedGenesysType(types('text/plain'))).toBeUndefined();
	});
});

describe('startDocumentDrag', () => {
	/** A drag's DataTransfer that keeps the data set on it, by format. */
	function recordingEvent() {
		const data = new Map<string, string>();
		const dataTransfer = {
			get types() {
				return [...data.keys()];
			},
			getData: (format: string) => data.get(format) ?? '',
			setData: (format: string, value: string) => void data.set(format, value),
		};
		return { dataTransfer } as unknown as DragEvent;
	}

	it("carries a dragged document's drag data, with its Genesys type, readable during the drag and on the drop", () => {
		const event = recordingEvent();

		startDocumentDrag(event, { uuid: 'Actor.pc.Item.sword', documentName: 'Item', type: 'weapon' });

		expect(dragData(event.dataTransfer)).toEqual({ uuid: 'Actor.pc.Item.sword', type: 'Item', genesysType: 'weapon' });
		expect(draggedGenesysType(event)).toBe('weapon');
	});

	it('adds what the drag source gives, such as the vehicle a crew member is dragged out of', () => {
		const event = recordingEvent();

		startDocumentDrag(event, { uuid: 'Actor.pilot', documentName: 'Actor', type: 'character' }, { sourceVehicleUuid: 'Actor.ship' });

		expect(dragData(event.dataTransfer)).toEqual({
			uuid: 'Actor.pilot',
			type: 'Actor',
			genesysType: 'character',
			sourceVehicleUuid: 'Actor.ship',
		});
	});
});
