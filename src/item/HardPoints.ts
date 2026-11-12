/**
 * What a weapon or an armor holds of its Hard Points: its base encumbrance, and the number it sets as an exception,
 * `null` while it has none.
 */
export type HardPointsSource = {
	encumbrance: number;
	hardPoints: number | null;
};

/**
 * The Hard Points a weapon or an armor gets from its base encumbrance: half of it, rounded up (CRB p. 206). An item
 * with no encumbrance, or one that lightens its bearer's load, holds no attachment.
 */
export function computedHardPoints(encumbrance: number): number {
	return Math.max(0, Math.ceil(encumbrance / 2));
}

/**
 * The Hard Points of a weapon or an armor: the number it sets as an exception, else the one its encumbrance gives.
 */
export function hardPoints(item: HardPointsSource): number {
	return item.hardPoints ?? computedHardPoints(item.encumbrance);
}

/**
 * The exception an edit of an item's Hard Points stores: none when the field is emptied or set to the computed number,
 * so that the item follows its encumbrance again, else the number typed. `undefined` refuses a value that isn't a
 * whole number of 0 or more.
 */
export function hardPointsException(encumbrance: number, input: string): number | null | undefined {
	if (input.trim() === '') {
		return null;
	}

	const value = Number(input);
	if (!Number.isInteger(value) || value < 0) {
		return undefined;
	}

	return value === computedHardPoints(encumbrance) ? null : value;
}
