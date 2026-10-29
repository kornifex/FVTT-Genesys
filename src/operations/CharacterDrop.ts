/**
 * @file Receives the items dropped on a character's sheet, as the CharacterItems module decides.
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import type { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import { advancementCharacter } from '@/actor/data/character/Advancement';
import { Character, CharacterDropPlan, decideCharacterDrop } from '@/actor/data/character/CharacterItems';
import { isRelevantToCharacter } from '@/actor/data/RelevantTypes';
import { CareerSkillPrompt } from '@/app/CareerSkillPrompt';
import type { GenesysItem } from '@/item/GenesysItem';
import type { SkillDataModel } from '@/item/data/SkillDataModel';
import { notify } from '@/notifications';
import { receiveInventoryDrop } from '@/operations/InventoryDrop';

/**
 * Receive an item dropped on a character's sheet: equipment goes to their inventory, anything else is written as one
 * plan. A Career first asks the player which skills get its Free Ranks, before anything is written. Returns the created
 * items, or false when the drop is refused.
 */
export async function receiveCharacterDrop(actor: GenesysActor<CharacterDataModel>, item: GenesysItem) {
	if (isRelevantToCharacter('INVENTORY', item.type)) {
		return receiveInventoryDrop(actor, item);
	}

	if (!actor.isOwner) {
		return false;
	}

	const dropped = { type: item.type, name: item.name, system: item.system as unknown, source: item.toObject() };
	const newId = () => foundry.utils.randomID();
	let decision = decideCharacterDrop(character(actor), dropped, newId);
	if (decision.action === 'chooseFreeRanks') {
		const skills = decision.skillIds.map((id) => actor.items.get(id) as GenesysItem<SkillDataModel>);
		const freeRankSkillIds = await CareerSkillPrompt.promptForSkills(skills);
		// The character is read again: it may have changed while the player chose.
		decision = decideCharacterDrop(character(actor), dropped, newId, freeRankSkillIds);
	}

	if (decision.action === 'write') {
		return write(actor, decision.plan);
	}

	// A decision made with the Free Ranks chosen asks nothing more: it writes or refuses.
	if (decision.action === 'refuse' && decision.refusal) {
		notify(decision.refusal);
	}
	return false;
}

function character(actor: GenesysActor<CharacterDataModel>): Character {
	return { id: actor.id, system: actor.systemData, items: actor.items.contents, advancement: advancementCharacter(actor) };
}

/**
 * Write a drop's plan on the character, one batch per kind of write: the items it creates, then those it updates and
 * deletes, then the character.
 */
async function write(actor: GenesysActor<CharacterDataModel>, plan: CharacterDropPlan) {
	let created: GenesysItem[] = [];
	if (plan.itemCreates.length > 0) {
		created = (await actor.createEmbeddedDocuments('Item', plan.itemCreates, { keepId: true })) as GenesysItem[];
	}
	if (plan.itemUpdates.length > 0) {
		await actor.updateEmbeddedDocuments('Item', plan.itemUpdates);
	}
	if (plan.itemDeletes.length > 0) {
		await actor.deleteEmbeddedDocuments('Item', plan.itemDeletes);
	}
	if (Object.keys(plan.actorUpdate).length > 0) {
		await actor.update(plan.actorUpdate);
	}

	return created;
}
