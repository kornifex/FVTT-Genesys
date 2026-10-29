/**
 * A copy of a list without the element at an index: a document's array field is updated with a new list.
 */
export function withoutIndex<T>(list: readonly T[], index: number): T[] {
	return list.filter((_, i) => i !== index);
}
