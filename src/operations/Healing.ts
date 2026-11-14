/**
 * @file The Heal action: a healer's Medicine check for a patient, at the difficulty of the patient's state of health;
 * the patient a Heal spell heals, picked as Medicine's is; and the Medicine check with which a character treats one of
 * their own Critical Injuries.
 */

import { GenesysActor } from '@/actor/GenesysActor';
import {
	canBePatient,
	healingSkillNames,
	medicineDifficulty,
	ownInjuryDifficulty,
	type Patient,
	patientChoices,
	skillOfLargestPool,
} from '@/actor/Recovery';
import { DicePrompt } from '@/app/DicePrompt';
import { SelectPatientPrompt } from '@/app/SelectPatientPrompt';
import { singleTargetActor } from '@/app/singleTarget';
import { skillToRoll } from '@/data/Skills';
import type { Stored } from '@/data/Stored';
import { difficultyGlyphs } from '@/dice/Difficulty';
import type { GenesysItem } from '@/item/GenesysItem';

type StoredActor = Stored<GenesysActor>;
type Character = Stored<GenesysActor<'character'>>;

/**
 * The actor of the user's single target, as the Dice Prompt reads it, when a check can heal them.
 */
function targetedPatient() {
	const actor = singleTargetActor() as StoredActor | undefined;
	return actor && canBePatient(actor.type) ? actor : undefined;
}

/**
 * The patients a healer picks among: the characters, rivals and nemeses of the viewed scene's tokens the user sees, the
 * players' characters, and the healer, who may heal themselves.
 */
function patientsToPick(healer: StoredActor) {
	const tokens = game.scenes.viewed?.tokens.contents ?? [];
	const sceneActors = tokens
		.filter((token) => game.user.isGM || !token.hidden)
		.flatMap((token) => (token.actor as StoredActor | null) ?? []);
	const playerCharacters = game.actors.filter((actor) => actor.hasPlayerOwner) as StoredActor[];
	return patientChoices([...sceneActors, healer], playerCharacters, (name, type) =>
		game.i18n.format('Genesys.Recovery.AdversaryPatient', { name, type: game.i18n.localize(`TYPES.Actor.${type}`) }),
	).map(({ actor, label }) => ({ actor, uuid: actor.uuid, name: label, img: actor.img }));
}

/**
 * The patient a healer heals: their single target when it can be healed, else the one they pick among the scene's
 * characters, rivals and nemeses, the players' characters and themselves. Undefined when they cancel the pick.
 */
export async function pickPatient(healer: StoredActor) {
	const targeted = targetedPatient();
	if (targeted) {
		return targeted;
	}

	return (await SelectPatientPrompt.promptForPatient(patientsToPick(healer)))?.actor;
}

/**
 * Open a healer's Medicine check that heals a patient's wounds: the patient is the healer's target when they have one,
 * else the one they pick. The Dice Prompt opens at the difficulty of the patient's state of health, two more when the
 * healer heals themselves (CRB p. 116), and the check's card offers to heal the patient by its results.
 *
 * @param skillName The healer's Medicine skill, by its name.
 */
export async function healWithMedicine(healer: StoredActor, skillName: string) {
	const patient = await pickPatient(healer);
	if (!patient) {
		return;
	}

	const level = medicineDifficulty((patient.system as Patient).wounds, patient.uuid === healer.uuid);
	await DicePrompt.promptForRoll(healer, skillName, {
		difficulty: difficultyGlyphs({ level, upgrades: 0 }),
		recovery: { patient: patient.uuid, rule: 'medicine' },
	});
}

/**
 * The skill a character treats their own Critical Injuries with: among those the Skills Compendium marks as healing
 * wounds, the one of the larger pool. Undefined when the compendium marks none, and the character can't treat them.
 */
export function ownTreatmentSkill(character: Character) {
	return skillOfLargestPool(healingSkillNames(CONFIG.genesys.skills), (name) => {
		const rolled = skillToRoll(character.skills, CONFIG.genesys.skills, name);
		return (
			rolled && {
				characteristic: character.system.characteristics[rolled.skill.system.characteristic],
				// An Unranked Skill Check rolls the Skills Compendium's skill, at no rank.
				rank: rolled.unranked ? 0 : rolled.skill.system.rank,
			}
		);
	});
}

/**
 * Open the Medicine check with which a character treats one of their own Critical Injuries, rather than wait for the
 * weekly Resilience check of a rest: at the injury's severity, two levels harder since they treat themselves (CRB
 * p. 116).
 *
 * @param skillName The character's healing skill, as `ownTreatmentSkill` picks it.
 */
export async function treatOwnInjury(character: Character, skillName: string, injury: Stored<GenesysItem<'injury'>>) {
	await DicePrompt.promptForRoll(character, skillName, { difficulty: ownInjuryDifficulty(injury.system.severity, true) });
}
