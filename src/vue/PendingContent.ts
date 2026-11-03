/**
 * @file The content a sheet's components show once an asynchronous task ends, such as enriching a text, which the sheet
 * waits for before it measures its content.
 */

import { type App, inject, type InjectionKey, nextTick } from 'vue';
import * as log from '@/log';

/**
 * The key under which a sheet's Vue app provides the function its components tell their tasks to, read through
 * `usePendingContent`.
 */
const TellTask: InjectionKey<(task: Promise<unknown>) => void> = Symbol('Pending Content');

/**
 * Let the components of a Vue app tell the asynchronous tasks their content waits for, and return the function that waits
 * until the content shows: once each task told so far has ended, and Vue has rendered what it brought, which may start
 * more tasks.
 */
export function providePendingContent(app: App): () => Promise<void> {
	const pending = new Set<Promise<unknown>>();
	app.provide(TellTask, (task) => {
		pending.add(task);
		void task.then(
			() => pending.delete(task),
			(error: unknown) => {
				// The component would have handed its task to Vue, which reports a failure: the failure is logged instead.
				log.error(error);
				pending.delete(task);
			},
		);
	});

	return async () => {
		await nextTick();
		while (pending.size > 0) {
			// A task that fails shows what it can: the content is shown all the same.
			await Promise.allSettled(pending);
			await nextTick();
		}
	};
}

/**
 * The function a component of a sheet tells the asynchronous tasks its content waits for to, such as enriching a text.
 */
export function usePendingContent(): (task: Promise<unknown>) => void {
	const tell = inject(TellTask);
	if (!tell) {
		throw new Error('This component renders in a Vue sheet, which waits for its content');
	}

	return tell;
}
