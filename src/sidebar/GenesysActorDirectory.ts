import { GenesysActor } from '@/actor/GenesysActor';
import { addGenesysDragType } from '@/data/DragTransferData';

/**
 * The Actors directory, whose drags carry the actor's type for the drop targets.
 */
export class GenesysActorDirectory extends ActorDirectory<GenesysActor> {
	protected override _onDragStart(event: ElementDragEvent): void {
		super._onDragStart(event);
		addGenesysDragType(event, ['Actor']);
	}
}
