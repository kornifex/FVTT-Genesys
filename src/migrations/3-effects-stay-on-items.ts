import { hasEquipmentState } from '@/actor/data/EquipmentEffects';
import { originItemId } from '@/effects/EffectOrigin';
import { ActorPlanner, EmbeddedUpdate } from '@/migrations/ActorMigration';
import * as log from '@/log';

/** What this migration reads of an effect. */
type EffectSource = {
	_id: string;
	origin: string | null;
	transfer?: boolean;
	disabled: boolean;
} & Record<(typeof WRITTEN_FIELDS)[number], unknown>;

/** What this migration reads of an item. */
type ItemSource = { _id: string; name: string; type: string; effects: EffectSource[] };

// The fields of a copy that may hold edits its item's effect doesn't: under legacy transferral, the actor's Effects tab
// edited the copy.
const WRITTEN_FIELDS = ['name', 'img', 'changes', 'duration'] as const;

function sameValue(left: unknown, right: unknown) {
	return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Under legacy transferral, Foundry copied the effects of an actor's items onto the actor; they now stay on their item
 * and apply from there (ADR 0001). This planner deletes the copies: the actor's effects whose origin is one of its own
 * items. Effects created on the actor are kept.
 *
 * Before that, it writes what each copy holds onto the item's effect it was copied from, pairing an item's copies with
 * its transferred effects by order. A copy's `disabled` is only written for items without an Equipment State: on
 * equipment, the old equipment rule wrote it. When an item's copies and transferred effects don't pair up, its effects
 * are left as they are and `warnUnpaired` is called.
 */
export function effectsStayOnItems(warnUnpaired: (actorName: string, itemName: string) => void): ActorPlanner {
	return (source) => {
		const items = source.items as ItemSource[];
		const effects = source.effects as EffectSource[];

		const copiesByItem = new Map<ItemSource, EffectSource[]>();
		for (const effect of effects) {
			const itemId = originItemId(effect.origin);
			const item = items.find((candidate) => candidate._id === itemId);
			if (item) {
				copiesByItem.set(item, [...(copiesByItem.get(item) ?? []), effect]);
			}
		}

		if (copiesByItem.size === 0) {
			return undefined;
		}

		const itemEffects: Record<string, EmbeddedUpdate[]> = {};
		for (const [item, copies] of copiesByItem) {
			// Legacy transferral only copied the effects that transfer.
			const transferred = item.effects.filter((effect) => effect.transfer !== false);
			if (transferred.length !== copies.length) {
				warnUnpaired(source.name, item.name);
				continue;
			}

			const fields = hasEquipmentState(source.type, item.type) ? WRITTEN_FIELDS : [...WRITTEN_FIELDS, 'disabled' as const];
			const updates = copies.flatMap((copy, index) => {
				const original = transferred[index];
				const update = Object.fromEntries(
					fields.filter((field) => !sameValue(copy[field], original[field])).map((field) => [field, copy[field]]),
				);
				return Object.keys(update).length > 0 ? [{ _id: original._id, ...update }] : [];
			});

			if (updates.length > 0) {
				itemEffects[item._id] = updates;
			}
		}

		return {
			...(Object.keys(itemEffects).length > 0 && { itemEffects }),
			deletedEffects: [...copiesByItem.values()].flat().map((copy) => copy._id),
		};
	};
}

/**
 * The planner, warning the user of the items whose edits weren't kept.
 */
export const effectsStayOnItemsWithNotifications = effectsStayOnItems((actorName, itemName) => {
	const message = game.i18n.format('Genesys.Migration.UnpairedEffectCopies', { actor: actorName, item: itemName });
	log.warn(message);
	ui.notifications.warn(message, { permanent: true });
});
