/** @file Critical Injuries: their severity, and the difficulty of the check that heals or repairs them. */

/**
 * The severities of a Critical Injury, from none to Formidable.
 */
export const SEVERITIES = ['-', 'easy', 'average', 'hard', 'daunting', 'formidable'] as const;

/**
 * The severity of a Critical Injury.
 */
export type Severity = (typeof SEVERITIES)[number];

/**
 * The difficulty glyphs of the check that heals or repairs a Critical Injury: one difficulty die per step of its
 * severity, none for `-`.
 */
export function severityDifficulty(severity: Severity) {
	return 'D'.repeat(SEVERITIES.indexOf(severity));
}
