/** @file Web Worker computing the chance to succeed of a dice pool off the main thread. */

import { type ChancePool, chanceToSucceed } from '@/dice/ChanceToSucceed';

// Each request carries the port its answer goes back on.
self.onmessage = ({ data, ports: [port] }: MessageEvent<ChancePool>) => {
	port.postMessage(chanceToSucceed(data));
};
