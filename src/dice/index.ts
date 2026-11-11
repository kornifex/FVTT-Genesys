import { AbilityDie } from '@/dice/dice/AbilityDie';
import { BoostDie } from '@/dice/dice/BoostDie';
import { ProficiencyDie } from '@/dice/dice/ProficiencyDie';
import { SetbackDie } from '@/dice/dice/SetbackDie';
import { DifficultyDie } from '@/dice/dice/DifficultyDie';
import { ChallengeDie } from '@/dice/dice/ChallengeDie';
import { register as registerDiceSoNice } from '@/dice/diceSoNice';
import { register as registerRecoveryCards } from '@/dice/RecoveryCard';
import * as log from '@/log';

/**
 * An object used to get general details of each dice type.
 */
const GenesysDice = {
	Proficiency: ProficiencyDie,
	Ability: AbilityDie,
	Boost: BoostDie,

	Challenge: ChallengeDie,
	Difficulty: DifficultyDie,
	Setback: SetbackDie,
};

/**
 * Registers custom dice types, their Dice So Nice dice, the check card as a partial, and the Apply button of the cards of
 * checks that heal.
 */
export function register() {
	Object.values(GenesysDice).forEach((dieType) => {
		CONFIG.Dice.terms[dieType.DENOMINATION] = dieType;
	});
	registerDiceSoNice();
	registerRecoveryCards();

	// The attack card calls the check card as a partial, which Handlebars only finds once registered.
	foundry.applications.handlebars
		.loadTemplates(['systems/genesys/templates/chat/rolls/skill.hbs'])
		.catch((reason: unknown) => log.error('The check card could not be loaded', reason));
}
