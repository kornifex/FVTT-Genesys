/** @file Whether a character's sheet shows their Magic tab. */

/**
 * What this module reads of a character's item: a skill's category and rank, or the item's type alone.
 */
type MagicItem = { type: string; system: unknown };

/**
 * Whether a character practices magic: they have a rank in a skill of the magic category, or own a spell (CRB p. 210).
 */
export function practicesMagic(items: Iterable<MagicItem>) {
	return [...items].some((item) => {
		if (item.type === 'spell') {
			return true;
		}
		const skill = item.system as { category?: string; rank?: number };
		return item.type === 'skill' && skill.category === 'magic' && (skill.rank ?? 0) > 0;
	});
}

/**
 * Whether a character's sheet shows their Magic tab: they practice magic, and the sheet's toggle doesn't hide it.
 */
export function showsMagicTab(items: Iterable<MagicItem>, hidden: boolean) {
	return !hidden && practicesMagic(items);
}

/**
 * The flag, in the `genesys` scope, by which a character's sheet hides their Magic tab.
 */
export const HIDE_MAGIC_TAB_FLAG = 'hideMagicTab';
