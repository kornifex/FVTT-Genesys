/** @file What a prompt hands the components it renders: how they give its answer, and how they cancel it. */

import { type App, inject, type InjectionKey } from 'vue';

/**
 * How the components of a prompt answer it and cancel it.
 */
export type PromptControls = {
	/**
	 * Sets how the answer is read when the prompt's form is submitted: by its primary button, or Enter in a field.
	 */
	answerWith(read: () => unknown): void;

	/**
	 * Closes the prompt without an answer.
	 */
	cancel(): void;
};

const PromptKey: InjectionKey<PromptControls> = Symbol('Prompt');

/**
 * Provide a prompt's controls to its Vue app.
 */
export function providePrompt(app: App, controls: PromptControls) {
	app.provide(PromptKey, controls);
}

/**
 * The controls of the prompt the component renders in.
 */
export function usePrompt(): PromptControls {
	const controls = inject(PromptKey);
	if (!controls) {
		throw new Error('This component renders in a prompt, which provides its controls');
	}

	return controls;
}

/**
 * Give the prompt's answer, read when its form is submitted. A promise is awaited before the prompt answers.
 */
export function usePromptAnswer<T>(read: () => T | Promise<T>) {
	usePrompt().answerWith(read);
}
