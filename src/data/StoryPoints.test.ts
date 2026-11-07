/** @file Tests for the two Story Point pools, against the Core Rulebook. */

import { describe, expect, it } from 'vitest';
import {
	serialStoryPointWrites,
	sessionStoryPoints,
	type StoryPointPool,
	storyPointsAfterSetting,
	storyPointsAfterSpending,
} from '@/data/StoryPoints';
import type { StoryPointData } from '@/settings/storyPoints';

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

describe('storyPointsAfterSetting', () => {
	it('sets the pool the GM edits to its new count, and leaves the other one alone', () => {
		expect(storyPointsAfterSetting({ player: 3, gm: 1 }, 'gm', 4)).toEqual({ player: 3, gm: 4 });
		expect(storyPointsAfterSetting({ player: 3, gm: 1 }, 'player', 0)).toEqual({ player: 0, gm: 1 });
	});
});

describe('serialStoryPointWrites', () => {
	/** A world setting whose write lands a moment later, as Foundry's does once the server answers. */
	function storedPools(initial: StoryPointData) {
		let stored = initial;
		const writes: StoryPointData[] = [];
		const write = async (storyPoints: StoryPointData) => {
			await new Promise((resolve) => setTimeout(resolve, 5));
			stored = storyPoints;
			writes.push(storyPoints);
		};
		return { read: () => stored, write, writes, stored: () => stored };
	}
	const add = (pool: StoryPointPool) => (storyPoints: StoryPointData) =>
		storyPointsAfterSetting(storyPoints, pool, storyPoints[pool] + 1);
	const spend = (pool: StoryPointPool) => (storyPoints: StoryPointData) => storyPointsAfterSpending(storyPoints, pool);

	it('counts changes made together, each from the pools the previous one wrote: a spend then a +, two +', async () => {
		const pools = storedPools({ player: 2, gm: 1 });
		const writeChange = serialStoryPointWrites(pools.read, pools.write);

		// Not awaited one by one: a second click before the first write has landed.
		const results = await Promise.all([writeChange(spend('gm')), writeChange(add('gm')), writeChange(add('gm'))]);

		expect(results).toEqual([true, true, true]);
		expect(pools.writes).toEqual([
			{ player: 3, gm: 0 },
			{ player: 3, gm: 1 },
			{ player: 3, gm: 2 },
		]);
	});

	it('writes nothing for a change that makes none, as a spend from a pool emptied meanwhile', async () => {
		const pools = storedPools({ player: 1, gm: 0 });
		const writeChange = serialStoryPointWrites(pools.read, pools.write);

		const results = await Promise.all([writeChange(spend('player')), writeChange(spend('player'))]);

		expect(results).toEqual([true, false]);
		expect(pools.stored()).toEqual({ player: 0, gm: 1 });
	});

	it('runs the next change after a write that failed, which rejects to its own caller', async () => {
		const pools = storedPools({ player: 1, gm: 1 });
		let fail = true;
		const writeChange = serialStoryPointWrites(pools.read, async (storyPoints) => {
			if (fail) {
				fail = false;
				throw new Error('refused');
			}
			await pools.write(storyPoints);
		});

		const failed = writeChange(add('gm'));
		const next = writeChange(add('gm'));

		await expect(failed).rejects.toThrow('refused');
		await expect(next).resolves.toBe(true);
		expect(pools.stored()).toEqual({ player: 1, gm: 2 });
	});
});
