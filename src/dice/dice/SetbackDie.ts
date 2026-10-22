import { GenesysDie } from '@/dice/dice/GenesysDie';
import { DieFaces } from '@/dice/DieFaces';
import { GenesysDieFace } from '@/dice/GenesysSymbol';

/**
 * Setback (black) Die
 */
export class SetbackDie extends GenesysDie {
	static override DENOMINATION = 's';
	static override GLYPH = 'S';
	static override FORMULA = 'ds' as const;
	static override CATEGORY = 'negative' as const;
	static override COLOR = 'K';
	static override FACES: GenesysDieFace[] = DieFaces.Setback;
}
