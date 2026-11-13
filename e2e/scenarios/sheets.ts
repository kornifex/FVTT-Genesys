/** @file The sheet and chat card items of the test checklist (#37), each step named after its section: `#95 A1 …` for §#95. */
import type { Client, ScenarioContext } from '../scenario.ts';
import { installSheetsHelpers, type SheetsContext } from './sheets/shared.ts';
import { welcomePart } from './sheets/welcome.ts';
import { tokenLabelsPart } from './sheets/tokenLabels.ts';
import { appV2WindowsPart } from './sheets/appV2Windows.ts';
import { fieldLooksPart } from './sheets/fieldLooks.ts';
import { windowSizesPart } from './sheets/windowSizes.ts';
import { characteristicBoxesPart } from './sheets/characteristicBoxes.ts';
import { headingsPart } from './sheets/headings.ts';
import { linkLines } from './sheets/linkLines.ts';
import { storyPointTrackerPlace } from './sheets/storyPointTrackerPlace.ts';
import { promptsPart } from './sheets/prompts.ts';
import { tabsAndFieldsPart } from './sheets/tabsAndFields.ts';
import { editorsPart } from './sheets/editors.ts';
import { editorTogglesPart } from './sheets/editorToggles.ts';
import { playerPermissionsPart } from './sheets/playerPermissions.ts';
import { gmSessionPart } from './sheets/gmSession.ts';
import { storyPointEditsPart } from './sheets/storyPointEdits.ts';
import { settingsPart } from './sheets/settings.ts';
import { liveEditsPart } from './sheets/liveEdits.ts';
import { storyPointSpendsPart } from './sheets/storyPointSpends.ts';
import { effectSheetPart } from './sheets/effectSheet.ts';
import { unregisteredChangeTypePart } from './sheets/unregisteredChangeType.ts';
import { frenchCardsPart } from './sheets/frenchCards.ts';
import { addedEffectsPart } from './sheets/addedEffects.ts';
import { enrichedSourcesPart } from './sheets/enrichedSources.ts';
import { crewTabPart } from './sheets/crewTab.ts';
import { effectsTabsPart } from './sheets/effectsTabs.ts';
import { chatCardsPart } from './sheets/chatCards.ts';
import { createdDocumentsPart } from './sheets/createdDocuments.ts';
import { weaponProfilesPart } from './sheets/weaponProfiles.ts';
import { weaponDataLayoutPart } from './sheets/weaponDataLayout.ts';
import { hardPointsPart } from './sheets/hardPoints.ts';
import { magicPart } from './sheets/magic.ts';
import { detachedWindowsPart } from './sheets/detachedWindows.ts';
import { sheetHeights } from './sheets/sheetHeights.ts';

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	const page = () => gm.page;

	// §#349: Foundry's compatibility warnings, which it logs through `console.warn` as the page reaches a deprecated API.
	// They are read from the console in Node, so that a warning logged as the system initializes is read too: the
	// listener is on before the GM reloads below. A warning logged once per page load comes again after each reload.
	const compatibilityWarnings: string[] = [];
	const listened = new WeakSet<object>();
	const recordCompatibilityWarnings = (client: Client) => {
		if (listened.has(client.page)) return;
		listened.add(client.page);
		client.page.on('console', (message) => {
			const text = message.text();
			if (
				message.type() === 'warning' &&
				/Deprecated since Version|You are accessing the global|You are assigning globalThis/.test(text)
			) {
				compatibilityWarnings.push(`${client.user}: ${text.split('\n')[0]}`);
			}
		});
	};
	recordCompatibilityWarnings(gm);

	// Each part starts from the shared setup, whatever the parts before it changed, so that it runs the same alone as after
	// them. Its notifications are cleared too: alone, the fresh world's permanent migration notifications, which the GM's
	// reload clears in a whole run, would fill the shown ones, cover the sheets and keep a part's own notification queued.
	let partRan = false;
	const part = (name: string, fn: () => Promise<void>) =>
		e2e.part(name, async () => {
			if (partRan) await gm.evaluate((name) => window.sheetsE2E.setUp(name), e2e.playerUser);
			await gm.evaluate(() => ui.notifications.clear());
			partRan = true;
			await fn();
		});

	// §#97: a GM who updates from an older version is welcomed with the documentation link. Reloading runs the ready hook
	// again; a last version of 0.0.0 skips the migrations. The GM reloads before the setup, which the parts share.
	await e2e.part('welcome', () => welcomePart({ e2e, gm }));

	// Installed again for a run without the welcome part, whose reload installs them otherwise.
	await gm.evaluate(installSheetsHelpers);
	const player = await e2e.player();
	await player.evaluate(installSheetsHelpers);
	recordCompatibilityWarnings(player);
	await e2e.step('setup', () => gm.evaluate((name) => window.sheetsE2E.setUp(name), e2e.playerUser));

	const context: SheetsContext = {
		e2e,
		gm,
		player,
		page,
		recordCompatibilityWarnings,
	};

	// §#348: the token configuration names an actor's bars and values in the game's language. Replacing their
	// translations tells a localized label from the English one it used to show raw.
	await part('tokenLabels', () => tokenLabelsPart(context));

	const actorTypes = ['Hero', 'Minion', 'Rival', 'Nemesis', 'Vehicle'];
	const itemTypes = await gm.evaluate(() => Object.keys(CONFIG.Item.dataModels));

	// §#95: the sheets and prompts are ApplicationV2 windows.
	await part('appV2Windows', () => appV2WindowsPart(context, actorTypes, itemTypes));

	// §#95: ApplicationV2 gives text fields and selects Foundry's look, with an inset shadow in a light theme. The sheets
	// give them the flat look of AppV1's fields, which the components are written over.
	await part('fieldLooks', () => fieldLooksPart(context, actorTypes, itemTypes));

	// #304: a minimized sheet collapses to its header, as wide as Foundry's --minimized-width (200px), and keeps its
	// minimum size while open.
	await part('windowSizes', () => windowSizesPart(context));

	// §#650: each characteristic's box is fitted to its own name and ↑ (#644), its ↑ beside the name, in English and in
	// French and in both Styles, and the sheet's default width holds the row (#621).
	await part('characteristicBoxes', () => characteristicBoxesPart(context));

	// #346: ApplicationV2 gives headings a larger size, a darker colour and wide margins. A description's headings keep
	// AppV1's look.
	await part('headings', () => headingsPart(context));

	await part('linkLines', () => linkLines(e2e));
	await part('storyPointTrackerPlace', () => storyPointTrackerPlace(e2e));

	// Prompts and the story point tracker.
	await part('prompts', () => promptsPart(context));

	// Tabs, fields, and a field closed without leaving it.
	await part('tabsAndFields', () => tabsAndFieldsPart(context));

	// §#260: the sheets edit their enriched text in Foundry's `<prose-mirror>` element, which their form submits.
	await part('editors', () => editorsPart(context));

	// §#488: an editor's toggle button shows while the pointer is over the editor, its icon centred in it; an adversary's
	// empty description shows it in a room of its own.
	await part('editorToggles', () => editorTogglesPart(context));

	// §#95 as a player who can't edit the sheet.
	await part('playerPermissions', () => playerPermissionsPart(context));

	// §#95 as GM: the session of the checklist's "To test".
	await part('gmSession', () => gmSessionPart(context));

	// The parts that change the Story Point pools put back these, the world's, so that the next part starts from them.
	const storyPoints = await gm.evaluate(() => window.sheetsE2E.storyPoints());
	await part('storyPointEdits', () => storyPointEditsPart(context, storyPoints));

	// §#415: Foundry cleans each setting through its DataField as it reads it, and validates it before storing it.
	await part('settings', () => settingsPart(context));

	// The Assistant GM joins in the first part that needs it, so that a part run alone without it doesn't wait for it.
	const assistantGM = async () => {
		const assistant = await e2e.assistantGM();
		await assistant.evaluate(installSheetsHelpers);
		recordCompatibilityWarnings(assistant);
		return assistant;
	};

	// §#249: an open sheet of each actor and item type shows at once an edit another client made with `update`, to the
	// document or to one of its items. The character shows its current wounds, the other sheets their source.
	await part('liveEdits', () => liveEditsPart(context, actorTypes, itemTypes, assistantGM));

	// §#250: a player's spend goes to the Acting GM alone, who writes it once and posts its message as the player.
	await part('storyPointSpends', () => storyPointSpendsPart(context, storyPoints, assistantGM));

	// §#32, §#40, §#49, §#85, §#140: the effect sheet.
	await part('effectSheet', () => effectSheetPart(context));

	// §#297: on v14, a change's type is one a module registers, and Foundry's form processing leaves a change of a type
	// no module registers as stored. A module removed leaves such a change; Foundry's types are cached once read, so the
	// effect is created with a type never registered rather than with one unregistered.
	await part('unregisteredChangeType', () => unregisteredChangeTypePart(context));

	// §#82 in French: the abilities' activation and the notification of a character created without skills.
	await part('frenchCards', () => frenchCardsPart(context));

	// §#101: the Effects tab adds an effect in each section.
	await part('addedEffects', () => addedEffectsPart(context));

	// §#101, §#82: enriched sources.
	await part('enrichedSources', () => enrichedSourcesPart(context));

	// §#82: the Crew tab follows its passengers and role members.
	await part('crewTab', () => crewTabPart(context));

	// §#102: the Effects tabs of actors and items.
	await part('effectsTabs', () => effectsTabsPart(context));

	// §#130: chat cards are spoken by the sheet's actor. §#134 shares its part: it reads the sword's quality rating that
	// §#130 changes.
	await part('chatCards', () => chatCardsPart(context));

	// §#262: the directories' create dialogs. Foundry's `createDialog` gets the position the directory asks for, so the
	// dialog opens there, and the system doesn't pass a dialog option where v13 reads a database option. §#258: the
	// defaults of a created document. §#97: a setting's hint.
	await part('createdDocuments', () => createdDocumentsPart(context));

	// B: a weapon's extra Weapon Profiles, edited on its Data tab, and listed on its card (§#366).
	// The weapon's profiles as stored, its main profile's skills and qualities, and the profile blocks its sheet shows.
	const weaponProfiles = () =>
		gm.evaluate(() => {
			type Quality = { name: string; rating: number };
			type Profile = { name: string; skills: string[]; qualities: Quality[] } & Record<string, unknown>;
			const weapon = game.items.getName('E2E weapon');
			const qualities = (list: Quality[]) => list.map(({ name, rating }) => ({ name, rating }));
			return {
				main: { skills: [...weapon.system.skills], qualities: qualities(weapon.system.qualities) },
				extraProfiles: (weapon.system.extraProfiles ?? []).map((profile: Profile) => ({
					...profile,
					skills: [...profile.skills],
					qualities: qualities(profile.qualities),
				})),
				blocks: window.e2e.htmlOf(weapon.sheet)!.querySelectorAll('.weapon-profile').length,
			};
		});
	await part('weaponProfiles', () => weaponProfilesPart(context, weaponProfiles));

	// §#428: a tab's own sections are as tall as it (nav.scss), and a tab is as tall as all its blocks together, or as the
	// window when that is taller: each Weapon Profile's block took the whole tab. §#439: drops on the Data tab.
	await part('weaponDataLayout', () => weaponDataLayoutPart(context, weaponProfiles));

	// §#695: a weapon's or an armor's Data tab shows its Hard Points after its encumbrance, worked out from it unless the
	// item sets its own number. A vehicle weapon has none.
	await part('hardPoints', () => hardPointsPart(context));

	// §#704: spells and their Additional Effects, written as items and dropped on each other, and the Magic tab of a
	// character who practices magic, which the window's menu hides.
	await part('magic', () => magicPart(context));

	// §#423: v14 lets a user detach any window into its own browser window, moving its element into that window's
	// document. A Genesys sheet and the Dice Prompt keep working there.
	await part('detachedWindows', () => detachedWindowsPart(context));

	await part('sheetHeights', () => sheetHeights(e2e));

	// §#349: the globals the system read before #245 go through their namespaces: no compatibility warning names them.
	const replacedGlobals = [
		'renderTemplate',
		'TextEditor',
		'FilePicker',
		'Tabs',
		'Dialog',
		'Actors',
		'Items',
		'ActorSheet',
		'ItemSheet',
		'DocumentSheetConfig',
		'ActiveEffectConfig',
		'ActorDirectory',
		'ItemDirectory',
		'Compendium',
	];
	e2e.log('#349 compatibility warnings', compatibilityWarnings);
	e2e.expect(
		'#349 A1 no compatibility warning logged while the sheets are used names a global the system read before #245',
		compatibilityWarnings.filter((warning) => replacedGlobals.some((name) => new RegExp(`\\b${name}\\b`).test(warning))),
		[],
	);
	// A global deprecated since v13 that no step reads shows that the console's warnings are read at all.
	await e2e.step('#349 GM reads the deprecated global SortingHelpers', async () => {
		await gm.evaluate(() => void (globalThis as unknown as Record<string, unknown>).SortingHelpers);
	});
	e2e.expect(
		"#349 A2 a deprecated global's compatibility warning is read from the console",
		compatibilityWarnings.filter((warning) => warning.includes('SortingHelpers')),
		[`${gm.user}: Error: You are accessing the global "SortingHelpers" which is now namespaced under foundry.utils.SortingHelpers`],
	);
	await e2e.step('cleanup', () => gm.evaluate(() => window.sheetsE2E.cleanUp()));
}
