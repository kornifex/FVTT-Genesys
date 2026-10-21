/**
 * @file Tests for the relevant types of an actor.
 */

import { describe, expect, it } from 'vitest';
import { isRelevantType, RelevantTypes } from '@/actor/data/RelevantTypes';

const relevantTypes: RelevantTypes<'INVENTORY' | 'EQUIPABLE'> = {
	INVENTORY: ['weapon', 'gear'],
	EQUIPABLE: ['weapon'],
};

describe('isRelevantType', () => {
	it('tells whether a type is listed for a context', () => {
		expect(isRelevantType(relevantTypes, 'INVENTORY', 'gear')).toBe(true);
		expect(isRelevantType(relevantTypes, 'EQUIPABLE', 'gear')).toBe(false);
	});

	it('never finds an empty type relevant', () => {
		expect(isRelevantType({ INVENTORY: [''] }, 'INVENTORY', '')).toBe(false);
	});

	it('never finds a type relevant to an unknown context', () => {
		expect(isRelevantType(relevantTypes, 'CONSUMABLE' as 'INVENTORY', 'weapon')).toBe(false);
	});
});
