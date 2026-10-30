import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysItem } from '@/item/GenesysItem';
import { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';
import { skillNamesMatch } from '@/data/Skills';
import { withQualityAdded } from '@/item/data/Qualities';

/**
 * Item sheet shared by the weapons, which receives their skills and qualities.
 */
export class BaseWeaponSheet extends GenesysItemSheet<'weapon' | 'vehicleWeapon'> {
	protected override async receiveItem(droppedItem: GenesysItem): Promise<void> {
		const system = this.item.system;
		switch (droppedItem.type) {
			case 'skill':
				if (system.skills.some((s) => skillNamesMatch(s, droppedItem.name))) {
					return;
				}

				await this.item.update({
					system: { skills: [...system.skills, droppedItem.name] },
				});

				await this.render();

				return;

			case 'quality': {
				const quality = droppedItem.system as ItemQualityDataModel;
				const qualities = withQualityAdded(system.qualities, {
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
