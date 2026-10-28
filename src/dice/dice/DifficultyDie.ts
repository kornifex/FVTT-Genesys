import { GenesysDie } from '@/dice/dice/GenesysDie';
import { DieFaces } from '@/dice/DieFaces';
import { DieTypes } from '@/dice/DieTypes';
import { GenesysDieFace } from '@/dice/GenesysSymbol';

/**
 * Difficulty (purple) Die
 */
export class DifficultyDie extends GenesysDie {
	static override DENOMINATION = DieTypes.Difficulty.DENOMINATION;
	static override GLYPH = DieTypes.Difficulty.GLYPH;
	static override FORMULA = DieTypes.Difficulty.FORMULA;
	static override CATEGORY = DieTypes.Difficulty.CATEGORY;
	static override COLOR = DieTypes.Difficulty.COLOR;
	static override FACES: GenesysDieFace[] = DieFaces.Difficulty;
}
