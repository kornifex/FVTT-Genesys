import VueCharacterSheet from '@/vue/sheets/actor/CharacterSheet.vue';
import { GenesysItem } from '@/item/GenesysItem';
import { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import { ArchetypeDataModel } from '@/item/data/ArchetypeDataModel';
import { CareerDataModel } from '@/item/data/CareerDataModel';
import * as Archetype from '@/actor/data/character/Archetype';
import { careerSkillUpdates } from '@/actor/data/character/Career';
import { GenesysActorSheet } from '@/actor/GenesysActorSheet';
import { receiveCharacterDrop } from '@/operations/CharacterDrop';

/**
 * Actor sheet used for Player Characters
 */
export class CharacterSheet extends GenesysActorSheet<CharacterDataModel> {
	override get vueComponent() {
		return VueCharacterSheet;
	}

	override get initialTab() {
		return 'skills';
	}

	protected override async receiveItem(droppedItem: GenesysItem) {
		return receiveCharacterDrop(this.actor, droppedItem);
	}

	// The character sheet's Vue components remove the Archetype through the sheet.
	canRemoveArchetype() {
		return Archetype.canRemoveArchetype(this.actor.systemData);
	}

	async removeArchetype(archetype: GenesysItem<ArchetypeDataModel>) {
		await Archetype.removeArchetype(this.actor, archetype);
	}

	/**
	 * Remove a Career from the character, with what it gave their skills.
	 */
	async removeCareer(career: GenesysItem<CareerDataModel>) {
		const careerData = career.systemData;

		await Promise.all(
			careerSkillUpdates(this.actor.items.contents, careerData.careerSkills, careerData.selectedSkillIDs, -1).map(
				async ({ skill, update }) => await skill.update(update),
			),
		);

		await career.delete();
	}
}
