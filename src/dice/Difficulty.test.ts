/**
 * @file Tests for the Difficulty of a check: its level, its upgrades, and the difficulty the Dice Prompt receives.
 */

import { describe, expect, it } from 'vitest';
import { difficultyGlyphs, receivedDifficulty, withLevel, withUpgrades } from '@/dice/Difficulty';

describe('receivedDifficulty', () => {
	it('reads Difficulty dice as the level, without upgrades', () => {
		expect(receivedDifficulty('DDD')).toEqual({ difficulty: { level: 3, upgrades: 0 }, manualChanges: [] });
	});

	it('reads each Challenge die as an upgraded Difficulty die of the level (CRB p. 20)', () => {
		expect(receivedDifficulty('CDD')).toEqual({ difficulty: { level: 3, upgrades: 1 }, manualChanges: [] });
		expect(receivedDifficulty('CC')).toEqual({ difficulty: { level: 2, upgrades: 2 }, manualChanges: [] });
	});

	it('keeps every other Pool Modification as a manual change, in the order they apply', () => {
		expect(receivedDifficulty('DDB')).toEqual({ difficulty: { level: 2, upgrades: 0 }, manualChanges: ['B'] });
		expect(receivedDifficulty('-Ds*DS')).toEqual({ difficulty: { level: 1, upgrades: 0 }, manualChanges: ['S', '*', '-D', 's'] });
	});

	it('reads a difficulty of more than five dice as a Formidable one, keeping as many Challenge dice as fit', () => {
		expect(receivedDifficulty('DDDDDDD')).toEqual({ difficulty: { level: 5, upgrades: 0 }, manualChanges: [] });
		expect(receivedDifficulty('CCCCCD')).toEqual({ difficulty: { level: 5, upgrades: 5 }, manualChanges: [] });
		expect(receivedDifficulty('CCDDDD')).toEqual({ difficulty: { level: 5, upgrades: 2 }, manualChanges: [] });
	});

	it('reads an empty difficulty as a Simple one', () => {
		expect(receivedDifficulty('')).toEqual({ difficulty: { level: 0, upgrades: 0 }, manualChanges: [] });
	});
});

describe('difficultyGlyphs', () => {
	it('gives a Difficulty die for each level, and turns as many into Challenge dice as it has upgrades (CRB p. 20)', () => {
		expect(difficultyGlyphs({ level: 3, upgrades: 0 })).toBe('DDD');
		expect(difficultyGlyphs({ level: 3, upgrades: 1 })).toBe('CDD');
		expect(difficultyGlyphs({ level: 2, upgrades: 2 })).toBe('CC');
	});

	it('gives no die for a Simple difficulty', () => {
		expect(difficultyGlyphs({ level: 0, upgrades: 0 })).toBe('');
	});
});

describe('withLevel', () => {
	it('sets the level and keeps the upgrades it still has dice for', () => {
		expect(withLevel({ level: 3, upgrades: 1 }, 2)).toEqual({ level: 2, upgrades: 1 });
		expect(withLevel({ level: 1, upgrades: 1 }, 4)).toEqual({ level: 4, upgrades: 1 });
	});

	it('lowers the upgrades with a level below them, each upgrade needing a Difficulty die', () => {
		expect(withLevel({ level: 4, upgrades: 3 }, 1)).toEqual({ level: 1, upgrades: 1 });
		expect(withLevel({ level: 2, upgrades: 2 }, 0)).toEqual({ level: 0, upgrades: 0 });
	});

	it('keeps the level from Simple to Formidable', () => {
		expect(withLevel({ level: 3, upgrades: 0 }, -1)).toEqual({ level: 0, upgrades: 0 });
		expect(withLevel({ level: 3, upgrades: 0 }, 6)).toEqual({ level: 5, upgrades: 0 });
	});
});

describe('withUpgrades', () => {
	it('sets the upgrades', () => {
		expect(withUpgrades({ level: 3, upgrades: 0 }, 2)).toEqual({ level: 3, upgrades: 2 });
	});

	it('keeps the upgrades from none to one for each Difficulty die of the level', () => {
		expect(withUpgrades({ level: 2, upgrades: 2 }, 3)).toEqual({ level: 2, upgrades: 2 });
		expect(withUpgrades({ level: 2, upgrades: 0 }, -1)).toEqual({ level: 2, upgrades: 0 });
		expect(withUpgrades({ level: 0, upgrades: 0 }, 1)).toEqual({ level: 0, upgrades: 0 });
	});
});
