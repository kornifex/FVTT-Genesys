/**
 * @file Tests for the qualities of a weapon or an armor: adding a dropped one with its effects, raising and changing its
 * rating, changing it, removing it with its effects.
 */

import { describe, expect, it } from 'vitest';

import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import {
	effectQuality,
	isOutrankedQualityEffect,
	itemQualities,
	orphanedQualityEffects,
	qualityCopy,
	qualityEffectsData,
	qualityIdOf,
	qualityLabel,
	qualityNameKey,
	withQualityAdded,
	withQualityChanged,
	withQualityRating,
} from '@/item/data/Qualities';

const quality = (name: string, rating = 1, isRated = true): ContainedItemQuality => ({
	id: name.toLowerCase(),
	name,
	description: `<p>${name}.</p>`,
	activation: 'passive',
	advantageCost: 2,
	isRated,
	rating,
});

// A quality item dropped on a weapon or an armor, as the item copies it.
const dropped = (name: string, isRated = true, description = `<p>${name}.</p>`): Omit<ContainedItemQuality, 'rating'> => ({
	id: name.toLowerCase(),
	name,
	description,
	activation: 'passive',
	advantageCost: 2,
	isRated,
});

// An effect tagged with the id of the quality it belongs to.
const tagged = (id: string | null, quality: string) => ({ id, flags: { genesys: { quality } } });

describe('qualityNameKey', () => {
	it('names the same quality whatever the case and the surrounding spaces of its name', () => {
		expect(qualityNameKey(' Vicious ')).toBe(qualityNameKey('vicious'));
		expect(qualityNameKey('Pierce')).not.toBe(qualityNameKey('Vicious'));
	});
});

describe('withQualityAdded', () => {
	it('adds a quality the item lacks at rating 1, after the ones it has', () => {
		expect(withQualityAdded([quality('Pierce', 2)], dropped('Vicious'))).toEqual([quality('Pierce', 2), quality('Vicious', 1)]);
	});

	it('raises by 1 the rating of a rated quality the item has, whatever the case of its name, and leaves the given list as it is', () => {
		const qualities = Object.freeze([quality('Pierce', 2), quality('Vicious', 1)].map((q) => Object.freeze(q)));

		expect(withQualityAdded(qualities, { ...dropped('vicious', true, '<p>Other.</p>'), id: 'other' })).toEqual([
			quality('Pierce', 2),
			quality('Vicious', 2),
		]);
		expect(qualities).toEqual([quality('Pierce', 2), quality('Vicious', 1)]);
	});

	it('changes nothing when the item already has the quality and the quality is not rated', () => {
		expect(withQualityAdded([quality('Accurate', 1, false)], dropped('Accurate', false, ''))).toBeUndefined();
	});
});

describe('withQualityRating', () => {
	it('gives the quality at an index its new rating, and leaves the given list and its qualities as they are', () => {
		const qualities = Object.freeze([quality('Pierce', 2), quality('Vicious', 1)].map((q) => Object.freeze(q)));

		expect(withQualityRating(qualities, 0, 4)).toEqual([quality('Pierce', 4), quality('Vicious', 1)]);
		expect(qualities).toEqual([quality('Pierce', 2), quality('Vicious', 1)]);
	});

	it.each([0, -1])('removes the quality given a rating of %i', (rating) => {
		expect(withQualityRating([quality('Pierce', 2), quality('Vicious', 1)], 0, rating)).toEqual([quality('Vicious', 1)]);
	});

	it.each([
		['its current rating', 2],
		['a rating that is not a number', NaN],
	])('changes nothing given %s', (_, rating) => {
		expect(withQualityRating([quality('Pierce', 2)], 0, rating)).toBeUndefined();
	});
});

describe('withQualityChanged', () => {
	it('changes the quality at an index, and leaves the given list and its qualities as they are', () => {
		const qualities = Object.freeze([quality('Auto-fire'), quality('Vicious')].map((q) => Object.freeze(q)));

		expect(withQualityChanged(qualities, 0, { activation: 'active', advantageCost: 3 })).toEqual([
			{ ...quality('Auto-fire'), activation: 'active', advantageCost: 3 },
			quality('Vicious'),
		]);
		expect(qualities).toEqual([quality('Auto-fire'), quality('Vicious')]);
	});

	it('changes nothing given the values the quality has, or an index the list lacks', () => {
		expect(withQualityChanged([quality('Vicious')], 0, { activation: 'passive', description: '<p>Vicious.</p>' })).toBeUndefined();
		expect(withQualityChanged([quality('Vicious')], 1, { activation: 'active' })).toBeUndefined();
	});
});

describe('qualityLabel', () => {
	it('names a rated quality with its rating, as Vicious 2', () => {
		expect(qualityLabel(quality('Vicious', 2))).toBe('Vicious 2');
	});

	it('names a quality that is not rated alone, whatever rating it keeps', () => {
		expect(qualityLabel(quality('Accurate', 1, false))).toBe('Accurate');
	});
});

describe('itemQualities', () => {
	it("lists a weapon's main profile's qualities, then its extra profiles'", () => {
		const system = { qualities: [quality('Accurate')], extraProfiles: [{ qualities: [quality('Limited Ammo')] }, { qualities: [] }] };

		expect(itemQualities(system)).toEqual([quality('Accurate'), quality('Limited Ammo')]);
	});

	it("lists an armor's qualities, and none for an item that holds none", () => {
		expect(itemQualities({ qualities: [quality('Defensive')] })).toEqual([quality('Defensive')]);
		expect(itemQualities({ rank: 2 })).toEqual([]);
	});
});

describe('qualityIdOf', () => {
	it('reads the id of the quality an effect is tagged with, and none for an effect without the tag', () => {
		expect(qualityIdOf(tagged('e1', 'accurate'))).toBe('accurate');
		expect(qualityIdOf({ flags: { genesys: { quality: '' } } })).toBeUndefined();
		expect(qualityIdOf({ flags: { genesys: {} } })).toBeUndefined();
		expect(qualityIdOf({})).toBeUndefined();
	});
});

describe('effectQuality', () => {
	it("finds the quality of an item an effect is tagged with, in any of a weapon's profiles", () => {
		const system = { qualities: [quality('Accurate')], extraProfiles: [{ qualities: [quality('Inaccurate', 2)] }] };

		expect(effectQuality(tagged('e1', 'inaccurate'), system)).toEqual(quality('Inaccurate', 2));
	});

	it('finds none for an effect tagged with a quality the item lacks, an untagged effect, or an effect without item', () => {
		const system = { qualities: [quality('Accurate')] };

		expect(effectQuality(tagged('e1', 'gone'), system)).toBeUndefined();
		expect(effectQuality({ flags: {} }, system)).toBeUndefined();
		expect(effectQuality(tagged('e1', 'accurate'), undefined)).toBeUndefined();
	});
});

describe('isOutrankedQualityEffect (CRB pp. 86–89)', () => {
	// A copy of a quality under its own id, as a drop on another Weapon Profile makes it.
	const copyOf = (id: string, name: string, rating = 1, isRated = true) => ({ ...quality(name, rating, isRated), id });

	it('keeps one copy of a quality held by two profiles at the same rank, the first: Defensive 1 counts once per weapon', () => {
		const system = { qualities: [copyOf('d1', 'Defensive')], extraProfiles: [{ qualities: [copyOf('d2', 'defensive')] }] };

		expect(isOutrankedQualityEffect(tagged('e1', 'd1'), system)).toBe(false);
		expect(isOutrankedQualityEffect(tagged('e2', 'd2'), system)).toBe(true);
	});

	it('keeps the copy of the highest rank, on whichever profile holds it', () => {
		const system = {
			qualities: [copyOf('d1', 'Defensive', 1)],
			extraProfiles: [{ qualities: [copyOf('d2', 'Defensive', 2)] }, { qualities: [copyOf('d3', 'Defensive', 2)] }],
		};

		expect(isOutrankedQualityEffect(tagged('e1', 'd1'), system)).toBe(true);
		expect(isOutrankedQualityEffect(tagged('e2', 'd2'), system)).toBe(false);
		expect(isOutrankedQualityEffect(tagged('e3', 'd3'), system)).toBe(true);
	});

	it("outranks nothing else: an armor's quality, distinct qualities, an untagged effect or one without item", () => {
		const system = { qualities: [copyOf('d1', 'Defensive')], extraProfiles: [{ qualities: [copyOf('a1', 'Accurate', 2)] }] };

		expect(isOutrankedQualityEffect(tagged('e1', 'd1'), { qualities: [copyOf('d1', 'Defensive')] })).toBe(false);
		expect(isOutrankedQualityEffect(tagged('e1', 'd1'), system)).toBe(false);
		expect(isOutrankedQualityEffect(tagged('e2', 'a1'), system)).toBe(false);
		expect(isOutrankedQualityEffect({ flags: {} }, system)).toBe(false);
		expect(isOutrankedQualityEffect(tagged('e1', 'd1'), undefined)).toBe(false);
	});
});

describe('orphanedQualityEffects', () => {
	it("lists the effects tagged with a quality the item no longer holds, and leaves the item's other effects", () => {
		const system = { qualities: [quality('Accurate')], extraProfiles: [{ qualities: [quality('Defensive')] }] };
		const effects = [
			tagged('e1', 'accurate'),
			tagged('e2', 'vicious'),
			tagged('e3', 'defensive'),
			{ id: 'e4', flags: {} },
			tagged('e5', 'vicious'),
		];

		expect(orphanedQualityEffects(effects, system)).toEqual(['e2', 'e5']);
	});
});

describe('qualityCopy', () => {
	it('copies what a quality item holds, but its rating, under the id given', () => {
		const item = {
			name: 'Auto-fire',
			system: { description: '<p>Fires.</p>', activation: 'active' as const, advantageCost: 2, isRated: false, source: 'CRB' },
		};

		expect(qualityCopy('q1', item)).toEqual({
			id: 'q1',
			name: 'Auto-fire',
			description: '<p>Fires.</p>',
			activation: 'active',
			advantageCost: 2,
			isRated: false,
		});
	});
});

describe('qualityEffectsData', () => {
	it("copies a quality item's effects without their ids, tagged with the quality's id, keeping their other flags", () => {
		const effects = [
			{ _id: 'a', name: 'Accurate', changes: [{ key: 'genesys.pool.combat.self.', value: 'B' }], flags: { core: { x: 1 } } },
			{ _id: 'b', name: 'Other', flags: { genesys: { lapses: true } } },
		];

		expect(qualityEffectsData(effects, 'q1')).toEqual([
			{
				name: 'Accurate',
				changes: [{ key: 'genesys.pool.combat.self.', value: 'B' }],
				flags: { core: { x: 1 }, genesys: { quality: 'q1' } },
			},
			{ name: 'Other', flags: { genesys: { lapses: true, quality: 'q1' } } },
		]);
	});
});
