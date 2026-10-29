import { GenesysItemSheet, DropData, itemFromDrop } from '@/item/GenesysItemSheet';

import { SkillDataModel } from '@/item/data/SkillDataModel';
import { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';
import { BaseWeaponDataModel } from '@/item/data/BaseWeaponDataModel';
import { skillNamesMatch } from '@/data/Skills';
import { withQualityAdded } from '@/item/data/Qualities';

export class BaseWeaponSheet extends GenesysItemSheet<BaseWeaponDataModel> {
	protected override async _onDropItem(_event: DragEvent, data: DropData): Promise<void> {
		if (!this.isEditable || !data.uuid) {
			return;
		}

		const droppedItem = await itemFromDrop<SkillDataModel | ItemQualityDataModel>(data);
		if (!droppedItem) {
			return;
		}

		const systemData = this.item.systemData;
		switch (droppedItem.type) {
			// Skill Drop
			case 'skill':
				// Don't allow duplicates of the same skill.
				if (systemData.skills.some((s) => skillNamesMatch(s, droppedItem.name))) {
					return;
				}

				await this.item.update({
					'system.skills': [...systemData.skills, droppedItem.name],
				});

				await this.render();

				return;

			// Item Quality Drop
			case 'quality': {
				const quality = droppedItem.systemData as ItemQualityDataModel;
				const qualities = withQualityAdded(systemData.qualities, {
					name: droppedItem.name,
					description: quality.description,
					isRated: quality.isRated,
				});
				if (qualities) {
					await this.item.update({ 'system.qualities': qualities });
				}

				return;
			}
		}
	}
}
