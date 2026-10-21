/**
 * @file Character creation: it lasts until the character receives their first XP award, and limits the skill ranks they can buy.
 */

import { Entry, EntryType } from '@/actor/data/character/ExperienceJournal';

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
