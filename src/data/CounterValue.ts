/** @file A counter's value: the bounds it keeps to, a step one up or down, and a value typed into it. */

/**
 * The value a counter takes once kept within its bounds. Every counter counts up from 0 (wounds, strain, hull trauma,
 * system strain, a quantity, Story Points); `max` caps it, such as twice a character's wound threshold (CRB p. 113),
 * and is left out when nothing does.
 */
export function boundedValue(value: number, max?: number): number {
	const raised = Math.max(value, 0);

	// A cap the data lacks, such as a threshold missing from an actor's data, caps nothing rather than giving NaN.
	return max !== undefined && Number.isFinite(max) ? Math.min(raised, max) : raised;
}

/**
 * The value a counter takes one step up or down, within its bounds.
 */
export function steppedValue(value: number, direction: 1 | -1, max?: number): number {
	return boundedValue(value + direction, max);
}

/**
 * How a counter reads the text typed into it: its cap, and whether a number below 0 is refused rather than raised to 0,
 * as the Story Point pools refuse one (#263).
 */
type TypedValueOptions = { max?: number; refuseNegative?: boolean };

/**
 * The value a counter takes from the text typed into it: a number, rounded to a whole one (#269), within its bounds.
 * Undefined when the text is no number, or a refused number below 0: the counter then keeps its value.
 */
export function typedValue(input: string, { max, refuseNegative = false }: TypedValueOptions = {}): number | undefined {
	const text = input.trim();
	if (!/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(text)) {
		return undefined;
	}

	const typed = Number(text);
	return refuseNegative && typed < 0 ? undefined : boundedValue(Math.round(typed), max);
}
