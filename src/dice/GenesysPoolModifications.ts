import { GenesysDice } from '@/dice';
import { GenesysPoolGradeOperation } from '@/dice/GenesysPoolGradeOperation';
import { GenesysSymbol } from '@/dice/GenesysSymbol';

type PoolEntity = keyof typeof GenesysDice | keyof typeof GenesysSymbol | keyof typeof GenesysPoolGradeOperation;

type PoolModificationData = {
	targetName: PoolEntity;
	icon: { baseType: 'dice' | 'symbol'; baseName: string; baseGlyph: string; operator: string };
	sort: number;
};

// A pattern for glyphs that represent all the possible pool modifications.
export const PoolModGlyphPattern = /(-?[BAPSDCasthfd]|[\^*_~])/g;

const POOL_MODIFICATIONS: [string, PoolModificationData][] = [
	...Object.entries(GenesysDice).map(([dieName, dieType]): [string, PoolModificationData] => [
		dieType.GLYPH,
		{
			targetName: dieName as PoolEntity,
			icon: { baseType: 'dice', baseName: dieName, baseGlyph: dieType.GLYPH, operator: 'fa-plus' },
			sort: 0,
		},
	]),
	[
		GenesysPoolGradeOperation.UpgradeAbility.GLYPH,
		{
			targetName: 'UpgradeAbility',
			icon: { baseType: 'dice', baseName: 'Ability', baseGlyph: GenesysDice['Ability'].GLYPH, operator: 'fa-arrow-up' },
			sort: 1,
		},
	],
	[
		GenesysPoolGradeOperation.UpgradeDifficulty.GLYPH,
		{
			targetName: 'UpgradeDifficulty',
			icon: { baseType: 'dice', baseName: 'Difficulty', baseGlyph: GenesysDice['Difficulty'].GLYPH, operator: 'fa-arrow-up' },
			sort: 1,
		},
	],
	[
		GenesysPoolGradeOperation.DowngradeAbility.GLYPH,
		{
			targetName: 'DowngradeAbility',
			icon: { baseType: 'dice', baseName: 'Proficiency', baseGlyph: GenesysDice['Proficiency'].GLYPH, operator: 'fa-arrow-down' },
			sort: 2,
		},
	],
	[
		GenesysPoolGradeOperation.DowngradeDifficulty.GLYPH,
		{
			targetName: 'DowngradeDifficulty',
			icon: { baseType: 'dice', baseName: 'Challenge', baseGlyph: GenesysDice['Challenge'].GLYPH, operator: 'fa-arrow-down' },
			sort: 2,
		},
	],
	...Object.entries(GenesysDice).map(([dieName, dieType]): [string, PoolModificationData] => [
		`-${dieType.GLYPH}`,
		{
			targetName: dieName as PoolEntity,
			icon: { baseType: 'dice', baseName: dieName, baseGlyph: dieType.GLYPH, operator: 'fa-minus' },
			sort: 3,
		},
	]),
	...Object.entries(GenesysSymbol).map(([symbolName, symbolType]): [string, PoolModificationData] => [
		symbolType.GLYPH,
		{
			targetName: symbolName as PoolEntity,
			icon: { baseType: 'symbol', baseName: symbolName, baseGlyph: symbolType.GLYPH, operator: 'fa-plus' },
			sort: 4,
		},
	]),
	...Object.entries(GenesysSymbol).map(([symbolName, symbolType]): [string, PoolModificationData] => [
		`-${symbolType.GLYPH}`,
		{
			targetName: symbolName as PoolEntity,
			icon: { baseType: 'symbol', baseName: symbolName, baseGlyph: symbolType.GLYPH, operator: 'fa-minus' },
			sort: 5,
		},
	]),
];

export const GenesysPoolModifications: Record<string, PoolModificationData> = Object.fromEntries(POOL_MODIFICATIONS);
