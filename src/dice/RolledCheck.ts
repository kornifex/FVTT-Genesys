/**
 * @file What a check's chat message records of it, from which the Acting GM writes what an observer's check costs the
 * actor: the strain of a spell cast, the effects it uses up.
 */

import type { CheckPurpose } from '@/dice/Check';
import { refuse } from '@/queries';

/**
 * What a check's message records of it: the uuid of the actor that made it, what it was rolled for, and for a spell cast
 * the strain the caster suffers.
 */
export type CheckFlag = { actor: string; purpose: CheckPurpose; strain?: number };

/**
 * A chat message, as the Acting GM finds it from a query: its author's id and its check's record.
 */
type CheckMessage = { authorId: string | undefined; check: CheckFlag | undefined };

/**
 * The check a querier rolled for an actor, read from its message, or undefined when the message is none, records no
 * check, isn't the querier's, or records a check of another actor: the Acting GM then refuses the query.
 */
export function rolledCheck(message: CheckMessage | undefined, querierId: string, actorUuid: string) {
	if (!message?.check || message.authorId !== querierId || message.check.actor !== actorUuid) {
		return undefined;
	}
	return message.check;
}

/**
 * The actor and the check of a query about a check a player rolled, as the Acting GM finds them. It refuses the query
 * unless the querier may see the actor, as one who could roll its checks, and rolled that check for it.
 */
export function queriedCheck({ actorUuid, messageId }: { actorUuid: string; messageId: string }, querier: User.Implementation) {
	const actor = fromUuidSync(actorUuid) as Actor.Implementation | null;
	const message = game.messages.get(messageId);
	const check = rolledCheck(
		message && { authorId: message.author?.id ?? undefined, check: message.getFlag('genesys', 'check') },
		// A user who sends a query is stored, and has an id.
		querier.id!,
		actorUuid,
	);
	if (!(actor instanceof Actor) || !actor.testUserPermission(querier, 'OBSERVER') || !check) {
		refuse('Genesys.Notifications.GenericError');
	}
	return { actor, check };
}
