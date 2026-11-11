/** @file Base for the ApplicationV2 prompts rendered with a Vue component, which wait for the user's answer. */

import type { App } from 'vue';
import type { DeepPartial } from 'fvtt-types/utils';
import { VueSheet } from '@/vue/VueSheet';
import { providePrompt } from '@/vue/usePrompt';

type RenderContext = foundry.applications.api.ApplicationV2.RenderContext;
type RenderOptions = DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>;

/**
 * The controls a prompt's focus can go to when it opens: its fields first, then any control Tab reaches.
 */
const FIELDS = 'input, select, textarea';
const CONTROLS = `${FIELDS}, button, a[href], [tabindex]:not([tabindex="-1"])`;

/**
 * Whether the user can reach a control: shown, enabled, and not hidden by a folded section.
 */
function reachable(element: HTMLElement) {
	return (
		!(element as HTMLInputElement).disabled && element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible'
	);
}

/**
 * The opener of each prompt that has settled, by its element, which stays in the page while it fades out. A prompt asked
 * for from it, as the Dice Prompt a crew member's choice opens, or the next combatant's initiative, takes its opener: its
 * own focus would be on a control that leaves the page. A map rather than a private field, as each `VuePrompt()` call
 * makes a class of its own.
 */
const settledOpeners = new WeakMap<Element, HTMLElement | undefined>();

/**
 * Whether a select's dropdown is open, where the browser says so (`:open`): Enter and Escape are the dropdown's then.
 */
function dropdownOpen(target: EventTarget | null) {
	if (!(target instanceof HTMLSelectElement)) return false;
	try {
		return target.matches(':open');
	} catch {
		// A browser without the `:open` selector throws on it: its dropdowns go unseen.
		return false;
	}
}

/**
 * A Vue application that waits for the user's answer, the fallback when the user closes it without one.
 *
 * It owns how a prompt is answered: its form's submission answers it, from the primary button of its `PromptFooter` or
 * Enter in one of its fields, with what the component gave `usePromptAnswer`; Cancel and Escape close it with the
 * fallback. Its first field takes the focus when it opens, and the focus goes back where it was when it closes.
 */
export function VuePrompt<T>(fallback: T) {
	return class Prompt extends VueSheet(foundry.applications.api.ApplicationV2) {
		static override DEFAULT_OPTIONS: foundry.applications.api.ApplicationV2.DefaultOptions = {
			// Foundry keeps the form from submitting natively and calls the handler on the prompt.
			form: { handler: Prompt.#onSubmit, closeOnSubmit: false },
		};

		#resolve?: (value: T) => void;

		/**
		 * Reads the answer the component gives, when the form is submitted.
		 */
		#readAnswer?: () => unknown;

		/**
		 * The element that had the focus when the prompt was asked for, which gets it back when the prompt closes.
		 */
		#opener?: HTMLElement;

		/**
		 * Whether the focus goes back to the opener on close: it does unless the user has put it somewhere else.
		 */
		#restoreFocus = false;

		/**
		 * Whether a submission is reading the answer: another one, from a held Enter or a double click, is ignored.
		 */
		#answering = false;

		static async #onSubmit(this: Prompt) {
			if (!this.#resolve || this.#answering) return;
			this.#answering = true;
			try {
				const value = (await this.#readAnswer?.()) as T;
				if (await this.accept(value)) this.answer(value);
			} finally {
				this.#answering = false;
			}
		}

		/**
		 * Render the prompt, and wait for the user's answer.
		 */
		async prompt(): Promise<T> {
			const answer = new Promise<T>((resolve) => {
				this.#resolve = resolve;
			});
			// A pointer's click on an action button leaves it without focus, and the body holds it then.
			const focused = document.activeElement;
			const settled = focused?.closest('.application');
			if (settled && settledOpeners.has(settled)) {
				this.#opener = settledOpeners.get(settled);
			} else {
				this.#opener = focused instanceof HTMLElement && focused !== document.body ? focused : undefined;
			}
			await this.render(true);

			return answer;
		}

		/**
		 * Whether the prompt answers with what its form gives, once submitted: a prompt that acts on its answer before it
		 * closes, and fails to, refuses it and stays open, for the user to change it or cancel. Its failure is its to tell.
		 */
		protected async accept(_answer: T): Promise<boolean> {
			return true;
		}

		/**
		 * Answer the prompt, and close it.
		 */
		answer(value: T) {
			this.#settle(value);
			void this.close();
		}

		#settle(value: T) {
			// Before the answer reaches its caller, who may ask for the next prompt at once.
			if (this.#resolve && this.element) settledOpeners.set(this.element, this.#opener);
			this.#resolve?.(value);
			this.#resolve = undefined;
		}

		protected override provideToVueApp(app: App) {
			providePrompt(app, {
				answerWith: (read) => {
					this.#readAnswer = read;
				},
				cancel: () => void this.close(),
			});
		}

		protected override async _onFirstRender(context: DeepPartial<RenderContext>, options: RenderOptions) {
			await super._onFirstRender(context, options);

			this.element.addEventListener('keydown', (event) => this.#onKeyDown(event));
		}

		#onKeyDown(event: KeyboardEvent) {
			if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
			if (dropdownOpen(event.target)) return;

			// A held Enter repeats the browser's submission of the form; in a text area it adds lines.
			if (event.key === 'Enter' && event.repeat) {
				if (!(event.target instanceof HTMLTextAreaElement)) event.preventDefault();
				return;
			}

			// Foundry's Escape keybinding skips a page whose focus is in a field of a form: the prompt listens itself, and
			// keeps Foundry from closing another window too.
			if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				void this.close();
				return;
			}

			// A browser submits a form on Enter in an input, not in a select: the prompt does, as from its primary button,
			// unless that is disabled.
			if (event.key === 'Enter' && event.target instanceof HTMLSelectElement) {
				const submit = this.element.querySelector<HTMLButtonElement>('button[type="submit"]');
				if (submit && !submit.disabled) {
					event.preventDefault();
					(this.element as HTMLFormElement).requestSubmit(submit);
				}
			}
		}

		protected override async _onRender(context: DeepPartial<RenderContext>, options: RenderOptions) {
			await super._onRender(context, options);

			if (options.isFirstRender) {
				const content = this.element.querySelector('.window-content') ?? this.element;
				const first = (selector: string) => [...content.querySelectorAll<HTMLElement>(selector)].find(reachable);
				(first(FIELDS) ?? first(CONTROLS))?.focus();
			}
		}

		protected override async _preClose(options: object) {
			this.#settle(fallback);
			const focused = document.activeElement;
			this.#restoreFocus = !focused || focused === document.body || this.element.contains(focused);
			await super._preClose(options);
		}

		protected override _onClose(options: RenderOptions) {
			super._onClose(options);

			// The focus left with the prompt's element, unless another window took it while the prompt faded out, as the
			// Dice Prompt a crew member's choice opens.
			const focused = document.activeElement;
			const lost = !focused || focused === document.body;
			if (this.#restoreFocus && lost && this.#opener?.isConnected) {
				this.#opener.focus();
			}
			this.#opener = undefined;
		}
	};
}
