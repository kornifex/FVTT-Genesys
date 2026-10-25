/**
 * @file Tests for resolving checks into their dice pool and chat description.
 */

import { describe, expect, it, vi } from 'vitest';

// The dice types extend Foundry's `Die` and the Dice So Nice! registration listens to `Hooks`; both are Foundry globals.
vi.hoisted(() => {
	Object.assign(globalThis, {
		Die: class {},
		Hooks: { once: () => {}, on: () => {} },
	});
});

import { Characteristic } from '@/data/Characteristics';
import { Check, CheckActor, CheckSkill, canPickCharacteristic, checkDescription, checkDicePool, resolveCheck } from '@/dice/Check';
import { PoolModificationEffect } from '@/effects/PoolModifications';

function skill(name: string, characteristic: Characteristic, rank = 0): CheckSkill {
	return { name, system: { characteristic, rank } };
}

const characteristics = { brawn: 3, agility: 2, intellect: 1, cunning: 2, willpower: 4, presence: 2 };

/**
 * An actor of a type, with skills, effects and data on top of the characteristics above.
 */
function actor(
	type: string,
	skills: CheckSkill[],
	{
		effects = [] as PoolModificationEffect[],
		superCharacteristics = [] as Characteristic[],
		groupSkillRank = undefined as number | undefined,
		totalDefense = { melee: 0, ranged: 0 },
	} = {},
): CheckActor {
	return {
		type,
		skills,
		systemData: { characteristics, superCharacteristics: new Set(superCharacteristics), groupSkillRank, totalDefense },
		allApplicableEffects: () => effects,
	};
}

function effect(name: string, changes: { key: string; value: string }[]): PoolModificationEffect {
	return { name, isSuppressed: false, origin: null, parent: null, changes };
}

const compendium = [
	skill('Cool', Characteristic.Presence),
	skill('Melee', Characteristic.Brawn),
	skill('Vigilance', Characteristic.Willpower),
];
const rules = { compendiumSkills: compendium, useSuperCharacteristics: true, uncoupleSkillsFromCharacteristics: false };
const uncoupled = { ...rules, uncoupleSkillsFromCharacteristics: true };

describe('resolveCheck', () => {
	it('resolves a check of an owned skill with its rank and characteristic', () => {
		const melee = skill('melee', Characteristic.Brawn, 2);
		const check = resolveCheck(actor('character', [melee]), { skillName: 'Melee' }, rules);

		expect(check).toMatchObject({
			kind: 'skill',
			skill: melee,
			characteristic: Characteristic.Brawn,
			characteristicValue: 3,
			rank: 2,
			usesSuperCharacteristic: false,
		});
	});

	it("resolves an Unranked Skill Check of the Skills Compendium's skill with no ranks, the lower value being zero (CRB p. 19)", () => {
		const check = resolveCheck(actor('character', []), { skillName: 'Vigilance', fallbackCharacteristic: Characteristic.Brawn }, rules);

		expect(check).toMatchObject({
			kind: 'unranked',
			skill: compendium[2],
			characteristic: Characteristic.Willpower,
			characteristicValue: 4,
			rank: 0,
		});
	});

	it('resolves a Characteristic Check without a skill, or when the skill is found nowhere', () => {
		expect(resolveCheck(actor('character', []), { fallbackCharacteristic: Characteristic.Agility }, rules)).toMatchObject({
			kind: 'characteristic',
			skill: undefined,
			characteristic: Characteristic.Agility,
			characteristicValue: 2,
			rank: 0,
		});
		expect(
			resolveCheck(actor('character', []), { skillName: 'Piloting', fallbackCharacteristic: Characteristic.Brawn }, rules),
		).toMatchObject({ kind: 'characteristic', characteristic: Characteristic.Brawn });
	});

	it('resolves a bare dice pool with neither skill nor characteristic', () => {
		expect(resolveCheck(actor('character', []), {}, rules)).toMatchObject({ kind: 'pool', characteristicValue: 0, rank: 0 });
		expect(resolveCheck(undefined, { usesSuperCharacteristic: true }, rules)).toMatchObject({
			kind: 'pool',
			usesSuperCharacteristic: true,
		});
		expect(
			resolveCheck(undefined, { usesSuperCharacteristic: true }, { ...rules, useSuperCharacteristics: false })
				.usesSuperCharacteristic,
		).toBe(false);
	});

	it('rolls the characteristic the roller picks for a skill check when skills are uncoupled from characteristics (CRB p. 205)', () => {
		// The book's example: Coercion is linked to Willpower, but Huck offers the suspect a coffee and rolls Presence.
		const coercion = skill('Coercion', Characteristic.Willpower, 1);

		expect(
			resolveCheck(actor('character', [coercion]), { skillName: 'Coercion', characteristic: Characteristic.Presence }, uncoupled),
		).toMatchObject({ kind: 'skill', characteristic: Characteristic.Presence, characteristicValue: 2, rank: 1 });
	});

	it('rolls the characteristic a skill is linked to, whatever the characteristic picked, unless skills are uncoupled from characteristics (CRB p. 205)', () => {
		const cool = skill('Cool', Characteristic.Presence, 1);

		expect(
			resolveCheck(actor('character', [cool]), { skillName: 'Cool', characteristic: Characteristic.Willpower }, rules),
		).toMatchObject({ kind: 'skill', characteristic: Characteristic.Presence, characteristicValue: 2, rank: 1 });
		expect(resolveCheck(actor('character', []), { skillName: 'Cool', characteristic: null }, rules)).toMatchObject({
			kind: 'unranked',
			characteristic: Characteristic.Presence,
		});
	});

	it('gives a minion group its group skill rank for the skills on its profile only (CRB p. 132)', () => {
		const minions = actor('minion', [skill('Melee', Characteristic.Brawn, 0)], { groupSkillRank: 3 });

		expect(resolveCheck(minions, { skillName: 'Melee' }, rules)).toMatchObject({ kind: 'skill', rank: 3 });
		expect(resolveCheck(minions, { skillName: 'Cool' }, rules)).toMatchObject({ kind: 'unranked', rank: 0 });
	});

	it('uses a super-characteristic for a check based on it, with a skill or alone, when the world allows it (CRB p. 251)', () => {
		const hero = actor('character', [skill('Melee', Characteristic.Brawn, 1)], { superCharacteristics: [Characteristic.Brawn] });

		expect(resolveCheck(hero, { skillName: 'Melee' }, rules).usesSuperCharacteristic).toBe(true);
		expect(resolveCheck(hero, { fallbackCharacteristic: Characteristic.Brawn }, rules).usesSuperCharacteristic).toBe(true);
		expect(resolveCheck(hero, { skillName: 'Melee' }, { ...rules, useSuperCharacteristics: false }).usesSuperCharacteristic).toBe(
			false,
		);
		expect(resolveCheck(hero, { skillName: 'Cool' }, rules).usesSuperCharacteristic).toBe(false);
	});

	it("collects the actor's Pool Modifications, and the target's when it has one", () => {
		const hero = actor('character', [skill('Melee', Characteristic.Brawn, 1)], {
			effects: [effect('Dueling', [{ key: 'genesys.pool.skill.self.melee', value: 'B' }])],
		});
		const foe = actor('rival', [], {
			effects: [effect('Shield', [{ key: 'genesys.pool.check.target.', value: 'S' }])],
			totalDefense: { melee: 1, ranged: 0 },
		});

		expect(resolveCheck(hero, { skillName: 'Melee' }, rules).poolModifications).toEqual([
			{ key: 'self.effect.Dueling', source: 'self', from: { effect: 'Dueling' }, mods: ['B'] },
		]);
		expect(
			resolveCheck(hero, { skillName: 'Melee', target: foe, attackRange: 'engaged' }, rules).poolModifications.map(
				(modification) => modification.key,
			),
		).toEqual(['self.effect.Dueling', 'target.effect.Shield', 'target.defense.melee']);
	});
});

describe('canPickCharacteristic', () => {
	const hero = actor('character', [skill('Cool', Characteristic.Presence, 1)]);

	it('lets the roller pick the characteristic of a skill check only when skills are uncoupled from characteristics (CRB p. 205)', () => {
		expect(canPickCharacteristic(resolveCheck(hero, { skillName: 'Cool' }, rules), rules)).toBe(false);
		expect(canPickCharacteristic(resolveCheck(hero, { skillName: 'Vigilance' }, rules), rules)).toBe(false);
		expect(canPickCharacteristic(resolveCheck(hero, { skillName: 'Cool' }, uncoupled), uncoupled)).toBe(true);
	});

	it('always lets the roller pick the characteristic of a check without a skill', () => {
		expect(canPickCharacteristic(resolveCheck(hero, { fallbackCharacteristic: Characteristic.Brawn }, rules), rules)).toBe(true);
		expect(canPickCharacteristic(resolveCheck(hero, {}, rules), rules)).toBe(true);
	});
});

describe('checkDicePool', () => {
	const hero = actor('character', [skill('Melee', Characteristic.Brawn, 2)], {
		effects: [effect('Dueling', [{ key: 'genesys.pool.skill.self.Melee', value: 'B' }])],
	});
	const check = resolveCheck(hero, { skillName: 'Melee' }, rules);

	it('builds the pool from the characteristic, the rank, the difficulty and the enabled Pool Modifications', () => {
		expect(checkDicePool(check, { difficulty: 'DD', isEnabled: () => true })).toEqual({
			dice: { Proficiency: 2, Ability: 1, Difficulty: 2, Boost: 1 },
			symbols: {},
			usesSuperCharacteristic: false,
		});
		expect(checkDicePool(check, { difficulty: '', manualChanges: ['s'], isEnabled: () => false })).toEqual({
			dice: { Proficiency: 2, Ability: 1 },
			symbols: { Success: 1 },
			usesSuperCharacteristic: false,
		});
	});
});

describe('an initiative check', () => {
	it("ignores the target, so only the actor's Pool Modifications apply", () => {
		const hero = actor('character', [skill('Cool', Characteristic.Presence, 1)], {
			effects: [effect('Alert', [{ key: 'genesys.pool.skill.self.Cool', value: 'B' }])],
		});
		const check = resolveCheck(hero, { skillName: 'Cool' }, rules);

		expect(check.poolModifications.map((modification) => modification.key)).toEqual(['self.effect.Alert']);
		expect(checkDicePool(check, { difficulty: '', isEnabled: () => true }).dice).toEqual({ Proficiency: 1, Ability: 1, Boost: 1 });
	});
});

describe('checkDescription', () => {
	const i18n = {
		localize: (key: string) => key.split('.').pop()!,
		format: (key: string, data: Record<string, string>) => `${key.split('.').pop()} ${JSON.stringify(data)}`,
	};
	const hero = actor('character', [skill('Melee', Characteristic.Brawn, 1)], { superCharacteristics: [Characteristic.Brawn] });
	const description = (check: Check, purpose: Parameters<typeof checkDescription>[1] = { kind: 'check' }) =>
		checkDescription(check, purpose, i18n);

	it('describes each kind of check', () => {
		expect(description(resolveCheck(hero, { skillName: 'Melee' }, rules))).toBe(
			'Skill {"skill":"Melee","characteristic":"Brawn","superChar":"super-char"}',
		);
		expect(description(resolveCheck(hero, { skillName: 'Cool' }, rules))).toBe(
			'Skill {"skill":"Cool","characteristic":"Presence","superChar":"hide-it"}',
		);
		expect(description(resolveCheck(hero, { skillName: 'Melee', characteristic: null }, uncoupled))).toBe(
			'SkillWithoutCharacteristic {"skill":"Melee"}',
		);
		expect(description(resolveCheck(hero, { fallbackCharacteristic: Characteristic.Agility }, rules))).toBe(
			'Characteristic {"characteristic":"Agility"}',
		);
		expect(description(resolveCheck(hero, {}, rules))).toBeUndefined();
		expect(description(resolveCheck(undefined, { usesSuperCharacteristic: true }, rules))).toBe('Simple {"superChar":"super-char"}');
	});

	it('describes each kind of attack', () => {
		const attack = { kind: 'attack', weaponName: 'Sword' } as const;

		expect(description(resolveCheck(hero, { skillName: 'Melee' }, rules), attack)).toBe(
			'AttackSkill {"name":"Sword","skill":"Melee","characteristic":"Brawn","superChar":"super-char"}',
		);
		expect(description(resolveCheck(hero, { skillName: 'Melee', characteristic: null }, uncoupled), attack)).toBe(
			'AttackSkillWithoutCharacteristic {"name":"Sword","skill":"Melee"}',
		);
		expect(description(resolveCheck(hero, { characteristic: Characteristic.Brawn }, rules), attack)).toBe(
			'AttackCharacteristic {"name":"Sword","characteristic":"Brawn"}',
		);
		expect(description(resolveCheck(hero, {}, rules), attack)).toBeUndefined();
	});

	it('describes initiative with the skill, or the characteristic of a Characteristic Check', () => {
		expect(description(resolveCheck(hero, { skillName: 'Vigilance' }, rules), { kind: 'initiative' })).toBe(
			'Initiative {"skill":"Vigilance","superChar":"hide-it"}',
		);
		expect(description(resolveCheck(hero, { fallbackCharacteristic: Characteristic.Brawn }, rules), { kind: 'initiative' })).toBe(
			'Initiative {"skill":"Brawn","superChar":"super-char"}',
		);
	});
});
