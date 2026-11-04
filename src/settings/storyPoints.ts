/**
 * @file System settings data related to the Story Point Tracker.
 */

import type { NAMESPACE } from '@/settings';
import { countField, type Localize } from '@/settings/table';

/**
 * Current Story Points data.
 */
export const KEY_STORY_POINTS = 'storyPoints';

/**
 * Structure of actual story point data stored in settings.
 */
export type StoryPointData = {
	/**
	 * Number of Story Points available to the GM.
	 */
	gm: number;

	/**
	 * Number of Story Points available to players.
	 */
	player: number;
};

/**
 * The field the world stores the Story Points with: Foundry refuses to store a pool that isn't a count.
 */
export function storyPointsField(localize: Localize) {
	return new foundry.data.fields.SchemaField({ gm: countField(localize), player: countField(localize) });
}

/**
 * Register the world setting that stores the Story Points.
 */
export function register(namespace: typeof NAMESPACE) {
	game.settings.register(namespace, KEY_STORY_POINTS, {
		name: 'StoryPoints',
		scope: 'world',
		config: false,
		default: {
			gm: 0,
			player: 0,
		},
		type: storyPointsField((key) => game.i18n.localize(key)),
	});
}
