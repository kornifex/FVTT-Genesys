import VueAwardXPPrompt from '@/vue/apps/AwardXPPrompt.vue';
import { VueSheet } from '@/vue/VueSheet';

type AwardData = {
	/**
	 * Amount of XP awarded to the player.
	 */
	amount: number;

	/**
	 * Details about why the XP was awarded.
	 */
	reason: string;
};

/**
 * What the XP award prompt resolves with.
 */
export type AwardXPContext = {
	resolvePromise: (value: AwardData) => void;
};

/**
 * Prompt the user for an XP Award.
 */
export class AwardXPPrompt extends VueSheet(foundry.applications.api.ApplicationV2) {
	override get vueComponent() {
		return VueAwardXPPrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-award-xp-prompt'],
		position: { width: 400 },
		window: { title: 'Genesys.RewardsPrompt.Title' },
	};

	static async promptForXPAward(): Promise<AwardData | undefined> {
		const sheet = new AwardXPPrompt();
		await sheet.render(true);

		return new Promise<AwardData | undefined>((resolve) => {
			sheet.#resolvePromise = resolve;
		});
	}

	#resolvePromise?: (value: AwardData | undefined) => void;

	override async getVueContext(): Promise<AwardXPContext> {
		return {
			resolvePromise: (data) => {
				this.#resolvePromise?.(data);
				this.#resolvePromise = undefined;

				void this.close();
			},
		};
	}

	protected override async _preClose(options: object) {
		this.#resolvePromise?.(undefined);
		await super._preClose(options);
	}
}
