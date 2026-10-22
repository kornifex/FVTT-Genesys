import { GenesysItem } from '@/item/GenesysItem';
import { scaledChangeValue, sourceItem } from '@/effects/PoolModifications';

export class GenesysEffect extends ActiveEffect {
	override get isSuppressed() {
		return this.disabled;
	}

	get originItem(): GenesysItem | undefined {
		return sourceItem<GenesysItem>(this);
	}

	override apply(actor: Actor, change: ApplicableChangeData<this>): unknown {
		change.value = scaledChangeValue(this.originItem, change);

		return super.apply(actor, change);
	}
}
