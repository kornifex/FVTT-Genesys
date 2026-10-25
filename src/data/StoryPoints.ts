/** @file The two Story Point pools: what they hold at the start of a session, and where a spent point goes. */

import type { StoryPointData } from '@/settings/storyPoints';

/**
 * One of the two Story Point pools.
 */
export type StoryPointPool = keyof StoryPointData;

/**
 * The pools at the start of a session: one point per player in the player pool, one in the GM pool.
 */
export function sessionStoryPoints(playerCount: number): StoryPointData {
	return { player: playerCount, gm: 1 };
}

/**
 * The pools once a point of one of them is spent: it goes to the other pool. Undefined when that pool is empty.
 */
export function storyPointsAfterSpending(storyPoints: StoryPointData, pool: StoryPointPool): StoryPointData | undefined {
	if (storyPoints[pool] === 0) {
		return undefined;
	}

	return pool === 'player'
		? { player: storyPoints.player - 1, gm: storyPoints.gm + 1 }
		: { player: storyPoints.player + 1, gm: storyPoints.gm - 1 };
}
