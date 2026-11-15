/** @file Tests for the planner of the migration that moves the expiry of an effect from its v13 flag to its duration. */

import { describe, expect, it } from 'vitest';

import { ActorSource } from '@/migrations/ActorMigration';
import { expiredEffectsInDuration } from '@/migrations/8-expired-effects-in-duration';

// Stands for Foundry's deletion operator, `_del`.
const DELETION = Symbol('deletion');
const plan = expiredEffectsInDuration(DELETION);

type Effect = { _id: string; name: string; flags: Record<string, unknown> };

function effect(_id: string, genesys?: Record<string, unknown>): Effect {
	return { _id, name: _id, flags: genesys ? { genesys } : {} };
}

function actor(effects: Effect[], items: { _id: string; effects: Effect[] }[] = []): ActorSource {
	return { name: 'Hero', type: 'character', system: {}, items, effects };
}

describe('expiredEffectsInDuration', () => {
	it('marks an effect the Acting GM flagged as expired as expired in its duration, and deletes the flag', () => {
		expect(plan(actor([effect('dazed', { expired: true })]))).toEqual({
			effects: [{ _id: 'dazed', 'duration.expired': true, 'flags.genesys.expired': DELETION }],
		});
	});

	it("moves the flags of the effects of the actor's items", () => {
		const source = actor([], [{ _id: 'sword', effects: [effect('keen', { expired: true }), effect('sharp')] }]);

		expect(plan(source)).toEqual({
			itemEffects: { sword: [{ _id: 'keen', 'duration.expired': true, 'flags.genesys.expired': DELETION }] },
		});
	});

	it('deletes a flag cleared when the effect was extended, without marking the effect as expired', () => {
		expect(plan(actor([effect('dazed', { expired: false })]))).toEqual({
			effects: [{ _id: 'dazed', 'flags.genesys.expired': DELETION }],
		});
	});

	it("leaves the system's other flags alone", () => {
		expect(plan(actor([effect('staggered', { expired: true, lapses: true })]))).toEqual({
			effects: [{ _id: 'staggered', 'duration.expired': true, 'flags.genesys.expired': DELETION }],
		});
	});

	it('leaves an actor whose effects have no expired flag, as on a second run', () => {
		expect(
			plan(actor([effect('dazed'), effect('staggered', { lapses: true })], [{ _id: 'sword', effects: [effect('keen')] }])),
		).toBeUndefined();
	});
});
