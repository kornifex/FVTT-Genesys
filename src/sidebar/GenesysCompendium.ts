import { addGenesysDragType } from '@/data/DragTransferData';

export class GenesysCompendium extends Compendium {
	protected override _onDragStart(event: ElementDragEvent): void {
		super._onDragStart(event);
		addGenesysDragType(event, ['Actor', 'Item']);
	}
}
