import { GenesysItem } from '@/item/GenesysItem';
import { isFoundryV13 } from '@/foundryGeneration';
import { isSuppressedAsConsumable, isSuppressedByContainer, isSuppressedByEquipmentState } from '@/actor/data/EquipmentEffects';
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
	 * Whether the Equipment State of the item this effect comes from, the Container holding it, or its being a consumable
	 * keeps it from applying to the item's actor.
	 */
	get isSuppressedByEquipmentState() {
		const item = this.originItem;
		return !!item?.actor && isSuppressedByEquipmentState(item.actor.type, item);
	}

	/**
	 * Whether the item this effect comes from is a consumable, whose effects never apply to its actor.
	 */
	get isSuppressedAsConsumable() {
		const item = this.originItem;
		return !!item?.actor && isSuppressedAsConsumable(item.actor.type, item);
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

	/**
	 * Applies a change scaled by the rank of the talent its effect comes from. Foundry v14's `Actor#applyActiveEffects`
	 * calls this method, with the effect in `change.effect`.
	 */
	static applyChange(targetDoc: unknown, change: { key: string; value: unknown; effect?: GenesysEffect }, options?: object): unknown {
		change.value = scaledChangeValue(change.effect?.originItem, change);

		// The vendored Foundry types predate v14, which added the static `applyChange`.
		const { applyChange } = ActiveEffect as unknown as { applyChange: (...args: unknown[]) => unknown };
		return applyChange.call(this, targetDoc, change, options);
	}

	// v13: `Actor#applyActiveEffects` calls the instance `apply`. On v14 it is a deprecated shim that calls the static
	// `applyChange`, which scales the change itself.
	override apply(actor: Actor, change: ApplicableChangeData<this>): unknown {
		if (isFoundryV13()) {
			change.value = scaledChangeValue(this.originItem, change);
		}

		return super.apply(actor, change);
	}
}
