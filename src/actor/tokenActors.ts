import type { GenesysActor } from '@/actor/GenesysActor';

/**
 * The synthetic actors of the unlinked tokens of the world's scenes, which `game.actors` doesn't hold: each keeps its
 * own changes to its base actor, a vehicle's Crew among them.
 */
export function unlinkedTokenActors(): GenesysActor[] {
	return game.scenes.contents.flatMap((scene) =>
		scene.tokens.contents.flatMap((token) => (!token.actorLink && token.actor ? [token.actor] : [])),
	);
}
