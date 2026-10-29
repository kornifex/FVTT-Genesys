export type DragTransferData = {
	uuid?: string;
	type?: string;
	genesysType?: string;
};

export type CrewDragTransferData = DragTransferData & {
	sourceVehicleUuid?: string;
};

const GENESYS_DRAG_TYPE_PREFIX = 'genesys';
const UPPER_CASE_PATTERN = /([A-Z]+)/g;
const ENCODED_UPPER_CASE_PATTERN = /\|(\d+)\|/g;

function encodeUpperCase(text: string) {
	return text.replace(UPPER_CASE_PATTERN, (_match, group1: string) => `|${group1.codePointAt(0)}|`);
}

function decodeUpperCase(text: string) {
	return text.replace(ENCODED_UPPER_CASE_PATTERN, (_match, group1: string) => String.fromCodePoint(parseInt(group1, 10)));
}

export function constructDragTransferTypeFromData(genesysType: string, uuid: DocumentUUID) {
	return `${GENESYS_DRAG_TYPE_PREFIX}/${encodeUpperCase(genesysType)}/${encodeUpperCase(uuid)}`;
}

/**
 * The drag data a drag carries as text: Foundry's, or the system's, which adds the dragged document's own type. Empty
 * when the drag carries no JSON object.
 */
export function dragData(dataTransfer?: Pick<DataTransfer, 'getData'> | null): DragTransferData {
	let data: unknown;
	try {
		data = JSON.parse(dataTransfer?.getData('text/plain') || '{}');
	} catch {
		// Text dragged from outside Foundry, such as a selection of a web page, isn't JSON: it carries no drag data.
		return {};
	}

	return typeof data === 'object' && data !== null && !Array.isArray(data) ? data : {};
}

/**
 * Mark the drag of an actor or an item of the given document types with its Genesys type, as the sidebar and the
 * compendiums start it. A drop target reads the type during the drag to light up for what it takes: browsers only let a
 * drag's formats be read before the drop, not its data.
 */
export function addGenesysDragType(event: DragEvent, acceptedTypes: readonly ('Actor' | 'Item')[]) {
	const { type, uuid } = dragData(event.dataTransfer);
	if (!uuid || !acceptedTypes.some((accepted) => accepted === type)) {
		return;
	}

	const dragged = fromUuidSync(uuid) as { type: string } | null;
	if (dragged) {
		event.dataTransfer?.setData(constructDragTransferTypeFromData(dragged.type, uuid as DocumentUUID), '');
	}
}

export function extractDataFromDragTransferTypes(dragTransferTypes?: readonly string[]) {
	if (dragTransferTypes) {
		const genesysDragType = dragTransferTypes.find((transferType) => transferType.indexOf(GENESYS_DRAG_TYPE_PREFIX) === 0);

		if (genesysDragType) {
			const genesysDataSections = decodeUpperCase(genesysDragType).split('/');

			if (genesysDataSections.length === 3) {
				return {
					genesysType: genesysDataSections[1],
					uuid: genesysDataSections[2],
				};
			}
		}
	}

	return null;
}

/**
 * The Genesys type of the document a drag carries, read from its formats while it moves over a drop target. Undefined
 * when it carries no Genesys document.
 */
export function draggedGenesysType(event: DragEvent) {
	return extractDataFromDragTransferTypes(event.dataTransfer?.types)?.genesysType;
}
