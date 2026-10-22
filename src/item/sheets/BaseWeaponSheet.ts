import { GenesysItemSheet, DropData, itemFromDrop } from '@/item/GenesysItemSheet';

import { SkillDataModel } from '@/item/data/SkillDataModel';
import { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';
import { BaseWeaponDataModel } from '@/item/data/BaseWeaponDataModel';
import { skillNamesMatch } from '@/data/Skills';

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
				const existingIndex = systemData.qualities.findIndex((i) => i.name.toLowerCase() === droppedItem.name.toLowerCase());
				const qualities = systemData.qualities;

				if (existingIndex >= 0) {
					// Do nothing if it's not a rated quality.
					if (!qualities[existingIndex].isRated) {
						return;
					}

					qualities[existingIndex].rating += 1;
					await this.item.update({
						'system.qualities': qualities,
					});
				} else {
					// New Quality
					await this.item.update({
						'system.qualities': [
							...qualities,
							{
								name: droppedItem.name,
								description: droppedItem.systemData.description,
								isRated: (droppedItem.systemData as ItemQualityDataModel).isRated,
								rating: 1,
							},
						],
					});
				}

				return;
			}
		}
	}
}
