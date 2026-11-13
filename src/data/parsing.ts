/** @file What the parsers of the data that comes from outside the code (flags, payloads) share. */

/**
 * Whether a value is an object whose properties a parser may read, one by one, as `unknown`.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * Whether a value is a whole number of zero or more.
 */
export function isCount(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
