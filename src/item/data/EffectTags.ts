/**
 * @file The effects of a weapon or an armor that belong to one copy it holds, a quality or an attachment: each is tagged,
 * by a flag in the `genesys` scope, with the id of its copy, so that the copy's rating scales it and removing the copy
 * removes it.
 */

/**
 * What this module reads of an effect: its id and its flags.
 */
type TaggedEffect = { id: string | null; flags?: object };

/**
 * The id a flag tags an effect with, or undefined when the effect has no such tag.
 */
export function effectTag(effect: Pick<TaggedEffect, 'flags'>, flag: string): string | undefined {
	const id = (effect.flags as { genesys?: Record<string, unknown> } | undefined)?.genesys?.[flag];
	return typeof id === 'string' && id !== '' ? id : undefined;
}

/**
 * The data of the effects a weapon or an armor creates for a copy dropped on it: the dropped item's effects, without
 * their ids, tagged with the copy's id on the weapon or armor. Each keeps whether it is disabled: a modification option
 * stays off until the table installs it.
 */
export function taggedEffectsData<Data extends { _id?: unknown; flags?: object | null }>(
	effects: readonly Data[],
	flag: string,
	id: string,
) {
	return effects.map(({ _id: _ignored, ...data }) => {
		const flags = (data.flags ?? {}) as { genesys?: object };
		return { ...data, flags: { ...flags, genesys: { ...flags.genesys, [flag]: id } } };
	});
}

/**
 * The ids of an item's effects tagged, by a flag, with a copy the item no longer holds, which go with it. The effects
 * without that flag are left alone.
 */
export function orphanedTaggedEffects(effects: Iterable<TaggedEffect>, flag: string, heldIds: Iterable<string>) {
	const held = new Set(heldIds);
	return [...effects].flatMap((effect) => {
		const id = effectTag(effect, flag);
		return effect.id && id && !held.has(id) ? [effect.id] : [];
	});
}
