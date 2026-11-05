/**
 * @file Foundry generations: the system supports v13, and v14 and later, whose APIs differ in places.
 */

/**
 * Whether Foundry runs generation 13. Later generations take the same code paths as v14.
 */
export function isFoundryV13() {
	return game.release.generation < 14;
}

/**
 * The update that deletes keys from an object of a document's data, the object given by its path.
 */
export function keyDeletion(path: string, ...keys: string[]): Record<string, unknown> {
	// v13: a `-=` key deletes it, which v14 deprecates for its deletion operator.
	const v13 = isFoundryV13();
	return Object.fromEntries(keys.map((key) => (v13 ? [`${path}.-=${key}`, null] : [`${path}.${key}`, _del])));
}
