/**
 * @file The strain a spell's caster suffers once the check to cast it is resolved, written by whoever may write the
 * caster: the roller, else the Acting GM.
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import type { CheckPurpose } from '@/dice/Check';
import { queriedCheck } from '@/dice/RolledCheck';
import { castingStrain } from '@/item/SpellCasting';
import { askActingGm, handleQuery, QueryName } from '@/queries';

/**
 * The strain an actor tracks, undefined for one who has none, as a minion.
 */
function strainOf(actor: GenesysActor) {
	return 'strain' in actor.system ? actor.system.strain : undefined;
}

/**
 * Make an actor suffer strain, when they track it. Their strain may go past its threshold: the update's Threshold States
 * then incapacitate them.
 */
async function sufferStrain(actor: GenesysActor, strain: number) {
	const pool = strainOf(actor);
	if (pool && strain > 0) {
		await actor.update({ system: { strain: { value: pool.value + strain } } });
	}
}

/**
 * Makes the caster of a spell suffer the strain of its cast, whose check the message shows (CRB p. 210); does nothing
 * for another check. A roller who can't write the caster, as a player observing
 * them, asks the Acting GM to, who reads what the check was rolled for from the message; a failure warns the roller.
 */
export async function sufferCastingStrain(actor: GenesysActor, purpose: CheckPurpose, message: ChatMessage.Implementation) {
	const strain = castingStrain(purpose);
	if (strain === 0) {
		return;
	}

	if (!actor.isOwner) {
		// A check is rolled by an actor of the world or of a scene, which has a uuid, and posts a stored message.
		await askActingGm(QueryName.SufferCastingStrain, { actorUuid: actor.uuid!, messageId: message.id! }, { name: actor.name });
		return;
	}

	await sufferStrain(actor, strain);
}

/**
 * Answers the players' spells cast for actors they can't write: the Acting GM makes the caster suffer the strain the rules
 * give for the check its message records, never a value the player's client wrote.
 */
export function registerCastingStrain() {
	handleQuery(QueryName.SufferCastingStrain, async (data, querier) => {
		const { actor, check } = queriedCheck(data, querier);
		await sufferStrain(actor, castingStrain(check.purpose));
	});
}
