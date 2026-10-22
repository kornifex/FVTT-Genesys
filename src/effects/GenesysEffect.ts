import { GenesysItem } from '@/item/GenesysItem';
import { isSuppressedByEquipmentState } from '@/actor/data/EquipmentEffects';
import { scaledChangeValue, sourceItem } from '@/effects/PoolModifications';

export class GenesysEffect extends ActiveEffect {
	/**
	 * An effect is suppressed when it's disabled, or when the Equipment State of the item it comes from keeps it from
	 * applying.
	 */
	override get isSuppressed() {
		return this.disabled || this.isSuppressedByEquipmentState;
	}

	/**
	 * Whether the Equipment State of the item this effect comes from keeps it from applying to the item's actor.
	 */
	get isSuppressedByEquipmentState() {
		const item = this.originItem;
		return !!item?.actor && isSuppressedByEquipmentState(item.actor.type, item);
	}

	get originItem(): GenesysItem | undefined {
		return sourceItem<GenesysItem>(this);
	}

	override apply(actor: Actor, change: ApplicableChangeData<this>): unknown {
		change.value = scaledChangeValue(this.originItem, change);

		return super.apply(actor, change);
	}
}
