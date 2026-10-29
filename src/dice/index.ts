import { AbilityDie } from '@/dice/dice/AbilityDie';
import { BoostDie } from '@/dice/dice/BoostDie';
import { ProficiencyDie } from '@/dice/dice/ProficiencyDie';
import { SetbackDie } from '@/dice/dice/SetbackDie';
import { DifficultyDie } from '@/dice/dice/DifficultyDie';
import { ChallengeDie } from '@/dice/dice/ChallengeDie';
import * as log from '@/log';

import '@/dice/diceSoNice';

/**
 * An object used to get general details of each dice type.
 */
export const GenesysDice = {
	Proficiency: ProficiencyDie,
	Ability: AbilityDie,
	Boost: BoostDie,

	Challenge: ChallengeDie,
	Difficulty: DifficultyDie,
	Setback: SetbackDie,
};

/**
 * Registers custom dice types, and the check card as a partial.
 */
export function register() {
	Object.values(GenesysDice).forEach((dieType) => {
		CONFIG.Dice.terms[dieType.DENOMINATION] = dieType;
	});

	// The attack card calls the check card as a partial, which Handlebars only finds once registered.
	foundry.applications.handlebars
		.loadTemplates(['systems/genesys/templates/chat/rolls/skill.hbs'])
		.catch((reason: unknown) => log.error('The check card could not be loaded', reason));
}
