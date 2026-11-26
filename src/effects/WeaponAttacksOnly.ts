/**
 * @file The option of a weapon's own effect that keeps its changes to its holder's checks (Pool Modifications, Attack
 * Changes and changes to the Critical Injuries inflicted) to the attacks made with that weapon, as an attachment's are,
 * instead of every check of its holder (#929).
 */
import { isRecord } from '@/data/parsing';
import { effectTag } from '@/item/data/EffectTags';
import { ATTACHMENT_FLAG } from '@/item/data/Attachments';
import { QUALITY_FLAG } from '@/item/data/Qualities';

/**
 * The flag, in the `genesys` scope, that the effect sheet sets on a weapon's effect for its attacks only.
 */
export const WEAPON_ATTACKS_ONLY_FLAG = 'weaponAttacksOnly';

/**
 * Whether an effect counts for its weapon's attacks only: it is marked so, and the item it comes from is a weapon. The
 * mark means nothing on another item, as an effect dragged from a weapon onto a talent keeps it.
 */
export function isForWeaponAttacksOnly(effect: { flags?: object }, item: { type?: string } | null | undefined) {
	const genesys = isRecord(effect.flags) ? effect.flags.genesys : undefined;
	return item?.type === 'weapon' && isRecord(genesys) && genesys[WEAPON_ATTACKS_ONLY_FLAG] === true;
}

/**
 * Whether the effect sheet offers the option: on a weapon's own effect, not on one a quality or an attachment brought,
 * which already counts for the weapon's attacks only. A vehicle weapon's effects never reach the Critical Injuries its
 * crew inflicts, so the option would keep only part of its promise there.
 */
export function offersWeaponAttacksOnly(effect: { flags?: object }, parent: { documentName?: string; type?: string } | null) {
	return (
		parent?.documentName === 'Item' &&
		parent.type === 'weapon' &&
		effectTag(effect, QUALITY_FLAG) === undefined &&
		effectTag(effect, ATTACHMENT_FLAG) === undefined
	);
}
