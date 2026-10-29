import { GenesysDie } from '@/dice/dice/GenesysDie';
import { DieFaces } from '@/dice/DieFaces';
import { DieTypes } from '@/dice/DieTypes';

/**
 * Boost (blue) Die
 */
export class BoostDie extends GenesysDie {
	static override DENOMINATION = DieTypes.Boost.DENOMINATION;
	static override GLYPH = DieTypes.Boost.GLYPH;
	static override FORMULA = DieTypes.Boost.FORMULA;
	static override CATEGORY = DieTypes.Boost.CATEGORY;
	static override COLOR = DieTypes.Boost.COLOR;
	static override FACES: string[] = DieFaces.Boost;
}
