/** @file The actions the sheets offer on an item: attack with it, open its sheet, delete it, step its quantity or damage, and send it to chat. */

import type { GenesysActor } from '@/actor/GenesysActor';
import type { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { crewForSkills } from '@/actor/data/CrewRoster';
import { equipmentStep, StepDirection, SteppedValue } from '@/actor/data/Inventory';
import { DicePrompt, RollType } from '@/app/DicePrompt';
import { attackSkillName } from '@/data/Skills';
import { postChatCard } from '@/item/ChatCards';
import type { GenesysItem } from '@/item/GenesysItem';
import type { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import type { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';
import type { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { rollForCrew } from '@/operations/CrewRoll';

/**
 * The name of the Attack Skill an actor rolls a weapon with. Undefined when the weapon lists no skill, and it offers no
 * attack.
 */
export function attackSkill(actor: GenesysActor, weapon: GenesysItem<WeaponDataModel>) {
	return attackSkillName(actor.skills, weapon.systemData);
}

/**
 * Open the dice prompt of an attack with an actor's weapon, which rolls its Attack Skill. A weapon that lists no skill
 * offers no attack.
 */
export async function attackWith(actor: GenesysActor, weapon: GenesysItem<WeaponDataModel>) {
	const skillName = attackSkill(actor, weapon);
	if (skillName) {
		await DicePrompt.promptForRoll(actor, skillName, { roll: { type: RollType.Attack, weapon } });
	}
}

/**
 * Open the dice prompt of an attack with a vehicle weapon, which one of its skills rolls, by the crew member of a role
 * that has it.
 */
export async function attackWithVehicleWeapon(vehicle: GenesysActor<VehicleDataModel>, weapon: GenesysItem<VehicleWeaponDataModel>) {
	await rollForCrew(crewForSkills(vehicle.systemData.crew, weapon.systemData.skills), { roll: { type: RollType.Attack, weapon } });
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
	item: GenesysItem<EquipmentDataModel>,
	kind: SteppedValue,
	direction: StepDirection,
	beforeWrite?: () => void,
) {
	const step = equipmentStep({ system: item.systemData }, kind, direction);
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
 * Ask the user to confirm an item's deletion. Closing the dialog keeps the item, as No does. Foundry's confirmation
 * dialog makes No its default button, as the AppV1 dialog it replaces did with `defaultYes: false`.
 */
async function confirmDeletion() {
	const confirmed = await foundry.applications.api.DialogV2.confirm({
		window: { title: 'Genesys.Dialogs.ConfirmDeleteItem.Title' },
		content: `<p>${game.i18n.localize('Genesys.Dialogs.ConfirmDeleteItem.Content')}</p>`,
		rejectClose: false,
	});
	return confirmed === true;
}
