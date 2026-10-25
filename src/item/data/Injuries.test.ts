/** @file Tests for the difficulty of the check that heals a Critical Injury or repairs a Critical Hit, against the Core Rulebook. */

import { describe, expect, it } from 'vitest';

import { severityDifficulty } from '@/item/data/Injuries';

describe('severityDifficulty', () => {
	it.each([
		['easy', 'D'],
		['average', 'DD'],
		['hard', 'DDD'],
		['daunting', 'DDDD'],
	] as const)(
		'gives the check that heals a Critical Injury or repairs a Critical Hit of severity %s its severity as difficulty, %s (CRB p. 115-116, 229-231)',
		(severity, difficulty) => {
			expect(severityDifficulty(severity)).toBe(difficulty);
		},
	);

	it('gives no difficulty to a Critical Injury or Critical Hit without severity, like Dead or Vaporized (CRB p. 115, 230)', () => {
		expect(severityDifficulty('-')).toBe('');
	});

	it("gives a Formidable Critical Injury, the system's own severity past Daunting, a Formidable difficulty", () => {
		expect(severityDifficulty('formidable')).toBe('DDDDD');
	});
});
