/** @file Tests for how a sheet waits for the content its components show once some asynchronous work ends. */

import { describe, expect, it } from 'vitest';
import { createApp } from 'vue';
import { providePendingContent, usePendingContent } from '@/vue/PendingContent';

/**
 * A promise and the function that resolves it.
 */
function deferred() {
	let resolve!: () => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

/**
 * A sheet's Vue app, with no component mounted: `setup` runs as a component's setup would.
 */
function sheetApp() {
	const app = createApp({});
	const contentShown = providePendingContent(app);
	return { contentShown, setup: <T>(fn: () => T) => app.runWithContext(fn) };
}

/**
 * Whether a promise has settled once the pending callbacks ran.
 */
async function settled(promise: Promise<unknown>) {
	let done = false;
	void promise.then(() => (done = true));
	for (let turn = 0; turn < 10; turn++) await Promise.resolve();
	return done;
}

describe('providePendingContent', () => {
	it('is shown at once when no component started any work', async () => {
		const sheet = sheetApp();

		expect(await settled(sheet.contentShown())).toBe(true);
	});

	it('waits for the work each component started', async () => {
		const sheet = sheetApp();
		const description = deferred();
		const source = deferred();
		sheet.setup(usePendingContent)(description.promise);
		sheet.setup(usePendingContent)(source.promise);

		const shown = sheet.contentShown();
		description.resolve();
		expect(await settled(shown)).toBe(false);

		source.resolve();
		expect(await settled(shown)).toBe(true);
	});

	it('waits for the work a component started while the sheet waited, as one mounted by the work before', async () => {
		const sheet = sheetApp();
		const crew = deferred();
		const description = deferred();
		const track = sheet.setup(usePendingContent);
		track(crew.promise.then(() => track(description.promise)));

		const shown = sheet.contentShown();
		crew.resolve();
		expect(await settled(shown)).toBe(false);

		description.resolve();
		expect(await settled(shown)).toBe(true);
	});

	it('shows the content when a work fails', async () => {
		const sheet = sheetApp();
		const description = deferred();
		sheet.setup(usePendingContent)(description.promise);

		const shown = sheet.contentShown();
		description.reject(new Error('The link names no document'));

		expect(await settled(shown)).toBe(true);
	});
});
