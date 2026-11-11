/**
 * @file The effects of the maneuvers a character performs from their sheet, put on their actor, and those a check uses up, removed once it is rolled by whoever may write the actor: the roller, else the Acting GM.
 */

import { isFoundryV13 } from '@/foundryGeneration';
import type { CheckPurpose } from '@/dice/Check';
import { changesPath, lapsingFor } from '@/effects/GenesysEffect';
import { aimAfter, aimBoosts, effectsUsedUp, GUARDED_STANCE, MANEUVER_IDS, type ManeuverEffect } from '@/effects/Maneuvers';
import { foundryChange } from '@/effects/tokenStateMenu';
import { askActingGm, handleQuery, QueryName, refuse } from '@/queries';

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
	const key = actor.uuid ?? '';
	const done = (performing.get(key) ?? Promise.resolve()).then(maneuver);
	// A maneuver that failed doesn't stop the next one: its own caller gets the error.
	performing.set(
		key,
		done.catch(() => undefined),
	);
	return done;
}

/**
 * The Aim maneuver: the character's Aim effect gets one more Boost, up to two after two Aim maneuvers in a row, or is put
 * on them with one (CRB p. 98).
 */
export function aim(actor: Actor.Implementation) {
	return perform(actor, () => aimNow(actor));
}

async function aimNow(actor: Actor.Implementation) {
	const [current] = effectsWith(actor, MANEUVER_IDS.aim);
	if (!current) {
		await actor.createEmbeddedDocuments('ActiveEffect', [effectData(aimAfter(0)) as ActiveEffect.CreateData]);
		return;
	}

	// The effect's changes, which v14 keeps in its system, as v14 shims them.
	const { changes } = current as unknown as { changes: { key?: string; value: unknown }[] };
	await current.update({ [changesPath()]: aimAfter(aimBoosts(changes)).changes.map(foundryChange) });
}

/**
 * The Guarded Stance maneuver: the character's Guarded Stance effect, put on them until the end of their next turn, a
 * Lapsing Effect of one round (CRB p. 99). Taken again, it starts again from the current turn.
 */
export function takeGuardedStance(actor: Actor.Implementation) {
	return perform(actor, async () => {
		const current = effectsWith(actor, MANEUVER_IDS.guardedStance).map((effect) => effect.id);
		if (current.length > 0) {
			await actor.deleteEmbeddedDocuments('ActiveEffect', current);
		}

		const data = foundry.utils.mergeObject(effectData(GUARDED_STANCE), lapsingFor(1));
		await actor.createEmbeddedDocuments('ActiveEffect', [data as ActiveEffect.CreateData]);
	});
}

/**
 * Removes the effects of an actor that a check it rolled uses up, as an attack does its Aim (CRB p. 98). A roller who
 * can't write the actor, as a player observing it, asks the Acting GM to.
 */
export async function useUpEffects(actor: Actor.Implementation, purpose: CheckPurpose) {
	const usedUp = effectsUsedUp(purpose, effectsOf(actor));
	if (usedUp.length === 0) {
		return;
	}

	if (actor.isOwner) {
		await actor.deleteEmbeddedDocuments('ActiveEffect', usedUp);
	} else {
		// A check is rolled by an actor of the world or of a scene, which has a uuid.
		await askActingGm(QueryName.UseUpEffects, { actorUuid: actor.uuid!, purpose }, { name: actor.name });
	}
}

function effectsOf(actor: Actor.Implementation) {
	return actor.effects.map((effect) => ({ id: effect.id, statuses: effect.statuses }));
}

/**
 * Answers the players' checks that use up effects of actors they can't write. The Acting GM finds those effects again,
 * for a player who may see the actor, as one who could roll its check.
 */
export function registerUsedUpEffects() {
	handleQuery(QueryName.UseUpEffects, async ({ actorUuid, purpose }, querier) => {
		const actor = fromUuidSync(actorUuid) as Actor.Implementation | null;
		if (!(actor instanceof Actor) || !actor.testUserPermission(querier, 'OBSERVER')) {
			refuse('Genesys.Notifications.GenericError');
		}

		const usedUp = effectsUsedUp(purpose, effectsOf(actor));
		if (usedUp.length > 0) {
			await actor.deleteEmbeddedDocuments('ActiveEffect', usedUp);
		}
	});
}
