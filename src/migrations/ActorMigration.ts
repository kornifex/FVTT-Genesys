/**
 * @file Actor migrations: one walk over every actor a world holds, planners that say what to change on each one, and the chain that runs the migrations in order.
 */

import * as log from '@/log';

/**
 * The source data of an embedded document, as a planner reads it: its id, and the fields the planner declares.
 */
type EmbeddedSource = { _id: string };

/**
 * An update of an embedded document.
 */
export type EmbeddedUpdate = { _id: string } & Record<string, unknown>;

/**
 * What a planner reads of an actor: its source data.
 */
export type ActorSource = {
	name: string;
	type: string;
	system: Record<string, unknown>;
	items: EmbeddedSource[];
	effects: EmbeddedSource[];
};

/**
 * The changes to make to an actor: an update of the actor itself, updates of the effects of its items by item id, and
 * the ids of its own effects to delete.
 */
export type ActorChanges = {
	update?: Record<string, unknown>;
	itemEffects?: Record<string, EmbeddedUpdate[]>;
	deletedEffects?: string[];
};

/**
 * A migration, planned actor by actor: from one actor's source data, the changes to make to it, or none. A planner is
 * pure and idempotent, so a failed migration can run again.
 */
export type ActorPlanner = (source: ActorSource) => ActorChanges | undefined;

/**
 * What the walk needs of an actor.
 */
export type WalkedActor = {
	uuid: string;
	source: ActorSource;
	apply(changes: ActorChanges): Promise<unknown>;
};

/**
 * What the walk needs of an actor compendium.
 */
export type ActorPack = {
	locked: boolean;
	setLocked(locked: boolean): Promise<unknown>;
	actors(): Promise<WalkedActor[]>;
};

/**
 * Where the walk finds actors: the world's actors, the synthetic actors of unlinked tokens, and the world's own actor
 * compendiums.
 */
export type ActorWorld = {
	worldActors(): WalkedActor[];
	tokenActors(): WalkedActor[];
	actorPacks(): ActorPack[];
};

/**
 * Whether a compendium is one of the world's own actor compendiums, which the walk visits. Module and system
 * compendiums are left alone.
 */
export function isWorldActorPack(metadata: { type: string; packageType: string }) {
	return metadata.type === 'Actor' && metadata.packageType === 'world';
}

/**
 * Visit every actor of a world, its world actors first so that the tokens' synthetic actors see their migrated base. A
 * locked pack is unlocked for the visit and locked again afterwards, whatever happens.
 */
export async function walkActors(world: ActorWorld, visit: (actor: WalkedActor) => Promise<void>) {
	for (const actor of world.worldActors()) {
		await visit(actor);
	}

	for (const actor of world.tokenActors()) {
		await visit(actor);
	}

	for (const pack of world.actorPacks()) {
		const wasLocked = pack.locked;
		if (wasLocked) {
			await pack.setLocked(false);
		}

		try {
			for (const actor of await pack.actors()) {
				await visit(actor);
			}
		} finally {
			if (wasLocked) {
				await pack.setLocked(true);
			}
		}
	}
}

/**
 * Apply a planner to every actor of a world. Returns the uuids of the actors that couldn't be migrated.
 */
export async function migrateActors(world: ActorWorld, plan: ActorPlanner) {
	const failures: string[] = [];

	await walkActors(world, async (actor) => {
		try {
			const changes = plan(actor.source);
			if (changes) {
				await actor.apply(changes);
			}
		} catch (error) {
			log.error(error);
			failures.push(actor.uuid);
		}
	});

	return failures;
}

/**
 * What the chain reports of each migration it runs.
 */
export type MigrationReport = {
	starting(migrationId: number): void;
	completed(migrationId: number): void;
	stopped(migrationId: number): void;
};

/**
 * Run the migrations after a version, in order, stopping at the first that fails. Migration ids start at 1. Returns the
 * version reached: the id of the last migration that succeeded.
 */
export async function runMigrationChain(migrations: (() => Promise<boolean>)[], fromVersion: number, report: MigrationReport) {
	let version = fromVersion;

	for (; version < migrations.length; version++) {
		const migrationId = version + 1;
		report.starting(migrationId);

		let succeeded: boolean;
		try {
			succeeded = await migrations[version]();
		} catch (error) {
			log.error(error);
			succeeded = false;
		}

		if (!succeeded) {
			report.stopped(migrationId);
			break;
		}

		report.completed(migrationId);
	}

	return version;
}
