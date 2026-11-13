/**
 * @file The Apply button of the card of a check that heals: it heals the patient by the recovery its message carries,
 * once, for the GM and the patient's owners.
 */

import { canBePatient, healedPools, type Patient, type Recovery } from '@/actor/Recovery';
import type { GenesysActor } from '@/actor/GenesysActor';
import { askActingGm, handleQuery, QueryName, refuse } from '@/queries';

/**
 * What a card of a check that heals shows a user: Apply while its healing can still be applied and the user may heal the
 * patient, that it was applied to everyone once it was, nothing otherwise.
 */
export function recoveryCardState({ applied, mayHeal }: { applied: boolean; mayHeal: boolean }) {
	if (applied) {
		return 'applied';
	}
	return mayHeal ? 'apply' : 'none';
}

/**
 * Applies the healing of each card once, on the client that writes it: a card already applied, or that this client is
 * applying still, isn't applied again. Two clicks reach it at once, as a GM's and a player's query, before the first
 * application is written.
 *
 * @returns Whether the card was applied.
 */
export function applyingOnce() {
	const applying = new Set<string>();
	return async (card: { id: string; applied: boolean }, apply: () => Promise<void>) => {
		if (card.applied || applying.has(card.id)) {
			return false;
		}

		applying.add(card.id);
		try {
			await apply();
			return true;
		} finally {
			applying.delete(card.id);
		}
	};
}

const applyOnce = applyingOnce();

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
 * Records on a card's message that its healing was applied, then heals the patient, unless it was applied already. The
 * record comes first: a failure to heal leaves the card applied rather than open to a second healing.
 */
function applyCard(message: ChatMessage.Implementation, patient: GenesysActor, recovery: Recovery) {
	// A message rendered in the chat log is stored, and has an id.
	return applyOnce({ id: message.id!, applied: message.getFlag('genesys', 'recoveryApplied') === true }, async () => {
		await message.setFlag('genesys', 'recoveryApplied', true);
		await applyRecovery(patient, recovery);
	});
}

/**
 * Wire the Apply button of each card of a check that heals as Foundry renders it, in the chat log and its notifications:
 * it shows only to the users who may heal the patient, the GM and the patient's owners, until the healing is applied,
 * which the card then shows to everyone. A GM applies it; a player asks the Acting GM to, so that two clicks at once heal
 * the patient once.
 */
export function register() {
	Hooks.on('renderChatMessageHTML', (message, html) => {
		const button = html.querySelector<HTMLButtonElement>('button.apply-recovery');
		if (!button) {
			return;
		}

		const recovery = message.getFlag('genesys', 'recovery');
		const patient = recovery && patientOf(recovery);
		const state = recoveryCardState({
			applied: message.getFlag('genesys', 'recoveryApplied') === true,
			mayHeal: !!patient?.isOwner,
		});
		if (state === 'applied') {
			button.replaceWith(appliedLabel());
			return;
		}
		if (state === 'none' || !recovery || !patient) {
			button.remove();
			return;
		}

		// A message rendered in the chat log is stored, and has an id.
		const apply = () =>
			game.user.isGM ? applyCard(message, patient, recovery) : askActingGm(QueryName.ApplyRecovery, { messageId: message.id! });
		// The button is spent once clicked, until the card renders again as applied, or comes back when it wasn't.
		button.addEventListener('click', () => {
			button.disabled = true;
			void apply().then((applied) => {
				button.disabled = !applied;
			});
		});
	});

	handleQuery(QueryName.ApplyRecovery, async ({ messageId }, querier) => {
		const message = game.messages.get(messageId);
		const recovery = message?.getFlag('genesys', 'recovery');
		const patient = recovery && patientOf(recovery);
		if (!message || !recovery || !patient?.testUserPermission(querier, 'OWNER')) {
			refuse('Genesys.Notifications.GenericError');
		}

		await applyCard(message, patient, recovery);
	});
}

/**
 * What a card shows in place of its Apply button once its healing was applied.
 */
function appliedLabel() {
	const label = document.createElement('span');
	label.className = 'recovery-applied';
	const icon = document.createElement('i');
	icon.className = 'fas fa-kit-medical';
	icon.setAttribute('aria-hidden', 'true');
	label.append(icon, ` ${game.i18n.localize('Genesys.Recovery.Applied')}`);
	return label;
}
