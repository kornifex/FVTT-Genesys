import { addGenesysDragType } from '@/data/DragTransferData';

/**
 * A compendium's window, whose drags carry the document's type for the drop targets.
 */
export class GenesysCompendium extends Compendium {
	protected override _onDragStart(event: ElementDragEvent): void {
		super._onDragStart(event);
		addGenesysDragType(event, ['Actor', 'Item']);
	}
}
