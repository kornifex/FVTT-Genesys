/**
 * @file Keeps an actor's Threshold States in step with its wounds and strain, whatever changed them: the sheet, a token's bar, a heal or a macro.
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import type { Stored } from '@/data/Stored';
import { CRITICAL_INJURY_FLAG, type CriticalInjuryFlag } from '@/dice/CriticalInjuryRoll';
import { type ThresholdStanding, type ThresholdState, thresholdStanding, thresholdStateChanges } from '@/effects/ThresholdStates';

const OFFER_TEMPLATE = 'systems/genesys/templates/chat/critical-injury-offer.hbs';

/**
 * The standings an update's options carry, by actor uuid.
 */
export type RecordedStandings = Record<string, ThresholdStanding>;

/**
 * The status id of each Threshold State: the system's Incapacitated, and Foundry's Defeated, which the combat tracker
 * reads to mark the actor's combatant defeated.
 */
function statusId(state: ThresholdState): string {
	return state === 'defeated' ? CONFIG.specialStatusEffects.DEFEATED : 'incapacitated';
}

/**
 * Keep the actor's standing before an update in the update's options, which reach its `_onUpdate` once the update is
 * done: the update's author compares it with the standing after. Keyed by the actor's uuid, as one operation may update
 * several actors.
 */
export function recordStandingBefore(actor: Stored<GenesysActor>, options: Actor.Database.PreUpdateOptions) {
	options.genesysStandings = { ...options.genesysStandings, [actor.uuid]: thresholdStanding(actor) };
}

/**
 * Set or clear the actor's Threshold States after an update, and post the offer of their Critical Injury to a character
 * gone past their wound threshold. Run by the update's author alone, once per update.
 */
export async function syncThresholdStates(actor: Stored<GenesysActor>, options: Actor.Database.OnUpdateOptions) {
	const before = options.genesysStandings?.[actor.uuid];
	if (!before) {
		return;
	}

	const { apply, remove, criticalInjury } = thresholdStateChanges(before, thresholdStanding(actor));
	// Foundry's own toggle, with the overlay the combat tracker gives Defeated.
	for (const state of remove) await actor.toggleStatusEffect(statusId(state), { active: false });
	for (const state of apply) await actor.toggleStatusEffect(statusId(state), { active: true, overlay: state === 'defeated' });

	if (criticalInjury) {
		await offerCriticalInjury(actor);
	}
}

/**
 * Post a message, as the character, whose button opens the dialog that rolls their Critical Injury (CRB p. 112), for the
 * GM or the character's player to use.
 */
async function offerCriticalInjury(actor: Stored<GenesysActor>) {
	const flag: CriticalInjuryFlag = { target: actor.uuid };
	await ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
		content: await foundry.applications.handlebars.renderTemplate(OFFER_TEMPLATE, { actor: actor.name }),
		flags: { genesys: { [CRITICAL_INJURY_FLAG]: flag } },
	});
}
