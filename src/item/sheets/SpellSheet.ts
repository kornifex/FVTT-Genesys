import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysItem } from '@/item/GenesysItem';
import VueSpellSheet from '@/vue/sheets/item/SpellSheet.vue';
import { skillNamesMatch } from '@/data/Skills';
import { additionalEffectCopy } from '@/item/data/Spells';
import type { AdditionalEffectDataModel } from '@/item/data/AdditionalEffectDataModel';

/**
 * Item sheet used for spells, which receives the magic skills that may cast them and their Additional Effects.
 */
export class SpellSheet extends GenesysItemSheet<'spell'> {
	override get vueComponent() {
		return VueSpellSheet;
	}

	protected override async receiveItem(droppedItem: GenesysItem): Promise<void> {
		const { skills, additionalEffects } = this.item.system;

		switch (droppedItem.type) {
			case 'skill':
				if (!skills.some((skill) => skillNamesMatch(skill, droppedItem.name))) {
					await this.item.update({ system: { skills: [...skills, droppedItem.name] } });
				}
				return;

			// The same effect dropped twice is held twice: some can be added more than once, as Range (CRB p. 215).
			case 'additionalEffect': {
				const copy = additionalEffectCopy(foundry.utils.randomID(), {
					name: droppedItem.name,
					system: droppedItem.system as AdditionalEffectDataModel,
				});
				await this.item.update({ system: { additionalEffects: [...additionalEffects, copy] } });
				return;
			}
		}
	}
}
