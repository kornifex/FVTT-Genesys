/**
 * @file The Apply button of the card of a check that heals: it heals the patient by the recovery its message carries,
 * for the GM and the patient's owners.
 */

import { canBePatient, healedPools, type Patient, type Recovery } from '@/actor/Recovery';
import type { GenesysActor } from '@/actor/GenesysActor';

/**
 * The patient a recovery heals, when they still exist and a check can heal them.
 */
function patientOf(recovery: Recovery) {
	const patient = fromUuidSync(recovery.patient) as GenesysActor | null;
	return patient instanceof Actor && canBePatient(patient.type) ? patient : undefined;
}

/**
 * Heal a patient by a recovery: their wounds and strain go down by what it heals, never below zero.
 */
async function applyRecovery(patient: GenesysActor, recovery: Recovery) {
	const { wounds, strain } = healedPools(patient.system as Patient, recovery);
	await patient.update({
		system: { wounds: { value: wounds }, ...(strain !== undefined && { strain: { value: strain } }) },
	});
}

/**
 * Wire the Apply button of each card of a check that heals as Foundry renders it, in the chat log and its notifications:
 * it shows only to the users who may heal the patient, the GM and the patient's owners.
 */
export function register() {
	Hooks.on('renderChatMessageHTML', (message, html) => {
		const button = html.querySelector<HTMLButtonElement>('button.apply-recovery');
		if (!button) {
			return;
		}

		const recovery = message.getFlag('genesys', 'recovery');
		const patient = recovery && patientOf(recovery);
		if (!recovery || !patient?.isOwner) {
			button.remove();
			return;
		}

		// A second click, as a double click, would heal the patient twice: the button is spent once clicked, until the
		// card renders again.
		button.addEventListener('click', () => {
			button.disabled = true;
			void applyRecovery(patient, recovery);
		});
	});
}
