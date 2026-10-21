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
