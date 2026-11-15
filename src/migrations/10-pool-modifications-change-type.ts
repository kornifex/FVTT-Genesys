import { ActorPlanner, EmbeddedUpdate } from '@/migrations/ActorMigration';
import { ItemPlanner } from '@/migrations/ItemMigration';

/** What this migration reads of a change. */
type ChangeSource = { key: string; type?: string };

/**
 * What this migration reads of an effect. Foundry migrates an effect that a world stored before v14 as it loads it, so
 * that its changes are in its system and have a type.
 */
type EffectSource = { _id: string; system?: { changes?: ChangeSource[] } };

// The key prefix and the types written out as 0.7.0 and 0.7.1 store them, whatever later versions name them.
const POOL_KEY_PREFIX = 'genesys.pool.';
const CUSTOM_TYPE = 'custom';
const POOL_MODIFICATION_TYPE = 'genesys.poolModification';

const isCustomPoolModification = ({ key, type }: ChangeSource) => type === CUSTOM_TYPE && key.startsWith(POOL_KEY_PREFIX);

/**
 * The updates that give the Pool Modifications of some effects their own type. Up to 0.7.0, which ran on Foundry v13
 * too, a Pool Modification took Foundry's custom type, which v13 offered for the changes a system reads itself; Foundry
 * v14 lets the system register a type of its own. Only a change of the custom type is rewritten, keeping its other
 * fields: one a user set to another type isn't what the system wrote.
 */
function poolModificationsTyped(effects: readonly EffectSource[]): EmbeddedUpdate[] {
	return effects.flatMap((effect) => {
		const changes = effect.system?.changes ?? [];
		if (!changes.some(isCustomPoolModification)) {
			return [];
		}

		const typed = changes.map((change) => (isCustomPoolModification(change) ? { ...change, type: POOL_MODIFICATION_TYPE } : change));
		return [{ _id: effect._id, system: { changes: typed } }];
	});
}

/**
 * This migration's planner for the actor's own effects; {@link poolModificationsTypeOfItem} plans its items'.
 */
export const poolModificationsTypeOfActor: ActorPlanner = (source) => {
	const effects = poolModificationsTyped(source.effects);
	return effects.length > 0 ? { effects } : undefined;
};

/**
 * This migration's planner for an item's effects.
 */
export const poolModificationsTypeOfItem: ItemPlanner = (source) => {
	// The type system can't see the shape of a stored effect, which ItemSource leaves open.
	const effects = poolModificationsTyped(source.effects as EffectSource[]);
	return effects.length > 0 ? { effects } : undefined;
};
