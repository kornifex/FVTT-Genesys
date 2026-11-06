/** @file Tests for the details of each die type. */

import { describe, expect, it } from 'vitest';
import { dieOfDenomination } from '@/dice/DieTypes';

describe('dieOfDenomination', () => {
	it('finds the die type Foundry rolls under each denomination, a Difficulty die under `i`', () => {
		expect(['p', 'a', 'b', 'c', 'i', 's'].map(dieOfDenomination)).toEqual([
			'Proficiency',
			'Ability',
			'Boost',
			'Challenge',
			'Difficulty',
			'Setback',
		]);
	});

	it('finds none for a denomination of no Genesys die', () => {
		expect(dieOfDenomination('d')).toBeUndefined();
	});
});
