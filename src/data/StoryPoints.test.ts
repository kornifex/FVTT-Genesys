/** @file Tests for the two Story Point pools, against the Core Rulebook. */

import { describe, expect, it } from 'vitest';
import { sessionStoryPoints, storyPointsAfterSpending } from '@/data/StoryPoints';

describe('sessionStoryPoints', () => {
	it('puts one point per player in the player pool and one in the GM pool at the start of a session (CRB p. 28)', () => {
		expect(sessionStoryPoints(4)).toEqual({ player: 4, gm: 1 });
		expect(sessionStoryPoints(0)).toEqual({ player: 0, gm: 1 });
	});
});

describe('storyPointsAfterSpending', () => {
	it('moves a point the players spend into the GM pool, and a point the GM spends into the player pool (CRB p. 28)', () => {
		expect(storyPointsAfterSpending({ player: 3, gm: 1 }, 'player')).toEqual({ player: 2, gm: 2 });
		expect(storyPointsAfterSpending({ player: 3, gm: 1 }, 'gm')).toEqual({ player: 4, gm: 0 });
	});

	it('spends nothing from an empty pool (CRB p. 28)', () => {
		expect(storyPointsAfterSpending({ player: 0, gm: 2 }, 'player')).toBeUndefined();
		expect(storyPointsAfterSpending({ player: 2, gm: 0 }, 'gm')).toBeUndefined();
	});
});
