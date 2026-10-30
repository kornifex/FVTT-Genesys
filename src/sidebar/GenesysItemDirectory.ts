import { addGenesysDragType } from '@/data/DragTransferData';

/**
 * The Items directory, whose drags carry the item's type for the drop targets.
 */
export class GenesysItemDirectory extends foundry.applications.sidebar.tabs.ItemDirectory {
	protected override _onDragStart(event: DragEvent): void {
		super._onDragStart(event);
		addGenesysDragType(event, ['Item']);
	}
}
