/**
 * @file System Entry Point
 */

import { register as registerConfig } from '@/config';
import { register as registerCombat } from '@/combat';
import { register as registerSidebars } from '@/sidebar';
import { register as registerDice } from '@/dice';
import { register as registerEnrichers } from '@/enrichers';
import { register as registerFonts } from '@/fonts';
import { register as registerHandlebarsHelpers } from '@/handlebars';
import { NAMESPACE as SETTINGS_NAMESPACE, register as registerSettings, setup as setupSettings, ready as readySettings } from '@/settings';
import { KEY_ALPHA_VERSION } from '@/settings/alpha';
import type { SettingKey } from '@/settings/table';

import { register as registerStoryPointTracker } from '@/app/StoryPointTracker';
import { register as registerActors } from '@/actor';
import { register as registerToken } from '@/token';
import { register as registerEffects } from '@/effects';
import { register as registerItems } from '@/item';
import { register as registerVehicles } from '@/actor/data/VehicleDataModel';
import { DicePrompt } from '@/app/DicePrompt';

import { GenesysCompendium } from '@/sidebar/GenesysCompendium';
import { performMigrations } from '@/migrations/MigrationHelper';

import '@scss/index.scss';

async function doAlphaNotice(lastAlpha: string) {
	if (!game.user.isGM) {
		return;
	}

	const [lastMajor, lastMinor, lastRevision] = lastAlpha.split('.').map((v) => parseInt(v));
	const [currMajor, currMinor, currRevision] = game.system.version.split('.').map((v) => parseInt(v));

	if (lastMajor >= currMajor && lastMinor >= currMinor && lastRevision >= currRevision) {
		return;
	}

	const enrichedMessage = await TextEditor.enrichHTML(
		/*html*/ `
	<h3 style="font-family: 'Bebas Neue', sans-serif">Genesys Alpha ${game.system.version}</h3>
	<p>
		Hello! Thank you for giving the Genesys system a try! Please note that this system is currently in an alpha state; it is ready for some early playtesting and experimentation, but there are many features that are yet unimplemented and may be bugs!
	</p>
	<div style="text-align: center">@symbol[satfhd]</div>
	<h4 style="font-family: 'Bebas Neue', sans-serif">Bug Fixes & Updates</h4>
	<ul style="margin-top: 0">
      <li>The system is now maintained at <a href="https://github.com/kornifex/FVTT-Genesys">kornifex/FVTT-Genesys</a>.</li>
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/1824caef9f1a93d8d0b3acf8ca9f0cb9129db452">[FIX]</a>: Count every term of a repeated die in roll results, so a hand-typed formula such as <code>2da + 1da</code> keeps the symbols of the second term</li>
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/ae497293602c9aa602ee8d3fcb9453e622a4134f">[FEATURE]</a>: Add a "Style" world setting, with a Realms of Terrinoth color variant chosen by the GM for every user</li>
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/dc0df416da4304262cb39b721fd9315b98eb0773">[STYLING]</a>: Use only FontAwesome Free icons: a few sheet icons change (injuries, inventory, weapons, careers)</li>
	</ul>
	<div style="text-align: center">@dice[apbdcs]</div>
	<h4 style="font-family: 'Bebas Neue', sans-serif">Useful Links</h4>
	<ul style="margin-top: 0">
		<li><a href="https://github.com/kornifex/FVTT-Genesys/wiki">Project Documentation</a></li>
		<li><a href="https://github.com/kornifex/FVTT-Genesys">Project Source Code</a></li>
		<li><a href="https://github.com/kornifex/FVTT-Genesys/issues">Report Bugs &amp; Suggest Features</a></li>
		<li><a href="https://github.com/kornifex/FVTT-Genesys/blob/main/LICENSE">Licensed under the MIT License</a></li>
	</ul>
	`,
		{ async: true },
	);

	await ChatMessage.create({
		user: game.user.id,
		content: enrichedMessage,
		style: CONST.CHAT_MESSAGE_STYLES.OTHER,
	});

	await game.settings.set(SETTINGS_NAMESPACE, KEY_ALPHA_VERSION, game.system.version);
}

Hooks.once('init', async () => {
	// System Documents
	registerActors();
	registerToken();
	registerEffects();
	registerItems();

	// Misc. modules with one-time registrations
	registerCombat();
	registerSidebars();
	registerEnrichers();
	registerFonts();
	registerDice();
	registerHandlebarsHelpers();
	registerSettings();
	registerConfig();
});

Hooks.once('setup', () => {
	setupSettings();
});

Hooks.once('ready', async () => {
	// Get the last-acknowledged Alpha version notice.
	const lastAlpha = game.settings.get<string>(SETTINGS_NAMESPACE, KEY_ALPHA_VERSION) ?? '0.0.0';

	await doAlphaNotice(lastAlpha);
	readySettings();

	await performMigrations(lastAlpha);

	registerStoryPointTracker();
	registerVehicles();
});

// Allow to open the DicePrompt on chat command /gendr (for GENesys Dice Roller), thus allowing to open it from a macro
Hooks.on('chatMessage', (_chatLog: ChatLog, message: string, _chatData: unknown) => {
	const commandR = /^\/gendr(?:oll)?/i;
	if (message.match(commandR)) {
		void DicePrompt.promptForRoll(undefined, '');
		return false;
	}
	return true;
});

// Create wiki links in the description section of certain settings. We use a hook here since there is no way to
// directly add links as any HTML is escaped.
const wikiLinkPattern = /\[\[([^|\]]+)(\|([^\]]+))?\]\]/g;
const WIKI_LINKED_SETTING: SettingKey = 'defaultDifficulty';
// v12: the Foundry types we have are v12's, whose hook passes jQuery; v13 passes the element.
Hooks.on('renderSettingsConfig', (_app: SettingsConfig, html: JQuery<HTMLElement>, _data: object) => {
	const note = (html as unknown as HTMLElement).querySelector(`.form-fields:has(input[name='genesys.${WIKI_LINKED_SETTING}']) + p.hint`);

	if (note) {
		note.innerHTML = note.innerHTML.replaceAll(wikiLinkPattern, (_m, g1, _g2, g3) => {
			return `<a href="https://github.com/kornifex/FVTT-Genesys/wiki/${g1}" target="_blank">${g3 ? g3 : g1}</a>`;
		});
	}
});

// Currently there is no way to specify the class for rendering a compendium collection application since it is
// hardcoded. However, we can cheat the system into using our own implementation by manually instanciating it and
// patching the compendium. Also, because we want to apply this even to newly created compendia we run this on every
// compendium directory bar rendering (it's triggered right after a new compendium is created). We went with this way
// of cheating the system in order to capture newly created compendia.
// For context, we want to perform this patch to allow sheets with drop areas to properly highlight when something is
// being dragged from a compendium.
const COMPENDIUM_PATCHING = {
	PATCHED: new Set<string>(),
	TYPES: ['Actor', 'Item'],
};
Hooks.on('renderCompendiumDirectory', (_sidebar: SidebarTab, _html: JQuery<HTMLElement>, _data: object) => {
	for (const pack of game.packs.values()) {
		if (!COMPENDIUM_PATCHING.PATCHED.has(pack.metadata.id)) {
			COMPENDIUM_PATCHING.PATCHED.add(pack.metadata.id);
			if (COMPENDIUM_PATCHING.TYPES.includes(pack.metadata.type)) {
				pack.apps.shift();
				pack.apps.push(new GenesysCompendium({ collection: pack }));
			}
		}
	}
});
