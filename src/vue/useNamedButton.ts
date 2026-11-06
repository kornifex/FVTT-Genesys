/**
 * @file Whether a component renders inside a button its label names: what the component would name itself repeats the
 * button's name, or contradicts it.
 */

import { computed, inject, type InjectionKey, provide, type Ref } from 'vue';

const NamedButton: InjectionKey<Readonly<Ref<boolean>>> = Symbol('Named Button');

/**
 * Tell the components inside a button whether its label names it.
 */
export function provideNamedButton(named: Readonly<Ref<boolean>>) {
	provide(NamedButton, named);
}

/**
 * Whether the component renders inside a button its label names, rather than its content.
 */
export function useInsideNamedButton(): Readonly<Ref<boolean>> {
	return inject(
		NamedButton,
		computed(() => false),
	);
}
