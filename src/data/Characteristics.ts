/**
 * The six characteristics of a character or adversary.
 */
export const Characteristic = {
	Brawn: 'brawn',
	Agility: 'agility',
	Intellect: 'intellect',
	Cunning: 'cunning',
	Willpower: 'willpower',
	Presence: 'presence',
} as const;

export type Characteristic = (typeof Characteristic)[keyof typeof Characteristic];

/**
 * A value for each characteristic.
 */
export type CharacteristicsContainer = Record<Characteristic, number>;

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
 * The localization key of each characteristic's name.
 */
export const CHARACTERISTIC_LABELS = Object.fromEntries(
	CHARACTERISTICS.map(({ characteristic, label }) => [characteristic, label]),
) as Record<Characteristic, string>;

/**
 * The localization key of each characteristic's abbreviation.
 */
export const CHARACTERISTIC_ABBREVIATIONS = Object.fromEntries(
	CHARACTERISTICS.map(({ characteristic, abbreviation }) => [characteristic, abbreviation]),
) as Record<Characteristic, string>;

/**
 * The most super-characteristics an actor can have (CRB p. 251).
 */
const MAX_SUPER_CHARACTERISTICS = 2;

/**
 * The super-characteristics with one marked, or unmarked if it already was. Undefined when marking it would go over two;
 * unmarking is always allowed, so an actor stored with more can get back to two. The caller decides whether they can be
 * changed at all.
 */
export function toggledSuperCharacteristics(
	superCharacteristics: Set<Characteristic>,
	characteristic: Characteristic,
): Characteristic[] | undefined {
	const toggled = new Set(superCharacteristics);
	if (!toggled.delete(characteristic)) {
		if (toggled.size >= MAX_SUPER_CHARACTERISTICS) {
			return undefined;
		}
		toggled.add(characteristic);
	}

	return Array.from(toggled);
}
