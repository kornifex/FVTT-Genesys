/**
 * @file The effects of the maneuvers a character performs from their sheet, put on their actor or taken back, and those a check uses up, removed once it is rolled by whoever may write the actor: the roller, else the Acting GM.
 */

import { isFoundryV13 } from '@/foundryGeneration';
import type { CheckPurpose } from '@/dice/Check';
import { changesPath, foundryChange, lapsingFor } from '@/effects/GenesysEffect';
import {
	aimBoosts,
	aimBoostsAfterClick,
	aimGiving,
	effectsUsedUp,
	GUARDED_STANCE,
	MANEUVER_IDS,
	type ManeuverEffect,
} from '@/effects/Maneuvers';
import { queriedCheck } from '@/dice/RolledCheck';
import { askActingGm, handleQuery, QueryName } from '@/queries';

/**
 * The effects of an actor that hold a status.
 */
function effectsWith(actor: Actor.Implementation, status: string) {
	return actor.effects.filter((effect) => effect.statuses.has(status));
}

/**
 * The data of a maneuver's effect, as the version of Foundry stores it.
 */
function effectData(maneuver: ManeuverEffect) {
	const data = {
		name: game.i18n.localize(maneuver.name),
		img: maneuver.img,
		statuses: [maneuver.id],
		// v13: a token shows the icon of every effect that holds a status; v14 only of a temporary one, unless told to.
		...(!isFoundryV13() && { showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS }),
	};
	foundry.utils.setProperty(data, changesPath(), maneuver.changes.map(foundryChange));
	return data;
}

// The maneuver each actor performs, by its uuid, after which the next one waits.
const performing = new Map<string, Promise<void>>();

/**
 * Performs a maneuver of an actor once the one this client performs already is written: a maneuver reads the effects
 * the previous one writes, and a second click on Aim before the first is written would put another Aim on the actor.
 */
function perform(actor: Actor.Implementation, maneuver: () => Promise<void>) {
	// An unsaved actor performs no maneuver: a document that is none of the world's has no uuid.
	const key = actor.uuid;
	if (!key) {
		throw new Error(`The actor ${actor.name} has no uuid, and performs no maneuver.`);
	}
	const done = (performing.get(key) ?? Promise.resolve()).then(maneuver);
	// A maneuver that failed doesn't stop the next one: its own caller gets the error.
	performing.set(
		key,
		done.catch(() => undefined),
	);
	return done;
}

/**
 * The Boosts an Aim effect gives.
 */
function boostsOf(effect: ActiveEffect.Implementation) {
	// The effect's changes, which v14 keeps in its system, as v14 shims them.
	const { changes } = effect as unknown as { changes: { key?: string; value: unknown }[] };
	return aimBoosts(changes);
}

/**
 * The Boosts the Aim of a character gives their next combat check, none when they haven't aimed.
 */
export function aimBoostsOf(actor: Actor.Implementation): number {
	const [current] = effectsWith(actor, MANEUVER_IDS.aim);
	return current ? boostsOf(current) : 0;
}

/**
 * Whether a character is in Guarded Stance.
 */
export function hasGuardedStance(actor: Actor.Implementation): boolean {
	return effectsWith(actor, MANEUVER_IDS.guardedStance).length > 0;
}

/**
 * A click on the Aim button: the Aim maneuver, which puts Aim on the character with one Boost, or gives their Aim one
 * Boost more, up to two after two Aim maneuvers in a row (CRB p. 98); once it gives two, the click takes it back.
 */
export function aim(actor: Actor.Implementation) {
	return perform(actor, async () => {
		const [current] = effectsWith(actor, MANEUVER_IDS.aim);
		const boosts = aimBoostsAfterClick(current ? boostsOf(current) : 0);
		if (!current) {
			await actor.createEmbeddedDocuments('ActiveEffect', [effectData(aimGiving(boosts)) as ActiveEffect.CreateData]);
		} else if (boosts === 0) {
			await current.delete();
		} else {
			await current.update({ [changesPath()]: aimGiving(boosts).changes.map(foundryChange) });
		}
	});
}

/**
 * A click on the Guarded Stance button: the Guarded Stance maneuver, which puts its effect on the character until the end
 * of their next turn, a Lapsing Effect of one round (CRB p. 99), or takes back the one they are in.
 */
export function toggleGuardedStance(actor: Actor.Implementation) {
	return perform(actor, async () => {
		const current = effectsWith(actor, MANEUVER_IDS.guardedStance).map((effect) => effect.id);
		if (current.length > 0) {
			await actor.deleteEmbeddedDocuments('ActiveEffect', current);
			return;
		}

		const data = foundry.utils.mergeObject(effectData(GUARDED_STANCE), lapsingFor(1));
		await actor.createEmbeddedDocuments('ActiveEffect', [data as ActiveEffect.CreateData]);
	});
}

/**
 * Removes the effects of an actor that a check it rolled uses up, as an attack does its Aim (CRB p. 98). A roller who
 * can't write the actor, as a player observing it, asks the Acting GM to, who reads what the check was rolled for from
 * its message.
 */
export async function useUpEffects(actor: Actor.Implementation, purpose: CheckPurpose, message: ChatMessage.Implementation) {
	if (!actor.isOwner) {
		if (effectsUsedUp(purpose, actor.effects).length > 0) {
			// A check is rolled by an actor of the world or of a scene, which has a uuid, and posts a stored message.
			await askActingGm(QueryName.UseUpEffects, { actorUuid: actor.uuid!, messageId: message.id! }, { name: actor.name });
		}
		return;
	}

	await deleteUsedUp(actor, purpose);
}

/**
 * Deletes the effects of an actor that a check uses up, for a user who may write them.
 */
async function deleteUsedUp(actor: Actor.Implementation, purpose: CheckPurpose) {
	const usedUp = effectsUsedUp(purpose, actor.effects);
	if (usedUp.length > 0) {
		await actor.deleteEmbeddedDocuments('ActiveEffect', usedUp);
	}
}

/**
 * Answers the players' checks that use up effects of actors they can't write. The Acting GM finds those effects again,
 * from what the check's message records it was rolled for.
 */
export function registerUsedUpEffects() {
	handleQuery(QueryName.UseUpEffects, async (data, querier) => {
		const { actor, check } = queriedCheck(data, querier);
		await deleteUsedUp(actor, check.purpose);
	});
}
