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

	it("offers the Pool Modification keys of the checks that target the actor in the order of its own checks, initiative's last of its own as it has no target", () => {
		expect(poolKeys).toEqual([
			'genesys.pool.check.self',
			'genesys.pool.char.self',
			'genesys.pool.skill.self',
			'genesys.pool.combat.self',
			'genesys.pool.melee.self',
			'genesys.pool.ranged.self',
			'genesys.pool.initiative.self',
			'genesys.pool.check.target',
			'genesys.pool.char.target',
			'genesys.pool.skill.target',
			'genesys.pool.combat.target',
			'genesys.pool.melee.target',
			'genesys.pool.ranged.target',
		]);
	});

	it('offers the key of the Career Skill changes, whose skill is picked beside it (RoT p. 87)', () => {
		const careerKeys = CHANGE_KEYS.find(({ group }) => group === 'Genesys.ActiveEffects.Types.CareerSkill.GroupLabel')?.keys.map(
			({ key }) => key,
		);
		expect(careerKeys).toEqual(['genesys.careerSkill']);
	});

	it("offers the keys of the wounds and strain a Medicine check heals, of the wounds a night's rest heals, and of the strain and wounds the end of an encounter recovers", () => {
		const healingKeys = CHANGE_KEYS.find(({ group }) => group === 'Genesys.Recovery.Effects.GroupLabel')?.keys.map(({ key }) => key);
		expect(healingKeys).toEqual([
			'genesys.healing.wounds',
			'genesys.healing.strain',
			'genesys.healing.rest.wounds',
			'genesys.healing.encounterEnd.strain',
			'genesys.healing.encounterEnd.wounds',
		]);
	});

	it('offers the keys of the Attack Changes: the damage and the Critical rating, by the attacks they apply to', () => {
		const attackKeys = CHANGE_KEYS.find(({ group }) => group === 'Genesys.ActiveEffects.Types.ModifyAttack.GroupLabel')?.keys.map(
			({ key }) => key,
		);
		expect(attackKeys).toEqual([
			'genesys.attack.damage.combat',
			'genesys.attack.damage.melee',
			'genesys.attack.damage.ranged',
			'genesys.attack.critical.combat',
			'genesys.attack.critical.melee',
			'genesys.attack.critical.ranged',
		]);
	});
});
