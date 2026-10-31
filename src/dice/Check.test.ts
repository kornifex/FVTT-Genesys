/**
 * @file Tests for resolving checks into their dice pool and chat description.
 */

import { describe, expect, it } from 'vitest';

import { Characteristic } from '@/data/Characteristics';
import {
	Check,
	CheckActor,
	CheckSkill,
	canPickCharacteristic,
	canRollWithoutCharacteristic,
	carriedPoolModificationStates,
	characteristicToRoll,
	checkDescription,
	checkDicePool,
	resolveCheck,
	vehicleAttacker,
} from '@/dice/Check';
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
		silhouette = 1,
	} = {},
): CheckActor {
	return {
		type,
		skills,
		system: { characteristics, superCharacteristics: new Set(superCharacteristics), groupSkillRank, totalDefense, silhouette },
		allApplicableEffects: () => effects,
	};
}

function effect(name: string, changes: { key: string; value: string }[], uuid = `ActiveEffect.${name}`): PoolModificationEffect {
	return { name, uuid, isSuppressed: false, origin: null, parent: null, changes };
}

/**
 * The effects of rings named alike, one Pool Modification each, as the sheets name a new effect after its item: each ring
 * is another copy of the item.
 */
function rings(...values: string[]) {
	return values.map((value, index) =>
		effect('Ring', [{ key: 'genesys.pool.check.self.', value }], `Actor.hero.Item.ring${index + 1}.ActiveEffect.grade`),
	);
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

	it("rolls a skill check picked with no characteristic with the skill's characteristic: every skill check has one (CRB p. 205)", () => {
		const cool = skill('Cool', Characteristic.Presence, 1);

		expect(resolveCheck(actor('character', [cool]), { skillName: 'Cool', characteristic: null }, uncoupled)).toMatchObject({
			kind: 'skill',
			characteristic: Characteristic.Presence,
			characteristicValue: 2,
			rank: 1,
		});
		expect(resolveCheck(actor('character', []), { skillName: 'Cool', characteristic: null }, uncoupled)).toMatchObject({
			kind: 'unranked',
			characteristic: Characteristic.Presence,
		});
	});

	it('rolls a check without a skill picked with no characteristic as a bare dice pool', () => {
		const check = resolveCheck(
			actor('character', []),
			{ fallbackCharacteristic: Characteristic.Brawn, characteristic: null },
			uncoupled,
		);

		expect(check).toMatchObject({ kind: 'pool', characteristicValue: 0, rank: 0 });
		expect(check.characteristic).toBeUndefined();
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
			{
				key: 'self.effect.ActiveEffect.Dueling',
				source: 'self',
				from: { effect: 'Dueling', uuid: 'ActiveEffect.Dueling' },
				mods: ['B'],
			},
		]);
		expect(
			resolveCheck(hero, { skillName: 'Melee', target: foe, attackRange: 'engaged' }, rules).poolModifications.map(
				(modification) => modification.key,
			),
		).toEqual(['self.effect.ActiveEffect.Dueling', 'target.effect.ActiveEffect.Shield', 'target.defense.melee']);
	});

	it('tells apart the Pool Modifications of effects that share a name, as the effects of two copies of an item do (#445)', () => {
		const hero = actor('character', [], {
			effects: rings('^', '^^'),
		});

		expect(resolveCheck(hero, { fallbackCharacteristic: Characteristic.Brawn }, rules).poolModifications).toEqual([
			{
				key: 'self.effect.Actor.hero.Item.ring1.ActiveEffect.grade',
				source: 'self',
				from: { effect: 'Ring', uuid: 'Actor.hero.Item.ring1.ActiveEffect.grade' },
				mods: ['^'],
			},
			{
				key: 'self.effect.Actor.hero.Item.ring2.ActiveEffect.grade',
				source: 'self',
				from: { effect: 'Ring', uuid: 'Actor.hero.Item.ring2.ActiveEffect.grade' },
				mods: ['^', '^'],
			},
		]);
	});

	it("compares the attacker's silhouette to the target's for an attack, and for no other check (CRB p. 109)", () => {
		const hero = actor('character', [skill('Melee', Characteristic.Brawn, 1)]);
		const giant = actor('rival', [], { silhouette: 3 });
		const attack = { kind: 'attack', weaponName: 'Sword' } as const;

		expect(resolveCheck(hero, { purpose: attack, skillName: 'Melee', target: giant }, rules).poolModifications).toEqual([
			{ key: 'target.silhouette', source: 'target', from: { silhouette: { target: 3, attacker: 1 } }, mods: ['-D'] },
		]);
		expect(resolveCheck(hero, { skillName: 'Melee', target: giant }, rules).poolModifications).toEqual([]);
	});

	it('takes the silhouette of the vehicle whose weapon is fired, not the crew member rolling the attack (CRB p. 222)', () => {
		const gunner = actor('character', [skill('Gunnery', Characteristic.Agility, 1)]);
		const vehicle = actor('vehicle', [], { silhouette: 3 });
		const request = {
			purpose: { kind: 'attack', weaponName: 'Cannon' },
			skillName: 'Gunnery',
			target: actor('character', []),
			attacker: vehicle,
		} as const;

		expect(resolveCheck(gunner, request, rules).poolModifications).toEqual([
			{ key: 'target.silhouette', source: 'target', from: { silhouette: { target: 1, attacker: 3 } }, mods: ['D'] },
		]);
	});
});

describe('vehicleAttacker', () => {
	it('is the vehicle that owns a vehicle weapon, which a crew member fires (CRB p. 222)', () => {
		const vehicle = actor('vehicle', [], { silhouette: 3 });

		expect(vehicleAttacker({ type: 'vehicleWeapon', actor: vehicle })).toBe(vehicle);
	});

	it('is nothing for a weapon of the actor rolling, or without a weapon', () => {
		expect(vehicleAttacker({ type: 'weapon', actor: actor('character', []) })).toBeUndefined();
		expect(vehicleAttacker(undefined)).toBeUndefined();
	});
});

describe('characteristicToRoll', () => {
	const cool = skill('Cool', Characteristic.Presence, 1);

	it("rolls the skill's characteristic, or the fallback one without a skill, when none is picked", () => {
		expect(characteristicToRoll(cool, {}, uncoupled)).toBe(Characteristic.Presence);
		expect(characteristicToRoll(cool, { fallbackCharacteristic: Characteristic.Brawn }, rules)).toBe(Characteristic.Presence);
		expect(characteristicToRoll(undefined, { fallbackCharacteristic: Characteristic.Brawn }, rules)).toBe(Characteristic.Brawn);
		expect(characteristicToRoll(undefined, {}, rules)).toBeUndefined();
	});

	it('rolls the characteristic picked without a skill, or for a skill when skills are uncoupled from characteristics (CRB p. 205)', () => {
		expect(characteristicToRoll(undefined, { characteristic: Characteristic.Agility }, rules)).toBe(Characteristic.Agility);
		expect(characteristicToRoll(cool, { characteristic: Characteristic.Agility }, uncoupled)).toBe(Characteristic.Agility);
		expect(characteristicToRoll(cool, { characteristic: Characteristic.Agility }, rules)).toBe(Characteristic.Presence);
	});

	it("rolls none when none is picked without a skill, and the skill's own for a skill: every skill check has one (CRB p. 205)", () => {
		const noCharacteristic = { characteristic: null, fallbackCharacteristic: Characteristic.Brawn };

		expect(characteristicToRoll(undefined, noCharacteristic, rules)).toBeUndefined();
		expect(characteristicToRoll(cool, noCharacteristic, uncoupled)).toBe(Characteristic.Presence);
		expect(characteristicToRoll(cool, noCharacteristic, rules)).toBe(Characteristic.Presence);
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

describe('canRollWithoutCharacteristic', () => {
	const hero = actor('character', [skill('Cool', Characteristic.Presence, 1)]);

	it('offers no characteristic only for a check without a skill: every skill check has one (CRB p. 205)', () => {
		expect(canRollWithoutCharacteristic(resolveCheck(hero, { skillName: 'Cool' }, uncoupled))).toBe(false);
		expect(canRollWithoutCharacteristic(resolveCheck(hero, { skillName: 'Vigilance' }, uncoupled))).toBe(false);
		expect(canRollWithoutCharacteristic(resolveCheck(hero, { fallbackCharacteristic: Characteristic.Brawn }, uncoupled))).toBe(true);
		expect(canRollWithoutCharacteristic(resolveCheck(hero, {}, rules))).toBe(true);
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

	it("applies only the Pool Modifications turned on, though another effect shares their effect's name (#445)", () => {
		// One Ability die; the roller turns on the first Ring's upgrade only.
		const wearer = actor('character', [], {
			effects: rings('^', '^^'),
		});
		const intellectCheck = resolveCheck(wearer, { fallbackCharacteristic: Characteristic.Intellect }, rules);
		const [first] = intellectCheck.poolModifications;

		expect(checkDicePool(intellectCheck, { difficulty: 'DD', isEnabled: ({ key }) => key === first.key }).dice).toEqual({
			Proficiency: 1,
			Ability: 0,
			Difficulty: 2,
		});
	});
});

describe('carriedPoolModificationStates', () => {
	const hero = actor('character', [skill('Melee', Characteristic.Brawn, 2), skill('Cool', Characteristic.Presence, 1)], {
		effects: [
			effect('Steady', [{ key: 'genesys.pool.check.self.', value: 'B' }]),
			effect('Dueling', [{ key: 'genesys.pool.skill.self.Melee', value: 'B' }]),
			effect('Alert', [{ key: 'genesys.pool.skill.self.Cool', value: 'B' }]),
		],
	});
	// The roller turned Steady off and left Dueling on, then picks Cool instead of Melee.
	const before = [
		{ key: 'self.effect.ActiveEffect.Steady', enabled: false },
		{ key: 'self.effect.ActiveEffect.Dueling', enabled: true },
	];
	const cool = resolveCheck(hero, { skillName: 'Cool' }, rules);
	const states = (autoApply: boolean) =>
		carriedPoolModificationStates(before, cool.poolModifications, autoApply).map(({ key, enabled }) => ({ key, enabled }));

	it('keeps the state of the Pool Modifications still listed, and turns new ones on when auto-apply is on', () => {
		expect(states(true)).toEqual([
			{ key: 'self.effect.ActiveEffect.Steady', enabled: false },
			{ key: 'self.effect.ActiveEffect.Alert', enabled: true },
		]);
	});

	it('leaves new Pool Modifications off when auto-apply is off', () => {
		expect(states(false)).toEqual([
			{ key: 'self.effect.ActiveEffect.Steady', enabled: false },
			{ key: 'self.effect.ActiveEffect.Alert', enabled: false },
		]);
	});

	it("keeps the state of each Pool Modification apart, though another effect shares their effect's name (#445)", () => {
		const wearer = actor('character', [skill('Cool', Characteristic.Presence, 1)], {
			effects: rings('^', 'B'),
		});
		// The roller turned the first Ring on and left the second off, then picks Cool.
		const [first, second] = resolveCheck(wearer, {}, rules).poolModifications;
		const picked = resolveCheck(wearer, { skillName: 'Cool' }, rules);

		expect(
			carriedPoolModificationStates(
				[
					{ key: first.key, enabled: true },
					{ key: second.key, enabled: false },
				],
				picked.poolModifications,
				false,
			).map(({ mods, enabled }) => ({ mods, enabled })),
		).toEqual([
			{ mods: ['^'], enabled: true },
			{ mods: ['B'], enabled: false },
		]);
	});

	it('keeps what each Pool Modification is and does', () => {
		const [steady, alert] = cool.poolModifications;

		expect(carriedPoolModificationStates(before, cool.poolModifications, true)).toEqual([
			{ ...steady, enabled: false },
			{ ...alert, enabled: true },
		]);
	});
});

describe('an initiative check', () => {
	it("ignores the target, so only the actor's Pool Modifications apply", () => {
		const hero = actor('character', [skill('Cool', Characteristic.Presence, 1)], {
			effects: [effect('Alert', [{ key: 'genesys.pool.skill.self.Cool', value: 'B' }])],
		});
		const foe = actor('rival', [], {
			effects: [effect('Shield', [{ key: 'genesys.pool.check.target.', value: 'S' }])],
			totalDefense: { melee: 1, ranged: 1 },
		});
		const check = resolveCheck(hero, { purpose: { kind: 'initiative' }, skillName: 'Cool', target: foe }, rules);

		expect(check.poolModifications.map((modification) => modification.key)).toEqual(['self.effect.ActiveEffect.Alert']);
		expect(checkDicePool(check, { difficulty: '', isEnabled: () => true }).dice).toEqual({ Proficiency: 1, Ability: 1, Boost: 1 });
	});
});

describe('checkDescription', () => {
	const i18n = {
		localize: (key: string) => key.split('.').pop()!,
		format: (key: string, data: Record<string, string>) => `${key.split('.').pop()} ${JSON.stringify(data)}`,
	};
	const hero = actor('character', [skill('Melee', Characteristic.Brawn, 1)], { superCharacteristics: [Characteristic.Brawn] });
	const description = (check: Check) => checkDescription(check, i18n);
	const initiative = { kind: 'initiative' } as const;

	it('carries what the check is rolled for, a plain check when not given', () => {
		expect(resolveCheck(hero, {}, rules).purpose).toEqual({ kind: 'check' });
		expect(resolveCheck(undefined, {}, rules).purpose).toEqual({ kind: 'check' });
		expect(resolveCheck(hero, { purpose: initiative }, rules).purpose).toEqual(initiative);
	});

	it('describes each kind of check', () => {
		expect(description(resolveCheck(hero, { skillName: 'Melee' }, rules))).toBe(
			'Skill {"skill":"Melee","characteristic":"Brawn","superChar":"super-char"}',
		);
		expect(description(resolveCheck(hero, { skillName: 'Cool' }, rules))).toBe(
			'Skill {"skill":"Cool","characteristic":"Presence","superChar":"hide-it"}',
		);
		// A skill check always has a characteristic (CRB p. 205).
		expect(description(resolveCheck(hero, { skillName: 'Melee', characteristic: null }, uncoupled))).toBe(
			'Skill {"skill":"Melee","characteristic":"Brawn","superChar":"super-char"}',
		);
		expect(description(resolveCheck(hero, { fallbackCharacteristic: Characteristic.Agility }, rules))).toBe(
			'Characteristic {"characteristic":"Agility"}',
		);
		expect(description(resolveCheck(hero, {}, rules))).toBeUndefined();
		expect(description(resolveCheck(undefined, { usesSuperCharacteristic: true }, rules))).toBe('Simple {"superChar":"super-char"}');
	});

	it('describes each kind of attack', () => {
		const attack = { kind: 'attack', weaponName: 'Sword' } as const;

		expect(description(resolveCheck(hero, { purpose: attack, skillName: 'Melee' }, rules))).toBe(
			'AttackSkill {"name":"Sword","skill":"Melee","characteristic":"Brawn","superChar":"super-char"}',
		);
		// An attack is a skill check, so it always has a characteristic (CRB p. 205).
		expect(description(resolveCheck(hero, { purpose: attack, skillName: 'Melee', characteristic: null }, uncoupled))).toBe(
			'AttackSkill {"name":"Sword","skill":"Melee","characteristic":"Brawn","superChar":"super-char"}',
		);
		expect(description(resolveCheck(hero, { purpose: attack, characteristic: Characteristic.Brawn }, rules))).toBe(
			'AttackCharacteristic {"name":"Sword","characteristic":"Brawn"}',
		);
		expect(description(resolveCheck(hero, { purpose: attack }, rules))).toBeUndefined();
	});

	it('describes initiative with the skill, or the characteristic of a Characteristic Check', () => {
		expect(description(resolveCheck(hero, { purpose: initiative, skillName: 'Vigilance' }, rules))).toBe(
			'Initiative {"skill":"Vigilance","superChar":"hide-it"}',
		);
		expect(description(resolveCheck(hero, { purpose: initiative, fallbackCharacteristic: Characteristic.Brawn }, rules))).toBe(
			'Initiative {"skill":"Brawn","superChar":"super-char"}',
		);
	});

	it('names the initiative skill as the actor spells it, not as the Skills Compendium does', () => {
		const watchful = actor('character', [skill('vigilance', Characteristic.Willpower, 1)]);

		expect(description(resolveCheck(watchful, { purpose: initiative, skillName: 'Vigilance' }, rules))).toBe(
			'Initiative {"skill":"vigilance","superChar":"hide-it"}',
		);
	});
});
