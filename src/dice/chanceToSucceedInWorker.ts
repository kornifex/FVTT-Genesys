/** @file Asks the chance worker for the chance to succeed of a dice pool, so that a large pool doesn't freeze the prompt. */

import type { ChancePool } from '@/dice/ChanceToSucceed';
import * as log from '@/log';

let chanceWorker: Worker | undefined;

function startChanceWorker() {
	// Vite only bundles a worker whose URL is a relative path written in the call.
	const worker = new Worker(new URL('./chanceWorker.ts', import.meta.url), { type: 'module' });
	worker.onerror = (event) => log.error('The chance worker failed.', event);
	return worker;
}

/**
 * Compute the chance to succeed of a dice pool in a Web Worker, started on the first request.
 */
export function chanceToSucceedInWorker(pool: ChancePool) {
	const worker = (chanceWorker ??= startChanceWorker());

	// A channel per request pairs each answer with its request, whatever order they come back in.
	const { port1, port2 } = new MessageChannel();
	return new Promise<number>((resolve) => {
		port1.onmessage = ({ data }: MessageEvent<number>) => {
			port1.close();
			resolve(data);
		};
		worker.postMessage(pool, [port2]);
	});
}
