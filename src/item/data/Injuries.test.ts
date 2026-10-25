/** @file Tests for the difficulty of the check that heals a Critical Injury, against the Core Rulebook. */

import { describe, expect, it } from 'vitest';

import { severityDifficulty } from '@/item/data/Injuries';

describe('severityDifficulty', () => {
	it.each([
		['easy', 'D'],
		['average', 'DD'],
		['hard', 'DDD'],
		['daunting', 'DDDD'],
	] as const)(
		'gives the check that heals a Critical Injury of severity %s its severity as difficulty, %s (CRB p. 115-116)',
		(severity, difficulty) => {
			expect(severityDifficulty(severity)).toBe(difficulty);
		},
	);

	it('gives no difficulty to a Critical Injury without severity, like Dead (CRB p. 115)', () => {
		expect(severityDifficulty('-')).toBe('');
	});

	it("gives a Formidable Critical Injury, the system's own severity past Daunting, a Formidable difficulty", () => {
		expect(severityDifficulty('formidable')).toBe('DDDDD');
	});
});
