/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file Player Character Sheet
 */

import VueCharacterSheet from '@/vue/sheets/actor/CharacterSheet.vue';
import GenesysItem from '@/item/GenesysItem';
import BaseItemDataModel from '@/item/data/BaseItemDataModel';
import CharacterDataModel from '@/actor/data/CharacterDataModel';
import ArchetypeDataModel from '@/item/data/ArchetypeDataModel';
import CareerDataModel from '@/item/data/CareerDataModel';
import SkillDataModel from '@/item/data/SkillDataModel';
import { advance, advancementCharacter, buyDroppedTalent, canReplaceCareer } from '@/actor/data/character/Advancement';
import * as Archetype from '@/actor/data/character/Archetype';
import CareerSkillPrompt from '@/app/CareerSkillPrompt';
import TalentDataModel from '@/item/data/TalentDataModel';
import VueSheet from '@/vue/VueSheet';
import GenesysActorSheet from '@/actor/GenesysActorSheet';
import { ActorSheetContext } from '@/vue/SheetContext';
import { DragTransferData } from '@/data/DragTransferData';
import { transferInventoryBetweenActors } from '@/operations/TransferBetweenActors';
import { EquipmentState } from '@/item/data/EquipmentDataModel';

/**
 * Actor sheet used for Player Characters
 */
export default class CharacterSheet extends VueSheet(GenesysActorSheet<CharacterDataModel>) {
	override get vueComponent() {
		return VueCharacterSheet;
	}

	override async getVueContext(): Promise<ActorSheetContext<CharacterDataModel>> {
		return {
			sheet: this,
			data: await this.getData(),
		};
	}

	static override get defaultOptions() {
		return {
			...super.defaultOptions,
			tabs: [
				{
					navSelector: '.sheet-tabs',
					contentSelector: '.sheet-body',
					initial: 'skills',
				},
			],
		};
	}

	protected override async _onDropItem(event: DragEvent, data: DropCanvasData<'Item', GenesysItem<BaseItemDataModel>>): Promise<GenesysItem<BaseItemDataModel>[] | boolean> {
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
			// Prevent adding the same skill multiple times.
			if (droppedItem.type === 'skill' && this.actor.items.find((item) => item.type === 'skill' && item.name === droppedItem.name)) {
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
				const bought = await advance(this.actor, buyDroppedTalent(advancementCharacter(this.actor), { name: droppedTalent.name, tier: droppedTalent.systemData.tier, source: droppedTalent.toObject() }, newId));
				if (!bought) {
					return false;
				}

				const targetTalent = this.actor.items.get(newId) ?? this.actor.items.find((i) => i.type === 'talent' && i.name === droppedTalent.name);
				clonedDroppedItem = [targetTalent as GenesysItem<BaseItemDataModel>];
			} else {
				// Let `super` handle the drop and save a reference to it.
				clonedDroppedItem = await super._onDropItem(event, data);
			}
		} else if (CharacterDataModel.isRelevantTypeForContext('INVENTORY', droppedItem.type)) {
			if (droppedItem.actor) {
				// If the item was dropped from another actor then we try transfering it and save a reference to it.
				clonedDroppedItem = await transferInventoryBetweenActors(dragData, this.actor, (type) => CharacterDataModel.isRelevantTypeForContext('INVENTORY', type));
			} else {
				// If the item comes from a folder or compendium then let `super` handle the drop and save a reference to it.
				clonedDroppedItem = await super._onDropItem(event, data);
			}

			// If we sucessfully cloned the dropped inventory item then update the state for any associated effect.
			if (Array.isArray(clonedDroppedItem)) {
				await this.actor.systemData.handleEffectsStatus(clonedDroppedItem, { equipmentState: EquipmentState.Carried });
			}
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
	 *
	 * @param droppedCareer
	 */
	async applyCareer(droppedCareer: GenesysItem<CareerDataModel>) {
		const [career] = await this._onDropItemCreate(droppedCareer.toObject());
		const careerSkillNames = droppedCareer.systemData.careerSkills.map((s) => s.name.toLowerCase());

		const commonSkills = <GenesysItem<SkillDataModel>[]>this.actor.items.filter((i) => i.type === 'skill' && careerSkillNames.includes(i.name.toLowerCase()));
		const selectedSkills = await CareerSkillPrompt.promptForSkills(commonSkills);

		await career.update({
			'system.selectedSkillIDs': selectedSkills,
		});

		await Promise.all(
			commonSkills.map(
				async (skill) =>
					await skill.update({
						'system.career': true,
						'system.rank': skill.systemData.rank + (selectedSkills.includes(skill.id) ? 1 : 0),
					}),
			),
		);

		return career;
	}

	/**
	 *
	 * @param career
	 */
	async removeCareer(career: GenesysItem<CareerDataModel>) {
		const careerData = career.systemData;

		// Unmark Career Skills
		const careerSkillNames = careerData.careerSkills.map((s) => s.name);
		const skills = <GenesysItem<SkillDataModel>[]>this.actor.items.filter((i) => i.type === 'skill');

		await Promise.all(
			skills.map(async (skill) => {
				// Only un-mark career skills from the Career
				if (careerSkillNames.includes(skill.name)) {
					// Reduce the skill's rank if it was one of the selected skills.
					const rank = skill.systemData.rank - (careerData.selectedSkillIDs.includes(skill.id) ? 1 : 0);

					await skill.update({
						'system.career': false,
						'system.rank': rank,
					});
				}
			}),
		);

		await career.delete();
	}
}
