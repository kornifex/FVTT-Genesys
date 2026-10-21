/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @file Document types an actor cares about, grouped by the context they matter in.
 */

/**
 * Lists of Document types, keyed by the context in which an actor cares about them (e.g. the types listed on its Inventory
 * tab).
 */
export type RelevantTypes<Context extends string> = Record<Context, string[]>;

/**
 * Whether a Document type is relevant to an actor in a context. An empty type or an unknown context is never relevant.
 */
export function isRelevantType<Context extends string>(relevantTypes: RelevantTypes<Context>, context: Context, type: string) {
	return !!type && (relevantTypes[context]?.includes(type) ?? false); // eslint-disable-line
}
