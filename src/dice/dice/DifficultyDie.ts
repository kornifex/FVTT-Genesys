import { GenesysDie } from '@/dice/dice/GenesysDie';
import { DieFaces } from '@/dice/DieFaces';
import { GenesysDieFace } from '@/dice/GenesysSymbol';

/**
 * Difficulty (purple) Die
 */
export class DifficultyDie extends GenesysDie {
	static override DENOMINATION = 'i';
	static override GLYPH = 'D';
	static override FORMULA = 'di' as const;
	static override CATEGORY = 'negative' as const;
	static override COLOR = 'P';
	static override FACES: GenesysDieFace[] = DieFaces.Difficulty;
}
