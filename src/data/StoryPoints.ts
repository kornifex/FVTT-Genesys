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
 * The points spent together from each pool, as one check may spend them from both.
 */
export type StoryPointSpend = Partial<StoryPointData>;

/**
 * The pools once points of them are spent together: each goes to the other pool. Undefined when a pool holds fewer
 * points than are spent from it: a point that reaches a pool by the spend can't be spent by it too.
 */
export function storyPointsAfterSpending(storyPoints: StoryPointData, spend: StoryPointSpend): StoryPointData | undefined {
	const player = spend.player ?? 0;
	const gm = spend.gm ?? 0;
	if (storyPoints.player < player || storyPoints.gm < gm) {
		return undefined;
	}

	return { player: storyPoints.player - player + gm, gm: storyPoints.gm - gm + player };
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
