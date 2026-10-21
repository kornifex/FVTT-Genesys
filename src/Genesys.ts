/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file System Entry Point
 */

import { register as registerConfig, ready as readyConfigs } from '@/config';
import { register as registerCombat } from '@/combat';
import { register as registerSidebars } from '@/sidebar';
import { register as registerDice } from '@/dice';
import { register as registerEnrichers } from '@/enrichers';
import { register as registerFonts } from '@/fonts';
import { register as registerHandlebarsHelpers } from '@/handlebars';
import { NAMESPACE as SETTINGS_NAMESPACE, register as registerSettings } from '@/settings';
import { KEY_ALPHA_VERSION } from '@/settings/alpha';
import { KEY_DEFAULT_DIFFICULTY } from '@/settings/campaign';

import { register as registerStoryPointTracker } from '@/app/StoryPointTracker';
import { register as registerActors, AdversaryTypes } from '@/actor';
import { register as registerToken } from '@/token';
import { register as registerEffects } from '@/effects';
import { register as registerItems, CharacterCreationItemTypes, EquipmentItemTypes } from '@/item';
import { register as registerVehicles } from '@/actor/data/VehicleDataModel';
import DicePrompt, { registerWorker } from '@/app/DicePrompt';

import GenesysActor from '@/actor/GenesysActor';
import GenesysCompendium from '@/sidebar/GenesysCompendium';
import { performMigrations } from '@/migrations/MigrationHelper';

import './scss/index.scss';

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
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/fe01eb276620a711888ba5a2ac6a74c5f81742a4">[FIX]</a>: Fix initiative skill selection in the combat tracker: the chosen skill is shared between the GM and players and survives reloads</li>
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/65a276460e66c596c7cab4ee1b57afa80aaf6deb">[FEATURE]</a>: Roll skills an adversary has no ranks in (initiative, journal checks, weapons), listed as "Unranked" in the dice prompt</li>
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/eaba0ca2f3f24c8620d11baeb7db74f358fa0c24">[FEATURE]</a>: Add an "Ignore Talent Pyramid" house rule setting</li>
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/0f89ed0ba9d91fa452cf7442dd945f36e8952d43">[FEATURE]</a>: Add a "Talent Tier Versions" house rule setting, for talents with one item per tier</li>
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/f5ec9d6060ff25d77c2026095d1f28483bb6eb92">[STYLING]</a>: Expose the color palette as CSS custom properties, so worlds and modules can restyle the system</li>
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/7164d115542833e31dd829228cd78be1dd590d22">[STYLING]</a>: Give player notes the full width of the journal tab</li>
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/1810142ae5d6f81ef7a25733e21abb88a9e96e44">[LOCALIZATION]</a>: Localize adversary weapon details and XP journal characteristics</li>
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/adf860990bab9dc635c483172a5959d8900d2c18">[LOCALIZATION]</a>: Improve the French translation</li>
	</ul>
	<div style="text-align: center">@dice[apbdcs]</div>
	<h4 style="font-family: 'Bebas Neue', sans-serif">Useful Links</h4>
	<ul style="margin-top: 0">
		<li><a href="https://github.com/Mezryss/FVTT-Genesys/wiki">Project Wiki</a></li>
		<li><a href="https://github.com/Mezryss/FVTT-Genesys">Project Source Code</a></li>
		<li><a href="https://github.com/Mezryss/FVTT-Genesys/discussions">Discuss The System</a></li>
		<li><a href="https://github.com/Mezryss/FVTT-Genesys/issues">Report Bugs &amp; Suggest Features</a></li>
		<li><a href="https://github.com/Mezryss/FVTT-Genesys/blob/main/LICENSE">Licensed under the MIT License</a></li>
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

Hooks.once('ready', async () => {
	// Get the last-acknowledged Alpha version notice.
	const lastAlpha = game.settings.get<string>(SETTINGS_NAMESPACE, KEY_ALPHA_VERSION) ?? '0.0.0';

	await doAlphaNotice(lastAlpha);
	readyConfigs();

	await performMigrations(lastAlpha);

	registerStoryPointTracker();
	registerVehicles();
	registerWorker();
});

function constructOptGroup(select: HTMLSelectElement, groupLabel: string, optValues?: string[]): HTMLOptGroupElement {
	const options = select.querySelectorAll<HTMLOptionElement>(':scope > option');
	const optgroup = document.createElement('optgroup');

	optgroup.label = groupLabel;
	optgroup.append(...Array.from(options).filter((option) => !optValues || optValues.includes(option.value)));

	return optgroup;
}

// Add options groups to the dialog that appears when creating an actor or item.
Hooks.on('renderDialog', (_dialog: Dialog, html: JQuery<HTMLElement>, _data: object) => {
	const container = html[0];

	// Cheks if it's the item creation dialog and categorize the options from the dropdown
	if (container.classList.contains('dialog-item-create')) {
		const select = container.querySelector<HTMLSelectElement>('select[name=type]');

		if (select) {
			select.append(
				constructOptGroup(select, game.i18n.localize('Genesys.DialogGroups.Item.CharacterCreation'), CharacterCreationItemTypes),
				constructOptGroup(select, game.i18n.localize('Genesys.DialogGroups.Item.Equipment'), EquipmentItemTypes),
				constructOptGroup(select, game.i18n.localize('Genesys.DialogGroups.Item.Other')),
			);
			select.querySelector('option')!.selected = true;
		}

		// Cheks if it's the actor creation dialog and categorize the options from the dropdown
	} else if (container.classList.contains('dialog-actor-create')) {
		const select = container.querySelector<HTMLSelectElement>('select[name=type]');

		if (select) {
			select.append(constructOptGroup(select, game.i18n.localize('Genesys.DialogGroups.Actor.Adversary'), AdversaryTypes), constructOptGroup(select, game.i18n.localize('Genesys.DialogGroups.Actor.Other')));
			select.querySelector('option')!.selected = true;
		}
	}
});

// Makes the dice icon at the bottom of the chat to function as a shortcut to call the dice prompt.
Hooks.on('renderChatLog', (_sidebar: SidebarTab, html: JQuery<HTMLElement>, _data: object) => {
	if (game.version.startsWith('13')) {
		return;
	}

	const diceIcon = html.find('#chat-controls > .chat-control-icon');
	diceIcon.on('click', async (_event) => {
		const controlledTokens = canvas.tokens.controlled;

		let targetActor;
		if (controlledTokens.length > 1) {
			ui.notifications.error(game.i18n.localize('Genesys.Notifications.SelectNoneOrOneTokenForAction'));
			return;
		} else if (controlledTokens.length === 1) {
			if (controlledTokens[0].actor?.type === 'vehicle') {
				ui.notifications.error(game.i18n.localize('Genesys.Notifications.InvalidTokenTypeForAction'));
				return;
			} else {
				targetActor = (controlledTokens[0].actor ?? undefined) as GenesysActor | undefined;
			}
		}

		await DicePrompt.promptForRoll(targetActor, '');
	});
});

// Allow to open the DicePrompt on chat command /gendr (for GENesys Dice Roller), thus allowing to open it from a macro
Hooks.on('chatMessage', (chatLog: ChatLog, message: string, _chatData: any) => {
	const commandR = /^\/gendr(?:oll)?/i;
	if (message.match(commandR)) {
		DicePrompt.promptForRoll(undefined, '');
		return false;
	}
	return true;
});

// Create wiki links in the description section of certain settings. We use a hook here since there is no way to
// directly add links as any HTML is escaped.
const wikiLinkPattern = /\[\[([^|\]]+)(\|([^\]]+))?\]\]/g;
Hooks.on('renderSettingsConfig', (_app: SettingsConfig, html: JQuery<HTMLElement>, _data: object) => {
	const theHtml = game.version.startsWith('13') ? (html as unknown as HTMLElement) : html[0];

	let note = theHtml.querySelector(`[data-setting-id='genesys.${KEY_DEFAULT_DIFFICULTY}'] > .notes`);
	if (!note) {
		// FVTT v13 has a different way for structuring their settings.
		note = theHtml.querySelector(`.form-fields:has(input[name='genesys.${KEY_DEFAULT_DIFFICULTY}']) + p.hint`);
	}

	if (note) {
		note.innerHTML = note.innerHTML.replaceAll(wikiLinkPattern, (_m, g1, _g2, g3) => {
			return `<a href="https://github.com/Mezryss/FVTT-Genesys/wiki/${g1}" target="_blank">${g3 ? g3 : g1}</a>`;
		});
	}
});

// Currently there is no way to specify the class for rendering a compendium collection application since it is
// hardcoded. However, we can cheat the system into using our own implementation by manually instanciating it and
// patching the compendium. Also, because we want to apply this even to newly created compendia we run this on every
// compendium directory bar rendering (it's triggered right after a new compendium is created). We went with this way
// of cheating the system in order to maintain compatibility with FVTTv10+ and to capture newly created compendia.
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
