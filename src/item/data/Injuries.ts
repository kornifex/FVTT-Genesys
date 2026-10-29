/** @file Critical Injuries: their severity, and the difficulty of the check that heals or repairs them. */

import { DIE_GLYPHS } from '@/dice/GenesysPoolModifications';

/**
 * The severities of a Critical Injury, from none to Formidable.
 */
export const SEVERITIES = ['-', 'easy', 'average', 'hard', 'daunting', 'formidable'] as const;

/**
 * The severity of a Critical Injury.
 */
export type Severity = (typeof SEVERITIES)[number];

/**
 * The localization key of each severity's name, the difficulty of its check. `-` has none.
 */
export const SEVERITY_LABELS: Record<Exclude<Severity, '-'>, string> = {
	easy: 'Genesys.Difficulty.Easy',
	average: 'Genesys.Difficulty.Average',
	hard: 'Genesys.Difficulty.Hard',
	daunting: 'Genesys.Difficulty.Daunting',
	formidable: 'Genesys.Difficulty.Formidable',
};

/**
 * The difficulty glyphs of the check that heals or repairs a Critical Injury: one difficulty die per step of its
 * severity, none for `-`.
 */
export function severityDifficulty(severity: Severity) {
	return DIE_GLYPHS.Difficulty.repeat(SEVERITIES.indexOf(severity));
}
