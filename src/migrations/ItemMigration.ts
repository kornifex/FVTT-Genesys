/**
 * @file Item migrations: planners that say what to change on one item, applied to the items of every actor and to the
 * world's own items and item compendiums.
 */

import * as log from '@/log';
import { ActorPlanner, EmbeddedUpdate, LockablePack, whileUnlocked } from '@/migrations/ActorMigration';

/**
 * What a planner reads of an item: its source data.
 */
export type ItemSource = {
	_id: string;
	name: string;
	type: string;
	system: Record<string, unknown>;
	effects: object[];
};

/**
 * The changes to make to an item: an update of the item itself, then effects to create on it.
 */
export type ItemChanges = {
	update?: Record<string, unknown>;
	createdEffects?: object[];
};

/**
 * A migration, planned item by item: from one item's source data, the changes to make to it, or none. A planner is
 * idempotent, so a failed migration can run again.
 */
export type ItemPlanner = (source: ItemSource) => ItemChanges | undefined;

/**
 * An item planner applied to each item of an actor.
 */
export function actorItemsPlanner(plan: ItemPlanner): ActorPlanner {
	return (source) => {
		const items: EmbeddedUpdate[] = [];
		const createdItemEffects: Record<string, object[]> = {};
		// The type system can't see the shape of a stored item, which ActorSource leaves open.
		for (const item of source.items as ItemSource[]) {
			const { update, createdEffects = [] } = plan(item) ?? {};
			if (update) {
				items.push({ _id: item._id, ...update });
			}
			if (createdEffects.length > 0) {
				createdItemEffects[item._id] = createdEffects;
			}
		}

		if (items.length === 0 && Object.keys(createdItemEffects).length === 0) {
			return undefined;
		}

		return { ...(items.length > 0 && { items }), ...(Object.keys(createdItemEffects).length > 0 && { createdItemEffects }) };
	};
}

/**
 * What the walk needs of an item.
 */
export type WalkedItem = {
	uuid: string;
	source: ItemSource;
	apply(changes: ItemChanges): Promise<unknown>;
};

/**
 * What the walk needs of an item compendium.
 */
export type ItemPack = LockablePack & {
	items(): Promise<WalkedItem[]>;
};

/**
 * Where the walk finds items outside actors: the world's items and its own item compendiums.
 */
export type ItemWorld = {
	worldItems(): WalkedItem[];
	itemPacks(): ItemPack[];
};

/**
 * Whether a compendium is one of the world's own item compendiums, which the walk visits. Module and system compendiums
 * are left alone.
 */
export function isWorldItemPack(metadata: { type: string; packageType: string }) {
	return metadata.type === 'Item' && metadata.packageType === 'world';
}

/**
 * Apply a planner to every item of a world outside its actors. A locked pack is unlocked for the visit and locked again
 * afterwards. Returns the uuids of the items that couldn't be migrated.
 */
export async function migrateItems(world: ItemWorld, plan: ItemPlanner) {
	const failures: string[] = [];
	const visit = async (item: WalkedItem) => {
		try {
			const changes = plan(item.source);
			if (changes) {
				await item.apply(changes);
			}
		} catch (error) {
			log.error(error);
			failures.push(item.uuid);
		}
	};

	for (const item of world.worldItems()) {
		await visit(item);
	}

	for (const pack of world.itemPacks()) {
		await whileUnlocked(pack, async () => {
			for (const item of await pack.items()) {
				await visit(item);
			}
		});
	}

	return failures;
}
