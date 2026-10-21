/**
 * @file Building a dice pool from a characteristic, a skill, a difficulty and pool modifications.
 */

import { GenesysDice } from '@/dice';
import { GenesysPoolGradeOperation } from '@/dice/types/GenesysPoolGradeOperation';
import { GenesysPoolModifications, PoolModGlyphPattern } from '@/dice/types/GenesysPoolModifications';
import { GenesysSymbol } from '@/dice/types/GenesysSymbol';

type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

export type DieName = keyof typeof GenesysDice;
export type SymbolName = keyof typeof GenesysSymbol;
export type DieGradeOperationName = keyof typeof GenesysPoolGradeOperation;
type SimplePoolEntity = DieName | SymbolName;
type PoolEntity = SimplePoolEntity | DieGradeOperationName;

export type DicePool = {
	dice: PartialRecord<DieName, number>;
	symbols: PartialRecord<SymbolName, number>;
	usesSuperCharacteristic: boolean;
};

export type DicePoolModifications = {
	baseDifficulty: string[];
	manualChanges: string[];
	effects: Array<{
		name: string;
		enabled: boolean;
		mods: string[];
	}>;
};

/**
 * What a dice pool is built from.
 */
export type DicePoolInputs = {
	/**
	 * Value of the characteristic used for the check, 0 without one.
	 */
	characteristicValue: number;

	/**
	 * Ranks in the skill used for the check, 0 without one or for an Unranked Skill Check.
	 */
	skillRank: number;

	/**
	 * Whether the Proficiency dice of the pool explode, as they do with a super-characteristic.
	 */
	usesSuperCharacteristic: boolean;

	/**
	 * Pool modifications coming from the difficulty, the manual changes and the effects.
	 */
	modifications: DicePoolModifications;
};

// Helper function for sorting dice pool modifications. These are sorted according to the steps used for modifying a
// dice pool:
//  1- Adding dice
//  2- Upgrading dice
//  3- Downgrading dice
//  4- Removing dice
//  5- Adding symbols (this is not a formal step but adding it here is done for convenience since it doesn't interfere)
//  6- Removing symbols (see above)
export function sortPoolModifications(left: string, right: string) {
	return GenesysPoolModifications[left].sort - GenesysPoolModifications[right].sort;
}

/**
 * Extract the pool modification glyphs from a text, sorted in the order they are applied to a dice pool.
 */
export function parsePoolModifications(text: string) {
	return text.match(PoolModGlyphPattern)?.sort(sortPoolModifications) ?? [];
}

/**
 * Apply each pool modification to the dice pool, in the order given.
 */
export function applyDicePoolModifications(dicePool: DicePool, modifierTokens: string[]) {
	for (const modifierToken of modifierTokens) {
		if (modifierToken === '^' || modifierToken === '*') {
			const [baseDice, upgradeDice]: DieName[] = modifierToken === '^' ? ['Ability', 'Proficiency'] : ['Difficulty', 'Challenge'];
			if (dicePool.dice[baseDice]) {
				dicePool.dice[baseDice]!--;
				dicePool.dice[upgradeDice] = 1 + (dicePool.dice[upgradeDice] ?? 0);
			} else {
				dicePool.dice[baseDice] = 1 + (dicePool.dice[baseDice] ?? 0);
			}
		} else if (modifierToken === '_' || modifierToken === '~') {
			const [baseDice, downgradeDice]: DieName[] = modifierToken === '_' ? ['Proficiency', 'Ability'] : ['Challenge', 'Difficulty'];
			if (dicePool.dice[baseDice]) {
				dicePool.dice[baseDice]!--;
				dicePool.dice[downgradeDice] = 1 + (dicePool.dice[downgradeDice] ?? 0);
			}
		} else {
			// If we reach this branch then the glyph is for a dice or symbol.
			let targetEntity = modifierToken;
			let direction = 1;

			// If the glyph has two characters then the first one is signaling a removal.
			if (modifierToken.length === 2) {
				targetEntity = modifierToken[1];
				direction = -1;
			}

			// Check which sub pool we want to modify. Note that dice glyphs are always uppercase letters while symbols
			// use lowercase letters.
			const targetSubPool: PartialRecord<PoolEntity, number> = targetEntity === targetEntity.toUpperCase() ? dicePool.dice : dicePool.symbols;
			const entityName = GenesysPoolModifications[targetEntity].targetName;

			// Do not let the number of dice or symbols be a negative value.
			if (direction > 0 || targetSubPool[entityName]) {
				targetSubPool[entityName] = direction + (targetSubPool[entityName] ?? 0);
			}
		}
	}
}

/**
 * Build the dice pool of a check.
 */
export function buildDicePool({ characteristicValue, skillRank, usesSuperCharacteristic, modifications }: DicePoolInputs): DicePool {
	// Step 1: Applying Skills and Characteristics
	const proficiencyDice = Math.min(characteristicValue, skillRank);
	const abilityDice = Math.max(characteristicValue, skillRank) - proficiencyDice;

	const dicePool: DicePool = {
		dice: {
			Proficiency: proficiencyDice,
			Ability: abilityDice,
		},
		symbols: {},
		usesSuperCharacteristic,
	};

	// Step 2: Applying Task Difficulty
	applyDicePoolModifications(dicePool, modifications.baseDifficulty);

	// Step 3: Modifying a Dice Pool
	const activeModifications = [...modifications.manualChanges];
	modifications.effects.forEach((effect) => {
		if (effect.enabled) {
			activeModifications.push(...effect.mods);
		}
	});

	// We sort the modifications so that they follow the proper sub-steps when applied to the dice pool.
	applyDicePoolModifications(dicePool, activeModifications.sort(sortPoolModifications));

	return dicePool;
}

/**
 * Compile the dice of the pool into a roll formula.
 */
export function compileDiceFormula(dicePool: DicePool) {
	const usesSuperCharacteristic = dicePool.usesSuperCharacteristic;
	const formula = Object.entries(dicePool.dice)
		.map(([dieKey, dieAmount]) => {
			const dieName = dieKey as DieName;
			const explodeDice = dieName === 'Proficiency' && usesSuperCharacteristic ? 'X' : '';
			return `${dieAmount}${GenesysDice[dieName].FORMULA}${explodeDice}`;
		})
		.join('+');

	return formula === '' ? '0' : formula;
}

// Convert the symbols object into the old format to make the GenesysRoller understand it.
// A refactor of said class should get rid of this method.
export function compileSymbolsData(dicePool: DicePool) {
	return Object.entries(dicePool.symbols).reduce(
		(accum, [symbolName, symbolAmount]) => {
			accum[GenesysSymbol[symbolName as SymbolName].GLYPH] = symbolAmount;
			return accum;
		},
		{} as Record<string, number>,
	);
}

/**
 * Whether two dice pools have the same chance to succeed, so that it needs not be computed again.
 */
export function hasSameChanceToSucceed(firstDicePool: DicePool, secondDicePool: DicePool) {
	// Dice always contribute to the success rate so any difference implies the pools have different probabilities.
	const diceTypes = new Set([...Object.keys(firstDicePool.dice), ...Object.keys(secondDicePool.dice)]);
	for (const diceType of diceTypes) {
		if ((firstDicePool.dice[diceType as DieName] ?? 0) !== (secondDicePool.dice[diceType as DieName] ?? 0)) {
			return false;
		}
	}

	// Even if the dice on both pools are the same a discrepancy in super-characteristics will yield different results.
	if (firstDicePool.usesSuperCharacteristic !== secondDicePool.usesSuperCharacteristic) {
		return false;
	}

	// Advantages and threats do not impact the chance to succeed so we ignore them.
	const firstPoolNetSuccesses = (firstDicePool.symbols.Success ?? 0) + (firstDicePool.symbols.Triumph ?? 0) - (firstDicePool.symbols.Failure ?? 0) - (firstDicePool.symbols.Despair ?? 0);
	const secondPoolNetSuccesses = (secondDicePool.symbols.Success ?? 0) + (secondDicePool.symbols.Triumph ?? 0) - (secondDicePool.symbols.Failure ?? 0) - (secondDicePool.symbols.Despair ?? 0);

	return firstPoolNetSuccesses === secondPoolNetSuccesses;
}
