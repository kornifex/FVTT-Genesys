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

const WHOLE_NUMBER_PATTERN = /^\s*[+-]?\d+\s*$/;

/**
 * The whole number a value holds, signed or not, or undefined when it holds anything else: an effect change stores a
 * number as one, and text it can't parse as a string, which may still write one.
 */
export function parseWholeNumber(value: unknown): number | undefined {
	if (typeof value === 'number') {
		return Number.isInteger(value) ? value : undefined;
	}

	return typeof value === 'string' && WHOLE_NUMBER_PATTERN.test(value) ? parseInt(value, 10) : undefined;
}
