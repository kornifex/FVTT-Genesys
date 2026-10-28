/**
 * @file Tests for building a dice pool and compiling it into a roll.
 */

import { describe, expect, it } from 'vitest';

import {
	applyDicePoolModifications,
	buildDicePool,
	compileDiceFormula,
	compileSymbolsData,
	DicePool,
	DicePoolInputs,
	DicePoolModifications,
	hasSameChanceToSucceed,
	parsePoolModifications,
	sortPoolModifications,
} from '@/dice/DicePool';

type PoolInputs = Partial<Omit<DicePoolInputs, 'modifications'>> & Partial<DicePoolModifications>;

/**
 * Build a dice pool, every input defaulting to nothing.
 */
function pool({
	characteristicValue = 0,
	skillRank = 0,
	usesSuperCharacteristic = false,
	baseDifficulty = [],
	manualChanges = [],
	effects = [],
}: PoolInputs = {}) {
	return buildDicePool({
		characteristicValue,
		skillRank,
		usesSuperCharacteristic,
		modifications: { baseDifficulty, manualChanges, effects },
	});
}

function emptyPool(): DicePool {
	return { dice: {}, symbols: {}, usesSuperCharacteristic: false };
}

describe('buildDicePool', () => {
	describe('Step 1: skills and characteristics (CRB p. 19)', () => {
		it('adds Ability dice up to the higher value and upgrades as many as the lower value, as for Kendra and Katie (Examples 1-2)', () => {
			expect(pool({ characteristicValue: 3, skillRank: 2 }).dice).toEqual({ Proficiency: 2, Ability: 1 });
			expect(pool({ characteristicValue: 2, skillRank: 3 }).dice).toEqual({ Proficiency: 2, Ability: 1 });
		});

		it('only upgrades when the characteristic and the skill are equal', () => {
			expect(pool({ characteristicValue: 3, skillRank: 3 }).dice).toEqual({ Proficiency: 3, Ability: 0 });
		});

		it('only adds Ability dice without ranks in the skill, the lower value being zero, as for Rex (Example 3)', () => {
			expect(pool({ characteristicValue: 2 }).dice).toEqual({ Proficiency: 0, Ability: 2 });
			expect(pool({ characteristicValue: 3 }).dice).toEqual({ Proficiency: 0, Ability: 3 });
		});

		it('adds Ability dice for the skill ranks with a characteristic of zero', () => {
			expect(pool({ skillRank: 2 }).dice).toEqual({ Proficiency: 0, Ability: 2 });
		});

		it('starts with no dice and no symbols without a characteristic or a skill', () => {
			expect(pool()).toEqual({ dice: { Proficiency: 0, Ability: 0 }, symbols: {}, usesSuperCharacteristic: false });
		});

		it('keeps whether the pool uses a super-characteristic', () => {
			expect(pool({ usesSuperCharacteristic: true }).usesSuperCharacteristic).toBe(true);
			expect(pool({ usesSuperCharacteristic: false }).usesSuperCharacteristic).toBe(false);
		});
	});

	describe('Step 2: task difficulty (CRB p. 16-20)', () => {
		it('adds the Difficulty dice of the difficulty', () => {
			expect(pool({ characteristicValue: 2, baseDifficulty: ['D', 'D'] }).dice).toEqual({
				Proficiency: 0,
				Ability: 2,
				Difficulty: 2,
			});
		});

		it('upgrades the Difficulty dice of the difficulty', () => {
			expect(pool({ baseDifficulty: ['D', 'D', 'D', '*'] }).dice).toEqual({
				Proficiency: 0,
				Ability: 0,
				Difficulty: 2,
				Challenge: 1,
			});
		});

		it('applies the difficulty in the order given', () => {
			// An upgrade given first finds no Difficulty die and adds one, so callers sort the difficulty beforehand.
			expect(pool({ baseDifficulty: ['*', 'D', 'D'] }).dice).toEqual({ Proficiency: 0, Ability: 0, Difficulty: 3 });
		});

		it('applies the difficulty with the basic pool, before the other modifications (CRB p. 20)', () => {
			// The downgrade comes after the difficulty's upgrade even though it would be sorted before an added die.
			expect(pool({ baseDifficulty: ['D', '*'], manualChanges: ['~'] }).dice).toEqual({
				Proficiency: 0,
				Ability: 0,
				Difficulty: 1,
				Challenge: 0,
			});
		});
	});

	describe('Step 3: modifying the dice pool, in the order add, upgrade, downgrade, remove (CRB p. 20-23)', () => {
		it('adds dice before upgrading them', () => {
			expect(pool({ manualChanges: ['^', 'A'] }).dice).toEqual({ Proficiency: 1, Ability: 0 });
			expect(pool({ manualChanges: ['*', 'D'] }).dice).toEqual({ Proficiency: 0, Ability: 0, Difficulty: 0, Challenge: 1 });
		});

		it('upgrades dice before downgrading them', () => {
			expect(pool({ characteristicValue: 2, manualChanges: ['_', '^'] }).dice).toEqual({ Proficiency: 0, Ability: 2 });
			expect(pool({ baseDifficulty: ['D'], manualChanges: ['~', '*'] }).dice).toEqual({
				Proficiency: 0,
				Ability: 0,
				Difficulty: 1,
				Challenge: 0,
			});
		});

		it('downgrades dice before removing them', () => {
			expect(pool({ characteristicValue: 1, skillRank: 1, manualChanges: ['-A', '_'] }).dice).toEqual({ Proficiency: 0, Ability: 0 });
		});

		it('adds dice before removing them', () => {
			expect(pool({ manualChanges: ['-B', 'B'] }).dice).toEqual({ Proficiency: 0, Ability: 0, Boost: 0 });
		});

		it("adds Boost and Setback dice, which don't cancel each other (CRB p. 21)", () => {
			expect(pool({ manualChanges: ['B', 'B', 'S'] }).dice).toEqual({ Proficiency: 0, Ability: 0, Boost: 2, Setback: 1 });
		});

		it('adds symbols before removing them', () => {
			expect(pool({ manualChanges: ['-s', 's'] }).symbols).toEqual({ Success: 0 });
		});

		it('applies the enabled effects with the manual changes, sorted together', () => {
			const effects = [{ name: 'Self: Talent', enabled: true, mods: ['A'] }];
			expect(pool({ manualChanges: ['^'], effects }).dice).toEqual({ Proficiency: 1, Ability: 0 });
		});

		it('ignores the disabled effects', () => {
			const effects = [
				{ name: 'Self: Talent', enabled: false, mods: ['B', 'B'] },
				{ name: 'Target: Ranged Defense', enabled: true, mods: ['S'] },
			];
			expect(pool({ effects }).dice).toEqual({ Proficiency: 0, Ability: 0, Setback: 1 });
		});

		it('leaves the modifications it is given untouched', () => {
			const modifications: DicePoolModifications = {
				baseDifficulty: ['D'],
				manualChanges: ['^', 'A'],
				effects: [{ name: 'Self: Talent', enabled: true, mods: ['-s', 's'] }],
			};
			buildDicePool({ characteristicValue: 2, skillRank: 1, usesSuperCharacteristic: false, modifications });

			expect(modifications).toEqual({
				baseDifficulty: ['D'],
				manualChanges: ['^', 'A'],
				effects: [{ name: 'Self: Talent', enabled: true, mods: ['-s', 's'] }],
			});
		});
	});

	it('builds a full check', () => {
		// Agility 3, Ranged 1, Average difficulty, an Aim Boost die, a talent upgrading the check and a target's Setback die.
		const result = pool({
			characteristicValue: 3,
			skillRank: 1,
			baseDifficulty: ['D', 'D'],
			manualChanges: ['B'],
			effects: [
				{ name: 'Self: Talent', enabled: true, mods: ['^'] },
				{ name: 'Target: Ranged Defense', enabled: true, mods: ['S'] },
			],
		});

		expect(result.dice).toEqual({ Proficiency: 2, Ability: 1, Difficulty: 2, Boost: 1, Setback: 1 });
		expect(result.symbols).toEqual({});
	});
});

describe('applyDicePoolModifications', () => {
	it('adds an Ability die when upgrading without one (CRB p. 22)', () => {
		const dicePool = emptyPool();
		applyDicePoolModifications(dicePool, ['^']);

		expect(dicePool.dice).toEqual({ Ability: 1 });
	});

	it('adds an Ability die when upgrading a pool of Proficiency dice only (CRB p. 22)', () => {
		const dicePool: DicePool = { ...emptyPool(), dice: { Proficiency: 2, Ability: 0 } };
		applyDicePoolModifications(dicePool, ['^']);

		expect(dicePool.dice).toEqual({ Proficiency: 2, Ability: 1 });
	});

	it('upgrades the Ability die that a previous upgrade added (CRB p. 22)', () => {
		const dicePool = emptyPool();
		applyDicePoolModifications(dicePool, ['^', '^']);

		expect(dicePool.dice).toEqual({ Ability: 0, Proficiency: 1 });
	});

	it('adds a Difficulty die when upgrading without one (CRB p. 22)', () => {
		const dicePool = emptyPool();
		applyDicePoolModifications(dicePool, ['*']);

		expect(dicePool.dice).toEqual({ Difficulty: 1 });
	});

	it('downgrades a Proficiency die into an Ability die (CRB p. 22)', () => {
		const dicePool: DicePool = { ...emptyPool(), dice: { Proficiency: 2, Ability: 1 } };
		applyDicePoolModifications(dicePool, ['_']);

		expect(dicePool.dice).toEqual({ Proficiency: 1, Ability: 2 });
	});

	it('downgrades a Challenge die into a Difficulty die (CRB p. 22)', () => {
		const dicePool: DicePool = { ...emptyPool(), dice: { Challenge: 1 } };
		applyDicePoolModifications(dicePool, ['~']);

		expect(dicePool.dice).toEqual({ Challenge: 0, Difficulty: 1 });
	});

	it('ignores a downgrade without a die to downgrade (CRB p. 22)', () => {
		const dicePool: DicePool = { ...emptyPool(), dice: { Proficiency: 0, Ability: 2, Difficulty: 1 } };
		applyDicePoolModifications(dicePool, ['_', '~']);

		expect(dicePool.dice).toEqual({ Proficiency: 0, Ability: 2, Difficulty: 1 });
	});

	it('removes dice down to zero and ignores the removals past them (CRB p. 23)', () => {
		const dicePool: DicePool = { ...emptyPool(), dice: { Proficiency: 0, Ability: 1 } };
		applyDicePoolModifications(dicePool, ['-A', '-A', '-P', '-S']);

		expect(dicePool.dice).toEqual({ Proficiency: 0, Ability: 0 });
	});

	it('adds and removes symbols without touching the dice', () => {
		const dicePool = emptyPool();
		applyDicePoolModifications(dicePool, ['s', 's', 'a', 't', 'h', 'f', 'd', '-s', '-h', '-h']);

		expect(dicePool.dice).toEqual({});
		expect(dicePool.symbols).toEqual({ Success: 1, Advantage: 1, Triumph: 1, Threat: 0, Failure: 1, Despair: 1 });
	});

	it('tells the Ability die from the Advantage symbol and the Despair symbol from the Difficulty die', () => {
		const dicePool = emptyPool();
		applyDicePoolModifications(dicePool, ['A', 'a', 'D', 'd']);

		expect(dicePool.dice).toEqual({ Ability: 1, Difficulty: 1 });
		expect(dicePool.symbols).toEqual({ Advantage: 1, Despair: 1 });
	});

	it('never removes a symbol that is not there', () => {
		const dicePool = emptyPool();
		applyDicePoolModifications(dicePool, ['-f']);

		expect(dicePool.symbols).toEqual({});
	});
});

describe('parsePoolModifications', () => {
	it('reads every glyph of a difficulty', () => {
		expect(parsePoolModifications('DD')).toEqual(['D', 'D']);
	});

	it('sorts the glyphs in the order they apply to a dice pool', () => {
		expect(parsePoolModifications('-ht_s-A^B')).toEqual(['B', '^', '_', '-A', 't', 's', '-h']);
	});

	it('ignores what is not a pool modification', () => {
		expect(parsePoolModifications('D, D x')).toEqual(['D', 'D']);
		expect(parsePoolModifications('-')).toEqual([]);
	});

	it('reads nothing from an empty text', () => {
		expect(parsePoolModifications('')).toEqual([]);
	});
});

describe('sortPoolModifications', () => {
	it('keeps the order of the modifications of a same step', () => {
		expect(['s', 'B', 'a', 'D', 'A'].sort(sortPoolModifications)).toEqual(['B', 'D', 'A', 's', 'a']);
	});

	it('puts upgrades of either die before downgrades of either die (CRB p. 22-23)', () => {
		expect(['~', '_', '*', '^'].sort(sortPoolModifications)).toEqual(['*', '^', '~', '_']);
	});
});

describe('compileDiceFormula', () => {
	it('compiles each die into its formula term', () => {
		expect(
			compileDiceFormula({ ...emptyPool(), dice: { Proficiency: 2, Ability: 1, Boost: 1, Difficulty: 2, Challenge: 1, Setback: 3 } }),
		).toBe('2dp+1da+1db+2di+1dc+3ds');
	});

	it('keeps the terms of the dice that are not in the pool anymore', () => {
		expect(compileDiceFormula(pool({ manualChanges: ['B', '-B'] }))).toBe('0dp+0da+0db');
	});

	it('explodes the Proficiency dice, and only them, with a super-characteristic (CRB p. 251)', () => {
		expect(compileDiceFormula({ ...emptyPool(), dice: { Proficiency: 2, Ability: 1 }, usesSuperCharacteristic: true })).toBe(
			'2dpX+1da',
		);
	});

	it('compiles a pool without dice into an empty roll', () => {
		expect(compileDiceFormula(emptyPool())).toBe('0');
	});
});

describe('compileSymbolsData', () => {
	it('counts the symbols by glyph', () => {
		expect(compileSymbolsData({ ...emptyPool(), symbols: { Success: 2, Threat: 1, Triumph: 0 } })).toEqual({ s: 2, h: 1, t: 0 });
	});

	it('compiles a pool without symbols into no symbols', () => {
		expect(compileSymbolsData(pool({ characteristicValue: 2 }))).toEqual({});
	});
});

describe('hasSameChanceToSucceed', () => {
	it('holds for pools with the same dice', () => {
		expect(hasSameChanceToSucceed(pool({ characteristicValue: 2 }), pool({ characteristicValue: 2 }))).toBe(true);
	});

	it('counts a missing die as none', () => {
		expect(hasSameChanceToSucceed({ ...emptyPool(), dice: { Ability: 2, Boost: 0 } }, { ...emptyPool(), dice: { Ability: 2 } })).toBe(
			true,
		);
	});

	it('fails for pools with different dice', () => {
		expect(hasSameChanceToSucceed(pool({ characteristicValue: 2 }), pool({ characteristicValue: 2, skillRank: 1 }))).toBe(false);
	});

	it('fails when only one pool uses a super-characteristic', () => {
		expect(
			hasSameChanceToSucceed(
				pool({ characteristicValue: 2, skillRank: 2 }),
				pool({ characteristicValue: 2, skillRank: 2, usesSuperCharacteristic: true }),
			),
		).toBe(false);
	});

	it('ignores advantages and threats', () => {
		expect(hasSameChanceToSucceed(pool({ manualChanges: ['A', 'a'] }), pool({ manualChanges: ['A', 'h', 'h'] }))).toBe(true);
	});

	it('compares the net successes of the symbols', () => {
		expect(hasSameChanceToSucceed(pool({ manualChanges: ['A', 's'] }), pool({ manualChanges: ['A', 't'] }))).toBe(true);
		expect(hasSameChanceToSucceed(pool({ manualChanges: ['A', 's', 'f'] }), pool({ manualChanges: ['A'] }))).toBe(true);
		expect(hasSameChanceToSucceed(pool({ manualChanges: ['A', 's'] }), pool({ manualChanges: ['A', 'd'] }))).toBe(false);
	});
});
