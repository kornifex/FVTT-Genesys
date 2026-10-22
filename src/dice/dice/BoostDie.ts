import { GenesysDie } from '@/dice/dice/GenesysDie';
import { DieFaces } from '@/dice/DieFaces';
import { GenesysDieFace } from '@/dice/GenesysSymbol';

/**
 * Boost (blue) Die
 */
export class BoostDie extends GenesysDie {
	static override DENOMINATION = 'b';
	static override GLYPH = 'B';
	static override FORMULA = 'db' as const;
	static override CATEGORY = 'positive' as const;
	static override COLOR = 'B';
	static override FACES: GenesysDieFace[] = DieFaces.Boost;
}
