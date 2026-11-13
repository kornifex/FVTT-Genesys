/**
 * @file What a check's chat message records of it, from which the Acting GM writes what an observer's check costs the
 * actor: the strain of a spell cast, the effects it uses up.
 */

import { isRecord } from '@/data/parsing';
import type { CheckPurpose } from '@/dice/Check';
import { refuse } from '@/queries';

/**
 * What a check's message records of it: the uuid of the actor that made it, and what it was rolled for.
 */
export type CheckFlag = { actor: string; purpose: CheckPurpose };

/**
 * A chat message, as the Acting GM finds it from a query: its author's id, whether it holds a roll, and its check's
 * record. The querier's client wrote that record, which may hold anything.
 */
type CheckMessage = { authorId: string | undefined; hasRoll: boolean; check: unknown };

/**
 * The check a querier rolled for an actor, read from its message, or undefined when the message is none, holds no roll,
 * isn't the querier's, records no check or a malformed one, or records a check of another actor: the Acting GM then
 * refuses the query. The check holds only the actor and the purpose: anything else the record holds is ignored.
 */
export function rolledCheck(message: CheckMessage | undefined, querierId: string, actorUuid: string): CheckFlag | undefined {
	if (!message?.hasRoll || message.authorId !== querierId) {
		return undefined;
	}
	const check = parseCheckFlag(message.check);
	return check?.actor === actorUuid ? check : undefined;
}

function parseCheckFlag(value: unknown): CheckFlag | undefined {
	if (!isRecord(value) || typeof value.actor !== 'string') {
		return undefined;
	}
	const purpose = parsePurpose(value.purpose);
	return purpose && { actor: value.actor, purpose };
}

function parsePurpose(value: unknown): CheckPurpose | undefined {
	if (!isRecord(value)) {
		return undefined;
	}
	switch (value.kind) {
		case 'check':
		case 'initiative':
			return { kind: value.kind };
		case 'attack':
			return typeof value.weaponName === 'string' ? { kind: 'attack', weaponName: value.weaponName } : undefined;
		case 'spell':
			return typeof value.spellName === 'string' && typeof value.isAttack === 'boolean'
				? { kind: 'spell', spellName: value.spellName, isAttack: value.isAttack }
				: undefined;
		default:
			return undefined;
	}
}

/**
 * The actor and the check of a query about a check a player rolled, as the Acting GM finds them. It refuses the query
 * unless the querier may see the actor, as one who could roll its checks, and rolled that check for it.
 */
export function queriedCheck({ actorUuid, messageId }: { actorUuid: string; messageId: string }, querier: User.Implementation) {
	const actor = fromUuidSync(actorUuid) as Actor.Implementation | null;
	const message = game.messages.get(messageId);
	const check = rolledCheck(
		message && {
			authorId: message.author?.id ?? undefined,
			hasRoll: message.rolls.length > 0,
			check: message.getFlag('genesys', 'check'),
		},
		// A user who sends a query is stored, and has an id.
		querier.id!,
		actorUuid,
	);
	if (!(actor instanceof Actor) || !actor.testUserPermission(querier, 'OBSERVER') || !check) {
		refuse('Genesys.Notifications.GenericError');
	}
	return { actor, check };
}
