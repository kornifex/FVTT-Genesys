/**
 * @file Building a dice pool from a characteristic, a skill, a difficulty and pool modifications.
 */

import { DieTypes } from '@/dice/DieTypes';
import { GenesysPoolModifications, PoolModGlyphPattern, poolModificationStep, SYMBOL_GLYPHS } from '@/dice/GenesysPoolModifications';
import { GenesysSymbol } from '@/dice/GenesysSymbol';
import { downgradeDie, upgradeDie } from '@/dice/DieGrades';

type PartialRecord<K extends PropertyKey, T> = Partial<Record<K, T>>;

export type DieName = keyof typeof DieTypes;
export type SymbolName = keyof typeof GenesysSymbol;

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

/**
 * Compare two pool modification glyphs by the step of modifying a dice pool each one applies at.
 */
export function sortPoolModifications(left: string, right: string) {
	return poolModificationStep(left) - poolModificationStep(right);
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
		const { operation } = GenesysPoolModifications[modifierToken];
		switch (operation.kind) {
			case 'upgrade':
				upgradeDie(dicePool.dice, operation.from, operation.to);
				break;

			case 'downgrade':
				downgradeDie(dicePool.dice, operation.from, operation.to);
				break;

			case 'dice':
				changeCount(dicePool.dice, operation.name, operation.amount);
				break;

			case 'symbols':
				changeCount(dicePool.symbols, operation.name, operation.amount);
				break;
		}
	}
}

/**
 * Add a die or a symbol to its part of a dice pool, or remove one, never leaving a negative count.
 */
function changeCount<K extends DieName | SymbolName>(counts: PartialRecord<K, number>, name: K, amount: 1 | -1) {
	if (amount > 0 || counts[name]) {
		counts[name] = amount + (counts[name] ?? 0);
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
			return `${dieAmount}${DieTypes[dieName].FORMULA}${explodeDice}`;
		})
		.join('+');

	return formula === '' ? '0' : formula;
}

/**
 * The symbols of the pool by their glyph, as a roll's data keeps them for its chat message.
 */
export function compileSymbolsData(dicePool: DicePool) {
	return Object.fromEntries(
		Object.entries(dicePool.symbols).map(([symbolName, symbolAmount]) => [SYMBOL_GLYPHS[symbolName as SymbolName], symbolAmount]),
	) as Record<string, number>;
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
	const firstPoolNetSuccesses =
		(firstDicePool.symbols.Success ?? 0) +
		(firstDicePool.symbols.Triumph ?? 0) -
		(firstDicePool.symbols.Failure ?? 0) -
		(firstDicePool.symbols.Despair ?? 0);
	const secondPoolNetSuccesses =
		(secondDicePool.symbols.Success ?? 0) +
		(secondDicePool.symbols.Triumph ?? 0) -
		(secondDicePool.symbols.Failure ?? 0) -
		(secondDicePool.symbols.Despair ?? 0);

	return firstPoolNetSuccesses === secondPoolNetSuccesses;
}
