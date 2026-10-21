# Non-legacy Active Effect transferral on every Foundry version

Foundry v14 removed legacy effect transferral: item effects now stay on their item and apply to the owning actor from there, instead of being copied onto the actor. We adopt non-legacy transferral on v13 too, rather than keeping legacy on v13 and non-legacy on v14. We add a world migration that deletes the actor-side copies of effects whose origin is one of the actor's own items. This gives a single effect model to maintain.

The migration is mandatory, not cosmetic. A world created on v13 still holds the legacy copies, so on v14 every talent effect would apply twice: once from the copy, once from the item. Effects created directly on an actor (origin not pointing to one of its items) are kept.

## Consequences

- Code that looks for an actor's effects must read every applicable effect (the actor's own plus the transferred effects of its items), not the actor's own effect collection. This includes dice pool modification aggregation.
- An effect's source item is its parent when the effect lives on an item. Parsing the origin only applies to effects that live on an actor.
- The migration cannot be undone without a world backup. Reverting to legacy transferral would require recreating the copies.
- Under legacy transferral, editing an effect from an actor's Effects tab edited the actor-side copy, so a copy may hold changes its item doesn't. Before deleting a copy, the migration writes its name, image, changes and duration onto the item's effect it was copied from (paired by order, as moving an item between actors already did). Its `disabled` is written only for items that aren't equipment: on equipment, the old equipment rule wrote it.
- The migration covers world actors, the synthetic actors of unlinked tokens and the world's actor compendiums. An actor created with legacy copies, for instance imported from an older module compendium, loses them at creation by the same rule.
- An equipment effect's suppression is derived from its item's equipment state when it is read, instead of being written onto the effect, since there is no actor-side copy left to write it on.
