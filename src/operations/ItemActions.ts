/** @file The actions the sheets offer on an item: attack with it, open its sheet, delete it, step its quantity or damage, and send it to chat. */

import type { GenesysActor } from '@/actor/GenesysActor';
import type { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { crewForSkills } from '@/actor/data/CrewRoster';
import { equipmentStep } from '@/actor/data/Inventory';
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
 * Open the dice prompt of an attack with a weapon: an actor's weapon rolls its Attack Skill, and a vehicle weapon one of
 * its skills, by the crew member of a role that has it.
 */
export async function attackWith(actor: GenesysActor, weapon: GenesysItem<WeaponDataModel | VehicleWeaponDataModel>) {
	const roll = { type: RollType.Attack, weapon };
	if (weapon.type === 'vehicleWeapon') {
		// Only a vehicle holds vehicle weapons.
		const crew = (actor.systemData as VehicleDataModel).crew;
		await rollForCrew(crewForSkills(crew, weapon.systemData.skills), { roll });
		return;
	}

	// An item that isn't a vehicle weapon is an actor's weapon here.
	const skillName = attackSkill(actor, weapon as GenesysItem<WeaponDataModel>);
	if (skillName) {
		await DicePrompt.promptForRoll(actor, skillName, { roll });
	}
}

/**
 * Open the sheet of an item, or of an actor.
 */
export async function openSheet(document: GenesysItem | GenesysActor) {
	await document.sheet?.render(true);
}

/**
 * Delete an item. A Container's contents are deleted with it.
 */
export async function deleteItem(item: GenesysItem) {
	await item.delete();
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
	kind: 'quantity' | 'damage',
	direction: 1 | -1,
	beforeWrite?: () => void,
) {
	const step = equipmentStep({ system: item.systemData }, kind, direction);
	if (step.action === 'none' || (step.action === 'delete' && !(await confirmDeletion()))) {
		return;
	}

	beforeWrite?.();
	if (step.action === 'delete') {
		await deleteItem(item);
	} else {
		await item.update(step.update);
	}
}

/**
 * Ask the user to confirm an item's deletion. Closing the dialog keeps the item, as No does.
 */
async function confirmDeletion() {
	const confirmed = await foundry.applications.api.DialogV2.confirm({
		window: { title: 'Genesys.Dialogs.ConfirmDeleteItem.Title' },
		content: `<p>${game.i18n.localize('Genesys.Dialogs.ConfirmDeleteItem.Content')}</p>`,
		rejectClose: false,
	});
	return confirmed === true;
}
