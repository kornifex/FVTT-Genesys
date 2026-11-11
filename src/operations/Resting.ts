/**
 * @file The End of encounter and Night's rest actions of a character: the check that recovers strain at the end of an
 * encounter, and the strain and wound a full night's rest heals (CRB pp. 116–117).
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import { healedPools, nightsRest, strainRecoverySkill } from '@/actor/Recovery';
import { DicePrompt } from '@/app/DicePrompt';
import { Characteristic } from '@/data/Characteristics';
import { skillToRoll } from '@/data/Skills';
import type { Stored } from '@/data/Stored';
import { difficultyGlyphs } from '@/dice/Difficulty';

type Character = Stored<GenesysActor<'character'>>;

/**
 * Open a character's check that recovers strain at the end of an encounter: a Simple Discipline or Cool check, on the
 * skill of the larger pool, whose card recovers a strain per Success (CRB p. 117). The roller can pick the other skill
 * in the Dice Prompt.
 */
export async function recoverAtEndOfEncounter(character: Character) {
	const skillName = strainRecoverySkill((name) => {
		const rolled = skillToRoll(character.skills, CONFIG.genesys.skills, name);
		return (
			rolled && {
				characteristic: character.system.characteristics[rolled.skill.system.characteristic],
				// An Unranked Skill Check rolls the Skills Compendium's skill, at no rank.
				rank: rolled.unranked ? 0 : rolled.skill.system.rank,
			}
		);
	});

	await DicePrompt.promptForRoll(character, skillName, {
		difficulty: difficultyGlyphs({ level: 0, upgrades: 0 }),
		// Discipline's characteristic, for a world whose Skills Compendium lacks both skills.
		characteristic: Characteristic.Willpower,
		recovery: { patient: character.uuid, rule: 'endOfEncounter' },
	});
}

/**
 * Rest a character for a full night: they recover all their strain and heal one wound (CRB pp. 116–117), and the chat
 * says how much, since the sheet's bars change without a roll to show why.
 */
export async function restForTheNight(character: Character) {
	const healed = nightsRest(character.system);
	const { wounds, strain } = healedPools(character.system, healed);
	await character.update({ system: { wounds: { value: wounds }, strain: { value: strain } } });
	await ChatMessage.create({
		speaker: { actor: character.id },
		content: `<p>${game.i18n.format('Genesys.Recovery.NightsRestMessage', { strain: healed.strain, wounds: healed.wounds })}</p>`,
	});
}
