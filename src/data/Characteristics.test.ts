import { describe, expect, it } from 'vitest';

import { CHARACTERISTIC_ABBREVIATIONS, CHARACTERISTIC_LABELS, Characteristic, toggledSuperCharacteristics } from '@/data/Characteristics';

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

	it('leaves its input unchanged', () => {
		const superCharacteristics = new Set([Characteristic.Brawn]);

		toggledSuperCharacteristics(superCharacteristics, Characteristic.Brawn);
		toggledSuperCharacteristics(superCharacteristics, Characteristic.Agility);

		expect(superCharacteristics).toEqual(new Set([Characteristic.Brawn]));
	});
});
