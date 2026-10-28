import { GenesysDie } from '@/dice/dice/GenesysDie';
import { DieFaces } from '@/dice/DieFaces';
import { DieTypes } from '@/dice/DieTypes';
import { GenesysDieFace } from '@/dice/GenesysSymbol';

/**
 * Ability (green) Die
 */
export class AbilityDie extends GenesysDie {
	static override DENOMINATION = DieTypes.Ability.DENOMINATION;
	static override GLYPH = DieTypes.Ability.GLYPH;
	static override FORMULA = DieTypes.Ability.FORMULA;
	static override CATEGORY = DieTypes.Ability.CATEGORY;
	static override COLOR = DieTypes.Ability.COLOR;
	static override FACES: GenesysDieFace[] = DieFaces.Ability;
}
