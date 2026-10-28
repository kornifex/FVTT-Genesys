import { GenesysDie } from '@/dice/dice/GenesysDie';
import { DieFaces } from '@/dice/DieFaces';
import { DieTypes } from '@/dice/DieTypes';
import { GenesysDieFace } from '@/dice/GenesysSymbol';

/**
 * Challenge (red) Die
 */
export class ChallengeDie extends GenesysDie {
	static override DENOMINATION = DieTypes.Challenge.DENOMINATION;
	static override GLYPH = DieTypes.Challenge.GLYPH;
	static override FORMULA = DieTypes.Challenge.FORMULA;
	static override CATEGORY = DieTypes.Challenge.CATEGORY;
	static override COLOR = DieTypes.Challenge.COLOR;
	static override FACES: GenesysDieFace[] = DieFaces.Challenge;
}
