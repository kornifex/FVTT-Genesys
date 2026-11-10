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
 * The pools once the GM sets one of them, typing its count or adding a point with its +: the other pool keeps its
 * points, unlike a spend.
 */
export function storyPointsAfterSetting(storyPoints: StoryPointData, pool: StoryPointPool, count: number): StoryPointData {
	return { ...storyPoints, [pool]: count };
}

/**
 * A change of the pools, made from the pools stored when it runs: the pools to write, or undefined to write nothing.
 */
export type StoryPointChange = (storyPoints: StoryPointData) => StoryPointData | undefined;

/**
 * Returns the function through which a client writes the pools: one change at a time, each reading the pools the
 * previous one wrote, so that changes that reach the client together all count (a double click on a count, a spend then
 * a typed count, two players' spends). It resolves to whether the change wrote anything.
 */
export function serialStoryPointWrites(read: () => StoryPointData, write: (storyPoints: StoryPointData) => Promise<unknown>) {
	let queue: Promise<unknown> = Promise.resolve();

	return (change: StoryPointChange): Promise<boolean> => {
		const written = queue.then(async () => {
			const storyPoints = change(read());
			if (!storyPoints) {
				return false;
			}
			await write(storyPoints);
			return true;
		});
		// A failed write rejects to its own caller; the next ones still run.
		queue = written.catch(() => false);
		return written;
	};
}
