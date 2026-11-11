/** @file The Heal action: a healer's Medicine check for a patient, at the difficulty of the patient's state of health. */

import { GenesysActor } from '@/actor/GenesysActor';
import { canBePatient, medicineDifficulty, type Patient, patientChoices } from '@/actor/Recovery';
import { DicePrompt } from '@/app/DicePrompt';
import { SelectPatientPrompt } from '@/app/SelectPatientPrompt';
import type { Stored } from '@/data/Stored';
import { difficultyGlyphs } from '@/dice/Difficulty';

type StoredActor = Stored<GenesysActor>;

/**
 * The actor of the user's single target, as the Dice Prompt reads it, when a check can heal them.
 */
function targetedPatient() {
	const [target] = game.user.targets.size === 1 ? game.user.targets : [];
	const actor = (target?.actor ?? undefined) as StoredActor | undefined;
	return actor && canBePatient(actor.type) ? actor : undefined;
}

/**
 * The patients a healer picks among: the characters of the viewed scene's tokens the user sees, the players'
 * characters, and the healer, who may heal themselves.
 */
function patientsToPick(healer: StoredActor) {
	const tokens = game.scenes.viewed?.tokens.contents ?? [];
	const sceneActors = tokens
		.filter((token) => game.user.isGM || !token.hidden)
		.flatMap((token) => (token.actor as StoredActor | null) ?? []);
	const playerCharacters = game.actors.filter((actor) => actor.hasPlayerOwner) as StoredActor[];
	return patientChoices([...sceneActors, healer], playerCharacters);
}

/**
 * Open a healer's Medicine check that heals a patient's wounds: the patient is the healer's target when they have one,
 * else the one they pick. The Dice Prompt opens at the difficulty of the patient's state of health, two more when the
 * healer heals themselves (CRB p. 116), and the check's card offers to heal the patient by its results.
 *
 * @param skillName The healer's Medicine skill, by its name.
 */
export async function healWithMedicine(healer: StoredActor, skillName: string) {
	const patient = targetedPatient() ?? (await SelectPatientPrompt.promptForPatient(patientsToPick(healer)));
	if (!patient) {
		return;
	}

	const level = medicineDifficulty((patient.system as Patient).wounds, patient.uuid === healer.uuid);
	await DicePrompt.promptForRoll(healer, skillName, {
		difficulty: difficultyGlyphs({ level, upgrades: 0 }),
		recovery: { patient: patient.uuid, rule: 'medicine' },
	});
}
