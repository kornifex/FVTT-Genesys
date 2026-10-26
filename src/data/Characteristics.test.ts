import { describe, expect, it } from 'vitest';

import {
	CHARACTERISTIC_ABBREVIATIONS,
	CHARACTERISTIC_LABELS,
	CHARACTERISTICS,
	Characteristic,
	toggledSuperCharacteristics,
} from '@/data/Characteristics';

describe('CHARACTERISTICS', () => {
	it('lists the six characteristics: Agility, Brawn, Cunning, Intellect, Presence and Willpower (CRB p. 13)', () => {
		const characteristics = CHARACTERISTICS.map(({ characteristic }) => characteristic);

		expect(characteristics).toHaveLength(6);
		expect(new Set(characteristics)).toEqual(
			new Set([
				Characteristic.Agility,
				Characteristic.Brawn,
				Characteristic.Cunning,
				Characteristic.Intellect,
				Characteristic.Presence,
				Characteristic.Willpower,
			]),
		);
	});
});

describe('CHARACTERISTIC_LABELS and CHARACTERISTIC_ABBREVIATIONS', () => {
	it("give a characteristic's name and abbreviation keys", () => {
		expect(CHARACTERISTIC_LABELS[Characteristic.Willpower]).toBe('Genesys.Characteristics.Willpower');
		expect(CHARACTERISTIC_ABBREVIATIONS[Characteristic.Willpower]).toBe('Genesys.CharacteristicAbbr.Willpower');
		expect(CHARACTERISTIC_LABELS[Characteristic.Cunning]).toBe('Genesys.Characteristics.Cunning');
		expect(CHARACTERISTIC_ABBREVIATIONS[Characteristic.Cunning]).toBe('Genesys.CharacteristicAbbr.Cunning');
	});
});

describe('toggledSuperCharacteristics', () => {
	it('marks a characteristic that is not a super-characteristic', () => {
		expect(toggledSuperCharacteristics(new Set([Characteristic.Brawn]), Characteristic.Willpower)).toEqual([
			Characteristic.Brawn,
			Characteristic.Willpower,
		]);
	});

	it('unmarks a characteristic that is a super-characteristic', () => {
		expect(toggledSuperCharacteristics(new Set([Characteristic.Brawn, Characteristic.Willpower]), Characteristic.Brawn)).toEqual([
			Characteristic.Willpower,
		]);
	});

	describe('allows two super-characteristics at most (CRB p. 251)', () => {
		const { Brawn, Agility, Intellect, Cunning } = Characteristic;

		it.each([
			{ before: [], toggle: Brawn, after: [Brawn] },
			{ before: [Brawn], toggle: Agility, after: [Brawn, Agility] },
			{ before: [Brawn, Agility], toggle: Agility, after: [Brawn] },
			{ before: [Brawn, Agility, Cunning], toggle: Cunning, after: [Brawn, Agility] },
		])('toggles $toggle on $before into $after', ({ before, toggle, after }) => {
			expect(toggledSuperCharacteristics(new Set(before), toggle)).toEqual(after);
		});

		it.each([
			{ before: [Brawn, Agility], toggle: Intellect },
			{ before: [Brawn, Agility, Cunning], toggle: Intellect },
		])('refuses to mark $toggle on $before', ({ before, toggle }) => {
			expect(toggledSuperCharacteristics(new Set(before), toggle)).toBeUndefined();
		});
	});

	it('leaves its input unchanged', () => {
		const superCharacteristics = new Set([Characteristic.Brawn]);

		toggledSuperCharacteristics(superCharacteristics, Characteristic.Brawn);
		toggledSuperCharacteristics(superCharacteristics, Characteristic.Agility);

		expect(superCharacteristics).toEqual(new Set([Characteristic.Brawn]));
	});
});
