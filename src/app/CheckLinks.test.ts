/**
 * @file Tests for which actor rolls the check of a `@check` link.
 */

import { describe, expect, it } from 'vitest';
import { checkLinkActor } from '@/app/CheckLinks';

describe('checkLinkActor', () => {
	it('rolls for the actor of the actor sheet the link is in', () => {
		expect(checkLinkActor({ sheetActor: 'sheet', controlledActors: ['token'], assignedCharacter: 'character' })).toBe('sheet');
	});

	it('rolls for the actor of the single controlled token outside an actor sheet', () => {
		expect(checkLinkActor({ controlledActors: ['token'], assignedCharacter: 'character' })).toBe('token');
	});

	it('rolls for the assigned character when no token or several tokens are controlled', () => {
		expect(checkLinkActor({ controlledActors: [], assignedCharacter: 'character' })).toBe('character');
		expect(checkLinkActor({ controlledActors: ['token', 'other'], assignedCharacter: 'character' })).toBe('character');
	});

	it('rolls for the assigned character when the controlled token has no actor', () => {
		expect(checkLinkActor({ controlledActors: [undefined], assignedCharacter: 'character' })).toBe('character');
	});

	it('rolls for no actor when there is none of them', () => {
		expect(checkLinkActor({ controlledActors: ['token', 'other'] })).toBeUndefined();
	});
});
