/** @file Tests for the planner of the migration that makes cover and Guarded Stance provide their defense (CRB p. 106). */

import { describe, expect, it } from 'vitest';

import { ActorChanges, ActorSource } from '@/migrations/ActorMigration';
import { maneuverEffectsProvideDefense } from '@/migrations/7-maneuver-effects-provide-defense';

type Change = { key: string; value: string; type: string; phase?: string; priority?: number | null };

type Effect = { _id: string; name: string; statuses: string[]; system: { changes: Change[] } };

const SETBACK_ON_COMBAT_CHECKS = { key: 'genesys.pool.combat.self.', value: 'S' };

function effect(_id: string, statuses: string[], changes: Change[]): Effect {
	return { _id, name: _id, statuses, system: { changes } };
}

function actor(effects: Effect[]): ActorSource {
	return { name: 'Hero', type: 'character', system: {}, items: [], effects };
}

// The actor's source once a plan is applied, as Foundry would apply it.
function applied(source: ActorSource, { effects = [] }: ActorChanges): ActorSource {
	return {
		...source,
		effects: (source.effects as Effect[]).map((sourceEffect) => ({
			...sourceEffect,
			...effects.find((update) => update._id === sourceEffect._id),
		})),
	};
}

describe('maneuverEffectsProvideDefense', () => {
	it("rewrites 0.7.0-rc.1's cover and Guarded Stance to provide their defense with the Upgrade type, keeping the fields of the change", () => {
		const source = actor([
			effect('cover', ['cover'], [{ key: 'system.defense.ranged', value: '1', type: 'add', phase: 'initial', priority: null }]),
			effect(
				'guarded',
				['guardedStance'],
				[
					{ ...SETBACK_ON_COMBAT_CHECKS, type: 'custom' },
					{ key: 'system.defense.melee', value: '1', type: 'add' },
				],
			),
		]);

		expect(maneuverEffectsProvideDefense(source)).toEqual({
			effects: [
				{
					_id: 'cover',
					system: {
						changes: [{ key: 'system.providedDefense.ranged', value: '1', type: 'upgrade', phase: 'initial', priority: null }],
					},
				},
				{
					_id: 'guarded',
					system: {
						changes: [
							{ ...SETBACK_ON_COMBAT_CHECKS, type: 'custom' },
							{ key: 'system.providedDefense.melee', value: '1', type: 'upgrade' },
						],
					},
				},
			],
		});
	});

	it('leaves a change that is not of the Add type as it is', () => {
		const source = actor([
			effect('cover', ['cover'], [{ key: 'system.defense.ranged', value: '1', type: 'upgrade' }]),
			effect('guarded', ['guardedStance'], [{ key: 'system.defense.melee', value: '1', type: 'override' }]),
		]);

		expect(maneuverEffectsProvideDefense(source)).toBeUndefined();
	});

	it('rewrites only the change of the Add type of an effect that holds another on the same key', () => {
		const source = actor([
			effect(
				'cover',
				['cover'],
				[
					{ key: 'system.defense.ranged', value: '1', type: 'override' },
					{ key: 'system.defense.ranged', value: '1', type: 'add' },
				],
			),
		]);

		expect(maneuverEffectsProvideDefense(source)).toEqual({
			effects: [
				{
					_id: 'cover',
					system: {
						changes: [
							{ key: 'system.defense.ranged', value: '1', type: 'override' },
							{ key: 'system.providedDefense.ranged', value: '1', type: 'upgrade' },
						],
					},
				},
			],
		});
	});

	it("leaves the defense of the actor's other effects, which increases it (CRB p. 106)", () => {
		const source = actor([
			effect('talent', [], [{ key: 'system.defense.ranged', value: '1', type: 'add' }]),
			effect('blessed', ['blessed'], [{ key: 'system.defense.melee', value: '1', type: 'add' }]),
		]);

		expect(maneuverEffectsProvideDefense(source)).toBeUndefined();
	});

	it('changes nothing on the effects that 0.7.0-rc.2 creates, nor on a second run', () => {
		const source = actor([
			effect('cover', ['cover'], [{ key: 'system.defense.ranged', value: '1', type: 'add' }]),
			effect('guarded', ['guardedStance'], [{ key: 'system.defense.melee', value: '1', type: 'add' }]),
		]);

		const changes = maneuverEffectsProvideDefense(source)!;
		expect(maneuverEffectsProvideDefense(applied(source, changes))).toBeUndefined();
	});
});
