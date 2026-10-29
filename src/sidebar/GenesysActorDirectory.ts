import { GenesysActor } from '@/actor/GenesysActor';
import { addGenesysDragType } from '@/data/DragTransferData';

export class GenesysActorDirectory extends foundry.applications.sidebar.tabs.ActorDirectory<GenesysActor> {
	protected override _onDragStart(event: ElementDragEvent): void {
		super._onDragStart(event);
		addGenesysDragType(event, ['Actor']);
	}
}
