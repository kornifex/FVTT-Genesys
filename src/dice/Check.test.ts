/**
 * @file Tests for resolving checks into their dice pool and chat description.
 */

import { describe, expect, it } from 'vitest';

import { Characteristic } from '@/data/Characteristics';
import {
	Check,
	CheckActor,
	CheckPurpose,
	CheckSkill,
	canPickCharacteristic,
	canRollWithoutCharacteristic,
	carriedPoolModificationStates,
	characteristicToRoll,
	checkAttackChanges,
	checkDescription,
	checkDicePool,
	resolveCheck,
	startingCount,
	vehicleAttacker,
} from '@/dice/Check';
import { PoolModificationChoice, PoolModificationEffect, TOGGLED } from '@/effects/PoolModifications';

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
		currentEncumbrance = { value: 0, threshold: 8 },
	} = {},
): CheckActor {
	return {
		type,
		skills,
		system: {
			characteristics,
			superCharacteristics: new Set(superCharacteristics),
			groupSkillRank,
			totalDefense,
			silhouette,
			currentEncumbrance,
		},
		allApplicableEffects: () => effects,
	};
}

function effect(name: string, changes: { key: string; value: string }[], uuid = `ActiveEffect.${name}`): PoolModificationEffect {
	return { name, uuid, isSuppressed: false, origin: null, parent: null, system: { changes } };
}

/**
 * The effect of a talent at a rank, ranked unless said otherwise, which lives on the talent.
 */
function talentEffect(
	name: string,
	{ ranked = 'yes', rank, scalesWithRank }: { ranked?: 'yes' | 'no'; rank: number; scalesWithRank: 'yes' | 'no' | 'upTo' },
	changes: { key: string; value: string }[],
): PoolModificationEffect {
	const talent = { documentName: 'Item', type: 'talent', name, uuid: `Item.${name}`, system: { ranked, rank, scalesWithRank } };
	return { ...effect(name, changes, `Item.${name}.ActiveEffect.effect`), parent: talent };
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
	const attack: CheckPurpose = { kind: 'attack', weaponName: 'Sword' };

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
				choice: TOGGLED,
			},
		]);
		expect(
			resolveCheck(hero, { skillName: 'Melee', target: foe, attackRange: 'engaged', purpose: attack }, rules).poolModifications.map(
				(modification) => modification.key,
			),
		).toEqual(['self.effect.ActiveEffect.Dueling', 'target.effect.ActiveEffect.Shield', 'target.defense.melee']);
	});

	it("leaves a range given to a check that isn't an attack out: only an attack is a combat check, which defense, cover, prone and Aim change (CRB p. 98–100, 104)", () => {
		const hero = actor('character', [skill('Melee', Characteristic.Brawn, 1)], {
			effects: [effect('Aim', [{ key: 'genesys.pool.combat.self.', value: 'B' }])],
		});
		const foe = actor('rival', [], {
			effects: [effect('Prone', [{ key: 'genesys.pool.melee.target.', value: 'B' }])],
			totalDefense: { melee: 1, ranged: 0 },
		});
		const keys = (purpose: CheckPurpose) =>
			resolveCheck(hero, { skillName: 'Melee', target: foe, attackRange: 'engaged', purpose }, rules).poolModifications.map(
				(modification) => modification.key,
			);

		expect(keys({ kind: 'check' })).toEqual([]);
		expect(keys(attack)).toEqual(['self.effect.ActiveEffect.Aim', 'target.effect.ActiveEffect.Prone', 'target.defense.melee']);
	});

	it("meets the defense of the kind of attack the Skills Compendium gives the skill, whatever the weapon's range and the actor's copy (CRB p. 104, RoT p. 93)", () => {
		const kinds = {
			...rules,
			compendiumSkills: [
				{ name: 'Melee (Heavy)', system: { characteristic: Characteristic.Brawn, rank: 0, attackKind: 'melee' as const } },
				{ name: 'Ranged', system: { characteristic: Characteristic.Agility, rank: 0, attackKind: 'ranged' as const } },
				{ name: 'Arcana', system: { characteristic: Characteristic.Intellect, rank: 0, attackKind: 'range' as const } },
			],
		};
		const hero = actor('character', [
			// The copy's own kind is never read.
			{ name: 'Melee (Heavy)', system: { characteristic: Characteristic.Brawn, rank: 1, attackKind: 'ranged' as const } },
			skill('Ranged', Characteristic.Agility, 1),
			skill('Arcana', Characteristic.Intellect, 1),
		]);
		const foe = actor('rival', [], {
			effects: [effect('Prone', [{ key: 'genesys.pool.melee.target.', value: 'B' }])],
			totalDefense: { melee: 1, ranged: 1 },
		});
		const keys = (skillName: string, attackRange: string) =>
			resolveCheck(hero, { skillName, target: foe, attackRange, purpose: attack }, kinds).poolModifications.map(
				(modification) => modification.key,
			);

		// A pike attacks at short range with Melee (Heavy).
		expect(keys('Melee (Heavy)', 'short')).toEqual(['target.effect.ActiveEffect.Prone', 'target.defense.melee']);
		expect(keys('Ranged', 'engaged')).toEqual(['target.defense.ranged']);
		// A skill that gives no kind leaves it to the weapon's range, as a skill the Skills Compendium lacks does.
		expect(keys('Arcana', 'short')).toEqual(['target.defense.ranged']);
		expect(keys('Arcana', 'engaged')).toEqual(['target.effect.ActiveEffect.Prone', 'target.defense.melee']);
	});

	it("makes a magic attack a combat check, which the target's defense and Aim change, and leaves another spell out (CRB p. 215)", () => {
		const hero = actor('character', [skill('Arcana', Characteristic.Intellect, 1)], {
			effects: [effect('Aim', [{ key: 'genesys.pool.combat.self.', value: 'B' }])],
		});
		const foe = actor('rival', [], { totalDefense: { melee: 0, ranged: 1 } });
		const keys = (isAttack: boolean) =>
			resolveCheck(
				hero,
				{ skillName: 'Arcana', target: foe, attackRange: 'short', purpose: { kind: 'spell', spellName: 'Fireball', isAttack } },
				rules,
			).poolModifications.map((modification) => modification.key);

		expect(keys(true)).toEqual(['self.effect.ActiveEffect.Aim', 'target.defense.ranged']);
		expect(keys(false)).toEqual([]);
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
				choice: TOGGLED,
			},
			{
				key: 'self.effect.Actor.hero.Item.ring2.ActiveEffect.grade',
				source: 'self',
				from: { effect: 'Ring', uuid: 'Actor.hero.Item.ring2.ActiveEffect.grade' },
				mods: ['^', '^'],
				choice: TOGGLED,
			},
		]);
	});

	it("compares the attacker's silhouette to the target's for an attack, and for no other check (CRB p. 109)", () => {
		const hero = actor('character', [skill('Melee', Characteristic.Brawn, 1)]);
		const giant = actor('rival', [], { silhouette: 3 });
		const attack = { kind: 'attack', weaponName: 'Sword' } as const;

		expect(
			resolveCheck(hero, { purpose: attack, skillName: 'Melee', target: giant, attackRange: 'engaged' }, rules).poolModifications,
		).toEqual([
			{ key: 'target.silhouette', source: 'target', from: { silhouette: { target: 3, attacker: 1 } }, mods: ['-D'], choice: TOGGLED },
		]);
		expect(resolveCheck(hero, { skillName: 'Melee', target: giant, attackRange: 'engaged' }, rules).poolModifications).toEqual([]);
	});

	it('takes the silhouette of the vehicle whose weapon is fired, not the crew member rolling the attack (CRB p. 222)', () => {
		const gunner = actor('character', [skill('Gunnery', Characteristic.Agility, 1)]);
		const vehicle = actor('vehicle', [], { silhouette: 3 });
		const request = {
			purpose: { kind: 'attack', weaponName: 'Cannon' },
			skillName: 'Gunnery',
			target: actor('character', []),
			attackRange: 'long',
			attacker: vehicle,
		} as const;

		expect(resolveCheck(gunner, request, rules).poolModifications).toEqual([
			{ key: 'target.silhouette', source: 'target', from: { silhouette: { target: 1, attacker: 3 } }, mods: ['D'], choice: TOGGLED },
		]);
	});

	it('hinders the Agility check an encumbered character picks for a skill when skills are uncoupled from characteristics (CRB p. 85, 205)', () => {
		const hero = actor('character', [skill('Cool', Characteristic.Presence, 1)], { currentEncumbrance: { value: 9, threshold: 8 } });
		const encumbrance = {
			key: 'self.encumbrance',
			source: 'self',
			from: { encumbrance: { value: 9, threshold: 8 } },
			mods: ['S'],
			choice: TOGGLED,
		};

		expect(resolveCheck(hero, { skillName: 'Cool', characteristic: Characteristic.Agility }, uncoupled).poolModifications).toEqual([
			encumbrance,
		]);
		expect(resolveCheck(hero, { skillName: 'Cool', characteristic: Characteristic.Agility }, rules).poolModifications).toEqual([]);
	});

	it("hinders an attack with the weapon's damage, and no other check (CRB p. 89)", () => {
		const hero = actor('character', [skill('Melee', Characteristic.Brawn, 1)]);
		const sword = { name: 'Sword', uuid: 'Item.sword', system: { damage: 'moderate' } } as const;
		const attack = { kind: 'attack', weaponName: 'Sword' } as const;

		expect(
			resolveCheck(hero, { purpose: attack, skillName: 'Melee', attackRange: 'engaged', weapon: sword }, rules).poolModifications,
		).toEqual([
			{
				key: 'self.itemDamage',
				source: 'self',
				from: { itemDamage: { name: 'Sword', uuid: 'Item.sword', damage: 'moderate' } },
				mods: ['D'],
				choice: TOGGLED,
			},
		]);
		expect(resolveCheck(hero, { skillName: 'Melee', attackRange: 'engaged', weapon: sword }, rules).poolModifications).toEqual([]);
	});

	it('changes an attack with the effects of the qualities of the Weapon Profile it is made with, and no other check (CRB p. 86)', () => {
		const hero = actor('character', [skill('Melee', Characteristic.Brawn, 1)]);
		const sword = {
			documentName: 'Item',
			type: 'weapon',
			name: 'Sword',
			uuid: 'Item.sword',
			system: {
				damage: 'undamaged' as const,
				qualities: [{ id: 'acc', name: 'Accurate', description: 'Aims better.', isRated: true, rating: 2 }],
			},
			effects: [] as PoolModificationEffect[],
		};
		sword.effects = [
			{
				name: 'Accurate',
				uuid: 'ActiveEffect.accurate',
				isSuppressed: false,
				origin: null,
				parent: sword,
				system: { changes: [{ key: 'genesys.pool.combat.self.', value: 'B' }] },
				flags: { genesys: { quality: 'acc' } },
			},
		];
		const attack = { kind: 'attack', weaponName: 'Sword' } as const;
		const request = { skillName: 'Melee', attackRange: 'engaged', weapon: sword, attackQualities: [{ id: 'acc' }] };

		expect(resolveCheck(hero, { ...request, purpose: attack }, rules).poolModifications).toEqual([
			{
				key: 'self.effect.ActiveEffect.accurate',
				source: 'self',
				from: {
					effect: 'Accurate',
					uuid: 'ActiveEffect.accurate',
					item: { name: 'Sword', uuid: 'Item.sword' },
					described: { name: 'Accurate', description: 'Aims better.' },
				},
				mods: ['B', 'B'],
				choice: TOGGLED,
			},
		]);
		expect(resolveCheck(hero, request, rules).poolModifications).toEqual([]);
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
		expect(checkDicePool(check, { difficulty: 'DD', countOf: () => 1 })).toEqual({
			dice: { Proficiency: 2, Ability: 1, Difficulty: 2, Boost: 1 },
			symbols: {},
			usesSuperCharacteristic: false,
		});
		expect(checkDicePool(check, { difficulty: '', manualChanges: ['s'], countOf: () => 0 })).toEqual({
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

		expect(checkDicePool(intellectCheck, { difficulty: 'DD', countOf: ({ key }) => (key === first.key ? 1 : 0) }).dice).toEqual({
			Proficiency: 1,
			Ability: 0,
			Difficulty: 2,
		});
	});
});

describe('checkAttackChanges', () => {
	const orc = actor('character', [skill('Melee', Characteristic.Brawn, 2)], {
		effects: [
			effect('Battle Rage', [
				{ key: 'genesys.pool.melee.self.', value: 'S' },
				{ key: 'genesys.attack.damage.melee', value: '2' },
			]),
			effect('Devastating', [{ key: 'genesys.attack.damage.combat', value: '2' }]),
			effect('Dueling', [{ key: 'genesys.pool.skill.self.Melee', value: 'B' }]),
		],
	});
	const attack = resolveCheck(orc, { skillName: 'Melee', purpose: { kind: 'attack', weaponName: 'Axe' }, attackRange: 'engaged' }, rules);

	it('gives the Attack Changes of the effects left on, each named after its effect (RoT pp. 67, 79)', () => {
		expect(checkAttackChanges(attack, () => 1)).toEqual([
			{ name: 'Battle Rage', damage: 2 },
			{ name: 'Devastating', damage: 2 },
		]);
	});

	it('leaves out those of an effect turned off, as its Pool Modifications', () => {
		const countOf = ({ key }: { key: string }) => (key !== 'self.effect.ActiveEffect.Battle Rage' ? 1 : 0);

		expect(checkAttackChanges(attack, countOf)).toEqual([{ name: 'Devastating', damage: 2 }]);
		expect(checkDicePool(attack, { difficulty: 'DD', countOf }).dice.Setback).toBeUndefined();
	});

	it('gives none for a check that is no attack', () => {
		expect(checkAttackChanges(resolveCheck(orc, { skillName: 'Melee' }, rules), () => 1)).toEqual([]);
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
		{ key: 'self.effect.ActiveEffect.Steady', count: 0, choice: TOGGLED },
		{ key: 'self.effect.ActiveEffect.Dueling', count: 1, choice: TOGGLED },
	];
	const cool = resolveCheck(hero, { skillName: 'Cool' }, rules);
	const states = (autoApply: boolean) =>
		carriedPoolModificationStates(before, cool.poolModifications, autoApply).map(({ key, count }) => ({ key, count }));

	it('keeps the state of the Pool Modifications still listed, and turns new ones on when auto-apply is on', () => {
		expect(states(true)).toEqual([
			{ key: 'self.effect.ActiveEffect.Steady', count: 0 },
			{ key: 'self.effect.ActiveEffect.Alert', count: 1 },
		]);
	});

	it('leaves new Pool Modifications off when auto-apply is off', () => {
		expect(states(false)).toEqual([
			{ key: 'self.effect.ActiveEffect.Steady', count: 0 },
			{ key: 'self.effect.ActiveEffect.Alert', count: 0 },
		]);
	});

	it("starts an active quality's Pool Modification off though auto-apply is on, and keeps the roller's choice once they turn it on (CRB p. 86)", () => {
		const startsOff: PoolModificationChoice = { kind: 'toggle', startsOff: true };
		const autoFire = { key: 'self.effect.ActiveEffect.AutoFire', choice: startsOff };
		const accurate = { key: 'self.effect.ActiveEffect.Accurate', choice: TOGGLED };
		const states = (previous: { key: string; count: number; choice: PoolModificationChoice }[]) =>
			carriedPoolModificationStates(previous, [autoFire, accurate], true).map(({ key, count }) => ({ key, count }));

		expect(states([])).toEqual([
			{ key: 'self.effect.ActiveEffect.AutoFire', count: 0 },
			{ key: 'self.effect.ActiveEffect.Accurate', count: 1 },
		]);
		expect(states([{ ...autoFire, count: 1 }])[0]).toEqual({
			key: 'self.effect.ActiveEffect.AutoFire',
			count: 1,
		});
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
					{ ...first, count: 1 },
					{ ...second, count: 0 },
				],
				picked.poolModifications,
				false,
			).map(({ mods, count }) => ({ mods, count })),
		).toEqual([
			{ mods: ['^'], count: 1 },
			{ mods: ['B'], count: 0 },
		]);
	});

	it('keeps what each Pool Modification is and does', () => {
		const [steady, alert] = cool.poolModifications;

		expect(carriedPoolModificationStates(before, cool.poolModifications, true)).toEqual([
			{ ...steady, count: 0 },
			{ ...alert, count: 1 },
		]);
	});
});

describe("a talent's effect counted up to its rank", () => {
	// Rapid Reaction adds up to its ranks in Successes, for as much strain (CRB p. 74).
	const rapidReaction = (scalesWithRank: 'yes' | 'no' | 'upTo', changes = [{ key: 'genesys.pool.check.self.', value: 's' }]) =>
		talentEffect('Rapid Reaction', { rank: 3, scalesWithRank }, changes);
	const checkOf = (...effects: PoolModificationEffect[]) =>
		resolveCheck(actor('character', [], { effects }), { fallbackCharacteristic: Characteristic.Intellect }, rules);
	const counted = (check: Check, count: number) => checkDicePool(check, { difficulty: 'DD', countOf: () => count });

	it("lists its Pool Modifications once, with the talent's rank as the most times they count", () => {
		const [modification] = checkOf(rapidReaction('upTo')).poolModifications;

		expect(modification).toMatchObject({ mods: ['s'], choice: { kind: 'count', upTo: 3 } });
	});

	it('counts its Pool Modifications as many times as the count, 0 included', () => {
		const check = checkOf(rapidReaction('upTo'));

		expect([0, 1, 2, 3].map((count) => counted(check, count).symbols)).toEqual([{}, { Success: 1 }, { Success: 2 }, { Success: 3 }]);
	});

	it("applies each count through the pool's rules: an upgrade of a pool without Ability dice adds one, a downgrade without Proficiency dice does nothing (CRB p. 22)", () => {
		// Intellect 1, no skill: one Ability die.
		const upgrades = checkOf(
			talentEffect('Grit', { rank: 3, scalesWithRank: 'upTo' }, [{ key: 'genesys.pool.check.self.', value: '^' }]),
		);
		const downgrades = checkOf(
			talentEffect('Doubt', { rank: 2, scalesWithRank: 'upTo' }, [{ key: 'genesys.pool.check.self.', value: '_' }]),
		);

		// The first upgrade turns the Ability die into a Proficiency die, the second adds an Ability die, the third upgrades it.
		expect(counted(upgrades, 3).dice).toEqual({ Proficiency: 2, Ability: 0, Difficulty: 2 });
		expect(counted(downgrades, 2).dice).toEqual({ Proficiency: 0, Ability: 1, Difficulty: 2 });
	});

	it('starts at 0 whether the world applies Pool Modifications automatically or not, where a checkbox keeps the setting', () => {
		const { poolModifications } = checkOf(
			rapidReaction('upTo'),
			talentEffect('Steady', { rank: 2, scalesWithRank: 'yes' }, [{ key: 'genesys.pool.check.self.', value: 'B' }]),
		);
		const counts = (autoApply: boolean) => carriedPoolModificationStates([], poolModifications, autoApply).map(({ count }) => count);

		expect(counts(true)).toEqual([0, 1]);
		expect(counts(false)).toEqual([0, 0]);
		expect(poolModifications.map((modification) => startingCount(modification, true))).toEqual([0, 1]);
	});

	it("keeps the roller's count when the check is resolved again", () => {
		const { poolModifications } = checkOf(rapidReaction('upTo'));

		expect(carriedPoolModificationStates([{ ...poolModifications[0], count: 2 }], poolModifications, true)[0].count).toBe(2);
	});

	describe('resolved again once its row changed', () => {
		const hero = (rank: number, scalesWithRank: 'yes' | 'no' | 'upTo') =>
			actor('character', [skill('Melee', Characteristic.Brawn, 2), skill('Brawl', Characteristic.Brawn, 1)], {
				effects: [
					talentEffect('Rapid Reaction', { rank, scalesWithRank }, [
						{ key: 'genesys.pool.skill.self.Melee', value: 's' },
						{ key: 'genesys.attack.damage.combat', value: '1' },
					]),
				],
			});
		const attackWith = (skillName: string, rank = 3, scalesWithRank: 'yes' | 'no' | 'upTo' = 'upTo') =>
			resolveCheck(
				hero(rank, scalesWithRank),
				{ skillName, purpose: { kind: 'attack', weaponName: 'Axe' }, attackRange: 'engaged' },
				rules,
			).poolModifications;
		const countsOf = (rows: { count: number }[]) => rows.map(({ count }) => count);

		it('starts at 0 once its checkbox, which auto-apply checked, turns into a count', () => {
			// A Brawl attack gets the effect's Attack Change alone, which the roller turns on or off.
			const brawl = carriedPoolModificationStates([], attackWith('Brawl'), true);

			expect(brawl.map(({ choice, count }) => ({ choice, count }))).toEqual([{ choice: TOGGLED, count: 1 }]);
			expect(countsOf(carriedPoolModificationStates(brawl, attackWith('Melee'), true))).toEqual([0]);
		});

		it("starts again at 0 once the talent's rank it counts up to changed, so the roller chooses again what each count costs", () => {
			const counted = [{ ...attackWith('Melee', 3)[0], count: 3 }];

			expect(countsOf(carriedPoolModificationStates(counted, attackWith('Melee', 2), true))).toEqual([0]);
			expect(countsOf(carriedPoolModificationStates(counted, attackWith('Melee', 4), true))).toEqual([0]);
		});

		it('starts as a checkbox does once its talent scales with rank or not again, rather than repeating its Pool Modifications', () => {
			const counted = [{ ...attackWith('Melee')[0], count: 3 }];

			for (const scalesWithRank of ['yes', 'no'] as const) {
				expect(countsOf(carriedPoolModificationStates(counted, attackWith('Melee', 3, scalesWithRank), true))).toEqual([1]);
				expect(countsOf(carriedPoolModificationStates(counted, attackWith('Melee', 3, scalesWithRank), false))).toEqual([0]);
			}
		});

		it('never carries more than its most: its rank for a count, once for a checkbox', () => {
			const [melee] = attackWith('Melee');
			const [brawl] = attackWith('Brawl');

			expect(countsOf(carriedPoolModificationStates([{ ...melee, count: 5 }], [melee], true))).toEqual([3]);
			expect(countsOf(carriedPoolModificationStates([{ ...brawl, count: 2 }], [brawl], true))).toEqual([1]);
		});
	});

	it('turns on or off, once, the Pool Modifications of an unranked talent left counted up to its rank or scaling with it', () => {
		const unranked = (scalesWithRank: 'yes' | 'upTo') =>
			checkOf(
				talentEffect('Rapid Reaction', { ranked: 'no', rank: 3, scalesWithRank }, [
					{ key: 'genesys.pool.check.self.', value: 's' },
				]),
			).poolModifications;

		for (const scalesWithRank of ['yes', 'upTo'] as const) {
			const [modification] = unranked(scalesWithRank);
			expect({ mods: modification.mods, choice: modification.choice }).toEqual({ mods: ['s'], choice: TOGGLED });
			expect(carriedPoolModificationStates([], [modification], true)[0].count).toBe(1);
		}
	});

	it("leaves a talent that scales with rank, or doesn't, turned on or off as before", () => {
		const [scaling] = checkOf(rapidReaction('yes')).poolModifications;
		const [once] = checkOf(rapidReaction('no')).poolModifications;

		expect(scaling.mods).toEqual(['s', 's', 's']);
		expect(once.mods).toEqual(['s']);
		expect([scaling.choice, once.choice]).toEqual([
			{ kind: 'toggle', startsOff: false },
			{ kind: 'toggle', startsOff: false },
		]);
	});

	it('counts its Attack Changes once per rank, as a talent that scales with rank, once its count is above 0', () => {
		const attack = resolveCheck(
			actor('character', [skill('Melee', Characteristic.Brawn, 2)], {
				effects: [
					rapidReaction('upTo', [
						{ key: 'genesys.pool.melee.self.', value: 'S' },
						{ key: 'genesys.attack.damage.melee', value: '1' },
					]),
				],
			}),
			{ skillName: 'Melee', purpose: { kind: 'attack', weaponName: 'Axe' }, attackRange: 'engaged' },
			rules,
		);

		expect(checkAttackChanges(attack, () => 0)).toEqual([]);
		expect(checkAttackChanges(attack, () => 1)).toEqual([{ name: 'Rapid Reaction', damage: 3 }]);
		expect(checkAttackChanges(attack, () => 2)).toEqual([{ name: 'Rapid Reaction', damage: 3 }]);
	});

	it('is turned on or off as before when it holds Attack Changes alone, which count once per rank', () => {
		const [modification] = resolveCheck(
			actor('character', [skill('Melee', Characteristic.Brawn, 2)], {
				effects: [rapidReaction('upTo', [{ key: 'genesys.attack.damage.melee', value: '1' }])],
			}),
			{ skillName: 'Melee', purpose: { kind: 'attack', weaponName: 'Axe' }, attackRange: 'engaged' },
			rules,
		).poolModifications;

		expect(modification.choice).toEqual({ kind: 'toggle', startsOff: false });
		expect(modification.attack).toEqual({ damage: 3 });
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
		expect(checkDicePool(check, { difficulty: '', countOf: () => 1 }).dice).toEqual({ Proficiency: 1, Ability: 1, Boost: 1 });
	});

	describe("gets the actor's changes of initiative checks (#931)", () => {
		const watchful = actor('character', [skill('Vigilance', Characteristic.Willpower, 1), skill('Cool', Characteristic.Presence, 1)], {
			effects: [effect('Rapid Reaction', [{ key: 'genesys.pool.initiative.self.', value: 'B' }])],
		});
		const effectKeys = (check: Check) => check.poolModifications.map((modification) => modification.key);

		it('whatever the skill it is rolled with, Vigilance, Cool or another', () => {
			for (const skillName of ['Vigilance', 'Cool', 'Melee']) {
				expect(effectKeys(resolveCheck(watchful, { purpose: { kind: 'initiative' }, skillName }, rules))).toEqual([
					'self.effect.ActiveEffect.Rapid Reaction',
				]);
			}
		});

		it('and no check of Vigilance or Cool that is not rolled for initiative gets them', () => {
			for (const skillName of ['Vigilance', 'Cool']) {
				expect(effectKeys(resolveCheck(watchful, { skillName }, rules))).toEqual([]);
			}
		});
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

	it('names the spell cast, with its skill, or alone when the roller picks none', () => {
		const spell = { kind: 'spell', spellName: 'Curse', isAttack: false } as const;

		expect(description(resolveCheck(hero, { purpose: spell, skillName: 'Melee' }, rules))).toBe(
			'SpellSkill {"name":"Curse","skill":"Melee","characteristic":"Brawn","superChar":"super-char"}',
		);
		expect(description(resolveCheck(hero, { purpose: spell, characteristic: Characteristic.Brawn }, rules))).toBe(
			'SpellWithoutSkill {"name":"Curse"}',
		);
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
