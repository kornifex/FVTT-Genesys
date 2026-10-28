import { GenesysDie } from '@/dice/dice/GenesysDie';
import { DieFaces } from '@/dice/DieFaces';
import { DieTypes } from '@/dice/DieTypes';
import { GenesysDieFace } from '@/dice/GenesysSymbol';

/**
 * Setback (black) Die
 */
export class SetbackDie extends GenesysDie {
	static override DENOMINATION = DieTypes.Setback.DENOMINATION;
	static override GLYPH = DieTypes.Setback.GLYPH;
	static override FORMULA = DieTypes.Setback.FORMULA;
	static override CATEGORY = DieTypes.Setback.CATEGORY;
	static override COLOR = DieTypes.Setback.COLOR;
	static override FACES: GenesysDieFace[] = DieFaces.Setback;
}
