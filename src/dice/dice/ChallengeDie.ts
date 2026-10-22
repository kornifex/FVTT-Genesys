import { GenesysDie } from '@/dice/dice/GenesysDie';
import { GenesysDieFace } from '@/dice/GenesysSymbol';

/**
 * Challenge (red) Die
 */
export class ChallengeDie extends GenesysDie {
	static override DENOMINATION = 'c';
	static override GLYPH = 'C';
	static override FORMULA = 'dc' as const;
	static override CATEGORY = 'negative' as const;
	static override COLOR = 'R';
	static override FACES: GenesysDieFace[] = [' ', 'f', 'f', 'ff', 'ff', 'h', 'h', 'fh', 'fh', 'hh', 'hh', 'd'];
}
