import { GenesysDie } from '@/dice/dice/GenesysDie';
import { DieFaces } from '@/dice/DieFaces';
import { DieTypes } from '@/dice/DieTypes';

/**
 * Proficiency (yellow) Die
 */
export class ProficiencyDie extends GenesysDie {
	static override DENOMINATION = DieTypes.Proficiency.DENOMINATION;
	static override GLYPH = DieTypes.Proficiency.GLYPH;
	static override FORMULA = DieTypes.Proficiency.FORMULA;
	static override CATEGORY = DieTypes.Proficiency.CATEGORY;
	static override COLOR = DieTypes.Proficiency.COLOR;
	static override FACES: string[] = DieFaces.Proficiency;
}
