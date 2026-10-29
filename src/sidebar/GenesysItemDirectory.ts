import { GenesysItem } from '@/item/GenesysItem';
import { addGenesysDragType } from '@/data/DragTransferData';

export class GenesysItemDirectory extends ItemDirectory<GenesysItem> {
	protected override _onDragStart(event: ElementDragEvent): void {
		super._onDragStart(event);
		addGenesysDragType(event, ['Item']);
	}
}
