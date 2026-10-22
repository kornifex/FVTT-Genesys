import { GenesysDie } from '@/dice/dice/GenesysDie';
import { GenesysDieFace } from '@/dice/GenesysSymbol';

/**
 * Ability (green) Die
 */
export class AbilityDie extends GenesysDie {
	static override DENOMINATION = 'a';
	static override GLYPH = 'A';
	static override FORMULA = 'da' as const;
	static override CATEGORY = 'positive' as const;
	static override COLOR = 'G';
	static override FACES: GenesysDieFace[] = [' ', 's', 's', 'ss', 'a', 'a', 'sa', 'aa'];
}
