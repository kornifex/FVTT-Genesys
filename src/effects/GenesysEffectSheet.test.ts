/**
 * @file Tests for the keys the effect sheets offer.
 */

import { describe, expect, it, vi } from 'vitest';

// The sheet extends a Foundry class, which the keys don't need.
vi.hoisted(() => {
	vi.stubGlobal('foundry', { applications: { sheets: { ActiveEffectConfig: class {} } } });
});

import { CHANGE_KEYS } from '@/effects/GenesysEffectSheet';

describe('CHANGE_KEYS', () => {
	// The test fails on the find if the group is ever renamed.
	const poolKeys = CHANGE_KEYS.find(({ group }) => group === 'Genesys.ActiveEffects.Types.ModifyDicePool.GroupLabel')!.keys.map(
		({ key }) => key,
	);

	it('offers the Pool Modification keys of the checks that target the actor in the order of its own checks', () => {
		expect(poolKeys).toEqual([
			'genesys.pool.check.self',
			'genesys.pool.char.self',
			'genesys.pool.skill.self',
			'genesys.pool.combat.self',
			'genesys.pool.melee.self',
			'genesys.pool.ranged.self',
			'genesys.pool.check.target',
			'genesys.pool.char.target',
			'genesys.pool.skill.target',
			'genesys.pool.combat.target',
			'genesys.pool.melee.target',
			'genesys.pool.ranged.target',
		]);
	});

	it('offers the key of the wounds a Medicine check heals', () => {
		const healingKeys = CHANGE_KEYS.find(({ group }) => group === 'Genesys.Recovery.Effects.GroupLabel')?.keys.map(({ key }) => key);
		expect(healingKeys).toEqual(['genesys.healing.wounds']);
	});
});
