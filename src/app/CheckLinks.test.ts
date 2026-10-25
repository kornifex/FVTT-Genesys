/**
 * @file Tests for the difficulty of a `@check` link and which actor rolls its check.
 */

import { describe, expect, it } from 'vitest';
import { checkLinkActor, checkLinkDifficulty } from '@/app/CheckLinks';

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

describe('checkLinkDifficulty', () => {
	it.each([
		[0, 'Genesys.Difficulty.Simple'],
		[1, 'Genesys.Difficulty.Easy'],
		[2, 'Genesys.Difficulty.Average'],
		[3, 'Genesys.Difficulty.Hard'],
		[4, 'Genesys.Difficulty.Daunting'],
		[5, 'Genesys.Difficulty.Formidable'],
	])('adds %i Difficulty dice for a level named %s (CRB p. 16-18, Table I.1–3)', (level, label) => {
		expect(checkLinkDifficulty(level, 0)).toEqual({ label, challengeDice: 0, difficultyDice: level });
	});

	it('names an Impossible task above Formidable, which adds five Difficulty dice (CRB p. 18)', () => {
		expect(checkLinkDifficulty(6, 0)).toEqual({ label: 'Genesys.Difficulty.Impossible', challengeDice: 0, difficultyDice: 5 });
		expect(checkLinkDifficulty(9, 0)).toEqual({ label: 'Genesys.Difficulty.Impossible', challengeDice: 0, difficultyDice: 5 });
	});

	it('upgrades as many Difficulty dice into Challenge dice as it has upgrades (CRB p. 20, 22)', () => {
		expect(checkLinkDifficulty(2, 1)).toEqual({ label: 'Genesys.Difficulty.Average', challengeDice: 1, difficultyDice: 1 });
		expect(checkLinkDifficulty(3, 3)).toEqual({ label: 'Genesys.Difficulty.Hard', challengeDice: 3, difficultyDice: 0 });
	});
});
