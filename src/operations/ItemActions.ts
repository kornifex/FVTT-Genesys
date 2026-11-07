/**
 * @file The actions the sheets offer on an item: roll a skill, attack with a weapon, open its sheet, delete it, remove a
 * character's Archetype or Career, give or take a skill's Free Rank, step its quantity, damage or an adversary talent's
 * rank, and send it to chat. Each that deletes the item asks the user first.
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import { talentRankChange } from '@/actor/data/AdversaryItems';
import * as Archetype from '@/actor/data/character/Archetype';
import { careerSkillUpdates } from '@/actor/data/character/Career';
import { crewForSkills } from '@/actor/data/CrewRoster';
import { type EquipmentStep, equipmentStep, quantityChange, StepDirection, SteppedValue } from '@/actor/data/Inventory';
import { DicePrompt, RollType } from '@/app/DicePrompt';
import { attackSkillName, freeRank } from '@/data/Skills';
import type { Stored } from '@/data/Stored';
import { postChatCard } from '@/item/ChatCards';
import type { GenesysEffect } from '@/effects/GenesysEffect';
import type { GenesysItem } from '@/item/GenesysItem';
import type { EquipmentType } from '@/item/ItemTypes';
import { attackProfile, vehicleAttackProfile, type WeaponProfile, type WeaponProfileData, weaponProfiles } from '@/item/WeaponProfiles';
import { rollForCrew } from '@/operations/CrewRoll';
import { notify } from '@/notifications';

/**
 * A document a sheet's row shows: an item, an actor, or an Active Effect.
 */
export type RowDocument = GenesysItem | GenesysActor | GenesysEffect;

/**
 * The name of the Attack Skill an actor rolls a Weapon Profile with: a weapon's own fields are its main profile.
 * Undefined when the profile lists no skill, and it offers no attack.
 */
export function attackSkill(actor: GenesysActor, profile: Pick<WeaponProfileData, 'skills' | 'attackSkill'>) {
	return attackSkillName(actor.skills, profile);
}

/**
 * Open the dice prompt of a check of one of an actor's skills.
 */
export async function rollSkill(actor: GenesysActor, skill: Pick<GenesysItem<'skill'>, 'name'>) {
	await DicePrompt.promptForRoll(actor, skill.name);
}

/**
 * Give a skill a Free Rank, or take one from it: no XP is spent, nothing goes into the Experience Journal, and the rank
 * never goes below 0.
 */
export async function freeSkillRank(skill: Pick<GenesysItem<'skill'>, 'system' | 'update'>, step: 1 | -1) {
	await skill.update({
		system: { rank: freeRank(skill.system.rank, step) },
	});
}

/**
 * Open the dice prompt of an attack with one of an actor's Weapon Profiles, its main one by default, which rolls the
 * profile's Attack Skill. A profile that lists no skill offers no attack.
 */
export async function attackWith(actor: GenesysActor, weapon: GenesysItem<'weapon'>, profile?: WeaponProfile) {
	const attacked = profile ?? weaponProfiles(weapon.system)[0];
	const skillName = attackSkill(actor, attacked);
	if (skillName) {
		await DicePrompt.promptForRoll(actor, skillName, {
			roll: { type: RollType.Attack, weapon, profile: attackProfile(weapon.name, attacked, game.i18n) },
		});
	}
}

/**
 * Open the dice prompt of an attack with a vehicle weapon, which one of its skills rolls, by the crew member of a role
 * that has it. A vehicle weapon has a single Weapon Profile.
 */
export async function attackWithVehicleWeapon(vehicle: GenesysActor<'vehicle'>, weapon: GenesysItem<'vehicleWeapon'>) {
	await rollForCrew(crewForSkills(vehicle.system.crew, weapon.system.skills), {
		roll: { type: RollType.Attack, weapon, profile: vehicleAttackProfile(weapon) },
	});
}

/**
 * Whether the user may open a document's sheet, at least as Limited: an owned item follows its actor's ownership. A
 * crew member's skills show on a vehicle's sheet to users who can't see the member, and Foundry refuses their sheets
 * with an error.
 */
export function canOpenSheet(document: RowDocument) {
	return document.testUserPermission(game.user, 'LIMITED');
}

/**
 * Open the sheet of any document: an item, an actor, or an Active Effect.
 */
export async function openSheet(document: RowDocument) {
	await document.sheet?.render(true);
}

/**
 * Delete a document of a row, an item or an Active Effect, once the user confirms in the dialog that names it. A
 * Container's contents are deleted with it.
 */
export async function deleteDocument(document: { name: string; delete(): Promise<unknown> }) {
	if (await confirmDelete(document.name)) {
		await document.delete();
	}
}

/**
 * A deletion that says in its own words what it does, such as the undo of an Experience Journal entry: the localization
 * key of the dialog's title, and its question, already localized.
 */
type DeletionQuestion = { title: string; question: string };

/**
 * Ask the user to confirm the deletion of what a sheet names: an item, an Active Effect, an extra Weapon Profile, a
 * Role, a Quality of a list, by its name; or a deletion that asks its own question. No is the dialog's default button,
 * and closing it answers No.
 */
export async function confirmDelete(deleted: string | DeletionQuestion) {
	if (typeof deleted === 'string') {
		return confirmDialog('Genesys.Dialogs.ConfirmDelete.Title', 'Genesys.Dialogs.ConfirmDelete.Content', deleted);
	}

	return confirmQuestion(deleted.title, deleted.question);
}

/**
 * Remove a character's Archetype, with what it gave them, once the user confirms in a dialog that says what is taken
 * back.
 */
export async function removeArchetype(character: GenesysActor<'character'>, archetype: GenesysItem<'archetype'>) {
	if (
		await confirmDialog(
			'Genesys.Dialogs.ConfirmRemoveArchetype.Title',
			'Genesys.Dialogs.ConfirmRemoveArchetype.Content',
			archetype.name,
		)
	) {
		await Archetype.removeArchetype(character, archetype);
	}
}

/**
 * Remove a character's Career, with what it gave their skills, once the user confirms in a dialog that says what is
 * taken back.
 */
export async function removeCareer(character: GenesysActor<'character'>, career: GenesysItem<'career'>) {
	if (!(await confirmDialog('Genesys.Dialogs.ConfirmRemoveCareer.Title', 'Genesys.Dialogs.ConfirmRemoveCareer.Content', career.name))) {
		return;
	}

	const { careerSkills, selectedSkillIDs } = career.system;
	// Foundry takes the updates' dot-notation keys, which the types don't.
	await Promise.all(
		careerSkillUpdates(character.items.contents, careerSkills, selectedSkillIDs, -1).map(({ skill, update }) =>
			skill.update(update as Item.UpdateData),
		),
	);
	await career.delete();
}

/**
 * Post an item's chat card, spoken by the actor whose sheet sends it.
 */
export async function sendToChat(item: GenesysItem, actor: GenesysActor) {
	await postChatCard(item, actor);
}

/**
 * Step an item's quantity or damage one up or down from its row. An item whose quantity goes down to 0, or destroyed past
 * major damage, is deleted once the user confirms.
 */
export async function stepEquipment(item: GenesysItem<EquipmentType>, kind: SteppedValue, direction: StepDirection) {
	await applyEquipmentStep(item, equipmentStep({ system: item.system }, kind, direction));
}

/**
 * Set an item's quantity to a value typed on its row. An item left with none is deleted once the user confirms, as a
 * step down to 0 is.
 */
export async function setEquipmentQuantity(item: GenesysItem<EquipmentType>, quantity: number) {
	await applyEquipmentStep(item, quantityChange(quantity));
}

async function applyEquipmentStep(item: GenesysItem<EquipmentType>, step: EquipmentStep) {
	if (step.action === 'none' || (step.action === 'delete' && !(await confirmDelete(item.name)))) {
		return;
	}

	if (step.action === 'delete') {
		// Already confirmed, in the step's own words.
		await item.delete();
	} else {
		await item.update(step.update);
	}
}

/**
 * Raise or lower the rank of an adversary's talent from its menu. Lowering it below rank 1 deletes it once the user
 * confirms, as a step of an item's quantity down to 0 does; a refused change tells the user why, when there is a reason.
 */
export async function stepTalentRank(adversary: GenesysActor, talent: Stored<GenesysItem<'talent'>>, direction: StepDirection) {
	const change = talentRankChange(talent, direction);
	switch (change.action) {
		case 'update':
			await adversary.updateEmbeddedDocuments('Item', [change.update]);
			break;
		case 'delete':
			if (await confirmDelete(talent.name)) {
				await adversary.deleteEmbeddedDocuments('Item', [change.id]);
			}
			break;
		case 'refuse':
			if (change.refusal) {
				notify(change.refusal);
			}
			break;
	}
}

/**
 * Ask the user a yes-or-no question, which names an item.
 */
async function confirmDialog(titleKey: string, contentKey: string, name: string) {
	return confirmQuestion(titleKey, game.i18n.format(contentKey, { name }));
}

/**
 * Ask the user a yes-or-no question, already localized. Foundry's confirmation dialog makes No its default button, and
 * closing it answers No.
 */
async function confirmQuestion(titleKey: string, question: string) {
	// The question holds the user's text, such as an item's name: the paragraph takes it as text, never as HTML.
	const paragraph = document.createElement('p');
	paragraph.textContent = question;
	const body = document.createElement('div');
	body.append(paragraph);

	const confirmed = await foundry.applications.api.DialogV2.confirm({
		window: { title: titleKey },
		content: body,
		rejectClose: false,
	});
	return confirmed === true;
}
