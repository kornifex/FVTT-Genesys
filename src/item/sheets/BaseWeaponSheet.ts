import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysItem } from '@/item/GenesysItem';
import { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';
import { BaseWeaponDataModel } from '@/item/data/BaseWeaponDataModel';
import { skillNamesMatch } from '@/data/Skills';
import { withQualityAdded } from '@/item/data/Qualities';

/**
 * Item sheet shared by the weapons, which receives their skills and qualities.
 */
export class BaseWeaponSheet extends GenesysItemSheet<BaseWeaponDataModel> {
	protected override async receiveItem(droppedItem: GenesysItem): Promise<void> {
		const systemData = this.item.systemData;
		switch (droppedItem.type) {
			case 'skill':
				if (systemData.skills.some((s) => skillNamesMatch(s, droppedItem.name))) {
					return;
				}

				await this.item.update({
					system: { skills: [...systemData.skills, droppedItem.name] },
				});

				await this.render();

				return;

			case 'quality': {
				const quality = droppedItem.systemData as ItemQualityDataModel;
				const qualities = withQualityAdded(systemData.qualities, {
					name: droppedItem.name,
					description: quality.description,
					isRated: quality.isRated,
				});
				if (qualities) {
					await this.item.update({ system: { qualities } });
				}

				return;
			}
		}
	}
}
