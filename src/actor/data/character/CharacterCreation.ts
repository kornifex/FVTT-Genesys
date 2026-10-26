/**
 * @file Character creation: it lasts until the character receives their first XP award, limits the skill ranks they can buy,
 * and is when super-characteristics are marked.
 */

import { Entry, EntryType } from '@/actor/data/character/ExperienceJournal';
import { Characteristic, toggledSuperCharacteristics } from '@/data/Characteristics';

/**
 * The highest rank a skill can reach.
 */
const MAX_SKILL_RANK = 5;

/**
 * The highest rank a skill can be bought to during character creation.
 */
const MAX_CREATION_SKILL_RANK = 2;

/**
 * Whether a character is still in character creation, i.e. their Experience Journal has no XP award yet.
 */
export function isInCharacterCreation(entries: Pick<Entry, 'type'>[]) {
	return !entries.some((entry) => entry.type === EntryType.Award);
}

/**
 * The highest rank a skill can be bought to. Ranks granted for free (by the archetype or the career) are not limited.
 */
export function maxPurchasableSkillRank(entries: Pick<Entry, 'type'>[]) {
	return isInCharacterCreation(entries) ? MAX_CREATION_SKILL_RANK : MAX_SKILL_RANK;
}

/**
 * Whether a character can mark or unmark super-characteristics: only during character creation, whether or not they
 * have starting XP left.
 */
export function canMarkSuperCharacteristics(entries: Pick<Entry, 'type'>[]) {
	return isInCharacterCreation(entries);
}

/**
 * A character's super-characteristics with one marked, or unmarked if it already was. Undefined when they can no longer
 * be changed, or when marking it would go over two.
 */
export function toggleSuperCharacteristic(
	entries: Pick<Entry, 'type'>[],
	superCharacteristics: Set<Characteristic>,
	characteristic: Characteristic,
): Characteristic[] | undefined {
	if (!canMarkSuperCharacteristics(entries)) {
		return undefined;
	}

	return toggledSuperCharacteristics(superCharacteristics, characteristic);
}
