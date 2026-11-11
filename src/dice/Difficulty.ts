/**
 * @file The Difficulty of a check: a level from Simple to Formidable, or Impossible, some of whose Difficulty dice may be
 * upgraded into Challenge dice, set before any Pool Modification (CRB p. 20), and the one the Dice Prompt opens at.
 */

import { DIE_GLYPHS } from '@/dice/GenesysPoolModifications';
import { type DicePool, parsePoolModifications } from '@/dice/DicePool';
import { upgradeDie } from '@/dice/DieGrades';
import { skillNamesMatch } from '@/data/Skills';

/**
 * The localization keys of the difficulty levels' names, by their number of Difficulty dice, then Impossible (CRB p. 18,
 * Table I.1–3).
 */
export const DIFFICULTY_LABELS = [
	'Genesys.Difficulty.Simple',
	'Genesys.Difficulty.Easy',
	'Genesys.Difficulty.Average',
	'Genesys.Difficulty.Hard',
	'Genesys.Difficulty.Daunting',
	'Genesys.Difficulty.Formidable',
	'Genesys.Difficulty.Impossible',
];

/**
 * The difficulty level of five Difficulty dice, Formidable: the most dice a difficulty rolls.
 */
export const FORMIDABLE = 5;

/**
 * The level above Formidable: an Impossible task, which rolls as a Formidable one once the roller spends a Story Point to
 * attempt it (CRB p. 18).
 */
export const IMPOSSIBLE = FORMIDABLE + 1;

/**
 * The localization key of a difficulty level's name: every level above Formidable is Impossible.
 */
export function difficultyLabel(level: number) {
	return DIFFICULTY_LABELS[Math.min(level, IMPOSSIBLE)];
}

/**
 * The Difficulty of a check: its level, the number of its Difficulty dice but for an Impossible one, and how many of them
 * are upgraded into Challenge dice.
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
 * What the Dice Prompt's opening difficulty needs of a skill of the Skills Compendium.
 */
export type SkillWithDifficulty = { name: string; system: { difficulty: string } };

/**
 * The difficulty the Dice Prompt opens at, as Pool Modification glyphs: the one its caller gives, even an empty one;
 * else the default difficulty of the Skills Compendium's skill named as the rolled skill, when it has one; else the
 * world's. An actor's own copy of the skill is never read, so a change in the compendium applies to every actor at once.
 */
export function openingDifficulty(
	callerDifficulty: string | undefined,
	compendiumSkills: SkillWithDifficulty[],
	skillName: string | undefined,
	worldDifficulty: string,
) {
	if (callerDifficulty !== undefined) {
		return callerDifficulty;
	}

	const skill = skillName ? compendiumSkills.find((candidate) => skillNamesMatch(candidate.name, skillName)) : undefined;
	return skill?.system.difficulty || worldDifficulty;
}

/**
 * Split the difficulty the Dice Prompt receives, as Pool Modification glyphs, into its Difficulty and the other Pool
 * Modifications it holds. An Impossible task's glyphs are a Formidable one's: its caller says the task is Impossible.
 */
export function receivedDifficulty(glyphs: string, impossible = false): ReceivedDifficulty {
	const modifications = parsePoolModifications(glyphs);
	const count = (die: string) => modifications.filter((glyph) => glyph === die).length;
	const challengeDice = count(DIE_GLYPHS.Challenge);
	// No difficulty rolls more dice than a Formidable one, so a larger difficulty, as an upgraded Impossible task's, loses
	// its extra dice, Difficulty dice first.
	const dice = Math.min(count(DIE_GLYPHS.Difficulty) + challengeDice, FORMIDABLE);

	return {
		difficulty: { level: impossible ? IMPOSSIBLE : dice, upgrades: Math.min(challengeDice, dice) },
		manualChanges: modifications.filter((glyph) => glyph !== DIE_GLYPHS.Difficulty && glyph !== DIE_GLYPHS.Challenge),
	};
}

/**
 * The dice of a difficulty: a Difficulty die for each level up to Formidable, whose five an Impossible task rolls too
 * (CRB p. 18), of which each upgrade turns one into a Challenge die, or adds a Difficulty die when none is left, as the
 * Dice Prompt upgrades them (CRB p. 20, 22).
 */
export function difficultyDieCounts({ level, upgrades }: Difficulty) {
	const dice: DicePool['dice'] = { Difficulty: Math.min(level, FORMIDABLE) };
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
 * A Difficulty at another level, from Simple to Impossible, which keeps as many of its upgrades as it has Difficulty
 * dice.
 */
export function withLevel(difficulty: Difficulty, level: number): Difficulty {
	const newLevel = clamp(level, 0, IMPOSSIBLE);
	return { level: newLevel, upgrades: Math.min(difficulty.upgrades, newLevel, FORMIDABLE) };
}

/**
 * The level a click on one of the Difficulty's five dice, or on its Impossible mark after them, sets: the clicked die
 * and those before it, or one die fewer when the clicked die is the highest of the level, so that a click on the first
 * die of an Easy difficulty makes it Simple, and one on the mark of an Impossible task makes it Formidable.
 *
 * @param die The clicked die, from 1 to 5, or 6 for the Impossible mark.
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
