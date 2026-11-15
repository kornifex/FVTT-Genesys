import type { GenesysActor } from '@/actor/GenesysActor';
import type { GenesysItem } from '@/item/GenesysItem';
import { unlinkedTokenActors } from '@/actor/tokenActors';
import { NAMESPACE } from '@/settings';
import { isNewWorld, KEY_MIGRATION_VERSION } from '@/settings/alpha';
import {
	ActorChanges,
	ActorPlanner,
	ActorSource,
	ActorWorld,
	isWorldActorPack,
	migrateActors,
	runMigrationChain,
	WalkedActor,
} from '@/migrations/ActorMigration';
import { useUuidForVehicles } from '@/migrations/1-use-uuid-for-vehicle';
import { actorOnlyOnceInCrew } from '@/migrations/2-actors-once-in-vehicle';
import { effectsStayOnItemsWithNotifications } from '@/migrations/3-effects-stay-on-items';
import { effectsFollowEquipmentState } from '@/migrations/4-effects-follow-equipment-state';
import { linkTalentPurchases } from '@/migrations/5-link-talent-purchases';
import { CombatSource, combatSystemData } from '@/migrations/6-combat-system-data';
import { maneuverEffectsProvideDefense } from '@/migrations/7-maneuver-effects-provide-defense';
import { expiredEffectsInDuration } from '@/migrations/8-expired-effects-in-duration';
import { viciousThroughItsEffect } from '@/migrations/9-vicious-through-its-effect';
import { poolModificationsTypeOfActor, poolModificationsTypeOfItem } from '@/migrations/10-pool-modifications-change-type';
import {
	actorItemsPlanner,
	isWorldItemPack,
	ItemChanges,
	ItemPlanner,
	ItemSource,
	ItemWorld,
	migrateItems,
	WalkedItem,
} from '@/migrations/ItemMigration';
import { keyDeletion } from '@/data/keyDeletion';
import * as log from '@/log';
import { isActingGm } from '@/queries';

async function applyChanges(
	actor: GenesysActor,
	{ update, effects = [], items = [], createdItemEffects = {}, itemEffects = {}, deletedEffects = [] }: ActorChanges,
) {
	if (update) {
		await actor.update(update);
	}

	if (effects.length > 0) {
		await actor.updateEmbeddedDocuments('ActiveEffect', effects);
	}

	if (items.length > 0) {
		await actor.updateEmbeddedDocuments('Item', items);
	}

	for (const [itemId, created] of Object.entries(createdItemEffects)) {
		// A planner writes an effect's data as the world stores it, which the type system can't check.
		await actor.items.get(itemId)?.createEmbeddedDocuments('ActiveEffect', created as ActiveEffect.CreateData[]);
	}

	for (const [itemId, updates] of Object.entries(itemEffects)) {
		await actor.items.get(itemId)?.updateEmbeddedDocuments('ActiveEffect', updates);
	}

	if (deletedEffects.length > 0) {
		await actor.deleteEmbeddedDocuments('ActiveEffect', deletedEffects);
	}
}

function walkedActor(actor: GenesysActor): WalkedActor {
	// Every actor the world holds has a uuid, an unlinked token's synthetic actor included.
	return { uuid: actor.uuid!, source: actor.toObject() as ActorSource, apply: (changes) => applyChanges(actor, changes) };
}

/**
 * The actors of the running world: its actors, the synthetic actors of the unlinked tokens of its scenes, and the actors
 * of its own actor compendiums. Module and system compendiums are left alone.
 */
const foundryActorWorld: ActorWorld = {
	worldActors: () => game.actors.map(walkedActor),
	tokenActors: () => unlinkedTokenActors().map(walkedActor),
	actorPacks: () =>
		game.packs
			.filter((pack) => isWorldActorPack(pack.metadata))
			.map((pack) => ({
				locked: pack.locked,
				setLocked: (locked) => pack.configure({ locked }),
				actors: async () => ((await pack.getDocuments()) as Actor.Stored[]).map(walkedActor),
			})),
};

/**
 * Migrate every actor with a planner. It fails if any actor couldn't be migrated.
 */
async function migrateEveryActor(plan: ActorPlanner) {
	const failures = await migrateActors(foundryActorWorld, plan);
	if (failures.length > 0) {
		log.error('Unable to migrate these actors:', failures);
	}

	return failures.length === 0;
}

async function applyItemChanges(item: GenesysItem, { update, effects = [], createdEffects = [] }: ItemChanges) {
	if (update) {
		await item.update(update);
	}

	if (effects.length > 0) {
		await item.updateEmbeddedDocuments('ActiveEffect', effects);
	}

	if (createdEffects.length > 0) {
		// A planner writes an effect's data as the world stores it, which the type system can't check.
		await item.createEmbeddedDocuments('ActiveEffect', createdEffects as ActiveEffect.CreateData[]);
	}
}

function walkedItem(item: GenesysItem): WalkedItem {
	// Every item the world holds outside an actor has a uuid.
	return { uuid: item.uuid!, source: item.toObject() as ItemSource, apply: (changes) => applyItemChanges(item, changes) };
}

/**
 * The items of the running world outside its actors: its items, and the items of its own item compendiums. Module and
 * system compendiums are left alone.
 */
const foundryItemWorld: ItemWorld = {
	worldItems: () => game.items.map(walkedItem),
	itemPacks: () =>
		game.packs
			.filter((pack) => isWorldItemPack(pack.metadata))
			.map((pack) => ({
				locked: pack.locked,
				setLocked: (locked) => pack.configure({ locked }),
				items: async () => ((await pack.getDocuments()) as Item.Stored[]).map(walkedItem),
			})),
};

/**
 * Migrate every item with a planner: the items of every actor, then the world's own. It fails if any actor or item
 * couldn't be migrated.
 */
async function migrateEveryItem(plan: ItemPlanner) {
	const actorsMigrated = await migrateEveryActor(actorItemsPlanner(plan));
	const failures = await migrateItems(foundryItemWorld, plan);
	if (failures.length > 0) {
		log.error('Unable to migrate these items:', failures);
	}

	return actorsMigrated && failures.length === 0;
}

/**
 * The English name of the Vicious quality, which a world's quality may have whatever the world's language.
 */
const VICIOUS = 'Vicious';

/**
 * Move the Initiative Slots' state of every combat of the world, and of its combatants, from flags into system data. It
 * fails if any combat couldn't be migrated.
 */
async function migrateCombats() {
	const failures: string[] = [];

	for (const combat of game.combats) {
		const changes = combatSystemData(combat.toObject() as CombatSource);
		if (!changes) {
			continue;
		}

		try {
			await combat.update({ system: changes.system, ...keyDeletion('flags.genesys', ...changes.deletedFlags) });
			if (changes.combatants.length > 0) {
				await combat.updateEmbeddedDocuments(
					'Combatant',
					changes.combatants.map(({ _id, initiativeSkill }) => ({
						_id,
						system: { initiativeSkill },
						...keyDeletion('flags.genesys', 'initiativeSkill'),
					})),
				);
			}
		} catch (error) {
			log.error(`Unable to migrate the combat ${combat.id}:`, error);
			failures.push(combat.id);
		}
	}

	if (failures.length > 0) {
		log.error('Unable to migrate these combats:', failures);
	}

	return failures.length === 0;
}

const migrations: readonly (() => Promise<boolean>)[] = [
	() => migrateEveryActor(useUuidForVehicles((id) => game.actors.get(id)?.uuid)),
	() => migrateEveryActor(actorOnlyOnceInCrew),
	() => migrateEveryActor(effectsStayOnItemsWithNotifications),
	() => migrateEveryActor(effectsFollowEquipmentState),
	() => migrateEveryActor(linkTalentPurchases),
	migrateCombats,
	() => migrateEveryActor(maneuverEffectsProvideDefense),
	() => migrateEveryActor(expiredEffectsInDuration(_del)),
	() =>
		migrateEveryItem(
			viciousThroughItsEffect([VICIOUS, game.i18n.localize('Genesys.Migration.ViciousQuality')], () => foundry.utils.randomID()),
		),
	async () => {
		const actorsMigrated = await migrateEveryActor(poolModificationsTypeOfActor);
		return (await migrateEveryItem(poolModificationsTypeOfItem)) && actorsMigrated;
	},
];

/**
 * Run the migrations the world hasn't run yet, from the version of the last Alpha notice it showed: a new world has
 * nothing to migrate, and records every migration as run.
 */
export async function ready(lastAlpha: string) {
	const totalMigrationScripts = migrations.length;
	if (isNewWorld(lastAlpha)) {
		await game.settings.set(NAMESPACE, KEY_MIGRATION_VERSION, totalMigrationScripts);
		return;
	}

	const currentMigrationVersion = game.settings.get(NAMESPACE, KEY_MIGRATION_VERSION) ?? 0;
	if (currentMigrationVersion === totalMigrationScripts) {
		return;
	}

	if (!isActingGm()) {
		ui.notifications.error('Genesys.Migration.MustPerformMigration', { localize: true, permanent: true });
		return;
	}

	ui.notifications.warn(
		game.i18n.format('Genesys.Migration.StartingMigration', { amount: totalMigrationScripts - currentMigrationVersion }),
		{ permanent: true },
	);

	const lastMigrationRun = await runMigrationChain(migrations, currentMigrationVersion, {
		starting: (id) => ui.notifications.warn(game.i18n.format('Genesys.Migration.StartingScriptMigration', { id }), { permanent: true }),
		completed: (id) =>
			ui.notifications.warn(game.i18n.format('Genesys.Migration.CompletedScriptMigration', { id }), { permanent: true }),
		stopped: (id) => ui.notifications.error(game.i18n.format('Genesys.Migration.StoppedScriptMigration', { id }), { permanent: true }),
	});

	const runAmountMigrations = lastMigrationRun - currentMigrationVersion;
	if (runAmountMigrations > 0) {
		await game.settings.set(NAMESPACE, KEY_MIGRATION_VERSION, lastMigrationRun);
		ui.notifications.info('Genesys.Migration.MultipleSuccessfulMigration', { localize: true, permanent: true });
	}

	const remainingAmountMigrations = totalMigrationScripts - lastMigrationRun;
	if (remainingAmountMigrations > 0) {
		ui.notifications.error(game.i18n.format('Genesys.Migration.StoppedMigration', { amount: remainingAmountMigrations }), {
			permanent: true,
		});
	} else {
		ui.notifications.info('Genesys.Migration.CompletedMigration', { localize: true, permanent: true });
	}
}
