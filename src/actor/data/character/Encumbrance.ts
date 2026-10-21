/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @file Encumbrance of a character's equipment held in containers.
 */

export type HeldContainer = {
	/**
	 * The id of the container this one is held in, or an empty string.
	 */
	container: string;
};

/**
 * The outermost container holding a container, the container itself if it isn't held in another one. Undefined when
 * a container it is held in is missing or the containers hold each other.
 */
export function rootContainer<T extends HeldContainer>(containerId: string, getContainer: (id: string) => T | undefined): T | undefined {
	const visited = new Set<string>();
	let id = containerId;
	let container = getContainer(id);

	while (container && container.container !== '') {
		visited.add(id);
		id = container.container;
		if (visited.has(id)) {
			return undefined;
		}

		container = getContainer(id);
	}

	return container;
}
