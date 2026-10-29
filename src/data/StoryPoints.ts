/** @file The two Story Point pools: what they hold at the start of a session, where a spent point goes, and what the GM may set them to. */

import type { StoryPointData } from '@/settings/storyPoints';

/**
 * One of the two Story Point pools.
 */
export type StoryPointPool = keyof StoryPointData;

/**
 * The localization key of the chat message that announces a point spent from each pool.
 */
export const SPEND_MESSAGES: Record<StoryPointPool, string> = {
	player: 'Genesys.StoryPoints.ChatMessagePlayerPool',
	gm: 'Genesys.StoryPoints.ChatMessageGmPool',
};

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

/**
 * The pools once the GM types a new count for one of them. Undefined when the input isn't a whole number of points: the
 * tracker then keeps the pools as they are.
 */
export function storyPointsAfterEditing(storyPoints: StoryPointData, pool: StoryPointPool, input: string): StoryPointData | undefined {
	const count = input.trim();
	if (!/^\d+$/.test(count)) {
		return undefined;
	}

	return { ...storyPoints, [pool]: Number(count) };
}
