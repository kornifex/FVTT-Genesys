/**
 * @file Tests for the Difficulty of a check: its level, its upgrades, its dice in the Dice Prompt, and the difficulty the
 * Dice Prompt receives.
 */

import { describe, expect, it } from 'vitest';
import {
	clickedLevel,
	difficultyGlyphs,
	difficultyLabel,
	difficultyRow,
	openingDifficulty,
	receivedDifficulty,
	withLevel,
} from '@/dice/Difficulty';

describe('openingDifficulty', () => {
	const skill = (name: string, difficulty: string) => ({ name, system: { difficulty } });
	const compendium = [skill('Melee (Light)', 'DD'), skill('Athletics', '')];
	const WORLD = 'D';

	it('opens a melee attack at Average when its skill is set to it in the Skills Compendium (CRB p. 102)', () => {
		expect(openingDifficulty(undefined, compendium, 'Melee (Light)', WORLD)).toBe('DD');
	});

	it("matches the compendium's skill whatever the case of the rolled skill's name", () => {
		expect(openingDifficulty(undefined, compendium, 'melee (light)', WORLD)).toBe('DD');
	});

	it("opens at the caller's difficulty over the skill's", () => {
		expect(openingDifficulty('DDD', compendium, 'Melee (Light)', WORLD)).toBe('DDD');
	});

	it("opens at the caller's empty difficulty, as an initiative check's, over the skill's", () => {
		expect(openingDifficulty('', compendium, 'Melee (Light)', WORLD)).toBe('');
	});

	it("falls back to the world's difficulty for a skill whose field is empty", () => {
		expect(openingDifficulty(undefined, compendium, 'Athletics', WORLD)).toBe(WORLD);
	});

	it("falls back to the world's difficulty for a skill missing from the compendium", () => {
		expect(openingDifficulty(undefined, compendium, 'Knitting', WORLD)).toBe(WORLD);
	});

	it("falls back to the world's difficulty for a Characteristic Check, which names no skill", () => {
		expect(openingDifficulty(undefined, compendium, '', WORLD)).toBe(WORLD);
		expect(openingDifficulty(undefined, compendium, undefined, WORLD)).toBe(WORLD);
	});
});

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

	it("reads an Impossible task's dice, a Formidable difficulty's, at the Impossible level (CRB p. 18)", () => {
		expect(receivedDifficulty('DDDDD', true)).toEqual({ difficulty: { level: 6, upgrades: 0 }, manualChanges: [] });
		expect(receivedDifficulty('CDDDDB', true)).toEqual({ difficulty: { level: 6, upgrades: 1 }, manualChanges: ['B'] });
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

	it('keeps the level from Simple to Impossible (CRB p. 18)', () => {
		expect(withLevel({ level: 3, upgrades: 0 }, -1)).toEqual({ level: 0, upgrades: 0 });
		expect(withLevel({ level: 3, upgrades: 0 }, 6)).toEqual({ level: 6, upgrades: 0 });
		expect(withLevel({ level: 3, upgrades: 0 }, 7)).toEqual({ level: 6, upgrades: 0 });
	});

	it('keeps no more upgrades than the five dice an Impossible task rolls (CRB p. 18)', () => {
		expect(withLevel({ level: 5, upgrades: 5 }, 6)).toEqual({ level: 6, upgrades: 5 });
		expect(withLevel({ level: 6, upgrades: 6 }, 6)).toEqual({ level: 6, upgrades: 5 });
	});
});

describe('difficultyLabel', () => {
	it('names each level, and every level above Formidable Impossible (CRB p. 18)', () => {
		expect(difficultyLabel(0)).toBe('Genesys.Difficulty.Simple');
		expect(difficultyLabel(5)).toBe('Genesys.Difficulty.Formidable');
		expect(difficultyLabel(6)).toBe('Genesys.Difficulty.Impossible');
		expect(difficultyLabel(9)).toBe('Genesys.Difficulty.Impossible');
	});
});

describe('clickedLevel', () => {
	it('sets the level to the clicked die, lighting it and those before it (#469)', () => {
		expect(clickedLevel(0, 3)).toBe(3);
		expect(clickedLevel(3, 1)).toBe(1);
		expect(clickedLevel(2, 5)).toBe(5);
	});

	it('lowers the level by one on a click on its highest die, down to Simple (#469)', () => {
		expect(clickedLevel(3, 3)).toBe(2);
		expect(clickedLevel(1, 1)).toBe(0);
	});

	it('makes the task Impossible on a click on the mark after the dice, and Formidable on a second one (#671)', () => {
		expect(clickedLevel(2, 6)).toBe(6);
		expect(clickedLevel(6, 6)).toBe(5);
		expect(clickedLevel(6, 3)).toBe(3);
	});
});

describe('difficultyRow', () => {
	it('lights a Difficulty die for each level, the others off (#469)', () => {
		expect(difficultyRow({ level: 3, upgrades: 0 })).toEqual(['Difficulty', 'Difficulty', 'Difficulty', 'Off', 'Off']);
		expect(difficultyRow({ level: 0, upgrades: 0 })).toEqual(['Off', 'Off', 'Off', 'Off', 'Off']);
	});

	it('shows the upgraded dice as Challenge dice, first (#469)', () => {
		expect(difficultyRow({ level: 3, upgrades: 1 })).toEqual(['Challenge', 'Difficulty', 'Difficulty', 'Off', 'Off']);
		expect(difficultyRow({ level: 5, upgrades: 5 })).toEqual(['Challenge', 'Challenge', 'Challenge', 'Challenge', 'Challenge']);
	});

	it("lights an Impossible task's five dice, as a Formidable one's (CRB p. 18)", () => {
		expect(difficultyRow({ level: 6, upgrades: 1 })).toEqual(['Challenge', 'Difficulty', 'Difficulty', 'Difficulty', 'Difficulty']);
		expect(difficultyGlyphs({ level: 6, upgrades: 0 })).toBe('DDDDD');
	});
});
