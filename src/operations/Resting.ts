/**
 * @file The End of encounter and Night's rest actions of a character: the check that recovers strain at the end of an
 * encounter, and the strain and wound a full night's rest heals (CRB pp. 116–117).
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import { healedPools, nightsRest, type Patient, STRAIN_RECOVERY_SKILLS, strainRecoverySkill } from '@/actor/Recovery';
import { DicePrompt } from '@/app/DicePrompt';
import { skillToRoll } from '@/data/Skills';
import type { Stored } from '@/data/Stored';

type Character = Stored<GenesysActor<'character'>>;

/**
 * The Simple difficulty of the check that recovers strain, as Pool Modification glyphs: no Difficulty die.
 */
const SIMPLE = '';

/**
 * Open a character's check that recovers strain at the end of an encounter: a Simple Discipline or Cool check, on the
 * skill of the larger pool, whose card recovers a strain per Success (CRB p. 117). The roller can pick the other skill
 * in the Dice Prompt.
 */
export async function recoverAtEndOfEncounter(character: Character) {
	const candidates = STRAIN_RECOVERY_SKILLS.flatMap((name) => {
		const rolled = skillToRoll(character.skills, CONFIG.genesys.skills, name);
		return rolled
			? [
					{
						name: rolled.skill.name,
						characteristic: character.system.characteristics[rolled.skill.system.characteristic],
						rank: rolled.unranked ? 0 : rolled.skill.system.rank,
					},
				]
			: [];
	});

	await DicePrompt.promptForRoll(character, strainRecoverySkill(candidates), {
		difficulty: SIMPLE,
		recovery: { patient: character.uuid, rule: 'endOfEncounter' },
	});
}

/**
 * Rest a character for a full night: they recover all their strain and heal one wound (CRB pp. 116–117), and the chat
 * says how much.
 */
export async function restForTheNight(character: Character) {
	const patient = character.system as Required<Patient>;
	const healed = nightsRest(patient);
	const { wounds, strain } = healedPools(patient, healed);
	await character.update({ system: { wounds: { value: wounds }, strain: { value: strain } } });
	await ChatMessage.create({
		speaker: { actor: character.id },
		content: `<p>${game.i18n.format('Genesys.Recovery.NightsRestMessage', { strain: healed.strain, wounds: healed.wounds })}</p>`,
	});
}
