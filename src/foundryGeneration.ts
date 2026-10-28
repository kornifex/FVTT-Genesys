/**
 * @file Foundry generations: the system supports v13, and v14 and later, whose APIs differ in places.
 */

/**
 * Whether Foundry runs generation 13. Later generations take the same code paths as v14.
 */
export function isFoundryV13() {
	return game.release.generation < 14;
}
