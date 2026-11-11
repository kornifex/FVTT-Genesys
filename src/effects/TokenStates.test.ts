import { describe, expect, it } from 'vitest';
import { Characteristic } from '@/data/Characteristics';
import { DieTypes } from '@/dice/DieTypes';
import { type PoolModificationActor, poolModificationsForCheck } from '@/effects/PoolModifications';
import { stateReminders, TOKEN_STATES, tokenState } from '@/effects/TokenStates';

/**
 * A character with a Token State, as the token's status menu applies it: an effect named after the state, holding its
 * changes.
 */
function characterWith(stateId: string): PoolModificationActor {
	const state = tokenState(stateId)!;
	return {
		type: 'character',
		system: {},
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
	it('offers Immobilized, Disoriented and Staggered, each with its own id, which lapse after their rounds (CRB p. 114)', () => {
		expect(TOKEN_STATES.map(({ id, lapses }) => ({ id, lapses }))).toEqual([
			{ id: 'immobilized', lapses: true },
			{ id: 'disoriented', lapses: true },
			{ id: 'staggered', lapses: true },
		]);
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
		expect(tokenState('prone')).toBeUndefined();
	});
});
