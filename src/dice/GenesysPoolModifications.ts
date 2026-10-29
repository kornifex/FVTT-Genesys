/** @file The glyphs of the dice, the symbols and the grade operations, the one place they are spelled out, and how each glyph modifies a dice pool. */

import type { DieName, SymbolName } from '@/dice/DicePool';

// The glyphs are letters of the symbol fonts, which draw a die for an uppercase letter and a symbol for a lowercase
// one, so the same letter can stand for both (`A` an Ability die, `a` an Advantage).

/**
 * The glyph of each die.
 */
export const DIE_GLYPHS = {
	Proficiency: 'P',
	Ability: 'A',
	Boost: 'B',

	Challenge: 'C',
	Difficulty: 'D',
	Setback: 'S',
} as const;

/**
 * The glyph of each symbol.
 */
export const SYMBOL_GLYPHS = {
	Triumph: 't',
	Success: 's',
	Advantage: 'a',

	Despair: 'd',
	Failure: 'f',
	Threat: 'h',
} as const;

/**
 * The glyph of a die face without symbols.
 */
export const BLANK_FACE = ' ';

/**
 * The glyph of each grade operation: upgrading or downgrading a die of the roller's side or of the difficulty's.
 */
export const GRADE_GLYPHS = {
	UpgradeAbility: '^',
	DowngradeAbility: '_',
	UpgradeDifficulty: '*',
	DowngradeDifficulty: '~',
} as const;

/**
 * A glyph that removes a die or a symbol, rather than adding it.
 */
const REMOVAL = '-';

export type DieGradeOperationName = keyof typeof GRADE_GLYPHS;

/**
 * The steps of modifying a dice pool, in the order its modifications apply: adding dice, upgrading them, downgrading
 * them, then removing them (CRB p. 20-23). Symbols are added and removed last, which no rule orders but which doesn't
 * interfere with the dice.
 */
const STEPS = ['addDice', 'upgradeDice', 'downgradeDice', 'removeDice', 'addSymbols', 'removeSymbols'] as const;

type Step = (typeof STEPS)[number];

/**
 * What a glyph does to a dice pool: change the count of one of its dice or symbols, or upgrade or downgrade one of its
 * dice into another.
 */
type PoolOperation =
	| { kind: 'dice'; name: DieName; amount: 1 | -1 }
	| { kind: 'symbols'; name: SymbolName; amount: 1 | -1 }
	| { kind: 'upgrade' | 'downgrade'; from: DieName; to: DieName };

/**
 * How a dice pool modification shows: the die or symbol it applies to, and the Font Awesome icon of its operation.
 */
type PoolModificationIcon = { baseType: 'dice' | 'symbol'; baseName: string; baseGlyph: string; operator: string };

/**
 * A pool modification: what its glyph does to a dice pool, at which step, and how it shows.
 */
type PoolModification = {
	operation: PoolOperation;
	step: Step;
	icon: PoolModificationIcon;
};

/**
 * The grade operations: the die each one upgrades or downgrades, into which die.
 */
const GRADES: Record<DieGradeOperationName, Extract<PoolOperation, { kind: 'upgrade' | 'downgrade' }>> = {
	UpgradeAbility: { kind: 'upgrade', from: 'Ability', to: 'Proficiency' },
	DowngradeAbility: { kind: 'downgrade', from: 'Proficiency', to: 'Ability' },
	UpgradeDifficulty: { kind: 'upgrade', from: 'Difficulty', to: 'Challenge' },
	DowngradeDifficulty: { kind: 'downgrade', from: 'Challenge', to: 'Difficulty' },
};

function entries<K extends string, V>(record: Record<K, V>) {
	return Object.entries(record) as [K, V][];
}

const POOL_MODIFICATIONS: [string, PoolModification][] = [
	...entries(DIE_GLYPHS).flatMap(([name, glyph]): [string, PoolModification][] => [
		[
			glyph,
			{
				operation: { kind: 'dice', name, amount: 1 },
				step: 'addDice',
				icon: { baseType: 'dice', baseName: name, baseGlyph: glyph, operator: 'fa-plus' },
			},
		],
		[
			removalGlyph(glyph),
			{
				operation: { kind: 'dice', name, amount: -1 },
				step: 'removeDice',
				icon: { baseType: 'dice', baseName: name, baseGlyph: glyph, operator: 'fa-minus' },
			},
		],
	]),
	...entries(GRADES).map(([name, grade]): [string, PoolModification] => [
		GRADE_GLYPHS[name],
		{
			operation: grade,
			step: grade.kind === 'upgrade' ? 'upgradeDice' : 'downgradeDice',
			icon: {
				baseType: 'dice',
				baseName: grade.from,
				baseGlyph: DIE_GLYPHS[grade.from],
				operator: grade.kind === 'upgrade' ? 'fa-arrow-up' : 'fa-arrow-down',
			},
		},
	]),
	...entries(SYMBOL_GLYPHS).flatMap(([name, glyph]): [string, PoolModification][] => [
		[
			glyph,
			{
				operation: { kind: 'symbols', name, amount: 1 },
				step: 'addSymbols',
				icon: { baseType: 'symbol', baseName: name, baseGlyph: glyph, operator: 'fa-plus' },
			},
		],
		[
			removalGlyph(glyph),
			{
				operation: { kind: 'symbols', name, amount: -1 },
				step: 'removeSymbols',
				icon: { baseType: 'symbol', baseName: name, baseGlyph: glyph, operator: 'fa-minus' },
			},
		],
	]),
];

/**
 * Every pool modification, by its glyph.
 */
export const GenesysPoolModifications: Record<string, PoolModification> = Object.fromEntries(POOL_MODIFICATIONS);

/**
 * The glyph of the pool modification that removes a die or a symbol, from the glyph that adds it.
 */
export function removalGlyph(glyph: string) {
	return `${REMOVAL}${glyph}`;
}

/**
 * The order of a pool modification's step among the steps of modifying a dice pool.
 */
export function poolModificationStep(glyph: string) {
	return STEPS.indexOf(GenesysPoolModifications[glyph].step);
}

/**
 * The symbol a glyph stands for, if it stands for one.
 */
export function symbolOfGlyph(glyph: string): SymbolName | undefined {
	return entries(SYMBOL_GLYPHS).find(([, symbolGlyph]) => symbolGlyph === glyph)?.[0];
}

function escapeRegExp(text: string) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A pattern for the glyphs of every pool modification. A removal is tried before the glyph it removes.
 */
export const PoolModGlyphPattern = new RegExp(
	`(${Object.keys(GenesysPoolModifications)
		.sort((left, right) => right.length - left.length)
		.map(escapeRegExp)
		.join('|')})`,
	'g',
);
