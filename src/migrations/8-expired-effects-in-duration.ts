import { ActorChanges, ActorPlanner, EmbeddedUpdate } from '@/migrations/ActorMigration';

/** What this migration reads of an effect: the flag the Acting GM wrote on Foundry v13. */
type EffectSource = { _id: string; flags?: { genesys?: { expired?: unknown } } };

/** What this migration reads of an item: its effects. */
type ItemSource = { _id: string; effects?: EffectSource[] };

/**
 * The update that moves an effect's expiry from its flag to its duration, or undefined when it has no flag.
 */
function movedExpiry(effect: EffectSource, deletion: unknown): EmbeddedUpdate | undefined {
	const flags = effect.flags?.genesys;
	if (!flags || !Object.hasOwn(flags, 'expired')) {
		return undefined;
	}

	return { _id: effect._id, ...(flags.expired === true && { 'duration.expired': true }), 'flags.genesys.expired': deletion };
}

/**
 * Foundry v13 never expired an effect, so the Acting GM marked the Expired Effects of a combat with a
 * `flags.genesys.expired` flag, on its actors and their items. Foundry v14 marks them in `duration.expired`. This
 * planner moves a flag that is set into the duration, and deletes every flag, a cleared one included, with the deletion
 * operator it is given.
 */
export function expiredEffectsInDuration(deletion: unknown): ActorPlanner {
	return (source) => {
		const changes: ActorChanges = {};

		const effects = (source.effects as EffectSource[]).flatMap((effect) => movedExpiry(effect, deletion) ?? []);
		if (effects.length > 0) {
			changes.effects = effects;
		}

		for (const item of source.items as ItemSource[]) {
			const itemEffects = (item.effects ?? []).flatMap((effect) => movedExpiry(effect, deletion) ?? []);
			if (itemEffects.length > 0) {
				changes.itemEffects = { ...changes.itemEffects, [item._id]: itemEffects };
			}
		}

		return changes.effects || changes.itemEffects ? changes : undefined;
	};
}
