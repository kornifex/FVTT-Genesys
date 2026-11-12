import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysItem } from '@/item/GenesysItem';
import VueAdditionalEffectSheet from '@/vue/sheets/item/AdditionalEffectSheet.vue';
import { withSpellQualityAdded } from '@/item/data/Spells';
import type { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';

/**
 * Item sheet used for Additional Effects, which receives the qualities they give an attack: their data alone, without
 * their Active Effects.
 */
export class AdditionalEffectSheet extends GenesysItemSheet<'additionalEffect'> {
	override get vueComponent() {
		return VueAdditionalEffectSheet;
	}

	protected override async receiveItem(droppedItem: GenesysItem): Promise<void> {
		if (droppedItem.type !== 'quality') {
			return;
		}

		const qualities = withSpellQualityAdded(this.item.system.qualities, {
			name: droppedItem.name,
			system: droppedItem.system as ItemQualityDataModel,
		});
		if (qualities) {
			await this.item.update({ system: { qualities } });
		}
	}
}
