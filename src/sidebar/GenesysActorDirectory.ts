import { addGenesysDragType } from '@/data/DragTransferData';

/**
 * The Actors directory, whose drags carry the actor's type for the drop targets.
 */
export class GenesysActorDirectory extends foundry.applications.sidebar.tabs.ActorDirectory {
	protected override _onDragStart(event: DragEvent): void {
		super._onDragStart(event);
		addGenesysDragType(event, ['Actor']);
	}
}
