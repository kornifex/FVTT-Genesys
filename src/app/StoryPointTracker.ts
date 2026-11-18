/**
 * @file Foundry application to track the current pools of story points.
 */

import { NAMESPACE as SETTINGS_NAMESPACE } from '@/settings';
import { KEY_STORY_POINTS, type StoryPointData } from '@/settings/storyPoints';
import {
	onePoint,
	parseStoryPointSpend,
	serialStoryPointWrites,
	sessionStoryPoints,
	SPEND_MESSAGES,
	type StoryPointPool,
	type StoryPointSpend,
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
		void StoryPointTracker.#instance?.render({ force: true });
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
	 * Spends a Story Point of a pool for the current user.
	 */
	static async spendStoryPoint(pool: StoryPointPool) {
		await StoryPointTracker.spendStoryPoints(onePoint(pool));
	}

	/**
	 * Spends Story Points together for the current user, as the spends of a check, and tells whether they were: all of
	 * them, or none. A GM writes the spend; a player's goes to the Acting GM, who writes it.
	 */
	static async spendStoryPoints(spend: StoryPointSpend): Promise<boolean> {
		if (!StoryPointTracker.instance) {
			return false;
		}

		if (!storyPointsAfterSpending(StoryPointTracker.instance.storyPoints, spend)) {
			ui.notifications.warn(game.i18n.localize('Genesys.Notifications.NotEnoughStoryPoints'));
			return false;
		}

		if (game.user.isGM) {
			// Another spend may have emptied a pool since this client rendered it.
			if (!(await StoryPointTracker.#spend(spend, game.user))) {
				ui.notifications.warn(game.i18n.localize('Genesys.Notifications.NotEnoughStoryPoints'));
				return false;
			}
			return true;
		}

		// Only a GM may write the pools: with none connected, nothing is spent.
		return askActingGm(QueryName.SpendStoryPoint, spend);
	}

	/**
	 * Set one pool to a count the GM typed, leaving the other as it is when the write runs. Only a GM may.
	 */
	static async setStoryPointPool(pool: StoryPointPool, count: number) {
		if (game.user.isGM) {
			await StoryPointTracker.#write((storyPoints) => storyPointsAfterSetting(storyPoints, pool, count));
		}
	}

	// The GM's changes of the pools that reach this client together (a double click, a spend then a typed count, two
	// players' spends) are written one after the other, each from the pools the previous one wrote, so that none is lost and no
	// point is spent twice. A player's spend reaches the GM later than the player clicked: it reads the pools then too.
	static #write = serialStoryPointWrites(
		() => game.settings.get(SETTINGS_NAMESPACE, KEY_STORY_POINTS),
		(storyPoints) => game.settings.set(SETTINGS_NAMESPACE, KEY_STORY_POINTS, storyPoints),
	);

	/**
	 * Writes a user's spend, then posts the chat message of each point spent as that user, and tells whether the pools held
	 * the points to spend. Only a GM may write the pools.
	 */
	static async #spend(spend: StoryPointSpend, user: User) {
		if (!(await StoryPointTracker.#write((storyPoints) => storyPointsAfterSpending(storyPoints, spend)))) {
			return false;
		}

		const pools = (['player', 'gm'] as const).flatMap((pool) => Array<StoryPointPool>(spend[pool]).fill(pool));
		for (const pool of pools) {
			const chatTemplate = await foundry.applications.handlebars.renderTemplate('systems/genesys/templates/chat/storypoint.hbs', {
				type: pool,
				message: SPEND_MESSAGES[pool],
			});
			// A point of the GM pool is the GM's, who writes it, even when a player marked it on their check.
			const author = pool === 'gm' ? game.user : user;
			const message = {
				author: author.id,
				speaker: {
					actor: author.character?.id,
				},
				content: chatTemplate,
				style: CONST.CHAT_MESSAGE_STYLES.OOC,
			};
			await ChatMessage.create(message);
		}
		return true;
	}

	/**
	 * Writes a player's spend, as the Acting GM: the points the user who asked spends together from the player pool, and
	 * the GM's point they marked on their check.
	 */
	static async spendForPlayer(player: User, data: unknown) {
		const spend = parseStoryPointSpend(data);
		if (!spend) {
			refuse('Genesys.Notifications.GenericError');
		}

		// Another spend may have emptied a pool since the player's client checked it.
		if (!(await StoryPointTracker.#spend(spend, player))) {
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

	handleQuery(QueryName.SpendStoryPoint, (data, querier) => StoryPointTracker.spendForPlayer(querier, data));
}
