import { hasEquipmentState } from '@/actor/data/EquipmentEffects';
import { ActorPlanner, EmbeddedUpdate } from '@/migrations/ActorMigration';

/** What this migration reads of an effect. */
type EffectSource = { _id: string; transfer?: boolean; disabled: boolean };

/** What this migration reads of an item. */
type ItemSource = { _id: string; type: string; effects: EffectSource[] };

/**
 * Under legacy transferral, every Equipment State change overwrote the `disabled` of the actor's copies of its
 * equipment's effects, so an effect disabled on the item only stayed disabled until the item's first change. GMs
 * disabled an armor's effect so that it applied once Equipped rather than while Carried. Since effects stay on their
 * item (ADR 0001), the item effect's own `disabled` holds for good, and such an effect never applies. This planner
 * enables the transferred effects of the items that have an Equipment State on the actor, leaving that state to decide
 * whether they apply. Talents, adversaries' equipment and the actor's own effects keep their `disabled`.
 */
export const effectsFollowEquipmentState: ActorPlanner = (source) => {
	const itemEffects: Record<string, EmbeddedUpdate[]> = {};
	for (const item of source.items as ItemSource[]) {
		if (!hasEquipmentState(source.type, item.type)) {
			continue;
		}

		// Legacy transferral only copied, and so only overwrote, the effects that transfer.
		const updates = item.effects
			.filter((effect) => effect.transfer !== false && effect.disabled)
			.map((effect) => ({ _id: effect._id, disabled: false }));
		if (updates.length > 0) {
			itemEffects[item._id] = updates;
		}
	}

	return Object.keys(itemEffects).length > 0 ? { itemEffects } : undefined;
};
