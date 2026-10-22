import CareerDataModel from '@/item/data/CareerDataModel';
import VueCareerSheet from '@/vue/sheets/item/CareerSheet.vue';
import GenesysItemSheet, { DropData, itemFromDrop } from '@/item/GenesysItemSheet';
import SkillDataModel from '@/item/data/SkillDataModel';
import VueSheet from '@/vue/VueSheet';
import { GenesysItemSheetData, ItemSheetContext } from '@/vue/SheetContext';
import { isCareerSkill } from '@/actor/data/character/Career';

export default class CareerSheet extends VueSheet(GenesysItemSheet<CareerDataModel>) {
	static override get defaultOptions() {
		return {
			...super.defaultOptions,
			classes: ['genesys', 'sheet', 'item', 'career'],
			width: 500,
			height: 400,
		};
	}

	override get vueComponent() {
		return VueCareerSheet;
	}

	override async getVueContext(): Promise<ItemSheetContext | undefined> {
		return {
			sheet: this,
			data: (await this.getData()) as GenesysItemSheetData<CareerDataModel>,
		};
	}

	protected override async _onDropItem(_event: DragEvent, data: DropData): Promise<void> {
		if (!this.isEditable || !data.uuid) {
			return;
		}

		const droppedItem = await itemFromDrop<SkillDataModel>(data);
		if (!droppedItem || droppedItem.type !== 'skill') {
			return;
		}

		// Prevent adding a skill that's already present.
		if (isCareerSkill(droppedItem.name, this.item.systemData.careerSkills)) {
			return;
		}

		await this.item.update({
			'system.careerSkills': [...this.item.systemData.careerSkills, droppedItem.toObject()],
		});
	}
}
