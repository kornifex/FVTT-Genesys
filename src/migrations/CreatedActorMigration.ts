/** @file The migrations an actor gets when it is created, for instance imported from an older compendium. */

import { ActorPlanner, EmbeddedUpdate } from '@/migrations/ActorMigration';
import { effectsStayOnItemsWithNotifications } from '@/migrations/3-effects-stay-on-items';
import { effectsFollowEquipmentState } from '@/migrations/4-effects-follow-equipment-state';
import { linkTalentPurchases } from '@/migrations/5-link-talent-purchases';

// Migration 3 never writes the `disabled` of equipment, the only field migration 4 writes, so the updates of one effect
// merge without conflict.
function mergeItemEffects(...plans: Record<string, EmbeddedUpdate[]>[]) {
	const merged: Record<string, EmbeddedUpdate[]> = {};
	for (const [itemId, updates] of plans.flatMap((plan) => Object.entries(plan))) {
		const itemUpdates = (merged[itemId] ??= []);
		for (const update of updates) {
			const existing = itemUpdates.find((candidate) => candidate._id === update._id);
			if (existing) {
				Object.assign(existing, update);
			} else {
				itemUpdates.push({ ...update });
			}
		}
	}

	return merged;
}

// An actor created with legacy copies of its items' effects gets migrations 3 and 4, as the world's actors did. Those
// copies mark it as an actor of 0.3.1: an actor created without any, such as a duplicate or an export of a migrated
// actor, keeps its disabled equipment effects, since a GM disabled them after the migration.
function legacyEffectsMigration(effectsStayOnItems: ActorPlanner): ActorPlanner {
	return (source) => {
		const legacy = effectsStayOnItems(source);
		if (!legacy) {
			return undefined;
		}

		const enabled = effectsFollowEquipmentState(source);
		const itemEffects = mergeItemEffects(legacy.itemEffects ?? {}, enabled?.itemEffects ?? {});
		return { ...legacy, ...(Object.keys(itemEffects).length > 0 && { itemEffects }) };
	};
}

/**
 * The migrations of an actor created from older data, as the world's actors got them: migrations 3 and 4 when it holds
 * legacy copies of its items' effects, and migration 5 whatever it holds, since no talent purchase has been recorded
 * without its talent's id since upstream 0.1.14.
 */
export function createdActorMigration(effectsStayOnItems: ActorPlanner): ActorPlanner {
	const legacyEffects = legacyEffectsMigration(effectsStayOnItems);
	return (source) => {
		// The effects migrations change effects only, and migration 5 the actor only: their changes don't overlap.
		const changes = { ...legacyEffects(source), ...linkTalentPurchases(source) };
		return Object.keys(changes).length > 0 ? changes : undefined;
	};
}

/**
 * The migrations of a created actor, warning the user of the items whose edits weren't kept.
 */
export const migrateCreatedActor = createdActorMigration(effectsStayOnItemsWithNotifications);
