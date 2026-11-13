/**
 * @file Item Changes: the changes of a weapon's or an armor's own effects that change the item itself (its damage,
 * Critical rating, defense, soak or encumbrance) rather than its actor, as an attachment's do (CRB pp. 206–209).
 */

import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { effectQuality, isOutrankedQualityEffect, qualityIdOf } from '@/item/data/Qualities';

/**
 * The fields of a weapon or an armor an Item Change can change. A weapon's damage and Critical rating change on its
 * Weapon Profiles: on each for an attachment's changes, on the one that holds it for a quality's.
 */
const ITEM_CHANGE_FIELDS = ['baseDamage', 'critical', 'defense', 'soak', 'encumbrance'] as const;
export type ItemChangeField = (typeof ITEM_CHANGE_FIELDS)[number];

const PREFIX = 'genesys.item.';

/**
 * The change key of an Item Change to a field.
 */
export function itemChangeKey(field: ItemChangeField) {
	return `${PREFIX}${field}`;
}

/**
 * Whether a change key is an Item Change's, which never applies to an actor, whatever field it names.
 */
export function isItemChangeKey(key: string | undefined) {
	return key?.startsWith(PREFIX) ?? false;
}

/**
 * What this module reads of an effect of the item: whether it is disabled, its changes, and its flags, which tag the
 * effect of a quality.
 */
type ItemChangeEffect = {
	disabled: boolean;
	// v14 lets a change hold a value of any type.
	changes: readonly { key?: string; value: unknown }[];
	flags?: object;
};

/**
 * An effect of the item with the rank that scales its changes, a quality's rating, one by default.
 */
type RankedEffect = Omit<ItemChangeEffect, 'flags'> & { rank?: number };

/**
 * What each field of the item gains from its effects: the sum of the values of their enabled Item Changes, each once
 * per rank. A value that isn't a number, or a key naming no field, changes nothing. The item's Equipment State doesn't
 * matter: an attachment changes its item, carried or equipped.
 */
export function itemChangeTotals(effects: Iterable<RankedEffect>): Partial<Record<ItemChangeField, number>> {
	const totals: Partial<Record<ItemChangeField, number>> = {};
	for (const { disabled, changes, rank = 1 } of effects) {
		if (disabled) {
			continue;
		}

		for (const { key, value } of changes) {
			const field = isItemChangeKey(key) ? key!.slice(PREFIX.length) : '';
			const amount = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
			if ((ITEM_CHANGE_FIELDS as readonly string[]).includes(field) && Number.isFinite(amount)) {
				totals[field as ItemChangeField] = (totals[field as ItemChangeField] ?? 0) + amount * rank;
			}
		}
	}

	return totals;
}

/**
 * The fields of a Weapon Profile, which change on each profile, and the qualities it holds.
 */
type ProfileTarget = Partial<Record<'baseDamage' | 'critical', number>> & { qualities?: readonly Pick<ContainedItemQuality, 'id'>[] };

/**
 * The data of a weapon or an armor that Item Changes change: the fields of its type, its qualities (a weapon's main
 * profile's), and a weapon's extra Weapon Profiles.
 */
type ItemChangeTarget = Partial<Record<ItemChangeField, number>> &
	ProfileTarget & {
		extraProfiles?: ProfileTarget[];
	};

/**
 * Adds the Item Changes of an item's effects to its prepared data, in place, leaving the fields its type lacks alone. A
 * quality's rating scales its effects' changes, as it does on the actor (CRB pp. 86–89):
 * - on a Weapon Profile, a quality's changes count on the profile that holds it, at that copy's rank; the item's other
 *   effects with no quality, as an attachment's, count on every profile;
 * - on the fields of the item itself, a quality held by several profiles counts once, at its highest-ranked copy, even
 *   when that copy's effect is disabled, as on the actor (`GenesysEffect.active`);
 * - an effect tagged with a quality the item no longer holds counts nowhere.
 *
 * A Critical rating of 0 stays 0, since no Advantage triggers a Critical Injury then; any other stays at 1 or more: the
 * attack card counts the Advantage spent on a Critical Injury by it.
 */
export function applyItemChanges(system: ItemChangeTarget, effects: Iterable<ItemChangeEffect>) {
	// An effect tagged with a quality the item no longer holds is orphaned: its own deletion hasn't landed yet, and it
	// counts nowhere.
	const withQualities = [...effects].map((effect) => {
		const quality = effectQuality(effect, system);
		return { effect, quality, orphaned: qualityIdOf(effect) !== undefined && !quality };
	});
	const totals = (counted: typeof withQualities) =>
		itemChangeTotals(
			// Read field by field: the fields of a document aren't all its own properties.
			counted.map(({ effect, quality }) => ({
				disabled: effect.disabled,
				changes: effect.changes,
				rank: quality?.isRated ? quality.rating : 1,
			})),
		);
	const add = (target: Partial<Record<ItemChangeField, number>>, field: ItemChangeField, total: number | undefined) => {
		const value = target[field];
		if (total === undefined || typeof value !== 'number') {
			return;
		}
		if (field !== 'critical') {
			target[field] = value + total;
		} else if (value !== 0) {
			target[field] = Math.max(1, value + total);
		}
	};

	const itemTotals = totals(withQualities.filter(({ effect, orphaned }) => !orphaned && !isOutrankedQualityEffect(effect, system)));
	for (const field of ['defense', 'soak', 'encumbrance'] as const) {
		add(system, field, itemTotals[field]);
	}

	for (const profile of [system, ...(system.extraProfiles ?? [])]) {
		const held = new Set((profile.qualities ?? []).map(({ id }) => id));
		const profileTotals = totals(withQualities.filter(({ quality, orphaned }) => !orphaned && (!quality || held.has(quality.id))));
		add(profile, 'baseDamage', profileTotals.baseDamage);
		add(profile, 'critical', profileTotals.critical);
	}
}
