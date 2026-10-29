/**
 * @file Foundry application to track the current pools of story points.
 */

import { NAMESPACE as SETTINGS_NAMESPACE } from '@/settings';
import { KEY_STORY_POINTS, type StoryPointData } from '@/settings/storyPoints';
import { sessionStoryPoints, SPEND_MESSAGES, type StoryPointPool, storyPointsAfterSpending } from '@/data/StoryPoints';
import * as log from '@/log';
import { emit as socketEmit, handle as handleSocket, SocketOperation } from '@/socket';
import type { PlayerSpendStoryPointData } from '@/socket/Relay';
import VueStoryPointTracker from '@/vue/apps/StoryPointTracker.vue';
import { VueSheet } from '@/vue/VueSheet';

/**
 * What the tracker shows: the Story Points of each pool.
 */
export type StoryPointTrackerContext = StoryPointData;

/**
 * Singleton application used to track the current pools of Story Points.
 */
export class StoryPointTracker extends VueSheet(foundry.applications.api.ApplicationV2) {
	static #instance?: StoryPointTracker;

	static get instance(): StoryPointTracker | undefined {
		return StoryPointTracker.#instance;
	}

	static override DEFAULT_OPTIONS = {
		id: 'story-point-tracker',
		classes: ['genesys', 'story-point-tracker'],
		window: { frame: false, positioned: false },
	};

	override get vueComponent() {
		return VueStoryPointTracker;
	}

	get storyPoints() {
		return <StoryPointData>game.settings.get(SETTINGS_NAMESPACE, KEY_STORY_POINTS);
	}

	override async getVueContext(): Promise<StoryPointTrackerContext> {
		return { ...this.storyPoints };
	}

	constructor() {
		if (StoryPointTracker.#instance) {
			throw new Error('Attempted to create multiple instances of the StoryPointTracker singleton.');
		}

		// Foundry's interface leaves room for the tracker on the left.
		super({ classes: ['move-to-left'] });

		StoryPointTracker.#instance = this;
	}

	static forceRender() {
		void StoryPointTracker.#instance?.render(true);
	}

	static async resetStoryPoints({ player, gm }: { player?: number; gm?: number } = {}) {
		// Players can only Spend story points, they cannot set them.
		if (!game.user.isGM) {
			return;
		}

		const session = sessionStoryPoints(game.users.filter((u) => !u.isGM && u.active).length);
		await game.settings.set(SETTINGS_NAMESPACE, KEY_STORY_POINTS, {
			player: player ?? session.player,
			gm: gm ?? session.gm,
		});

		StoryPointTracker.forceRender();

		// Inform other connected clients to update the story point count.
		socketEmit(SocketOperation.UpdateStoryPointTracker);
	}

	/**
	 * Spends a Story Point for the current user. A GM writes the spend; a player's goes to the Acting GM, who writes it.
	 */
	static async spendStoryPoint(pool: StoryPointPool) {
		if (!StoryPointTracker.instance) {
			return;
		}

		if (!storyPointsAfterSpending(StoryPointTracker.instance.storyPoints, pool)) {
			ui.notifications.warn(game.i18n.localize('Genesys.Notifications.NotEnoughStoryPoints'));
			return;
		}

		if (game.user.isGM) {
			await StoryPointTracker.#spend(pool, game.user);
		} else if (pool === 'player') {
			// Only a GM may write the pools: with none connected, nothing is spent.
			if (!socketEmit(SocketOperation.PlayerSpendStoryPoint, { userId: game.user.id })) {
				ui.notifications.warn(game.i18n.localize('Genesys.Notifications.NoGMForStoryPoint'));
			}
		} else {
			ui.notifications.error(game.i18n.localize('Genesys.Notifications.GenericError'));
		}
	}

	static #writes: Promise<unknown> = Promise.resolve();

	/**
	 * Writes a spend from a pool, and tells whether there was a point to spend.
	 */
	static async #writeSpend(pool: StoryPointPool) {
		if (!StoryPointTracker.instance) {
			return false;
		}

		// The pools may have changed since the user spent the point: a player's spend reaches the GM later.
		const spentStoryPoints = storyPointsAfterSpending(StoryPointTracker.instance.storyPoints, pool);
		if (!spentStoryPoints) {
			return false;
		}

		await game.settings.set(SETTINGS_NAMESPACE, KEY_STORY_POINTS, spentStoryPoints);
		StoryPointTracker.forceRender();
		socketEmit(SocketOperation.UpdateStoryPointTracker);
		return true;
	}

	/**
	 * Writes a user's spend from a pool, then posts its chat message as that user. Only a GM may write the pools.
	 */
	static async #spend(pool: StoryPointPool, user: User) {
		// Spends that reach the GM together, from a double click or two players, are written one after the other: each
		// reads the pools the previous one wrote, so that no point is spent twice.
		const written = StoryPointTracker.#writes.then(() => StoryPointTracker.#writeSpend(pool));
		// The failed write rejects to its own caller; the next ones still run.
		StoryPointTracker.#writes = written.catch(() => false);
		if (!(await written)) {
			return;
		}

		const chatTemplate = await renderTemplate('systems/genesys/templates/chat/storypoint.hbs', {
			type: pool,
			message: SPEND_MESSAGES[pool],
		});
		const message = {
			// v12 renamed the message's `user` to `author`, which the types we have don't know; v14 drops `user`.
			author: user.id,
			speaker: {
				actor: user.character?.id,
			},
			content: chatTemplate,
			style: CONST.CHAT_MESSAGE_STYLES.OOC,
		};
		await ChatMessage.create(message as unknown as PreCreate<foundry.data.ChatMessageSource>);
	}

	/**
	 * Handles a player's spend, as the Acting GM.
	 */
	static async spendForPlayer({ userId }: PlayerSpendStoryPointData) {
		const player = game.users.get(userId);
		if (!player) {
			log.error(`A Story Point spend was received from an unknown user ${userId}`);
			return;
		}

		await StoryPointTracker.#spend('player', player);
	}
}

/**
 * Initialize the Story Point Tracker and handle its socket operations.
 */
export function register() {
	if (StoryPointTracker.instance) {
		return;
	}

	new StoryPointTracker();
	StoryPointTracker.forceRender();

	handleSocket(SocketOperation.PlayerSpendStoryPoint, (data) => StoryPointTracker.spendForPlayer(data));
	handleSocket(SocketOperation.UpdateStoryPointTracker, () => StoryPointTracker.forceRender());
}
