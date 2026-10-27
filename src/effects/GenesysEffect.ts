import { GenesysItem } from '@/item/GenesysItem';
import { isSuppressedByContainer, isSuppressedByEquipmentState } from '@/actor/data/EquipmentEffects';
import { scaledChangeValue, sourceItem } from '@/effects/PoolModifications';
import type { EquipmentDataModel } from '@/item/data/EquipmentDataModel';

export class GenesysEffect extends ActiveEffect {
	/**
	 * An effect is suppressed when it's disabled, or when the Equipment State of the item it comes from keeps it from
	 * applying.
	 */
	override get isSuppressed() {
		return this.disabled || this.isSuppressedByEquipmentState;
	}

	/**
	 * Whether the Equipment State of the item this effect comes from, or the Container holding it, keeps it from applying
	 * to the item's actor.
	 */
	get isSuppressedByEquipmentState() {
		const item = this.originItem;
		return !!item?.actor && isSuppressedByEquipmentState(item.actor.type, item);
	}

	/**
	 * The Container holding the item this effect comes from, when it is what keeps the effect from applying.
	 */
	get suppressingContainer(): GenesysItem | undefined {
		const item = this.originItem;
		if (!item?.actor || !isSuppressedByContainer(item.actor.type, item)) {
			return undefined;
		}

		return item.actor.items.get((item.systemData as EquipmentDataModel).container) as GenesysItem | undefined;
	}

	get originItem(): GenesysItem | undefined {
		return sourceItem<GenesysItem>(this);
	}

	override apply(actor: Actor, change: ApplicableChangeData<this>): unknown {
		change.value = scaledChangeValue(this.originItem, change);

		return super.apply(actor, change);
	}
}
