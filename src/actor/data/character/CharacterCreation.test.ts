/**
 * @file Tests for character creation.
 */

import { describe, expect, it } from 'vitest';
import { isInCharacterCreation, maxPurchasableSkillRank } from '@/actor/data/character/CharacterCreation';
import { EntryType } from '@/actor/data/character/ExperienceJournal';

describe('isInCharacterCreation', () => {
	it('is true for an empty journal', () => {
		expect(isInCharacterCreation([])).toBe(true);
	});

	it('is true while the journal holds only starting XP and spends', () => {
		expect(
			isInCharacterCreation([
				{ type: EntryType.Starting },
				{ type: EntryType.Characteristic },
				{ type: EntryType.Skill },
				{ type: EntryType.NewTalent },
			]),
		).toBe(true);
	});

	it('ends with the first XP award', () => {
		expect(isInCharacterCreation([{ type: EntryType.Starting }, { type: EntryType.Skill }, { type: EntryType.Award }])).toBe(false);
	});
});

describe('maxPurchasableSkillRank', () => {
	it('is 2 during character creation', () => {
		expect(maxPurchasableSkillRank([{ type: EntryType.Starting }])).toBe(2);
	});

	it('is 5 after the first XP award', () => {
		expect(maxPurchasableSkillRank([{ type: EntryType.Starting }, { type: EntryType.Award }])).toBe(5);
	});
});
