/**
 * @file System Entry Point
 */

import { register as registerConfig } from '@/config';
import { register as registerCombat } from '@/combat';
import { register as registerSidebars } from '@/sidebar';
import { register as registerSocket } from '@/socket';
import { register as registerDice } from '@/dice';
import { register as registerEnrichers } from '@/enrichers';
import { register as registerFonts } from '@/fonts';
import { register as registerHandlebarsHelpers } from '@/handlebars';
import { register as registerSettings, setup as setupSettings, ready as readySettings } from '@/settings';
import { lastAlphaVersion, ready as readyAlphaNotice } from '@/alphaNotice';
import { ready as readyMigrations } from '@/migrations';

import { register as registerDicePrompt } from '@/app/DicePrompt';
import { register as registerStoryPointTracker } from '@/app/StoryPointTracker';
import { register as registerActors } from '@/actor';
import { register as registerToken } from '@/token';
import { register as registerEffects } from '@/effects';
import { register as registerItems } from '@/item';
import { register as registerVehicles } from '@/actor/data/VehicleDataModel';

import '@scss/index.scss';

Hooks.once('init', () => {
	registerActors();
	registerToken();
	registerEffects();
	registerItems();

	registerSocket();
	registerCombat();
	registerSidebars();
	registerEnrichers();
	registerFonts();
	registerDice();
	registerDicePrompt();
	registerHandlebarsHelpers();
	registerSettings();
	registerConfig();
});

Hooks.once('setup', () => {
	setupSettings();
});

async function ready() {
	// The notice records the running version as the last one shown: the migrations tell a new world from the version
	// read before it.
	const lastAlpha = lastAlphaVersion();

	await readyAlphaNotice(lastAlpha);
	readySettings();

	await readyMigrations(lastAlpha);

	registerStoryPointTracker();
	registerVehicles();
}

// Foundry doesn't wait for a hook's callbacks.
Hooks.once('ready', () => void ready());
