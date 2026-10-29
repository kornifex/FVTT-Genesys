import { GenesysItem } from '@/item/GenesysItem';
import { addGenesysDragType } from '@/data/DragTransferData';

/**
 * The Items directory, whose drags carry the item's type for the drop targets.
 */
export class GenesysItemDirectory extends ItemDirectory<GenesysItem> {
	protected override _onDragStart(event: ElementDragEvent): void {
		super._onDragStart(event);
		addGenesysDragType(event, ['Item']);
	}
}
