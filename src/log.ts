/** @file Writes to the console with the system's prefix, so a message can be told apart from Foundry's and other packages'. */

const PREFIX = 'Genesys |';

/** Log an informational message. */
export function info(...data: unknown[]) {
	console.log(PREFIX, ...data);
}

/** Log something unexpected the system recovers from. */
export function warn(...data: unknown[]) {
	console.warn(PREFIX, ...data);
}

/** Log an error. */
export function error(...data: unknown[]) {
	console.error(PREFIX, ...data);
}
