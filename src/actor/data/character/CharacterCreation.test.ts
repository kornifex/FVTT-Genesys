/**
 * @file Tests for character creation.
 */

import { describe, expect, it } from 'vitest';
import {
	canMarkSuperCharacteristics,
	isInCharacterCreation,
	maxPurchasableSkillRank,
	toggleSuperCharacteristic,
} from '@/actor/data/character/CharacterCreation';
import { Entry, EntryType } from '@/actor/data/character/ExperienceJournal';
import { Characteristic } from '@/data/Characteristics';

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

describe('super-characteristics', () => {
	const withStartingXPLeft: Entry[] = [
		{ amount: 100, type: EntryType.Starting },
		{ amount: -10, type: EntryType.Skill, data: { name: 'Cool', id: 'cool', rank: 1 } },
	];
	const withNoStartingXPLeft: Entry[] = [
		{ amount: 10, type: EntryType.Starting },
		{ amount: -10, type: EntryType.Skill, data: { name: 'Cool', id: 'cool', rank: 1 } },
	];
	const awarded = (entries: Entry[]): Entry[] => [...entries, { amount: 20, type: EntryType.Award, data: { reason: 'Session' } }];

	it('can be marked and unmarked during Character Creation, with or without starting XP left', () => {
		for (const entries of [withStartingXPLeft, withNoStartingXPLeft]) {
			expect(canMarkSuperCharacteristics(entries)).toBe(true);
			expect(toggleSuperCharacteristic(entries, new Set([Characteristic.Brawn]), Characteristic.Willpower)).toEqual([
				Characteristic.Brawn,
				Characteristic.Willpower,
			]);
			expect(
				toggleSuperCharacteristic(entries, new Set([Characteristic.Brawn, Characteristic.Willpower]), Characteristic.Brawn),
			).toEqual([Characteristic.Willpower]);
		}
	});

	it('can no longer be marked or unmarked after the first XP award, with or without starting XP left', () => {
		for (const entries of [awarded(withStartingXPLeft), awarded(withNoStartingXPLeft)]) {
			expect(canMarkSuperCharacteristics(entries)).toBe(false);
			expect(toggleSuperCharacteristic(entries, new Set(), Characteristic.Willpower)).toBeUndefined();
			expect(toggleSuperCharacteristic(entries, new Set([Characteristic.Brawn]), Characteristic.Brawn)).toBeUndefined();
		}
	});
});
