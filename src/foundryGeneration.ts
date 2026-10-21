/**
 * @file Foundry generations: the system supports v12, and v13 and later, whose APIs differ in places.
 */

/**
 * Whether Foundry runs generation 13 or later. Later generations take the same code paths as v13.
 */
export function isFoundryV13OrLater() {
	return game.release.generation >= 13;
}

/**
 * Whether Foundry runs generation 12.
 */
export function isFoundryV12() {
	return !isFoundryV13OrLater();
}
