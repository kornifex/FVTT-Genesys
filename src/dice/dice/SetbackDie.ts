import GenesysDie from '@/dice/dice/GenesysDie';
import { GenesysDieFace } from '@/dice/GenesysSymbol';

/**
 * Setback (black) Die
 */
export default class SetbackDie extends GenesysDie {
	static override DENOMINATION = 's';
	static override GLYPH = 'S';
	static override FORMULA = 'ds' as const;
	static override CATEGORY = 'negative' as const;
	static override COLOR = 'K';
	static override FACES: GenesysDieFace[] = [' ', ' ', 'f', 'f', 'h', 'h'];
}
