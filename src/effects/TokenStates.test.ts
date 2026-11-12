import { describe, expect, it } from 'vitest';
import { adversaryDefense } from '@/actor/data/Protection';
import type { Defense } from '@/data/Actors';
import { Characteristic } from '@/data/Characteristics';
import { DieTypes } from '@/dice/DieTypes';
import { type PoolModificationActor, poolModificationsForCheck } from '@/effects/PoolModifications';
import { stateReminders, TOKEN_STATES, tokenState } from '@/effects/TokenStates';

/**
 * A character with a Token State, as the token's status menu applies it: an effect named after the state, holding its
 * changes. Their defense is 0.
 */
function characterWith(stateId: string): PoolModificationActor {
	const state = tokenState(stateId)!;
	return {
		type: 'character',
		system: { totalDefense: { melee: 0, ranged: 0 } },
		allApplicableEffects: () => [
			{
				name: state.name,
				uuid: `Actor.hero.ActiveEffect.${state.id}`,
				isSuppressed: false,
				origin: null,
				parent: null,
				changes: state.changes,
			},
		],
	};
}

describe('TOKEN_STATES', () => {
	it('offers Immobilized, Disoriented and Staggered, which lapse after their rounds (CRB p. 114), then cover and prone, which last until removed (CRB p. 99–100), and Incapacitated, which lasts while the actor is past a threshold (CRB pp. 112–113)', () => {
		expect(TOKEN_STATES.map(({ id, lapses }) => ({ id, lapses }))).toEqual([
			{ id: 'immobilized', lapses: true },
			{ id: 'disoriented', lapses: true },
			{ id: 'staggered', lapses: true },
			{ id: 'cover', lapses: false },
			{ id: 'prone', lapses: false },
			{ id: 'incapacitated', lapses: false },
		]);
	});

	it('offers cover and prone to characters and adversaries only, whose defense has a ranged rating', () => {
		const types = ['character', 'minion', 'rival', 'nemesis'];
		expect(tokenState('cover')?.actorTypes).toEqual(types);
		expect(tokenState('prone')?.actorTypes).toEqual(types);
		expect(tokenState('disoriented')?.actorTypes).toBeUndefined();
	});

	it('gives each state its own icon', () => {
		expect(new Set(TOKEN_STATES.map(({ img }) => img)).size).toBe(TOKEN_STATES.length);
	});
});

describe('Disoriented', () => {
	it('brings one Setback die to any check of its actor (CRB p. 114)', () => {
		const disoriented = characterWith('disoriented');
		const checks = [
			{ characteristic: Characteristic.Agility, skillName: 'Ranged (Light)' },
			{ characteristic: Characteristic.Willpower },
			{ characteristic: Characteristic.Presence, skillName: 'Cool', attackRange: 'short' },
			{},
		];

		for (const check of checks) {
			expect(poolModificationsForCheck(disoriented, undefined, check)).toEqual([
				{
					source: 'self',
					from: { effect: 'Genesys.TokenStates.Disoriented.Name', uuid: 'Actor.hero.ActiveEffect.disoriented' },
					mods: [DieTypes.Setback.GLYPH],
				},
			]);
		}
	});

	it("brings nothing to the checks that target its actor: only the actor's own checks suffer it (CRB p. 114)", () => {
		const attacker = characterWith('immobilized');
		expect(poolModificationsForCheck(attacker, characterWith('disoriented'), { characteristic: Characteristic.Agility })).toEqual([]);
	});
});

describe('Immobilized and Staggered', () => {
	it('change no dice (CRB p. 114)', () => {
		for (const id of ['immobilized', 'staggered']) {
			expect(poolModificationsForCheck(characterWith(id), undefined, { characteristic: Characteristic.Brawn })).toEqual([]);
		}
	});
});

describe('In cover', () => {
	/**
	 * A target in cover, its defense raised by the state's changes as Foundry adds them to its own (0 by default).
	 */
	function inCover(own: Defense = { melee: 0, ranged: 0 }): PoolModificationActor {
		const defense = { ...own };
		for (const { key, value, type } of tokenState('cover')!.changes) {
			const rating = key.match(/^system\.defense\.(melee|ranged)$/)?.[1] as keyof Defense | undefined;
			if (type === 'add' && rating) {
				defense[rating] += Number(value);
			}
		}
		return { type: 'rival', system: { totalDefense: adversaryDefense(defense) }, allApplicableEffects: () => [] };
	}

	const attacker = characterWith('immobilized');

	it('adds a Setback to a ranged attack against its actor, as ranged defense 1 (CRB p. 99, 104)', () => {
		for (const attackRange of ['short', 'medium', 'long', 'extreme']) {
			expect(poolModificationsForCheck(attacker, inCover(), { attackRange })).toEqual([
				{ source: 'target', from: { defense: 'ranged' }, mods: [DieTypes.Setback.GLYPH] },
			]);
		}
	});

	it('adds nothing to a melee attack against its actor (CRB p. 99)', () => {
		expect(poolModificationsForCheck(attacker, inCover(), { attackRange: 'engaged' })).toEqual([]);
	});

	it('raises the ranged defense its actor has already, up to 4 (CRB p. 99, 104)', () => {
		expect(poolModificationsForCheck(attacker, inCover({ melee: 1, ranged: 1 }), { attackRange: 'short' })[0].mods).toEqual([
			DieTypes.Setback.GLYPH,
			DieTypes.Setback.GLYPH,
		]);
		expect(poolModificationsForCheck(attacker, inCover({ melee: 0, ranged: 4 }), { attackRange: 'short' })[0].mods).toHaveLength(4);
	});
});

describe('Prone', () => {
	const attacker = characterWith('immobilized');
	const fromProne = (glyph: string) => [
		{ source: 'target', from: { effect: 'Genesys.TokenStates.Prone.Name', uuid: 'Actor.hero.ActiveEffect.prone' }, mods: [glyph] },
	];

	it('adds a Setback to a ranged attack against its actor (CRB p. 100, 108)', () => {
		for (const attackRange of ['short', 'medium', 'long', 'extreme']) {
			expect(poolModificationsForCheck(attacker, characterWith('prone'), { attackRange })).toEqual(fromProne(DieTypes.Setback.GLYPH));
		}
	});

	it('adds a Boost to a melee attack against its actor (CRB p. 100, 108)', () => {
		expect(poolModificationsForCheck(attacker, characterWith('prone'), { attackRange: 'engaged' })).toEqual(
			fromProne(DieTypes.Boost.GLYPH),
		);
	});

	it('adds nothing to a check against its actor that is no attack', () => {
		expect(poolModificationsForCheck(attacker, characterWith('prone'), { characteristic: Characteristic.Presence })).toEqual([]);
	});

	it("adds a Setback to its actor's own melee attack, not to their ranged attack nor to their Athletics check (CRB p. 108)", () => {
		const prone = characterWith('prone');
		expect(
			poolModificationsForCheck(prone, undefined, {
				characteristic: Characteristic.Brawn,
				skillName: 'Melee (Light)',
				attackRange: 'engaged',
			}),
		).toEqual([
			{
				source: 'self',
				from: { effect: 'Genesys.TokenStates.Prone.Name', uuid: 'Actor.hero.ActiveEffect.prone' },
				mods: [DieTypes.Setback.GLYPH],
			},
		]);
		for (const attackRange of ['short', 'medium', 'long', 'extreme']) {
			expect(
				poolModificationsForCheck(prone, undefined, {
					characteristic: Characteristic.Agility,
					skillName: 'Ranged (Light)',
					attackRange,
				}),
			).toEqual([]);
		}
		expect(poolModificationsForCheck(prone, undefined, { characteristic: Characteristic.Brawn, skillName: 'Athletics' })).toEqual([]);
	});

	it("adds the Setback on its actor's melee attack against a prone target beside the target's Boost (CRB p. 100, 108)", () => {
		expect(poolModificationsForCheck(characterWith('prone'), characterWith('prone'), { attackRange: 'engaged' })).toEqual([
			{
				source: 'self',
				from: { effect: 'Genesys.TokenStates.Prone.Name', uuid: 'Actor.hero.ActiveEffect.prone' },
				mods: [DieTypes.Setback.GLYPH],
			},
			...fromProne(DieTypes.Boost.GLYPH),
		]);
	});
});

describe('stateReminders', () => {
	it("reminds the roller of the Immobilized and Staggered states their actor has, in the menu's order", () => {
		expect(stateReminders(['staggered', 'dead', 'immobilized'])).toEqual([
			'Genesys.TokenStates.Immobilized.Reminder',
			'Genesys.TokenStates.Staggered.Reminder',
		]);
	});

	it('reminds of nothing for Disoriented, whose Setback the Dice Prompt lists, or without a state', () => {
		expect(stateReminders(['disoriented'])).toEqual([]);
		expect(stateReminders([])).toEqual([]);
	});
});

describe('tokenState', () => {
	it('finds a state by its id, and none for a status of Foundry', () => {
		expect(tokenState('staggered')?.name).toBe('Genesys.TokenStates.Staggered.Name');
		expect(tokenState('prone')?.name).toBe('Genesys.TokenStates.Prone.Name');
		expect(tokenState('bless')).toBeUndefined();
	});
});
