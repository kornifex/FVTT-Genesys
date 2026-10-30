import VueCareerSheet from '@/vue/sheets/item/CareerSheet.vue';
import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysItem } from '@/item/GenesysItem';
import { isCareerSkill } from '@/actor/data/character/Career';

/**
 * Item sheet used for Careers, which receives their career skills.
 */
export class CareerSheet extends GenesysItemSheet<'career'> {
	static override DEFAULT_OPTIONS = {
		classes: ['career'],
		position: { width: 500, height: 400 },
	};

	override get vueComponent() {
		return VueCareerSheet;
	}

	protected override async receiveItem(droppedItem: GenesysItem): Promise<void> {
		if (droppedItem.type !== 'skill') {
			return;
		}

		if (isCareerSkill(droppedItem.name, this.item.system.careerSkills)) {
			return;
		}

		await this.item.update({
			system: { careerSkills: [...this.item.system.careerSkills, droppedItem.toObject()] },
		});
	}
}
