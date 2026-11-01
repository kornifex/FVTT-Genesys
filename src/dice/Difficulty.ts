/**
 * @file The Difficulty of a check: a level from Simple to Formidable, some of whose Difficulty dice may be upgraded
 * into Challenge dice, set before any Pool Modification (CRB p. 20).
 */

import { DIE_GLYPHS } from '@/dice/GenesysPoolModifications';
import { type DicePool, parsePoolModifications } from '@/dice/DicePool';
import { upgradeDie } from '@/dice/DieGrades';

/**
 * The localization keys of the difficulty levels' names, by their number of Difficulty dice (CRB p. 18, Table I.1–3).
 */
export const DIFFICULTY_LABELS = [
	'Genesys.Difficulty.Simple',
	'Genesys.Difficulty.Easy',
	'Genesys.Difficulty.Average',
	'Genesys.Difficulty.Hard',
	'Genesys.Difficulty.Daunting',
	'Genesys.Difficulty.Formidable',
];

/**
 * The highest difficulty level, Formidable, of five Difficulty dice.
 */
export const FORMIDABLE = DIFFICULTY_LABELS.length - 1;

/**
 * The Difficulty of a check: its level, the number of its Difficulty dice, and how many of them are upgraded into
 * Challenge dice.
 */
export type Difficulty = { level: number; upgrades: number };

/**
 * The difficulty the Dice Prompt receives, split into the Difficulty and the other Pool Modifications it holds.
 */
export type ReceivedDifficulty = {
	difficulty: Difficulty;
	/**
	 * The glyphs of the received difficulty that are neither a Difficulty nor a Challenge die, as manual changes.
	 */
	manualChanges: string[];
};

/**
 * Split the difficulty the Dice Prompt receives, as Pool Modification glyphs, into its Difficulty and the other Pool
 * Modifications it holds.
 */
export function receivedDifficulty(glyphs: string): ReceivedDifficulty {
	const modifications = parsePoolModifications(glyphs);
	const count = (die: string) => modifications.filter((glyph) => glyph === die).length;
	const challengeDice = count(DIE_GLYPHS.Challenge);
	// The Dice Prompt offers no level above Formidable, so a larger difficulty, as an upgraded Impossible task's, loses
	// its extra dice, Difficulty dice first.
	const level = Math.min(count(DIE_GLYPHS.Difficulty) + challengeDice, FORMIDABLE);

	return {
		difficulty: { level, upgrades: Math.min(challengeDice, level) },
		manualChanges: modifications.filter((glyph) => glyph !== DIE_GLYPHS.Difficulty && glyph !== DIE_GLYPHS.Challenge),
	};
}

/**
 * The dice of a difficulty: a Difficulty die for each level, of which each upgrade turns one into a Challenge die, or
 * adds a Difficulty die when none is left, as the Dice Prompt upgrades them (CRB p. 20, 22).
 */
export function difficultyDieCounts({ level, upgrades }: Difficulty) {
	const dice: DicePool['dice'] = { Difficulty: level };
	for (let upgrade = 0; upgrade < upgrades; upgrade++) {
		upgradeDie(dice, 'Difficulty', 'Challenge');
	}

	return { challengeDice: dice.Challenge ?? 0, difficultyDice: dice.Difficulty ?? 0 };
}

/**
 * The glyphs of a Difficulty's dice, Challenge dice first, as the pool takes them.
 */
export function difficultyGlyphs(difficulty: Difficulty) {
	const { challengeDice, difficultyDice } = difficultyDieCounts(difficulty);
	return DIE_GLYPHS.Challenge.repeat(challengeDice) + DIE_GLYPHS.Difficulty.repeat(difficultyDice);
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(value, max));
}

/**
 * A Difficulty at another level, from Simple to Formidable, which keeps as many of its upgrades as it has Difficulty
 * dice.
 */
export function withLevel(difficulty: Difficulty, level: number): Difficulty {
	const newLevel = clamp(level, 0, FORMIDABLE);
	return { level: newLevel, upgrades: Math.min(difficulty.upgrades, newLevel) };
}

/**
 * The level a click on one of the Difficulty's five dice sets: the clicked die and those before it, or one die fewer when
 * the clicked die is the highest of the level, so that a click on the first die of an Easy difficulty makes it Simple.
 *
 * @param die The clicked die, from 1 to 5.
 */
export function clickedLevel(level: number, die: number) {
	return die === level ? die - 1 : die;
}

/**
 * The five dice of the Dice Prompt's Difficulty row, from the first: the Challenge dice of the upgrades, the Difficulty
 * dice of the level, and the dice past the level, which are off.
 */
export function difficultyRow(difficulty: Difficulty): ('Challenge' | 'Difficulty' | 'Off')[] {
	const { challengeDice, difficultyDice } = difficultyDieCounts(difficulty);
	return Array.from({ length: FORMIDABLE }, (_, index) => {
		if (index < challengeDice) return 'Challenge';
		return index < challengeDice + difficultyDice ? 'Difficulty' : 'Off';
	});
}
