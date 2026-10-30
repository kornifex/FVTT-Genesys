/**
 * @file System settings data related to the Story Point Tracker.
 */

import type { NAMESPACE } from '@/settings';

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
		type: Object,
	});
}
