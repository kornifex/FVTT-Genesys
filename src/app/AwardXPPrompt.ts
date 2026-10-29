import VueAwardXPPrompt from '@/vue/apps/AwardXPPrompt.vue';
import { VuePrompt } from '@/vue/VuePrompt';

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
	answer: (value: AwardData) => void;
};

/**
 * Prompt the user for an XP Award.
 */
export class AwardXPPrompt extends VuePrompt<AwardData | undefined>(undefined) {
	override get vueComponent() {
		return VueAwardXPPrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-award-xp-prompt'],
		position: { width: 400 },
		window: { title: 'Genesys.RewardsPrompt.Title' },
	};

	static async promptForXPAward() {
		return new AwardXPPrompt().prompt();
	}

	override async getVueContext(): Promise<AwardXPContext> {
		return { answer: (data) => this.answer(data) };
	}
}
