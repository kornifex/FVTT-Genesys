/** @file The glyphs of the dice, the symbols and the grade operations, the one place they are spelled out, how each glyph modifies a dice pool, and how glyphs read in words. */

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

/**
 * The name of a grade operation, such as `UpgradeAbility`.
 */
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

/**
 * The die a glyph stands for, if it stands for one.
 */
function dieOfGlyph(glyph: string): DieName | undefined {
	return entries(DIE_GLYPHS).find(([, dieGlyph]) => dieGlyph === glyph)?.[0];
}

/**
 * A die or a symbol, counted, or a die face without symbols: what a label names.
 */
type GlyphCount = { kind: 'die'; name: DieName; count: number } | { kind: 'symbol'; name: SymbolName; count: number } | { kind: 'blank' };

/**
 * What a group of Pool Modifications does: add, remove, upgrade or downgrade a number of one die or symbol.
 */
type PoolModificationCount = {
	operation: 'Add' | 'Remove' | 'Upgrade' | 'Downgrade';
	target: Extract<GlyphCount, { count: number }>;
};

/**
 * The dice, symbols and blank faces of a text of glyphs, each counted once in the order it first appears. A glyph that
 * stands for none of them, as the digits of a `@sym` enricher, is left out.
 */
export function glyphCounts(glyphs: string): GlyphCount[] {
	const counts: GlyphCount[] = [];
	for (const glyph of glyphs) {
		const found = countOfGlyph(glyph);
		const counted = found && counts.find((count) => nameOf(count) === nameOf(found));
		if (counted && counted.kind !== 'blank') {
			counted.count += 1;
		} else if (found && !counted) {
			counts.push(found);
		}
	}

	return counts;
}

/**
 * The die, symbol or blank face one glyph stands for, counted once.
 */
function countOfGlyph(glyph: string): GlyphCount | undefined {
	const die = dieOfGlyph(glyph);
	if (die) {
		return { kind: 'die', name: die, count: 1 };
	}

	const symbol = symbolOfGlyph(glyph);
	if (symbol) {
		return { kind: 'symbol', name: symbol, count: 1 };
	}

	return glyph === BLANK_FACE ? { kind: 'blank' } : undefined;
}

/**
 * The name of a die or a symbol counted, none for a blank face: no die and no symbol share a name.
 */
function nameOf(count: GlyphCount) {
	return count.kind === 'blank' ? undefined : count.name;
}

/**
 * What a Pool Modification does to its die or symbol.
 */
function modificationOf({ operation }: PoolModification): PoolModificationCount {
	switch (operation.kind) {
		case 'dice':
			return { operation: operation.amount > 0 ? 'Add' : 'Remove', target: { kind: 'die', name: operation.name, count: 1 } };

		case 'symbols':
			return { operation: operation.amount > 0 ? 'Add' : 'Remove', target: { kind: 'symbol', name: operation.name, count: 1 } };

		case 'upgrade':
		case 'downgrade':
			return {
				operation: operation.kind === 'upgrade' ? 'Upgrade' : 'Downgrade',
				target: { kind: 'die', name: operation.from, count: 1 },
			};
	}
}

/**
 * The Pool Modifications of a list of glyphs, those doing the same to the same die or symbol counted once, in the order
 * the first of them appears. A glyph that is no Pool Modification is left out.
 */
export function poolModificationCounts(glyphs: readonly string[]): PoolModificationCount[] {
	const counts: PoolModificationCount[] = [];
	for (const glyph of glyphs) {
		const modification = GenesysPoolModifications[glyph] as PoolModification | undefined;
		if (!modification) {
			continue;
		}

		const { operation, target } = modificationOf(modification);
		const counted = counts.find((count) => count.operation === operation && count.target.name === target.name);
		if (counted) {
			counted.target.count += 1;
		} else {
			counts.push({ operation, target });
		}
	}

	return counts;
}

/**
 * The localization functions a label is worded with: the plural category of a count picks the form of a die's or
 * symbol's name, and the list formatter joins the names.
 */
export type GlyphLocalizer = {
	localize(key: string): string;
	format(key: string, data: Record<string, string>): string;
	pluralRules: Pick<Intl.PluralRules, 'select'>;
	listFormatter: Pick<Intl.ListFormat, 'format'>;
};

/**
 * The start of the localization keys of each die's and symbol's name, followed by `one` or `other`.
 */
const NAME_KEYS: Record<DieName | SymbolName, string> = {
	Proficiency: 'Genesys.Symbols.Proficiency.',
	Ability: 'Genesys.Symbols.Ability.',
	Boost: 'Genesys.Symbols.Boost.',
	Challenge: 'Genesys.Symbols.Challenge.',
	Difficulty: 'Genesys.Symbols.Difficulty.',
	Setback: 'Genesys.Symbols.Setback.',
	Triumph: 'Genesys.Symbols.Triumph.',
	Success: 'Genesys.Symbols.Success.',
	Advantage: 'Genesys.Symbols.Advantage.',
	Despair: 'Genesys.Symbols.Despair.',
	Failure: 'Genesys.Symbols.Failure.',
	Threat: 'Genesys.Symbols.Threat.',
};

/**
 * The localization key of each die's name alone, as Dice So Nice names its colorsets.
 */
const DIE_KEYS: Record<DieName, string> = {
	Proficiency: 'Genesys.DiceColors.Proficiency',
	Ability: 'Genesys.DiceColors.Ability',
	Boost: 'Genesys.DiceColors.Boost',
	Challenge: 'Genesys.DiceColors.Challenge',
	Difficulty: 'Genesys.DiceColors.Difficulty',
	Setback: 'Genesys.DiceColors.Setback',
};

/**
 * The localization key of each operation of a Pool Modification.
 */
const OPERATION_KEYS: Record<PoolModificationCount['operation'], string> = {
	Add: 'Genesys.Glyphs.Operations.Add',
	Remove: 'Genesys.Glyphs.Operations.Remove',
	Upgrade: 'Genesys.Glyphs.Operations.Upgrade',
	Downgrade: 'Genesys.Glyphs.Operations.Downgrade',
};

function countLabel(count: GlyphCount, i18n: GlyphLocalizer) {
	if (count.kind === 'blank') {
		return i18n.localize('Genesys.Glyphs.BlankFace');
	}

	// The language files give the forms `one` and `other`, which is all the languages they hold need.
	const form = i18n.pluralRules.select(count.count) === 'one' ? 'one' : 'other';
	return i18n.format(`${NAME_KEYS[count.name]}${form}`, { count: String(count.count) });
}

/**
 * A text of glyphs in words, as a screen reader and a tooltip read it: "2 Successes, 1 Advantage". Empty when the text
 * holds no die, symbol or blank face.
 */
export function glyphLabel(glyphs: string, i18n: GlyphLocalizer): string {
	return i18n.listFormatter.format(glyphCounts(glyphs).map((count) => countLabel(count, i18n)));
}

/**
 * The glyphs of Pool Modifications in words: "Upgrade 1 Ability die". Empty when none of them is a Pool Modification.
 */
export function poolModificationLabel(glyphs: readonly string[], i18n: GlyphLocalizer): string {
	return i18n.listFormatter.format(
		poolModificationCounts(glyphs).map(({ operation, target }) =>
			i18n.format(OPERATION_KEYS[operation], { glyphs: countLabel(target, i18n) }),
		),
	);
}

/**
 * A die rolled, in words: the die, then the symbols of its face, "Ability Die: 1 Success, 1 Advantage".
 */
export function dieResultLabel(die: DieName, face: string, i18n: GlyphLocalizer): string {
	return i18n.format('Genesys.Glyphs.DieResult', { die: i18n.localize(DIE_KEYS[die]), face: glyphLabel(face, i18n) });
}

/**
 * The localization functions of the user's language.
 */
export function worldGlyphLocalizer(): GlyphLocalizer {
	return {
		localize: (key) => game.i18n.localize(key),
		format: (key, data) => game.i18n.format(key, data),
		// v13: Localization has no plural rules of its own.
		pluralRules: (game.i18n as { pluralRules?: Intl.PluralRules }).pluralRules ?? new Intl.PluralRules(game.i18n.lang),
		// Foundry's narrow list separates every item with a comma in English and French, without a closing "and".
		listFormatter: game.i18n.getListFormatter({ style: 'narrow' }),
	};
}

/**
 * The attributes of an element holding glyphs, which give it its label: an image to a screen reader, which reads the
 * label instead of the letters the glyphs are, and the label as its tooltip, which Foundry takes from `aria-label` when
 * `data-tooltip` is empty. None for an empty label.
 */
export function glyphAttributes(label: string): Record<string, string> {
	return label ? { role: 'img', 'aria-label': label, 'data-tooltip': '' } : {};
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * The attributes of an element holding glyphs, as HTML to write in its tag.
 */
export function glyphAttributesHTML(label: string): string {
	return Object.entries(glyphAttributes(label))
		.map(([name, value]) => `${name}="${value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character])}"`)
		.join(' ');
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
