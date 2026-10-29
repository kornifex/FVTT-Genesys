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
import * as log from '@/log';
import { isActingGm } from '@/socket';

async function applyChanges(actor: Actor, { update, itemEffects = {}, deletedEffects = [] }: ActorChanges) {
	if (update) {
		await actor.update(update);
	}

	for (const [itemId, updates] of Object.entries(itemEffects)) {
		await actor.items.get(itemId)?.updateEmbeddedDocuments('ActiveEffect', updates);
	}

	if (deletedEffects.length > 0) {
		await actor.deleteEmbeddedDocuments('ActiveEffect', deletedEffects);
	}
}

function walkedActor(actor: Actor): WalkedActor {
	return { uuid: actor.uuid, source: actor.toObject() as ActorSource, apply: (changes) => applyChanges(actor, changes) };
}

/**
 * The actors of the running world: its actors, the synthetic actors of the unlinked tokens of its scenes, and the actors
 * of its own actor compendiums. Module and system compendiums are left alone.
 */
const foundryActorWorld: ActorWorld = {
	worldActors: () => game.actors.map(walkedActor),
	tokenActors: () =>
		game.scenes.contents.flatMap((scene) =>
			scene.tokens.contents.flatMap((token) => (!token.actorLink && token.actor ? [walkedActor(token.actor)] : [])),
		),
	actorPacks: () =>
		game.packs
			.filter((pack) => isWorldActorPack(pack.metadata))
			.map((pack) => ({
				locked: pack.locked,
				setLocked: (locked) => pack.configure({ locked }),
				actors: async () => ((await pack.getDocuments()) as Actor[]).map(walkedActor),
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

const migrations: readonly (() => Promise<boolean>)[] = [
	() => migrateEveryActor(useUuidForVehicles((id) => game.actors.get(id)?.uuid)),
	() => migrateEveryActor(actorOnlyOnceInCrew),
	() => migrateEveryActor(effectsStayOnItemsWithNotifications),
	() => migrateEveryActor(effectsFollowEquipmentState),
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

	const currentMigrationVersion = game.settings.get<number>(NAMESPACE, KEY_MIGRATION_VERSION) ?? 0;
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
