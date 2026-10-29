/** @file Tests for the qualities of a weapon or an armor: adding a dropped one, raising and changing its rating, removing it. */

import { describe, expect, it } from 'vitest';

import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { qualityLabel, withQualityAdded, withQualityRating } from '@/item/data/Qualities';

const quality = (name: string, rating = 1, isRated = true): ContainedItemQuality => ({
	name,
	description: `<p>${name}.</p>`,
	isRated,
	rating,
});

describe('withQualityAdded', () => {
	it('adds a quality the item lacks at rating 1, after the ones it has', () => {
		expect(withQualityAdded([quality('Pierce', 2)], { name: 'Vicious', description: '<p>Vicious.</p>', isRated: true })).toEqual([
			quality('Pierce', 2),
			quality('Vicious', 1),
		]);
	});

	it('raises by 1 the rating of a rated quality the item has, whatever the case of its name, and leaves the given list as it is', () => {
		const qualities = Object.freeze([quality('Pierce', 2), quality('Vicious', 1)].map((q) => Object.freeze(q)));

		expect(withQualityAdded(qualities, { name: 'vicious', description: '<p>Other.</p>', isRated: true })).toEqual([
			quality('Pierce', 2),
			quality('Vicious', 2),
		]);
		expect(qualities).toEqual([quality('Pierce', 2), quality('Vicious', 1)]);
	});

	it('changes nothing when the item already has the quality and the quality is not rated', () => {
		expect(withQualityAdded([quality('Accurate', 1, false)], { name: 'Accurate', description: '', isRated: false })).toBeUndefined();
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

describe('qualityLabel', () => {
	it('names a rated quality with its rating, as Vicious 2', () => {
		expect(qualityLabel(quality('Vicious', 2))).toBe('Vicious 2');
	});

	it('names a quality that is not rated alone, whatever rating it keeps', () => {
		expect(qualityLabel(quality('Accurate', 1, false))).toBe('Accurate');
	});
});
