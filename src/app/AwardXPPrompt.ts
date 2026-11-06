import VueAwardXPPrompt from '@/vue/apps/AwardXPPrompt.vue';
import { VuePrompt } from '@/vue/VuePrompt';

/**
 * What the XP award prompt answers.
 */
export type AwardData = {
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

	/**
	 * Ask the user for an XP award. Undefined when the prompt is closed.
	 */
	static async promptForXPAward() {
		return new AwardXPPrompt().prompt();
	}
}
