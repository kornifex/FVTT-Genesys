/**
 * @file The attachments of a weapon or an armor: copied whole from an attachment item dropped on it, with its effects
 * and its qualities, removed with them, and the Hard Points they take.
 */

import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { effectTag } from '@/item/data/EffectTags';
import { profilesQualities, qualityNameKey, qualityRank } from '@/item/data/Qualities';

/**
 * What this module reads of a weapon's or an armor's stored data to change its qualities: those of its main profile,
 * and a weapon's extra Weapon Profiles, each with its own.
 */
type QualitiesSource<Profile extends QualitiesProfile> = {
	qualities: readonly ContainedItemQuality[];
	extraProfiles?: readonly Profile[];
};

type QualitiesProfile = { qualities: readonly ContainedItemQuality[] };

/**
 * The system update that gives an item new qualities on each of its profiles, its main one first, keeping the rest of
 * each extra profile as stored.
 */
function qualitiesUpdate<Profile extends QualitiesProfile>(source: QualitiesSource<Profile>, [main, ...extras]: ContainedItemQuality[][]) {
	return source.extraProfiles
		? { qualities: main, extraProfiles: source.extraProfiles.map((profile, index) => ({ ...profile, qualities: extras[index] })) }
		: { qualities: main };
}

/**
 * The qualities a weapon's or an armor's every profile has once an attachment is installed on it (ADR 0007: an
 * attachment changes every Weapon Profile). On each profile, a quality of the attachment that the profile holds, by
 * name, is raised by the attachment's rating of it (1 for an unrated quality); one it lacks is added at that rating, as
 * a copy under an id from `newId` that the item doesn't hold. Either records the rating under the attachment's id,
 * which its removal takes back.
 *
 * Returns the system update, built from the stored data given, and the qualities the attachment brought, from the id of
 * the attachment's quality to that of its copy: their effects are the attachment's quality's, which the item copies.
 */
export function attachmentQualitiesInstalled<Profile extends QualitiesProfile>(
	source: QualitiesSource<Profile>,
	attachment: { id: string; qualities: readonly ContainedItemQuality[] },
	newId: () => string,
) {
	const brought: { from: string; to: string }[] = [];
	const profiles = profilesQualities(source).map((qualities) =>
		attachment.qualities.reduce<ContainedItemQuality[]>(
			(held, added) => {
				const rating = qualityRank(added);
				const granted = { attachment: attachment.id, rating };
				const index = held.findIndex((quality) => qualityNameKey(quality.name) === qualityNameKey(added.name));
				if (index >= 0) {
					return held.map((quality, i) =>
						i === index
							? { ...quality, rating: quality.rating + rating, attachmentRatings: [...quality.attachmentRatings, granted] }
							: quality,
					);
				}

				const id = newId();
				brought.push({ from: added.id, to: id });
				return [...held, { ...added, id, rating, attachmentRatings: [granted], heldByItem: false }];
			},
			[...qualities],
		),
	);

	return { update: qualitiesUpdate(source, profiles), brought };
}

/**
 * The system update that takes back, on each of an item's profiles, what the attachments it no longer holds added to
 * its qualities: each rating comes down by what they added, and a quality goes once nothing holds it, neither the item
 * nor an attachment, its effects with it. A quality the item holds, or that an attachment still raises, stays at
 * rating 1 or more, even when the table lowered it below what the attachments add: the sheet shows the total alone, so
 * a lowered rating doesn't say whose part the table took. One the attachments brought, which the table raised, keeps
 * what the table added. `undefined` when every attachment that raised a quality is held.
 */
export function attachmentQualitiesTakenBack<Profile extends QualitiesProfile>(
	source: QualitiesSource<Profile>,
	heldIds: Iterable<string>,
) {
	const held = new Set(heldIds);
	let changed = false;
	const profiles = profilesQualities(source).map((qualities) =>
		qualities.flatMap((quality) => {
			const kept = quality.attachmentRatings.filter(({ attachment }) => held.has(attachment));
			if (kept.length === quality.attachmentRatings.length) {
				return [quality];
			}

			changed = true;
			const removed = quality.attachmentRatings.reduce(
				(total, { attachment, rating }) => (held.has(attachment) ? total : total + rating),
				0,
			);
			const rating = quality.rating - removed;
			return rating <= 0 && kept.length === 0 && !quality.heldByItem
				? []
				: [{ ...quality, rating: Math.max(rating, 1), attachmentRatings: kept }];
		}),
	);

	return changed ? qualitiesUpdate(source, profiles) : undefined;
}

/**
 * The qualities a new Weapon Profile starts with, so that the attachments installed on the weapon give it what they
 * give every profile (ADR 0007): a copy of each quality of the main profile that an attachment raises, under an id from
 * `newId`, at what the attachments add, which the new profile doesn't hold.
 *
 * Returns them, and the qualities copied, from the id of the main profile's copy to that of the new profile's: the new
 * copy's effects are a copy of the main one's, which are the quality's.
 */
export function attachmentQualitiesOfNewProfile(main: readonly ContainedItemQuality[], newId: () => string) {
	const copied: { from: string; to: string }[] = [];
	const qualities = main.flatMap((quality) => {
		if (quality.attachmentRatings.length === 0) {
			return [];
		}

		const id = newId();
		copied.push({ from: quality.id, to: id });
		const rating = quality.attachmentRatings.reduce((total, added) => total + added.rating, 0);
		return [{ ...quality, id, rating, heldByItem: false }];
	});

	return { qualities, copied };
}

/**
 * An attachment as a weapon or an armor holds it: a copy of the attachment item. Its effects are the item's own, tagged
 * with its id.
 */
export type ContainedAttachment = {
	/**
	 * The id that tags the attachment's effects on the item, unique among the item's attachments: the same attachment
	 * installed twice is two attachments.
	 */
	id: string;
	name: string;
	description: string;
	/**
	 * The Hard Points the attachment takes on the item (CRB p. 206).
	 */
	hardPointsRequired: number;
};

/**
 * The flag, in the `genesys` scope, that tags an effect of a weapon or an armor with the id of the attachment it belongs
 * to: removing the attachment removes it.
 */
export const ATTACHMENT_FLAG = 'attachment';

/**
 * What a weapon or an armor copies of an attachment item dropped on it, under the id given.
 */
export function attachmentCopy(
	id: string,
	{ name, system }: { name: string; system: Pick<ContainedAttachment, 'description' | 'hardPointsRequired'> },
): ContainedAttachment {
	return { id, name, description: system.description, hardPointsRequired: system.hardPointsRequired };
}

/**
 * The Hard Points an item's attachments take together.
 */
export function hardPointsTaken(attachments: readonly Pick<ContainedAttachment, 'hardPointsRequired'>[]) {
	return attachments.reduce((total, attachment) => total + attachment.hardPointsRequired, 0);
}

/**
 * The attachment of an item that an effect belongs to, or undefined when it belongs to none of the item's.
 */
export function effectAttachment(effect: { flags?: object }, system: object | undefined): ContainedAttachment | undefined {
	const id = effectTag(effect, ATTACHMENT_FLAG);
	// The data of an item that holds no attachments has none.
	const attachments = (system as { attachments?: readonly ContainedAttachment[] } | undefined)?.attachments;
	return id ? attachments?.find((attachment) => attachment.id === id) : undefined;
}
