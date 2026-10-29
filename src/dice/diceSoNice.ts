/** @file The Genesys dice of Dice So Nice: their faces, and their colours in each of its dice systems. */

import type { DieName } from '@/dice/DicePool';
import { DieFaces } from '@/dice/DieFaces';
import { DieTypes } from '@/dice/DieTypes';
import * as log from '@/log';

/**
 * How Dice So Nice draws a die: its colour, the colour of its symbols and of their outline, and the scale of its
 * symbols in the standard font and in the Magical Girl one.
 */
type DieLook = {
	die: DieName;
	color: string;
	foreground?: string;
	outline?: string;
	fontScale: number;
	magicalFontScale: number;
};

const DICE: DieLook[] = [
	{ die: 'Boost', color: '#72cddc', fontScale: 1.5, magicalFontScale: 1.5 },
	{ die: 'Ability', color: '#41ad49', fontScale: 0.8, magicalFontScale: 0.7 },
	{ die: 'Proficiency', color: '#ffe800', fontScale: 1.2, magicalFontScale: 1.0 },
	{ die: 'Setback', color: '#000000', foreground: '#ffffff', fontScale: 1.25, magicalFontScale: 1.5 },
	{ die: 'Difficulty', color: '#6c2a84', foreground: '#ffffff', outline: '#000000', fontScale: 0.8, magicalFontScale: 0.8 },
	{ die: 'Challenge', color: '#7d1821', foreground: '#ffffff', outline: '#000000', fontScale: 1.2, magicalFontScale: 1.0 },
];

const FONT_SCALE = Object.fromEntries(DICE.map(({ die, fontScale }) => [DieTypes[die].FORMULA, fontScale]));
const MAGICAL_FONT_SCALE = Object.fromEntries(DICE.map(({ die, magicalFontScale }) => [DieTypes[die].FORMULA, magicalFontScale]));

function standardColorset({ die, color, foreground, outline }: DieLook): ColorSet {
	return {
		name: `genesys-${die.toLowerCase()}`,
		description: `Genesys.DiceColors.${die}`,
		category: 'Genesys.DiceCat.Normal',
		foreground: foreground ?? '#000000',
		background: color,
		outline,
		edge: color,
		font: 'Genesys Symbols',
		fontScale: FONT_SCALE,
	};
}

function magicalColorset(look: DieLook): ColorSet {
	return {
		...standardColorset(look),
		name: `genesys-mg-${look.die.toLowerCase()}`,
		category: 'Genesys.DiceCat.MagicalGirl',
		// The Magical Girl symbols are outlined in the die's colour unless the die gives another.
		outline: look.outline ?? look.color,
		font: 'Magical Girl Symbols',
		fontScale: MAGICAL_FONT_SCALE,
	};
}

// The colorset a player colours as they like, for Dice So Nice's standard dice system.
function customColorset({ die }: DieLook): ColorSet {
	return {
		name: `genesys-cust-${die.toLowerCase()}`,
		description: `Genesys.DiceColors.${die}`,
		category: 'Genesys.DiceCat.Custom',
		fontScale: FONT_SCALE,
	};
}

/**
 * The dice systems the Genesys dice are drawn in, each with the colorset of a die.
 */
const SYSTEMS: { system: string; colorset: (look: DieLook) => ColorSet }[] = [
	{ system: 'genesys', colorset: standardColorset },
	{ system: 'genesys-mg', colorset: magicalColorset },
	{ system: 'standard', colorset: customColorset },
];

function registerDice(dice3d: Dice3d) {
	log.info('Dice So Nice! Detected, initializing dice...');

	dice3d.addSystem({ id: 'genesys', name: 'Genesys.System.Name' }, 'preferred');
	dice3d.addSystem({ id: 'genesys-mg', name: 'Genesys.DiceCat.MagicalGirl' }, 'default');

	for (const { system, colorset } of SYSTEMS) {
		for (const look of DICE) {
			const lookColorset = colorset(look);
			dice3d.addColorset(lookColorset, 'default');
			dice3d.addDicePreset({ type: DieTypes[look.die].FORMULA, labels: DieFaces[look.die], system, colorset: lookColorset.name });
		}
	}

	log.info('Dice So Nice! initialization complete.');
}

/**
 * Registers the Genesys dice with Dice So Nice, once it is ready.
 */
export function register() {
	Hooks.once('diceSoNiceReady', registerDice);
}
