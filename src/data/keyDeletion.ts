/**
 * The update that deletes keys from an object of a document's data, the object given by its path.
 */
export function keyDeletion(path: string, ...keys: string[]): Record<string, unknown> {
	return Object.fromEntries(keys.map((key) => [`${path}.${key}`, _del]));
}
