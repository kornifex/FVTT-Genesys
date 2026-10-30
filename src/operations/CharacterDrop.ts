/**
 * @file Receives the items dropped on a character's sheet, as the CharacterItems module decides.
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import { advancementCharacter, writeCharacter } from '@/actor/data/character/Advancement';
import { Character, decideCharacterDrop } from '@/actor/data/character/CharacterItems';
import { isRelevantToCharacter } from '@/actor/data/RelevantTypes';
import { CareerSkillPrompt } from '@/app/CareerSkillPrompt';
import type { Stored } from '@/data/Stored';
import type { GenesysItem } from '@/item/GenesysItem';
import { notify } from '@/notifications';
import { receiveInventoryDrop } from '@/operations/InventoryDrop';

/**
 * Receive an item dropped on a character's sheet: equipment goes to their inventory, anything else is written as one
 * plan. A Career first asks the player which skills get its Free Ranks, before anything is written. Returns the created
 * items, or false when the drop is refused.
 */
export async function receiveCharacterDrop(actor: Stored<GenesysActor<'character'>>, item: GenesysItem) {
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
		const skills = decision.skillIds.map((id) => actor.items.get(id) as Stored<GenesysItem<'skill'>>);
		const freeRankSkillIds = await CareerSkillPrompt.promptForSkills(skills);
		// The character is read again: it may have changed while the player chose.
		decision = decideCharacterDrop(character(actor), dropped, newId, freeRankSkillIds);
	}

	if (decision.action === 'write') {
		return writeCharacter(actor, decision.plan);
	}

	// A decision made with the Free Ranks chosen asks nothing more: it writes or refuses.
	if (decision.action === 'refuse' && decision.refusal) {
		notify(decision.refusal);
	}
	return false;
}

function character(actor: GenesysActor<'character'>): Character {
	return { id: actor.id, system: actor.system, items: actor.items.contents, advancement: advancementCharacter(actor) };
}
