/** @file Base for the ApplicationV2 prompts rendered with a Vue component, which wait for the user's answer. */

import { VueSheet } from '@/vue/VueSheet';

/**
 * A Vue application that waits for the user's answer, the fallback when the user closes it without one.
 */
export function VuePrompt<T>(fallback: T) {
	return class extends VueSheet(foundry.applications.api.ApplicationV2) {
		#resolve?: (value: T) => void;

		/**
		 * Render the prompt, and wait for the user's answer.
		 */
		async prompt(): Promise<T> {
			const answer = new Promise<T>((resolve) => {
				this.#resolve = resolve;
			});
			await this.render(true);

			return answer;
		}

		/**
		 * Answer the prompt, and close it.
		 */
		answer(value: T) {
			this.#settle(value);
			void this.close();
		}

		#settle(value: T) {
			this.#resolve?.(value);
			this.#resolve = undefined;
		}

		protected override async _preClose(options: object) {
			this.#settle(fallback);
			await super._preClose(options);
		}
	};
}
