/**
 * @file Foundry application to track the current pools of story points.
 */

import { NAMESPACE as SETTINGS_NAMESPACE } from '@/settings';
import { KEY_STORY_POINTS, type StoryPointData } from '@/settings/storyPoints';
import {
	serialStoryPointWrites,
	sessionStoryPoints,
	SPEND_MESSAGES,
	type StoryPointPool,
	storyPointsAfterSetting,
	storyPointsAfterSpending,
} from '@/data/StoryPoints';
import { askActingGm, handleQuery, QueryName, refuse } from '@/queries';
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

	/**
	 * The tracker, once registered.
	 */
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

	/**
	 * The Story Points of each pool, as the world stores them.
	 */
	get storyPoints() {
		return game.settings.get(SETTINGS_NAMESPACE, KEY_STORY_POINTS);
	}

	override async getVueContext(): Promise<StoryPointTrackerContext> {
		return { ...this.storyPoints };
	}

	constructor() {
		if (StoryPointTracker.#instance) {
			throw new Error('Attempted to create multiple instances of the StoryPointTracker singleton.');
		}

		super();

		StoryPointTracker.#instance = this;
	}

	/**
	 * Insert the tracker in the column Foundry keeps beside the sidebar, which follows it when it collapses, rather than
	 * in the document's body.
	 */
	protected override _insertElement(element: HTMLElement) {
		const existing = document.getElementById(element.id);
		if (existing) {
			existing.replaceWith(element);
		} else {
			(document.getElementById('ui-right-column-1') ?? document.body).append(element);
		}
	}

	/**
	 * Render the tracker again on this client. The pools' setting does at each write.
	 */
	static forceRender() {
		void StoryPointTracker.#instance?.render(true);
	}

	/**
	 * Set the Story Point pools, by default to those of a new session: one point per active player in the player pool,
	 * one in the GM pool. Only a GM may.
	 */
	static async resetStoryPoints({ player, gm }: { player?: number; gm?: number } = {}) {
		// Players can only Spend story points, they cannot set them.
		if (!game.user.isGM) {
			return;
		}

		const session = sessionStoryPoints(game.users.filter((u) => !u.isGM && u.active).length);
		// After the changes already on their way, as they would land before it.
		await StoryPointTracker.#write(() => ({ player: player ?? session.player, gm: gm ?? session.gm }));
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
			await askActingGm(QueryName.SpendStoryPoint, {});
		} else {
			ui.notifications.error(game.i18n.localize('Genesys.Notifications.GenericError'));
		}
	}

	/**
	 * Add a point to one pool, as the GM's + does: the other pool keeps its points. Only a GM may.
	 */
	static async addStoryPoint(pool: StoryPointPool) {
		if (game.user.isGM) {
			await StoryPointTracker.#write((storyPoints) => storyPointsAfterSetting(storyPoints, pool, storyPoints[pool] + 1));
		}
	}

	/**
	 * Set one pool to a count the GM typed, leaving the other as it is when the write runs. Only a GM may.
	 */
	static async setStoryPointPool(pool: StoryPointPool, count: number) {
		if (game.user.isGM) {
			await StoryPointTracker.#write((storyPoints) => storyPointsAfterSetting(storyPoints, pool, count));
		}
	}

	// The GM's changes of the pools that reach this client together (a double click, a spend then a +, two players'
	// spends) are written one after the other, each from the pools the previous one wrote, so that none is lost and no
	// point is spent twice. A player's spend reaches the GM later than the player clicked: it reads the pools then too.
	static #write = serialStoryPointWrites(
		() => game.settings.get(SETTINGS_NAMESPACE, KEY_STORY_POINTS),
		(storyPoints) => game.settings.set(SETTINGS_NAMESPACE, KEY_STORY_POINTS, storyPoints),
	);

	/**
	 * Writes a user's spend from a pool, then posts its chat message as that user, and tells whether there was a point to
	 * spend. Only a GM may write the pools.
	 */
	static async #spend(pool: StoryPointPool, user: User) {
		if (!(await StoryPointTracker.#write((storyPoints) => storyPointsAfterSpending(storyPoints, pool)))) {
			return false;
		}

		const chatTemplate = await foundry.applications.handlebars.renderTemplate('systems/genesys/templates/chat/storypoint.hbs', {
			type: pool,
			message: SPEND_MESSAGES[pool],
		});
		const message = {
			author: user.id,
			speaker: {
				actor: user.character?.id,
			},
			content: chatTemplate,
			style: CONST.CHAT_MESSAGE_STYLES.OOC,
		};
		await ChatMessage.create(message);
		return true;
	}

	/**
	 * Writes a player's spend, as the Acting GM: the spend of the user who asked, from the player pool.
	 */
	static async spendForPlayer(player: User) {
		// Another spend may have emptied the pool since the player's client checked it.
		if (!(await StoryPointTracker.#spend('player', player))) {
			refuse('Genesys.Notifications.NotEnoughStoryPoints');
		}
	}
}

/**
 * Initialize the Story Point Tracker and answer the players' spends.
 */
export function register() {
	if (StoryPointTracker.instance) {
		return;
	}

	new StoryPointTracker();
	StoryPointTracker.forceRender();

	handleQuery(QueryName.SpendStoryPoint, (_data, querier) => StoryPointTracker.spendForPlayer(querier));
}
