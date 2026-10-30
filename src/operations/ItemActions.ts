/**
 * @file The actions the sheets offer on an item: attack with it, open its sheet, delete it, remove a character's
 * Archetype or Career, step its quantity, damage or an adversary talent's rank, and send it to chat. Each that deletes
 * the item asks the user first.
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import { talentRankChange } from '@/actor/data/AdversaryItems';
import * as Archetype from '@/actor/data/character/Archetype';
import { careerSkillUpdates } from '@/actor/data/character/Career';
import { crewForSkills } from '@/actor/data/CrewRoster';
import { equipmentStep, StepDirection, SteppedValue } from '@/actor/data/Inventory';
import { DicePrompt, RollType } from '@/app/DicePrompt';
import { attackSkillName } from '@/data/Skills';
import type { Stored } from '@/data/Stored';
import { postChatCard } from '@/item/ChatCards';
import type { GenesysItem } from '@/item/GenesysItem';
import type { EquipmentType } from '@/item/ItemTypes';
import { attackProfile, type WeaponProfile, type WeaponProfileData, weaponProfiles } from '@/item/WeaponProfiles';
import { rollForCrew } from '@/operations/CrewRoll';
import { notify } from '@/notifications';

/**
 * The name of the Attack Skill an actor rolls a Weapon Profile with: a weapon's own fields are its main profile.
 * Undefined when the profile lists no skill, and it offers no attack.
 */
export function attackSkill(actor: GenesysActor, profile: Pick<WeaponProfileData, 'skills' | 'attackSkill'>) {
	return attackSkillName(actor.skills, profile);
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
	const { skills, baseDamage, critical, range, qualities } = weapon.system;
	await rollForCrew(crewForSkills(vehicle.system.crew, skills), {
		roll: { type: RollType.Attack, weapon, profile: { attackName: weapon.name, skills, baseDamage, critical, range, qualities } },
	});
}

/**
 * Open the sheet of any document: an item, or an actor.
 */
export async function openSheet(document: GenesysItem | GenesysActor) {
	await document.sheet?.render(true);
}

/**
 * Delete an item once the user confirms, in Foundry's own dialog, which names the item. No is its default button, and
 * closing it keeps the item. A Container's contents are deleted with it.
 */
export async function deleteItem(item: GenesysItem) {
	// The dialog deletes the item itself when the user answers Yes.
	await item.deleteDialog();
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
 * major damage, is deleted once the user confirms. `beforeWrite` runs right before the item is written, once confirmed.
 */
export async function stepEquipment(
	item: GenesysItem<EquipmentType>,
	kind: SteppedValue,
	direction: StepDirection,
	beforeWrite?: () => void,
) {
	const step = equipmentStep({ system: item.system }, kind, direction);
	if (step.action === 'none' || (step.action === 'delete' && !(await confirmDeletion()))) {
		return;
	}

	beforeWrite?.();
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
			if (await confirmDeletion()) {
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
 * Ask the user to confirm an item's deletion. Foundry's confirmation dialog makes No its default button, as the AppV1
 * dialog it replaces did with `defaultYes: false`.
 */
async function confirmDeletion() {
	return confirmDialog('Genesys.Dialogs.ConfirmDeleteItem.Title', 'Genesys.Dialogs.ConfirmDeleteItem.Content');
}

/**
 * Ask the user a yes-or-no question, which may name an item. No is the dialog's default button, and closing it answers
 * No.
 */
async function confirmDialog(titleKey: string, contentKey: string, name?: string) {
	// The name is the user's text: the paragraph takes it as text, never as HTML.
	const paragraph = document.createElement('p');
	paragraph.textContent = game.i18n.format(contentKey, { name: name ?? '' });
	const body = document.createElement('div');
	body.append(paragraph);

	const confirmed = await foundry.applications.api.DialogV2.confirm({
		window: { title: titleKey },
		content: body,
		rejectClose: false,
	});
	return confirmed === true;
}
