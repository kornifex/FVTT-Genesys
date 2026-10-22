import { describe, expect, it } from 'vitest';

import { severityDifficulty } from '@/item/data/Injuries';

describe('severityDifficulty', () => {
	it.each([
		['-', ''],
		['easy', 'D'],
		['average', 'DD'],
		['hard', 'DDD'],
		['daunting', 'DDDD'],
		['formidable', 'DDDDD'],
	] as const)('gives a %s injury the difficulty %j', (severity, difficulty) => {
		expect(severityDifficulty(severity)).toBe(difficulty);
	});
});
