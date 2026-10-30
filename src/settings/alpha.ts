import type { NAMESPACE } from '@/settings';

/**
 * The setting of the last Alpha version the world acknowledged.
 */
export const KEY_ALPHA_VERSION = 'alphaVersion';
/**
 * The setting of the last migration the world ran.
 */
export const KEY_MIGRATION_VERSION = 'migrationVersion';

/**
 * The Alpha version a world that never acknowledged one holds.
 */
export const NEW_WORLD_ALPHA_VERSION = '0.0.0';

/**
 * Whether a world is new, from the last Alpha version it acknowledged: a new world has no actor to migrate.
 */
export function isNewWorld(lastAlpha: string) {
	return lastAlpha === NEW_WORLD_ALPHA_VERSION;
}

/**
 * Register the world settings of the Alpha notice and the migrations.
 */
export function register(namespace: typeof NAMESPACE) {
	game.settings.register(namespace, KEY_ALPHA_VERSION, {
		name: 'Alpha Version',
		config: false,
		default: NEW_WORLD_ALPHA_VERSION,
		type: String,
		scope: 'world',
	});

	game.settings.register(namespace, KEY_MIGRATION_VERSION, {
		name: 'Migration Version',
		config: false,
		default: 0,
		type: Number,
		scope: 'world',
	});
}
