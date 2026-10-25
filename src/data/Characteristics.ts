export enum Characteristic {
	Brawn = 'brawn',
	Agility = 'agility',
	Intellect = 'intellect',
	Cunning = 'cunning',
	Willpower = 'willpower',
	Presence = 'presence',
}

export type CharacteristicsContainer = {
	brawn: number;
	agility: number;
	intellect: number;
	cunning: number;
	willpower: number;
	presence: number;
};

/**
 * The characteristics in the order the sheets show them, with the localization keys of their name and abbreviation.
 */
export const CHARACTERISTICS: { characteristic: Characteristic; label: string; abbreviation: string }[] = [
	{ characteristic: Characteristic.Brawn, label: 'Genesys.Characteristics.Brawn', abbreviation: 'Genesys.CharacteristicAbbr.Brawn' },
	{
		characteristic: Characteristic.Agility,
		label: 'Genesys.Characteristics.Agility',
		abbreviation: 'Genesys.CharacteristicAbbr.Agility',
	},
	{
		characteristic: Characteristic.Intellect,
		label: 'Genesys.Characteristics.Intellect',
		abbreviation: 'Genesys.CharacteristicAbbr.Intellect',
	},
	{
		characteristic: Characteristic.Cunning,
		label: 'Genesys.Characteristics.Cunning',
		abbreviation: 'Genesys.CharacteristicAbbr.Cunning',
	},
	{
		characteristic: Characteristic.Willpower,
		label: 'Genesys.Characteristics.Willpower',
		abbreviation: 'Genesys.CharacteristicAbbr.Willpower',
	},
	{
		characteristic: Characteristic.Presence,
		label: 'Genesys.Characteristics.Presence',
		abbreviation: 'Genesys.CharacteristicAbbr.Presence',
	},
];

/**
 * The localization key of each characteristic's abbreviation.
 */
export const CHARACTERISTIC_ABBREVIATIONS = Object.fromEntries(
	CHARACTERISTICS.map(({ characteristic, abbreviation }) => [characteristic, abbreviation]),
) as Record<Characteristic, string>;

/**
 * The super-characteristics with one marked, or unmarked if it already was. The caller decides whether they can be
 * changed at all.
 */
export function toggledSuperCharacteristics(superCharacteristics: Set<Characteristic>, characteristic: Characteristic) {
	const toggled = new Set(superCharacteristics);
	if (!toggled.delete(characteristic)) {
		toggled.add(characteristic);
	}

	return Array.from(toggled);
}
