import { addGenesysDragType } from '@/data/DragTransferData';

export class GenesysCompendium extends foundry.applications.sidebar.apps.Compendium {
	protected override _onDragStart(event: ElementDragEvent): void {
		super._onDragStart(event);
		addGenesysDragType(event, ['Actor', 'Item']);
	}
}
