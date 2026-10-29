/** @file Clones an actor, for instance to give a Crew or a scene an actor of its own rather than unlinked tokens of a shared one. */

import type { GenesysActor } from '@/actor/GenesysActor';

/**
 * What this module reads of an actor's source data.
 */
type ActorSource = {
	name: string;
	type: string;
	flags?: Record<string, Record<string, unknown> | undefined>;
	prototypeToken?: object;
};

/**
 * The source data of the clone of an actor: a copy under the given name, or the actor's own when none is given, whose
 * token is linked to it. The clone of a minion is an independent minion, which the minion sheet shows as one.
 */
export function cloneSource<S extends ActorSource>(source: S, name: string): S {
	return {
		...source,
		name: name || source.name,
		flags:
			source.type === 'minion' ? { ...source.flags, genesys: { ...source.flags?.genesys, independentMinion: true } } : source.flags,
		prototypeToken: { ...source.prototypeToken, actorLink: true },
	};
}

/**
 * Create the clone of an actor under the given name.
 */
export async function cloneActor(actor: GenesysActor, name: string) {
	return (Actor.implementation as typeof GenesysActor).create(cloneSource(actor.toObject(), name));
}
