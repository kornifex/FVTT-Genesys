/**
 * @file The content a sheet's components show once some asynchronous work ends, which the sheet waits for before it
 * measures its content.
 */

import { type App, inject, type InjectionKey, nextTick } from 'vue';

/**
 * The key the function a component tells its work with is provided under, read through `usePendingContent`.
 */
const PendingContent: InjectionKey<(work: Promise<unknown>) => void> = Symbol('Pending Content');

/**
 * Let the components of a Vue app tell the asynchronous work their content waits for, and return the function that waits
 * until the content shows: once every work told so far has ended, and Vue has rendered what it brought, which may start
 * more work.
 */
export function providePendingContent(app: App): () => Promise<void> {
	const pending = new Set<Promise<unknown>>();
	app.provide(PendingContent, (work) => {
		pending.add(work);
		const done = () => void pending.delete(work);
		void work.then(done, done);
	});

	return async () => {
		await nextTick();
		while (pending.size > 0) {
			// A work that fails shows what it can: the content is shown all the same.
			await Promise.allSettled(pending);
			await nextTick();
		}
	};
}

/**
 * The function a component of a sheet tells the asynchronous work its content waits for with, such as enriching a text.
 */
export function usePendingContent(): (work: Promise<unknown>) => void {
	const track = inject(PendingContent);
	if (!track) {
		throw new Error('This component renders in a Vue sheet, which waits for its content');
	}

	return track;
}
