import { GenesysDie } from '@/dice/dice/GenesysDie';
import { DieFaces } from '@/dice/DieFaces';
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
	static override FACES: GenesysDieFace[] = DieFaces.Ability;
}
