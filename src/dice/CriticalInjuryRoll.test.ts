/**
 * @file Tests for rolling a Critical Injury: how many times an attack triggers it, and the modifier of its roll.
 */

import { describe, expect, it } from 'vitest';

import {
	type CriticalEffect,
	type CriticalInjuryActor,
	criticalEffectBonuses,
	criticalInjuryFormula,
	criticalInjuryLines,
	criticalInjuryResults,
	criticalModifier,
	criticalTriggers,
	existingInjuriesBonus,
	extraTriggersBonus,
	isCriticalChangeKey,
	isCriticalChangeValue,
	parseCriticalInjuryFlag,
	viciousRating,
} from '@/dice/CriticalInjuryRoll';

describe('criticalTriggers', () => {
	const attack = { succeeded: true, netAdvantage: 0, triumphs: 0, critical: 3 };

	it('triggers once for each time the net Advantage reaches the Critical rating (CRB p. 102)', () => {
		expect(criticalTriggers({ ...attack, netAdvantage: 2 })).toBe(0);
		expect(criticalTriggers({ ...attack, netAdvantage: 3 })).toBe(1);
		expect(criticalTriggers({ ...attack, netAdvantage: 7 })).toBe(2);
	});

	it('triggers once more for each Triumph, whatever the Critical rating (CRB p. 103)', () => {
		expect(criticalTriggers({ ...attack, netAdvantage: 1, triumphs: 1 })).toBe(1);
		expect(criticalTriggers({ ...attack, netAdvantage: 3, triumphs: 2 })).toBe(3);
	});

	it('never triggers on a failed attack, which deals no damage (CRB p. 102)', () => {
		expect(criticalTriggers({ ...attack, succeeded: false, netAdvantage: 6, triumphs: 1 })).toBe(0);
	});

	it('counts no Advantage left after the Threats cancelled it', () => {
		expect(criticalTriggers({ ...attack, netAdvantage: -4, triumphs: 1 })).toBe(1);
	});

	it('triggers only with Triumphs for a weapon without a Critical rating', () => {
		expect(criticalTriggers({ ...attack, critical: 0, netAdvantage: 5 })).toBe(0);
		expect(criticalTriggers({ ...attack, critical: 0, netAdvantage: 5, triumphs: 1 })).toBe(1);
	});
});

describe('extraTriggersBonus', () => {
	it('adds +10 for each trigger spent past the first (CRB p. 103)', () => {
		expect(extraTriggersBonus(1)).toBe(0);
		expect(extraTriggersBonus(2)).toBe(10);
		expect(extraTriggersBonus(4)).toBe(30);
	});

	it('adds nothing for no trigger', () => {
		expect(extraTriggersBonus(0)).toBe(0);
	});
});

describe('existingInjuriesBonus', () => {
	it('adds +10 for each Critical Injury the actor already has (CRB p. 114)', () => {
		const items = [{ type: 'injury' }, { type: 'weapon' }, { type: 'injury' }, { type: 'talent' }];
		expect(existingInjuriesBonus(items)).toBe(20);
		expect(existingInjuriesBonus([{ type: 'weapon' }])).toBe(0);
	});
});

describe('viciousRating', () => {
	const quality = (name: string, rating: number) => ({ name, isRated: true, rating });
	const NAMES = ['Vicious', 'Sanguinaire'];

	it("finds Vicious under its English name, or the world's language's (CRB p. 89)", () => {
		expect(viciousRating([quality('Pierce', 2), quality('Vicious', 3)], NAMES)).toBe(3);
		expect(viciousRating([quality('Sanguinaire', 2)], NAMES)).toBe(2);
	});

	it('matches the name whatever its case and its surrounding spaces', () => {
		expect(viciousRating([quality(' vicious ', 1)], NAMES)).toBe(1);
		expect(viciousRating([quality('SANGUINAIRE', 4)], NAMES)).toBe(4);
	});

	it('is 0 for a weapon without Vicious', () => {
		expect(viciousRating([quality('Pierce', 2)], NAMES)).toBe(0);
		expect(viciousRating([], NAMES)).toBe(0);
	});
});

describe('isCriticalChangeKey and isCriticalChangeValue', () => {
	it('recognises the keys of the changes to Critical Injuries inflicted and suffered', () => {
		expect(isCriticalChangeKey('genesys.critical.inflicted')).toBe(true);
		expect(isCriticalChangeKey('genesys.critical.suffered')).toBe(true);
		expect(isCriticalChangeKey('genesys.critical.other')).toBe(false);
		expect(isCriticalChangeKey('genesys.pool.check.self.')).toBe(false);
	});

	it('takes a whole number, signed or not, as a value', () => {
		expect(['10', '-10', '+20', ' 5 ', '0'].map(isCriticalChangeValue)).toEqual([true, true, true, true, true]);
		expect(['', 'a', '1.5', '10a', 'D'].map(isCriticalChangeValue)).toEqual([false, false, false, false, false]);
	});
});

type Change = { key: string; value: unknown };

function effect(
	name: string,
	changes: Change[],
	{ isSuppressed = false, originItem, flags }: Partial<CriticalEffect> = {},
): CriticalEffect {
	return { name, uuid: `ActiveEffect.${name}`, isSuppressed, changes, originItem, flags };
}

function talent(name: string, rank: number, scalesWithRank: 'yes' | 'no') {
	return { name, uuid: `Item.${name}`, type: 'talent', system: { rank, scalesWithRank } };
}

function actor(effects: CriticalEffect[], items: { type: string }[] = []): CriticalInjuryActor {
	return { items, allApplicableEffects: () => effects };
}

const inflicted = (value: unknown) => ({ key: 'genesys.critical.inflicted', value });
const suffered = (value: unknown) => ({ key: 'genesys.critical.suffered', value });

describe('criticalEffectBonuses', () => {
	it('sums the changes of each effect to the Critical Injuries its actor inflicts, or suffers', () => {
		const attacker = actor([
			effect('Lethal Blows', [inflicted('10'), inflicted('10')]),
			effect('Durable', [suffered('-10')]),
			effect('Focus', [{ key: 'genesys.pool.check.self.', value: 'a' }]),
		]);

		expect(criticalEffectBonuses(attacker, 'inflicted')).toEqual([
			{ name: 'Lethal Blows', uuid: 'ActiveEffect.Lethal Blows', value: 20 },
		]);
		expect(criticalEffectBonuses(attacker, 'suffered')).toEqual([{ name: 'Durable', uuid: 'ActiveEffect.Durable', value: -10 }]);
	});

	it('reads a number as v14 stores it, and leaves out a value that is no whole number', () => {
		expect(criticalEffectBonuses(actor([effect('Number', [inflicted(15)]), effect('Text', [inflicted('lots')])]), 'inflicted')).toEqual(
			[{ name: 'Number', uuid: 'ActiveEffect.Number', value: 15 }],
		);
	});

	it('leaves out a suppressed effect', () => {
		expect(criticalEffectBonuses(actor([effect('Off', [inflicted('10')], { isSuppressed: true })]), 'inflicted')).toEqual([]);
	});

	it('counts a change once per rank of its talent when the talent scales with rank, as Pool Modifications do', () => {
		const scaled = effect('Lethal Blows', [inflicted('10')], { originItem: talent('Lethal Blows', 3, 'yes') });
		const unscaled = effect('Bloodthirst', [inflicted('10')], { originItem: talent('Bloodthirst', 3, 'no') });

		expect(criticalEffectBonuses(actor([scaled, unscaled]), 'inflicted')).toEqual([
			{
				name: 'Lethal Blows',
				uuid: 'ActiveEffect.Lethal Blows',
				item: { name: 'Lethal Blows', uuid: 'Item.Lethal Blows' },
				value: 30,
			},
			{ name: 'Bloodthirst', uuid: 'ActiveEffect.Bloodthirst', item: { name: 'Bloodthirst', uuid: 'Item.Bloodthirst' }, value: 10 },
		]);
	});
});

describe('criticalEffectBonuses of qualities (#726)', () => {
	const quality = (id: string, name: string, rating: number, isRated = true) => ({ id, name, isRated, rating });
	const qualityEffect = (
		name: string,
		id: string,
		item: { type: string; uuid: string; qualities: ReturnType<typeof quality>[] },
		key = inflicted,
	) => {
		// A weapon's or an armor's data holds its qualities, which a talent's has no use for.
		const system: object = { qualities: item.qualities };
		return effect(name, [key(10)], {
			flags: { genesys: { quality: id } },
			originItem: { name: item.uuid, uuid: item.uuid, type: item.type, system },
		});
	};

	const sword = { type: 'weapon', uuid: 'Item.Sword', qualities: [quality('q1', 'Brutal', 2), quality('q2', 'Brutal', 1)] };
	const dagger = { type: 'weapon', uuid: 'Item.Dagger', qualities: [quality('q3', 'Brutal', 1)] };
	const attackWith = (item: typeof sword) => ({ name: item.uuid, uuid: item.uuid, qualities: item.qualities });
	const attacker = actor([
		qualityEffect('Sword Brutal', 'q1', sword),
		qualityEffect('Sword Brutal copy', 'q2', sword),
		qualityEffect('Dagger Brutal', 'q3', dagger),
	]);

	it("counts a rated quality's change once per rank, for an attack with its weapon only", () => {
		expect(criticalEffectBonuses(attacker, 'inflicted', attackWith(sword)).map(({ name, value }) => [name, value])).toEqual([
			['Sword Brutal', 20],
		]);
		expect(criticalEffectBonuses(attacker, 'inflicted', attackWith(dagger)).map(({ name, value }) => [name, value])).toEqual([
			['Dagger Brutal', 10],
		]);
	});

	it("adds nothing for a weapon's quality without a weapon, or when the weapon has no uuid, as in a message of 0.7.0-rc.1", () => {
		expect(criticalEffectBonuses(attacker, 'inflicted')).toEqual([]);
		expect(criticalEffectBonuses(attacker, 'inflicted', { ...attackWith(sword), uuid: null })).toEqual([]);
	});

	it("leaves a weapon's quality out of the injuries its wielder suffers", () => {
		expect(criticalEffectBonuses(actor([qualityEffect('Sword Brutal', 'q1', sword, suffered)]), 'suffered', attackWith(sword))).toEqual(
			[],
		);
	});

	it("counts an armor's quality once per rank, whatever the weapon", () => {
		const armor = { type: 'armor', uuid: 'Item.Mail', qualities: [quality('a1', 'Sturdy', 3)] };

		expect(criticalEffectBonuses(actor([qualityEffect('Sturdy', 'a1', armor, suffered)]), 'suffered')).toMatchObject([{ value: 30 }]);
	});
});

describe('parseCriticalInjuryFlag', () => {
	const attack = {
		triggers: 2,
		attacker: 'Actor.Hero',
		target: null,
		weapon: { name: 'Axe', uuid: 'Item.Axe', qualities: [{ id: 'v1', name: 'Vicious', isRated: true, rating: 2 }] },
	};

	it("reads an attack's flag", () => {
		expect(parseCriticalInjuryFlag(attack)).toEqual({ kind: 'attack', ...attack });
	});

	it("reads the weapon of a message of 0.7.0-rc.1, which has no uuid and no quality ids, as one that matches no effect's", () => {
		const flag = { ...attack, weapon: { name: 'Axe', qualities: [{ name: 'Vicious', isRated: true, rating: 2 }] } };

		expect(parseCriticalInjuryFlag(flag)).toMatchObject({
			kind: 'attack',
			weapon: { name: 'Axe', uuid: null, qualities: [{ id: '', name: 'Vicious', isRated: true, rating: 2 }] },
		});
	});

	it("reads a wound threshold's flag, which has no weapon, as no attack", () => {
		expect(parseCriticalInjuryFlag({ target: 'Actor.Hero' })).toEqual({ kind: 'threshold', target: 'Actor.Hero' });
	});

	it.each([
		['no object', 'Actor.Hero'],
		['a threshold flag without its target', {}],
		['a threshold flag whose target is no uuid', { target: 3 }],
		['an attack without its triggers', { ...attack, triggers: undefined }],
		['an attack that triggers no injury', { ...attack, triggers: 0 }],
		['an attack whose attacker is no uuid', { ...attack, attacker: 3 }],
		['an attack without a target', { ...attack, target: undefined }],
		['an attack whose weapon is no object', { ...attack, weapon: 'Axe' }],
		['an attack whose weapon has no name', { ...attack, weapon: { qualities: [] } }],
		['an attack whose weapon has no qualities', { ...attack, weapon: { name: 'Axe' } }],
		['an attack whose weapon has a malformed quality', { ...attack, weapon: { name: 'Axe', qualities: [{ name: 'Vicious' }] } }],
	])('refuses %s', (_, flag) => {
		expect(parseCriticalInjuryFlag(flag)).toBeUndefined();
	});
});

describe('criticalInjuryLines', () => {
	const NAMES = ['Vicious', 'Sanguinaire'];
	const weapon = { name: 'Axe', uuid: 'Item.Axe', qualities: [{ id: 'v1', name: 'Vicious', isRated: true, rating: 2 }] };

	it('offers only the free modifier when it knows neither the actor nor the attack', () => {
		expect(criticalInjuryLines({}, NAMES)).toEqual([{ kind: 'free', value: 0 }]);
	});

	it("starts an attack's lines with one trigger spent, then its Vicious and the attacker's talents", () => {
		const attacker = actor([effect('Lethal Blows', [inflicted('10')])]);

		expect(criticalInjuryLines({ attack: { triggers: 3, weapon, attacker } }, NAMES)).toEqual([
			{ kind: 'triggers', count: 1, value: 0 },
			{ kind: 'vicious', count: 2, value: 20 },
			{ kind: 'inflicted', source: { name: 'Lethal Blows', uuid: 'ActiveEffect.Lethal Blows' }, value: 10 },
			{ kind: 'free', value: 0 },
		]);
	});

	it("adds the actor's existing injuries, even none, and their own talents", () => {
		const target = actor([effect('Durable', [suffered('-10')])], [{ type: 'injury' }]);

		expect(criticalInjuryLines({ actor: target }, NAMES)).toEqual([
			{ kind: 'injuries', count: 1, value: 10 },
			{ kind: 'suffered', source: { name: 'Durable', uuid: 'ActiveEffect.Durable' }, value: -10 },
			{ kind: 'free', value: 0 },
		]);
		expect(criticalInjuryLines({ actor: actor([]) }, NAMES)).toEqual([
			{ kind: 'injuries', count: 0, value: 0 },
			{ kind: 'free', value: 0 },
		]);
	});

	it('leaves out Vicious for a weapon without it', () => {
		expect(criticalInjuryLines({ attack: { triggers: 1, weapon: { name: 'Club', uuid: 'Item.Club', qualities: [] } } }, NAMES)).toEqual(
			[
				{ kind: 'triggers', count: 1, value: 0 },
				{ kind: 'free', value: 0 },
			],
		);
	});
});

describe('criticalModifier', () => {
	it("sums the lines' values into the bonus of the d100 (CRB p. 114)", () => {
		expect(criticalModifier([{ value: 10 }, { value: 20 }, { value: -10 }, { value: 5 }])).toBe(25);
	});

	it('counts a line emptied in the dialog as 0', () => {
		expect(criticalModifier([{ value: 10 }, { value: NaN }])).toBe(10);
	});
});

describe('criticalInjuryFormula', () => {
	it('adds the modifier to a d100', () => {
		expect(criticalInjuryFormula(30)).toBe('1d100 + 30');
		expect(criticalInjuryFormula(-10)).toBe('1d100 - 10');
		expect(criticalInjuryFormula(0)).toBe('1d100');
	});
});

describe('criticalInjuryResults', () => {
	const results = [
		{ id: 'nick', range: [1, 5] as [number, number] },
		{ id: 'slowed', range: [6, 10] as [number, number] },
		{ id: 'dead', range: [151, 151] as [number, number] },
	];
	const ids = (total: number) => criticalInjuryResults(results, total).map(({ id }) => id);

	it('draws the result whose range holds the total (CRB p. 115)', () => {
		expect(ids(7)).toEqual(['slowed']);
		expect(ids(151)).toEqual(['dead']);
	});

	it('draws the last result for a total above the table, as its "151+" reads', () => {
		expect(ids(190)).toEqual(['dead']);
	});

	it('draws the first result for a total below the table, which a negative modifier gives', () => {
		expect(ids(-5)).toEqual(['nick']);
	});

	it('draws nothing where the table has a gap, or no result', () => {
		expect(ids(60)).toEqual([]);
		expect(criticalInjuryResults([], 50)).toEqual([]);
	});
});
