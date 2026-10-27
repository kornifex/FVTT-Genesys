import VueCharacterSheet from '@/vue/sheets/actor/CharacterSheet.vue';
import { GenesysItem } from '@/item/GenesysItem';
import { BaseItemDataModel } from '@/item/data/BaseItemDataModel';
import { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import { ArchetypeDataModel } from '@/item/data/ArchetypeDataModel';
import { CareerDataModel } from '@/item/data/CareerDataModel';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import { advance, advancementCharacter, buyDroppedTalent, canReplaceCareer } from '@/actor/data/character/Advancement';
import * as Archetype from '@/actor/data/character/Archetype';
import { careerSkillUpdates, heldCareerSkills } from '@/actor/data/character/Career';
import { isOwnedSkill } from '@/data/Skills';
import { CareerSkillPrompt } from '@/app/CareerSkillPrompt';
import { TalentDataModel } from '@/item/data/TalentDataModel';
import { GenesysActorSheet } from '@/actor/GenesysActorSheet';
import { DragTransferData } from '@/data/DragTransferData';
import { receiveInventoryDrop } from '@/operations/InventoryDrop';

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

	protected override async _onDropItem(
		event: DragEvent,
		data: DropCanvasData<'Item', GenesysItem<BaseItemDataModel>>,
	): Promise<GenesysItem<BaseItemDataModel>[] | boolean> {
		// Regardless of what was dropped this is the last spot to process it.
		event.stopPropagation();

		// Check that the we have the UUID of the item that was dropped.
		const dragData = data as DragTransferData;
		if (!dragData.uuid) {
			return false;
		}

		// Make sure that the item in question exists and this actor doesn't own it.
		const droppedItem = await fromUuid<GenesysItem<BaseItemDataModel>>(dragData.uuid);
		if (!droppedItem || droppedItem.actor?.uuid === this.actor.uuid) {
			return false;
		}

		// We must be able to edit the actor to proceed.
		if (!this.isEditable) {
			return false;
		}

		let clonedDroppedItem: GenesysItem<BaseItemDataModel>[] | undefined | boolean;
		if (CharacterDataModel.isRelevantTypeForContext('APTITUDE', droppedItem.type)) {
			if (droppedItem.type === 'archetype') {
				// If it's an archetype, delete the old one and apply the new one.

				if (!Archetype.canRemoveArchetype(this.actor)) {
					return false;
				}

				const existingArchetype = this.actor.items.find((i) => i.type === 'archetype');
				if (existingArchetype) {
					await Archetype.removeArchetype(this.actor, existingArchetype as GenesysItem<ArchetypeDataModel>);
				}

				await Archetype.applyArchetype(this.actor, droppedItem as GenesysItem<ArchetypeDataModel>);

				// Let `super` handle the rest and save a reference to it.
				clonedDroppedItem = await super._onDropItem(event, data);
			} else if (droppedItem.type === 'career') {
				// If it's a career, delete the old one and apply the new one.

				if (!canReplaceCareer(this.actor.systemData.experienceJournal.entries)) {
					return false;
				}

				const existingCareer = this.actor.items.find((i) => i.type === 'career');
				if (existingCareer) {
					await this.removeCareer(existingCareer as GenesysItem<CareerDataModel>);
				}

				const career = await this.applyCareer(droppedItem as GenesysItem<CareerDataModel>);

				clonedDroppedItem = [career];
			} else {
				// Let `super` handle the drop and save a reference to it.
				clonedDroppedItem = await super._onDropItem(event, data);
			}
		} else if (CharacterDataModel.isRelevantTypeForContext('SKILL', droppedItem.type)) {
			// Refuse a skill the character already owns, whatever the case of its name, so that they never own a skill twice.
			if (isOwnedSkill(this.actor.skills, droppedItem)) {
				return false;
			}

			// Let `super` handle the drop and save a reference to it.
			clonedDroppedItem = await super._onDropItem(event, data);
		} else if (CharacterDataModel.isRelevantTypeForContext('COMBAT', droppedItem.type)) {
			// Let `super` handle the drop and save a reference to it.
			clonedDroppedItem = await super._onDropItem(event, data);
		} else if (CharacterDataModel.isRelevantTypeForContext('TALENT', droppedItem.type)) {
			if (droppedItem.type === 'ability') {
				// Let `super` handle the drop and save a reference to it.
				clonedDroppedItem = await super._onDropItem(event, data);
			} else if (droppedItem.type === 'talent') {
				const droppedTalent = droppedItem as GenesysItem<TalentDataModel>;
				const newId = foundry.utils.randomID();
				const bought = await advance(
					this.actor,
					buyDroppedTalent(
						advancementCharacter(this.actor),
						{ name: droppedTalent.name, tier: droppedTalent.systemData.tier, source: droppedTalent.toObject() },
						newId,
					),
				);
				if (!bought) {
					return false;
				}

				const targetTalent =
					this.actor.items.get(newId) ?? this.actor.items.find((i) => i.type === 'talent' && i.name === droppedTalent.name);
				clonedDroppedItem = [targetTalent as GenesysItem<BaseItemDataModel>];
			} else {
				// Let `super` handle the drop and save a reference to it.
				clonedDroppedItem = await super._onDropItem(event, data);
			}
		} else if (CharacterDataModel.isRelevantTypeForContext('INVENTORY', droppedItem.type)) {
			clonedDroppedItem = await receiveInventoryDrop(this.actor, data);
		} else {
			// If the dropped item is not of a type that we have a default behavior then end early.
			return false;
		}

		return clonedDroppedItem ?? false;
	}

	// The character sheet's Vue components remove the Archetype through the sheet.
	canRemoveArchetype() {
		return Archetype.canRemoveArchetype(this.actor);
	}

	async removeArchetype(archetype: GenesysItem<ArchetypeDataModel>) {
		await Archetype.removeArchetype(this.actor, archetype);
	}

	/**
	 * Add a Career to the character: its skills become Career skills, and those the player picks get its Free Ranks.
	 */
	async applyCareer(droppedCareer: GenesysItem<CareerDataModel>) {
		const [career] = await this._onDropItemCreate(droppedCareer.toObject());
		const careerSkills = droppedCareer.systemData.careerSkills;
		const skills = heldCareerSkills(this.actor.items.contents, careerSkills) as GenesysItem<SkillDataModel>[];
		const selectedSkills = await CareerSkillPrompt.promptForSkills(skills);

		await career.update({
			'system.selectedSkillIDs': selectedSkills,
		});

		await Promise.all(
			careerSkillUpdates(skills, careerSkills, selectedSkills, 1).map(async ({ skill, update }) => await skill.update(update)),
		);

		return career;
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
