/**
 * @file Check links: the difficulty of a `@check` link, and which actor rolls its check wherever the link is rendered.
 */

import type { DieName } from '@/dice/DicePool';
import { upgradeDie } from '@/dice/DieUpgrades';

/**
 * The actors a `@check` link can roll for.
 */
export type CheckLinkActors<A> = {
	/**
	 * The actor of the actor sheet the link is in, if any.
	 */
	sheetActor?: A;

	/**
	 * The actors of the tokens the user controls.
	 */
	controlledActors: (A | undefined)[];

	/**
	 * The user's assigned character, if any.
	 */
	assignedCharacter?: A;
};

/**
 * The actor a `@check` link rolls for: the actor of the actor sheet the link is in, otherwise the actor of the user's
 * single controlled token, otherwise the user's assigned character. None when there is none of them.
 */
export function checkLinkActor<A>({ sheetActor, controlledActors, assignedCharacter }: CheckLinkActors<A>): A | undefined {
	const controlledActor = controlledActors.length === 1 ? controlledActors[0] : undefined;

	return sheetActor ?? controlledActor ?? assignedCharacter;
}

// The difficulty levels a `@check` link names, by their number of Difficulty dice. A level above Formidable is an
// Impossible task, which rolls as many dice as a Formidable one.
const DIFFICULTY_LABELS = [
	'Genesys.Difficulty.Simple',
	'Genesys.Difficulty.Easy',
	'Genesys.Difficulty.Average',
	'Genesys.Difficulty.Hard',
	'Genesys.Difficulty.Daunting',
	'Genesys.Difficulty.Formidable',
];
const IMPOSSIBLE_LABEL = 'Genesys.Difficulty.Impossible';

/**
 * The difficulty of a `@check` link.
 */
export type CheckLinkDifficulty = {
	/**
	 * The localization key of the difficulty level's name.
	 */
	label: string;
	challengeDice: number;
	difficultyDice: number;
};

/**
 * The difficulty of a `@check` link from its level and its upgrades. Each upgrade turns a Difficulty die into a
 * Challenge die, or adds a Difficulty die when none is left, as the dice prompt upgrades them.
 */
export function checkLinkDifficulty(level: number, upgrades: number): CheckLinkDifficulty {
	const dice: Partial<Record<DieName, number>> = { Difficulty: Math.min(level, DIFFICULTY_LABELS.length - 1) };
	for (let upgrade = 0; upgrade < upgrades; upgrade++) {
		upgradeDie(dice, 'Difficulty', 'Challenge');
	}

	return {
		label: DIFFICULTY_LABELS[level] ?? IMPOSSIBLE_LABEL,
		challengeDice: dice.Challenge ?? 0,
		difficultyDice: dice.Difficulty ?? 0,
	};
}
