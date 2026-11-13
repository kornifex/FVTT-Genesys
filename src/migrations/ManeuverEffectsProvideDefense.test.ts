/** @file Tests for the planner of the migration that makes cover and Guarded Stance provide their defense (CRB p. 106). */

import { describe, expect, it } from 'vitest';

import { ActorChanges, ActorSource } from '@/migrations/ActorMigration';
import { maneuverEffectsProvideDefense } from '@/migrations/7-maneuver-effects-provide-defense';

// The changes of an effect as Foundry v13 stores them, with a numeric mode (2 adds, 4 upgrades), and as v14 does, in its
// system with a type.
type V13Change = { key: string; value: string; mode: number; priority?: number | null };
type V14Change = { key: string; value: string; type: string; phase?: string; priority?: number | null };

type Effect = { _id: string; name: string; statuses: string[]; changes?: V13Change[]; system?: { changes: V14Change[] } };

const SETBACK_ON_COMBAT_CHECKS = { key: 'genesys.pool.combat.self.', value: 'S' };

function v13Effect(_id: string, statuses: string[], changes: V13Change[]): Effect {
	return { _id, name: _id, statuses, changes };
}

function v14Effect(_id: string, statuses: string[], changes: V14Change[]): Effect {
	return { _id, name: _id, statuses, system: { changes } };
}

function actor(effects: Effect[]): ActorSource {
	return { name: 'Hero', type: 'character', system: {}, items: [], effects };
}

// The actor's source once a plan is applied, as Foundry would apply it.
function applied(source: ActorSource, { effects = [] }: ActorChanges): ActorSource {
	return {
		...source,
		effects: (source.effects as Effect[]).map((effect) => ({ ...effect, ...effects.find((update) => update._id === effect._id) })),
	};
}

describe('maneuverEffectsProvideDefense', () => {
	it("rewrites 0.7.0-rc.1's cover and Guarded Stance on Foundry v13 to provide their defense with the Upgrade mode", () => {
		const source = actor([
			v13Effect('cover', ['cover'], [{ key: 'system.defense.ranged', value: '1', mode: 2 }]),
			v13Effect(
				'guarded',
				['guardedStance'],
				[
					{ ...SETBACK_ON_COMBAT_CHECKS, mode: 0 },
					{ key: 'system.defense.melee', value: '1', mode: 2 },
				],
			),
		]);

		expect(maneuverEffectsProvideDefense(source)).toEqual({
			effects: [
				{ _id: 'cover', changes: [{ key: 'system.providedDefense.ranged', value: '1', mode: 4 }] },
				{
					_id: 'guarded',
					changes: [
						{ ...SETBACK_ON_COMBAT_CHECKS, mode: 0 },
						{ key: 'system.providedDefense.melee', value: '1', mode: 4 },
					],
				},
			],
		});
	});

	it('rewrites them on Foundry v14, in the effect system, keeping the fields of the change', () => {
		const source = actor([
			v14Effect('cover', ['cover'], [{ key: 'system.defense.ranged', value: '1', type: 'add', phase: 'initial', priority: null }]),
			v14Effect(
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

	it('leaves a change that is not in the Add mode as it is, on both versions', () => {
		const source = actor([
			v13Effect('cover', ['cover'], [{ key: 'system.defense.ranged', value: '1', mode: 4 }]),
			v14Effect('guarded', ['guardedStance'], [{ key: 'system.defense.melee', value: '1', type: 'override' }]),
		]);

		expect(maneuverEffectsProvideDefense(source)).toBeUndefined();
	});

	it('rewrites only the change in the Add mode of an effect that holds another on the same key', () => {
		const source = actor([
			v13Effect(
				'cover',
				['cover'],
				[
					{ key: 'system.defense.ranged', value: '1', mode: 5 },
					{ key: 'system.defense.ranged', value: '1', mode: 2 },
				],
			),
		]);

		expect(maneuverEffectsProvideDefense(source)).toEqual({
			effects: [
				{
					_id: 'cover',
					changes: [
						{ key: 'system.defense.ranged', value: '1', mode: 5 },
						{ key: 'system.providedDefense.ranged', value: '1', mode: 4 },
					],
				},
			],
		});
	});

	it("leaves the defense of the actor's other effects, which increases it (CRB p. 106)", () => {
		const source = actor([
			v13Effect('talent', [], [{ key: 'system.defense.ranged', value: '1', mode: 2 }]),
			v14Effect('blessed', ['blessed'], [{ key: 'system.defense.melee', value: '1', type: 'add' }]),
		]);

		expect(maneuverEffectsProvideDefense(source)).toBeUndefined();
	});

	it('changes nothing on the effects that 0.7.0-rc.2 creates, nor on a second run', () => {
		const source = actor([
			v13Effect('cover', ['cover'], [{ key: 'system.defense.ranged', value: '1', mode: 2 }]),
			v14Effect('guarded', ['guardedStance'], [{ key: 'system.defense.melee', value: '1', type: 'add' }]),
		]);

		const changes = maneuverEffectsProvideDefense(source)!;
		expect(maneuverEffectsProvideDefense(applied(source, changes))).toBeUndefined();
	});
});
