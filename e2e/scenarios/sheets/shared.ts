import type { Client, ScenarioContext } from '../../scenario.ts';
import type { Page } from 'playwright-core';

/**
 * A row of an Effects tab.
 */
type EffectRow = {
	section: string;
	name: string;
	source: string;
	tooltip: string | null;
	buttons: string[];
	/** The button that turns the effect on or off: its name, its icon and its `aria-pressed`. */
	toggle: { name: string | null; icon: string | null; pressed: string | null };
};

/**
 * A chat card a sheet sent, as the GM reads it.
 */
type Card = {
	speaker: string;
	content: Record<string, string>;
};

/**
 * A change of an effect, as stored: its key, its mode (v14: type) and its value.
 */
export type ChangeRow = [string, number | string, unknown];

type Position = { left: number; top: number; width: number };

/**
 * A directory's create dialog: where it opened and where the directory asked, the types its select lists and those the
 * system declares, its option groups, and the `createDialog` compatibility warnings logged while it opened.
 */
type CreateDialog = { position: Position; asked: Position; types: string[]; declaredTypes: string[]; groups: number; warnings: string[] };

export type Size = { width: number; height: number };

/**
 * A sheet's window as it closes: its height when open, the properties whose CSS transition its closing started, the
 * height it keeps once those transitions end, and its computed min-height.
 */
export type SheetClosing = { open: number; transitions: string[]; closed: number; minHeight: string };

/**
 * The Data tab of a weapon's sheet at a window height: the window's height; the blank between the last row of each of
 * its blocks and the next block (each Weapon Profile's, then the Add Weapon Profile button's), beyond that block's top
 * margin; the height its blocks span; and the top of each row of the main profile, from the tab's top.
 */
export type WeaponDataLayout = { window: number; gaps: number[]; content: number; mainRows: number[] };

/**
 * A `<prose-mirror>` editor of a sheet: its toggle button (`null` when it has none), whether it is open, the text it
 * shows, and the document links in it.
 */
type EditorState = { toggle: 'enabled' | 'disabled' | null; open: boolean; text: string; links: number };

/**
 * The toggle button of an editor as laid out: its display, whether it shows, and how far its icon's centre is from its
 * own, in px (`x` positive to the right, `y` downwards), rounded to the half pixel.
 */
export type ToggleIcon = { display: string; visible: boolean; x: number; y: number };

/**
 * The look of a heading: its size against its parent's, its margins in rem, its weight, line height, colour, shadow and
 * bottom rule.
 */
type StoryPointPoolState = { shown: string; spend: { name: string | null; tooltip: string | null } | null; beside: string[] };

export type HeadingStyle = { size: number; margin: string; weight: string; lineHeight: string; color: string; shadow: string; border: string };

export type SheetsHelpers = {
	/** Deletes what the previous run left, then creates the actors and the world items, one of each item type. */
	setUp(player: string): Promise<void>;
	closeAll(): Promise<void>;
	/** Renders the sheet of an actor, a world item, or an owned item (`Actor/Item`), and returns its window's state. */
	open(name: string): Promise<{ appV2: boolean; title: string; headerTitle: string }>;
	close(name: string): Promise<void>;
	/**
	 * The characteristic boxes of a rendered sheet, as laid out: each box's width, the row's edges relative to the
	 * sheet's, and how many ↑ show and how many rooms for one are kept (#644).
	 */
	characteristicRow(name: string): { widths: number[]; edges: number[]; raises: number; rooms: number };
	/** Minimizes an open sheet then maximizes it, and reads its window's size at each stage, with its header's height. */
	minimizeAndMaximize(name: string): Promise<{ open: Size; minimized: Size; headerHeight: number; maximized: Size }>;
	/** Asks an open sheet for a size below any minimum, and reads the size its window takes. */
	resizeBelowMinimum(name: string): Promise<Size>;
	/** Resizes an open weapon sheet, its Data tab shown, to each height, and lays the tab out at each. */
	weaponDataLayout(name: string, heights: number[]): Promise<WeaponDataLayout[]>;
	/** The header buttons and controls menu entries of a sheet. */
	header(name: string): { buttons: string[]; controls: string[] };
	clickTab(name: string, tab: string): Promise<void>;
	activeTab(name: string): string | null;
	/** Marks a field of a sheet so that the scenario can type in it with Playwright. */
	markField(name: string, selector: string, mark: string): Promise<void>;
	changeField(name: string, selector: string, value: string): Promise<void>;
	/** The value an open sheet shows in its field of a name: `system.source`. */
	fieldValue(name: string, field: string): string;
	/** The text of an element of an open sheet, in the row a selector finds whose text holds a name. */
	rowText(name: string, row: string, which: string, selector: string): string;
	/** How many counters a sheet shows, how many of them are spin buttons, and how many − and + buttons they hold. */
	counters(name: string): { counters: number; spinButtons: number; buttons: number };
	/** The value a counter of a sheet shows, by its spin button's name. */
	counterValue(name: string, counter: string): string;
	/** The text of the first element a selector finds in an open sheet. */
	shownText(name: string, selector: string): string;
	/**
	 * The `<prose-mirror>` editor of a field on an open sheet, once it shows: its toggle button, whether it is open, its text,
	 * and the document links in it.
	 */
	editor(name: string, field: string): Promise<EditorState>;
	/** Opens the editor of a field with its toggle button, and marks its text so that the scenario can type in it with Playwright. */
	openEditor(name: string, field: string, mark: string): Promise<void>;
	/** Saves an open editor with the save button of its menu, and waits for it to close. */
	saveEditor(name: string, field: string): Promise<void>;
	/** Marks the editor of a field so that the scenario can hover it with Playwright. */
	markEditor(name: string, field: string, mark: string): Promise<void>;
	/** The toggle button of an editor and its icon as laid out, while the pointer is over the editor. */
	toggleIcon(name: string, field: string): Promise<ToggleIcon>;
	/** A field of a document, as stored. */
	stored(name: string, field: string): unknown;
	isRendered(name: string): boolean;
	/** Renders a sheet with hooks on the render events of AppV1 and AppV2, and returns the ones that fired. */
	renderHooks(name: string): Promise<{ fired: string[]; htmlIsElement: boolean }>;
	/**
	 * The fields of a sheet a user could change, and its action buttons (#574): how many are enabled, and how many show
	 * the icon of an action that edits (delete, add, raise, turn on or off).
	 */
	editableFields(name: string): {
		inputs: number;
		textareas: number;
		enabled: number;
		editableTextareas: number;
		actions: number;
		enabledActions: number;
		editActions: number;
	};
	itemNames(actor: string): string[];
	/** Drops a world document on a sheet, on the element a selector finds in it. */
	drop(name: string, document: { type: 'Actor' | 'Item'; name: string }, selector?: string): Promise<void>;
	/** The open prompts of a class, as `<class>: <title>` with whether they are ApplicationV2 windows. */
	prompts(cssClass: string): { appV2: boolean; title: string }[];
	closePrompts(cssClass: string): Promise<void>;
	/** Opens a prompt through its class's static method, closes it, and tells when its promise resolved. */
	promptResolution(): Promise<{ resolved: boolean; value: unknown; elementStillShown: boolean }>;
	/**
	 * Closes the award XP prompts, then opens one through its class's static method, so that its answer writes nothing,
	 * and records the answer.
	 */
	openDetachedAwardXP(): Promise<void>;
	/** The detached award XP prompt's answer, null while it has none, and how many award XP prompts are open. */
	detachedAwardXP(): { answer: unknown; open: number };
	/** Clicks an element of a sheet: the n-th match (from 1) of a selector, or the one whose text holds a name. */
	click(name: string, selector: string, which?: number | string): Promise<void>;
	/** Drags an element of a sheet, found as {@link click} finds it, and drops it on another. */
	drag(name: string, from: string, which: string, to: string): Promise<void>;
	/** Opens the context menu of an element of a sheet and clicks its entry with an icon, or with one of icons `a|b`. */
	menu(name: string, container: string, which: string, icon: string): Promise<void>;
	/** Opens the context menu of an element of a sheet, closes the sheet, then clicks the page: whether the click was blocked. */
	clickAfterClosingMenu(name: string, container: string): Promise<boolean>;
	/** Sets an input of an open prompt and fires its event. */
	setPromptInput(cssClass: string, selector: string, value: string, event: string): void;
	clickPrompt(cssClass: string, selector: string): Promise<void>;
	pickImage(name: string, path: string): Promise<{ pickerShown: boolean; img: string }>;
	/** Chat messages created since the last {@link readMessages}. */
	readMessages(): { speaker: string; rolls: number; content: string }[];
	storyPoints(): { gm: number; player: number };
	clickStoryPoints(selector: string): Promise<void>;
	/**
	 * Opens the GM pool's input with a right-click, types a count into it, then confirms it with Enter (the default) or a
	 * blur, or cancels it with Escape. Returns whether the input is still open.
	 */
	editGMStoryPoints(input: string, close?: 'Enter' | 'blur' | 'Escape'): Promise<boolean>;
	/** Clicks buttons of the Story Point tracker one after the other, before any of their writes lands. */
	clickStoryPointsTogether(selectors: string[]): Promise<void>;
	/** Right-clicks a Story Point pool's count, then closes with Escape the input it opens; returns whether one opened. */
	rightClickStoryPoints(pool: 'gm' | 'player'): Promise<boolean>;
	/** What each pool offers this user: its count, the button it is when it spends, and the names of the buttons beside it. */
	storyPointPools(): Record<'gm' | 'player', StoryPointPoolState>;
	/** Focuses a pool's count, for the keyboard. */
	focusStoryPoints(pool: 'gm' | 'player'): Promise<void>;
	setStoryPoints(points: { gm: number; player: number }): Promise<void>;
	/**
	 * Stores each system setting as 0.5.0 did, as the JSON of its value, without the cleaning and validation of
	 * `game.settings.set`: a world setting in its Setting document, a client setting in the browser's storage.
	 */
	storeAs050(values: Record<string, unknown>): Promise<void>;
	/** Sets each system setting to its value, and tells whether Foundry refused it and the value the setting then holds. */
	trySettings(values: [string, unknown][]): Promise<{ key: string; refused: boolean; holds: unknown }[]>;
	/**
	 * Since the last call: the users who wrote the Story Point pools, one entry per write, and the Story Point chat
	 * messages, as `<author>: <text>`.
	 */
	storyPointLog(): { writes: string[]; messages: string[] };
	journal(actor: string): { availableXP: number; entries: number };
	effectSheet: {
		create(): Promise<void>;
		open(owner: string): Promise<void>;
		state(owner: string): Promise<{
			template: string;
			charSelect: { options: string[]; values: string[]; selected: string };
			keyGroup: { label: string; options: string[]; values: string[] };
			keySelected: string;
			/** The key select's options: ungrouped first, then each group's label and options. */
			keyOptions: (string | { label: string; options: string[] })[];
			skillSelects: { index: number; selected: string; custom: boolean; changeCase: boolean; compendiumCase: boolean }[];
		}>;
		edit(owner: string): Promise<void>;
		submit(owner: string): Promise<void>;
		/** Each change's key, mode (v14: type) and value, as stored. */
		changes(owner: string): ChangeRow[];
	};
	setLanguage(lang: string): Promise<void>;
	effectRows(name: string): EffectRow[];
	/** The rows of a sheet's Effects tab, with the icons of their buttons, then of their ⋮ menu's entries (#577). */
	effectButtons(name: string): Promise<Omit<EffectRow, 'toggle'>[]>;
	/** Clicks the Add button of a section of a sheet's Effects tab, from 1. */
	addEffect(name: string, section: number): Promise<void>;
	effectsData(name: string): { name: string; disabled: boolean; rounds: number | null }[];
	source(name: string): { html: string; links: number; rolls: number; checks: number; italic: boolean; smaller: boolean };
	/** Opens a sheet while the enrichment takes a moment, and reads its source line before and after. */
	sourceBeforeEnrichment(name: string): Promise<{ before: string; afterLinks: number }>;
	update(name: string, data: object): Promise<void>;
	crewTab(vehicle: string): { passengers: string[]; members: string[][] };
	/** The notification shown with these words, once it shows. */
	notification(words: string): Promise<string>;
	charactersSkillsEmptied(name: string): Promise<{ skills: number }>;
	sendToChat(name: string, item: string): Promise<void>;
	cards(): Card[];
	setUserCharacter(user: string, character: string | null): Promise<void>;
	qualityDescription(item: string): string;
	settingsHintLink(): Promise<string | null>;
	/**
	 * Clicks the create button of the Actors or Items directory, then reads the dialog it opens: its position and the one
	 * the directory asks for, its type select, and the compatibility warnings about `createDialog` logged meanwhile.
	 */
	createDialog(documentName: 'Actor' | 'Item'): Promise<CreateDialog>;
	/** Creates each type with no system data, the items on a character too, and reads back the fields `template.json` gave a default. */
	emptyDefaults(): Promise<Record<string, unknown>>;
	welcomeLink(): string | null;
	/** The release notes link of the last welcome message, whatever its language: where it leads and what it reads. */
	welcomeReleaseNotes(): { href: string | null; text: string } | null;
	/** The number of welcome messages in the chat. */
	welcomeCount(): number;
	/** The text of the documentation link of the last welcome message, whatever its language. */
	welcomeDocumentationText(): string | null;
	/**
	 * The labels the token configuration offers for an actor's bars and values, read while some translations are replaced
	 * by others, then put back.
	 */
	trackedAttributeLabels(name: string, translations: Record<string, string>): string[];
	/** Opens a sheet whose description holds an `h1` to `h4`, and reads their look. */
	descriptionHeadings(name: string): Promise<Record<string, HeadingStyle>>;
	/**
	 * Writes an `h3` and an `h4` in a journal's text page, and reads their look in the journal; then opens the page's own
	 * sheet, and reads them in its editor.
	 */
	journalHeadings(): Promise<{ page: Record<string, HeadingStyle>; editor: Record<string, HeadingStyle> }>;
	/**
	 * Posts the cards of a gear and a talent of Hero whose descriptions hold an `h1` to `h4`, a check's card whose
	 * description holds an `h3`, and a plain message holding an `h3`, then reads their look in the chat log.
	 */
	cardHeadings(): Promise<{
		gear: Record<string, HeadingStyle>;
		talent: HeadingStyle;
		check: HeadingStyle;
		message: HeadingStyle;
	}>;
	cleanUp(): Promise<void>;
	/**
	 * The looks the text fields, number fields and selects of an open sheet take over all its tabs, as
	 * `<tag> shadow | background | border | radius`, each with how many fields take it; then the look of their options.
	 */
	fieldLooks(name: string): Promise<Record<string, number>>;
	/**
	 * v14: gives Hero an effect whose first change has a type no module registers, opens its sheet, edits its second change
	 * and saves it. Reads the type its select shows, then each change as stored, as `<key> <type> <value>`.
	 */
	unregisteredChangeType(): Promise<{ shown: string | null; stored: string[] }>;
	/**
	 * Opens a sheet, and records each content its source line shows until the line holds a link, as `raw`, `enriched` or
	 * `empty`: the page is observed from before the sheet renders, each mutation read before the browser paints it.
	 */
	sourceAsShown(name: string): Promise<string[]>;
	/**
	 * Marks the first quality of the last card an actor spoke in the chat log, an attack's or not, for the scenario to hover
	 * it with Playwright, and shows the chat log; false when there is no such quality.
	 */
	markQuality(speaker: string, attack: boolean): Promise<boolean>;
	/** Foundry's tooltip, once it shows: its text and the document links in it. */
	shownTooltip(): Promise<{ text: string; links: number }>;
	/** Waits for Foundry's tooltip to hide. */
	tooltipHidden(): Promise<void>;
	/**
	 * Closes an open sheet and catches its window as the closing starts: its height when open, the properties of its
	 * element whose CSS transition then runs, the height it reaches once those transitions end, and its minimum height.
	 */
	closeAnimation(name: string): Promise<SheetClosing>;
	/**
	 * The text of the element a selector finds in an open sheet, as the browser draws it: with the content of its
	 * `::before` and `::after`, without what isn't displayed.
	 */
	renderedText(name: string, selector: string, which?: number | string): string;
	/** Clicks the attack link of a vehicle weapon on the Combat tab, and waits for the Dice Prompt to be ready to roll. */
	attackWithVehicleWeapon(vehicle: string, weapon: string): Promise<void>;
	/** Rolls the open Dice Prompt and waits for its message. */
	rollDicePrompt(): Promise<void>;
	/** The texts of the elements of the last chat message these selectors match. */
	lastMessage(selectors: string[]): string[];
};

declare global {
	interface Window {
		sheetsE2E: SheetsHelpers;
	}
}

/**
 * Installs `window.sheetsE2E`. Playwright sends this function's source to the page, so it uses nothing from this module.
 */
export function installSheetsHelpers() {
	if (window.sheetsE2E) return;
	const { sleep, settle, waitFor, text, isSetUp, durationRounds, htmlOf, render, actor, apps, dragStart, drop, effectRows, addEffect } =
		window.e2e;
	const ApplicationV2 = foundry.applications.api.ApplicationV2;
	// An actor's name, a world item's name, or `Actor/Item` for an owned item.
	const documentNamed = (name: string) => {
		const [owner, itemName] = name.split('/');
		if (itemName) {
			const item = actor(owner).items.getName(`E2E ${itemName}`);
			if (!item) throw new Error(`No item E2E ${itemName} on E2E ${owner}`);
			return item;
		}
		const found = game.actors.getName(`E2E ${name}`) ?? game.items.getName(`E2E ${name}`);
		if (!found) throw new Error(`No document E2E ${name}`);
		return found;
	};
	const sheetElement = (name: string) => {
		const app = documentNamed(name).sheet;
		if (!app.rendered) throw new Error(`The sheet of ${name} is closed`);
		return htmlOf(app)!;
	};
	const sizeOf = (element: Element) => {
		const { width, height } = element.getBoundingClientRect();
		return { width: Math.round(width), height: Math.round(height) };
	};
	const find = (root: Element, selector: string, which: number | string = 1) => {
		const matches = [...root.querySelectorAll<HTMLElement>(selector)];
		// A role member's tile only shows its actor's name as a tooltip.
		const named = (match: HTMLElement, name: string) => text(match).includes(name) || !!match.querySelector(`[data-tooltip="${name}"]`);
		const found = typeof which === 'number' ? matches[which - 1] : matches.find((match) => named(match, which));
		if (!found) throw new Error(`No ${selector} ${which}`);
		return found;
	};
	// The editor of a field, which the sheet builds once it has enriched its text.
	const editorOf = (name: string, field: string) =>
		waitFor(`the editor ${field} of ${name}`, () =>
			sheetElement(name).querySelector<HTMLElement & { open: boolean }>(`prose-mirror[name="${field}"]`),
		);
	// The button that opens a toggled editor.
	const toggleOf = (editor: Element) => editor.querySelector<HTMLButtonElement>(':scope > button.toggle');
	const openApps = () =>
		[...foundry.applications.instances.values(), ...Object.values(ui.windows)].filter(
			(app: { rendered: boolean; hasFrame?: boolean; id: string }) =>
				app.rendered && (app.hasFrame ?? true) && app.id !== 'story-point-tracker',
		);
	const promptsOf = (cssClass: string) => apps(cssClass).filter((app: { rendered: boolean }) => app.rendered);
	// The answer of the award XP prompt opened apart from a journal, 'none' when it closed without one.
	let detachedAnswer: unknown = null;
	const notifications = () =>
		[...document.querySelectorAll('#notifications .notification')].map((element) => text(element)).filter(Boolean);

	const createdMessages: string[] = [];
	Hooks.on('createChatMessage', (message: { id: string }) => createdMessages.push(message.id));

	const storyPointWrites: string[] = [];
	const storyPointMessages: string[] = [];
	// The pools' first write creates their setting.
	const recordStoryPointWrite = (setting: { key: string }, userId: string) => {
		if (setting.key === 'genesys.storyPoints') storyPointWrites.push(game.users.get(userId)?.name ?? userId);
	};
	Hooks.on('createSetting', (setting: { key: string }, _options: unknown, userId: string) => recordStoryPointWrite(setting, userId));
	Hooks.on('updateSetting', (setting: { key: string }, _changed: unknown, _options: unknown, userId: string) =>
		recordStoryPointWrite(setting, userId),
	);
	Hooks.on('createChatMessage', (message: { content: string; author?: { name: string } }) => {
		const content = document.createElement('div');
		content.innerHTML = message.content;
		if (content.querySelector('.story-point')) storyPointMessages.push(`${message.author?.name}: ${text(content)}`);
	});

	const effectChanges = [
		{ key: 'system.characteristics.cunning', mode: 2, value: '1' },
		{ key: 'genesys.pool.char.self.willpower', mode: 0, value: 'B' },
		{ key: 'genesys.pool.check.self.', mode: 0, value: 'S' },
		{ key: 'genesys.pool.skill.self.E2E Custom Skill', mode: 0, value: 'A' },
		{ key: 'genesys.pool.skill.target.ranged (light)', mode: 0, value: 'D' },
		{ key: 'genesys.pool.check.target.', mode: 0, value: 'hello' },
	];
	// The effect edited in the effect sheet: on an actor, or on an item the actor owns.
	const editedEffect = (owner: string) => {
		const doc = documentNamed(owner);
		const effect = doc.effects.getName('E2E Edited');
		if (!effect) throw new Error(`No effect E2E Edited on ${owner}`);
		return effect;
	};
	const headingStyle = (heading: HTMLElement): HeadingStyle => {
		const style = getComputedStyle(heading);
		const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
		const inRem = (value: string) => Math.round((parseFloat(value) / rem) * 100) / 100;
		return {
			size: Math.round((parseFloat(style.fontSize) / parseFloat(getComputedStyle(heading.parentElement!).fontSize)) * 100) / 100,
			margin: [style.marginTop, style.marginRight, style.marginBottom, style.marginLeft].map(inRem).join(' '),
			weight: style.fontWeight,
			lineHeight: style.lineHeight,
			color: style.color,
			shadow: style.textShadow,
			border:
				style.borderBottomStyle === 'none'
					? 'none'
					: `${style.borderBottomWidth} ${style.borderBottomStyle} ${style.borderBottomColor}`,
		};
	};
	const setSelect = (element: Element, selector: string, value: string) => {
		const field = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
		if (!field) throw new Error(`No ${selector}`);
		field.value = value;
		field.dispatchEvent(new Event('change', { bubbles: true }));
	};

	const helpers: SheetsHelpers = {
		async setUp(player) {
			await helpers.closeAll();
			await window.e2e.deleteSetUp('Actor', 'Item');
			const levels = CONST.DOCUMENT_OWNERSHIP_LEVELS;
			await Actor.createDocuments([
				{
					name: 'E2E Hero',
					type: 'character',
					// Artwork of its own, for the header's artwork entries.
					img: 'icons/svg/aura.svg',
					prototypeToken: { texture: { src: 'icons/svg/aura.svg' } },
				},
				// XP of its own in Character Creation, so that its characteristics could be raised by a user who may edit it (#574 R1).
				{
					name: 'E2E Observed',
					type: 'character',
					system: { experienceJournal: { entries: [{ amount: 100, type: 'Starting' }] } },
				},
				{ name: 'E2E Limited', type: 'character' },
				{ name: 'E2E Bearer', type: 'character' },
				{ name: 'E2E Minion', type: 'minion' },
				{ name: 'E2E Rival', type: 'rival' },
				{ name: 'E2E Nemesis', type: 'nemesis' },
				{ name: 'E2E Vehicle', type: 'vehicle' },
			]);
			await window.e2e.setOwnership(actor('Hero'), player, 'OWNER');
			await window.e2e.setOwnership(actor('Observed'), player, 'OBSERVER');
			await window.e2e.setOwnership(actor('Limited'), player, 'LIMITED');
			const link = `@UUID[${actor('Hero').uuid}]{E2E Hero}`;
			const quality = { name: 'E2E Pierce', description: `<p>${link} pierces.</p>`, isRated: true, rating: 1 };
			await Item.createDocuments(
				Object.keys(CONFIG.Item.dataModels).map((type) => ({
					name: `E2E ${type}`,
					type,
					// The player sees the weapon, to drop it on a sheet.
					ownership: { default: type === 'weapon' ? levels.OBSERVER : 0 },
					system: {
						quality: { isRated: true, description: `<p>${link} pierces.</p>` },
						ability: { activation: { type: 'active', detail: 'Maneuver' } },
						talent: { tier: 1, ranked: 'yes' },
						skill: { characteristic: 'brawn' },
					}[type],
				})),
			);
			const weapon = {
				type: 'weapon',
				system: { skills: ['Melee'], baseDamage: 3, damageCharacteristic: 'brawn', qualities: [quality] },
			};
			const passive = { type: 'ability', system: { activation: { type: 'passive', detail: '' } } };
			const active = { type: 'ability', system: { activation: { type: 'active', detail: 'Maneuver' } } };
			const ranked = { type: 'talent', system: { tier: 1, ranked: 'yes', rank: 2 } };
			const unranked = { type: 'talent', system: { tier: 2, ranked: 'no' } };
			await actor('Hero').createEmbeddedDocuments('Item', [
				{ name: 'E2E Ranked', ...ranked },
				{ name: 'E2E Unranked', ...unranked },
				{ name: 'E2E Passive', ...passive },
				{ name: 'E2E Active', ...active },
				{ name: 'E2E Sword', ...weapon },
			]);
			await actor('Nemesis').createEmbeddedDocuments('Item', [
				{ name: 'E2E Ranked', ...ranked },
				{ name: 'E2E Unranked', ...unranked },
				{ name: 'E2E Passive', ...passive },
				{ name: 'E2E Active', ...active },
				{ name: 'E2E Sword', ...weapon },
			]);
			await actor('Vehicle').createEmbeddedDocuments('Item', [
				{
					name: 'E2E Cannon',
					type: 'vehicleWeapon',
					system: { skills: ['Gunnery'], baseDamage: 6, firingArc: { fore: true, port: true }, qualities: [quality] },
				},
			]);
		},

		async closeAll() {
			await Promise.all(openApps().map((app: { close(): Promise<void> }) => app.close()));
			await settle();
		},

		async open(name) {
			const app = documentNamed(name).sheet;
			const element = await render(app);
			return {
				appV2: app instanceof ApplicationV2,
				title: app.title,
				headerTitle: text(element.querySelector('.window-header .window-title')),
			};
		},

		async close(name) {
			const app = documentNamed(name).sheet;
			if (app.rendered) await app.close();
			await settle();
		},

		characteristicRow(name) {
			const element = sheetElement(name);
			const fields = [...element.querySelectorAll<HTMLElement>('.characteristic-field')];
			const [sheet, row] = [element.getBoundingClientRect(), fields[0].parentElement!.getBoundingClientRect()];
			return {
				widths: fields.map((field) => field.offsetWidth),
				edges: [Math.round(row.left - sheet.left), Math.round(row.right - sheet.left)],
				raises: element.querySelectorAll('.characteristic-label .raise').length,
				rooms: element.querySelectorAll('.characteristic-label .raise-room').length,
			};
		},

		async minimizeAndMaximize(name) {
			const app = documentNamed(name).sheet;
			const element = sheetElement(name);
			const header = element.querySelector('.window-header')!;
			const open = sizeOf(element);
			await app.minimize();
			// minimize() resolves on max-width's transitionend. Maximizing before max-height's comes would let maximize()
			// resolve on that event, before its own transition, which no user can do.
			await settle();
			const minimized = sizeOf(element);
			const headerHeight = sizeOf(header).height;
			await app.maximize();
			await settle();
			return { open, minimized, headerHeight, maximized: sizeOf(element) };
		},

		async resizeBelowMinimum(name) {
			documentNamed(name).sheet.setPosition({ width: 100, height: 100 });
			await settle();
			return sizeOf(sheetElement(name));
		},

		async weaponDataLayout(name, heights) {
			const layouts: WeaponDataLayout[] = [];
			for (const height of heights) {
				// From the top of the screen, so that Foundry doesn't shorten the window to keep it on screen.
				documentNamed(name).sheet.setPosition({ top: 10, height });
				await settle();
				const tab = find(sheetElement(name), '.tab[data-tab="data"]');
				const box = (element: Element) => element.getBoundingClientRect();
				const blocks = [...tab.querySelectorAll('section.data-grid, .add-profile')];
				const [main] = blocks;
				const lastRowBottom = (block: Element) => Math.max(...[...block.children].map((child) => box(child).bottom));
				layouts.push({
					window: Math.round(box(sheetElement(name)).height),
					gaps: blocks
						.slice(1)
						.map((block, index) =>
							Math.round(box(block).top - lastRowBottom(blocks[index]) - parseFloat(getComputedStyle(block).marginTop)),
						),
					content: Math.round(box(blocks.at(-1)!).bottom - box(main).top),
					mainRows: [...main.querySelectorAll('.row')].map((row) => Math.round(box(row).top - box(tab).top)),
				});
			}
			return layouts;
		},

		header(name) {
			const app = documentNamed(name).sheet;
			const buttons = [...htmlOf(app)!.querySelectorAll<HTMLElement>('.window-header [data-action]')].map(
				(button) => button.dataset.action!,
			);
			const controls = app
				._getHeaderControls()
				.filter((control: { visible?: boolean | (() => boolean) }) =>
					typeof control.visible === 'function' ? control.visible.call(app) : control.visible ?? true,
				)
				.map((control: { action: string }) => control.action);
			return { buttons: buttons.sort(), controls: controls.sort() };
		},

		async clickTab(name, tab) {
			find(sheetElement(name), `.sheet-tabs [data-tab="${tab}"]`).click();
			await waitFor(`tab ${tab} of ${name}`, () => helpers.activeTab(name) === tab);
		},

		activeTab(name) {
			return sheetElement(name).querySelector<HTMLElement>('.sheet-tabs .item.active')?.dataset.tab ?? null;
		},

		async markField(name, selector, mark) {
			find(sheetElement(name), selector).dataset.e2e = mark;
		},

		async changeField(name, selector, value) {
			setSelect(sheetElement(name), selector, value);
			await settle();
		},

		fieldValue(name, field) {
			return (find(sheetElement(name), `[name="${field}"]`) as HTMLInputElement).value;
		},

		shownText(name, selector) {
			return text(find(sheetElement(name), selector));
		},

		rowText(name, row, which, selector) {
			const element = find(sheetElement(name), row, which).querySelector(selector);
			if (!element) throw new Error(`No ${selector} in the ${row} of ${which}`);
			// A counter shows its value in an input (§#580).
			return element.matches('.counter') ? window.e2e.counterValue(element) : text(element);
		},

		counters(name) {
			const counters = [...sheetElement(name).querySelectorAll('.counter')];
			return {
				counters: counters.length,
				spinButtons: counters.filter((counter) => counter.querySelector('[role="spinbutton"]')).length,
				buttons: counters.reduce((count, counter) => count + counter.querySelectorAll('button').length, 0),
			};
		},

		counterValue(name, counter) {
			const element = window.e2e.counterNamed(sheetElement(name), counter);
			if (!element) throw new Error(`No counter ${counter} on the sheet of ${name}`);
			return window.e2e.counterValue(element);
		},

		async editor(name, field) {
			const element = await editorOf(name, field);
			const toggle = toggleOf(element);
			return {
				toggle: toggle ? (toggle.disabled ? 'disabled' : 'enabled') : null,
				open: element.open,
				text: text(element.querySelector('.editor-content')),
				links: element.querySelectorAll('.editor-content a.content-link').length,
			};
		},

		async openEditor(name, field, mark) {
			const element = await editorOf(name, field);
			const toggle = toggleOf(element);
			if (!toggle) throw new Error(`The editor ${field} of ${name} has no toggle button`);
			// The toggle only shows while the pointer is over the editor.
			toggle.click();
			const content = await waitFor(`the open editor ${field} of ${name}`, () =>
				element.querySelector<HTMLElement>('.ProseMirror[contenteditable="true"]'),
			);
			content.dataset.e2e = mark;
		},

		async saveEditor(name, field) {
			const element = await editorOf(name, field);
			const save = element.querySelector<HTMLButtonElement>('menu [data-action="save"]');
			if (!save) throw new Error(`The editor ${field} of ${name} has no save button`);
			save.click();
			await waitFor(`the editor ${field} of ${name} closed`, () => !element.open);
			await settle();
		},

		async markEditor(name, field, mark) {
			(await editorOf(name, field)).dataset.e2e = mark;
		},

		async toggleIcon(name, field) {
			const toggle = toggleOf(await editorOf(name, field));
			// Foundry's buttons transition every property: an empty adversary description's toggle turns visible once its
			// transition starts.
			await settle();
			const icon = toggle?.querySelector('i');
			if (!toggle || !icon) throw new Error(`The editor ${field} of ${name} has no toggle icon`);
			const button = toggle.getBoundingClientRect();
			const glyph = icon.getBoundingClientRect();
			const style = getComputedStyle(toggle);
			const half = (value: number) => Math.round(value * 2) / 2;
			return {
				display: style.display,
				visible: style.display !== 'none' && style.visibility === 'visible',
				x: half(glyph.left + glyph.width / 2 - (button.left + button.width / 2)),
				y: half(glyph.top + glyph.height / 2 - (button.top + button.height / 2)),
			};
		},

		stored(name, field) {
			return foundry.utils.getProperty(documentNamed(name)._source, field);
		},

		isRendered(name) {
			return documentNamed(name).sheet.rendered;
		},

		async renderHooks(name) {
			const app = documentNamed(name).sheet;
			if (app.rendered) await app.close();
			await settle();
			const names = [
				'renderApplicationV2',
				'renderDocumentSheetV2',
				'renderActorSheetV2',
				'renderItemSheetV2',
				'renderGenesysActorSheet',
				'renderGenesysItemSheet',
				'renderCharacterSheet',
				'renderApplication',
				'renderFormApplication',
				'renderDocumentSheet',
				'renderActorSheet',
				'renderItemSheet',
			];
			const fired: string[] = [];
			let htmlIsElement = true;
			const ids = names.map((hook) => ({
				hook,
				id: Hooks.on(hook, (_app: unknown, html: unknown) => {
					fired.push(hook);
					htmlIsElement &&= html instanceof HTMLElement;
				}),
			}));
			await render(app);
			for (const { hook, id } of ids) Hooks.off(hook, id);
			return { fired: names.filter((hook) => fired.includes(hook)), htmlIsElement };
		},

		editableFields(name) {
			const content = sheetElement(name).querySelector('.window-content')!;
			const fields = [...content.querySelectorAll<HTMLInputElement>('input, select, button:not(.action-button)')];
			const textareas = [...content.querySelectorAll<HTMLTextAreaElement>('textarea')];
			const actions = [...content.querySelectorAll<HTMLButtonElement>('button.action-button')];
			return {
				inputs: fields.length,
				textareas: textareas.length,
				enabled: fields.filter((field) => !field.disabled).length,
				editableTextareas: textareas.filter((textarea) => !textarea.disabled && !textarea.readOnly).length,
				actions: actions.length,
				enabledActions: actions.filter((action) => !action.disabled).length,
				// A counter's − and + are drawn, without an icon.
				editActions: actions.filter(
					(action) =>
						action.classList.contains('step') ||
						action.querySelector(':scope > i:is(.fa-trash, .fa-plus, .fa-arrow-circle-up, .fa-toggle-on, .fa-toggle-off)'),
				).length,
			};
		},

		itemNames(name) {
			return actor(name)
				.items.filter(isSetUp)
				.map((item: { name: string }) => item.name)
				.sort();
		},

		async drop(name, document, selector) {
			const collection = document.type === 'Actor' ? game.actors : game.items;
			const dropped = collection.getName(`E2E ${document.name}`);
			if (!dropped) throw new Error(`No ${document.type} E2E ${document.name}`);
			const element = sheetElement(name);
			drop(selector ? find(element, selector) : element, { type: document.type, uuid: dropped.uuid });
			await settle();
		},

		prompts(cssClass) {
			return promptsOf(cssClass).map((app: { title: string }) => ({ appV2: app instanceof ApplicationV2, title: app.title }));
		},

		async closePrompts(cssClass) {
			await Promise.all(promptsOf(cssClass).map((app: { close(): Promise<void> }) => app.close()));
			await settle();
		},

		async promptResolution() {
			// The prompt's class, from a prompt the journal opened.
			const shown = await waitFor('award XP prompt', () => promptsOf('app-award-xp-prompt')[0]);
			const AwardXPPrompt = shown.constructor;
			await helpers.closePrompts('app-award-xp-prompt');

			let resolution = { resolved: false, value: null as unknown, elementStillShown: false };
			const promise = AwardXPPrompt.promptForXPAward().then((value: unknown) => {
				resolution = { resolved: true, value: value ?? null, elementStillShown: !!htmlOf(app)?.isConnected };
			});
			const app = await waitFor('award XP prompt', () => promptsOf('app-award-xp-prompt')[0]);
			await app.close();
			await Promise.race([promise, sleep(2000)]);
			return resolution;
		},

		async openDetachedAwardXP() {
			const shown = await waitFor('award XP prompt', () => promptsOf('app-award-xp-prompt')[0]);
			const AwardXPPrompt = shown.constructor;
			await helpers.closePrompts('app-award-xp-prompt');
			detachedAnswer = null;
			void AwardXPPrompt.promptForXPAward().then((value: unknown) => (detachedAnswer = value ?? 'none'));
			await waitFor('the award XP prompt', () => {
				const app = promptsOf('app-award-xp-prompt')[0];
				return app && htmlOf(app)?.querySelector('.amount input');
			});
			await settle();
		},

		detachedAwardXP: () => ({ answer: detachedAnswer, open: promptsOf('app-award-xp-prompt').length }),

		async click(name, selector, which = 1) {
			find(sheetElement(name), selector, which).click();
			await settle();
		},

		async drag(name, from, which, to) {
			const element = sheetElement(name);
			const dataTransfer = dragStart(find(element, from, which));
			drop(find(element, to), dataTransfer);
			await settle();
		},

		async menu(name, container, which, icon) {
			const element = find(sheetElement(name), container, which);
			const menu = element.matches('.menu-container') ? element : element.querySelector<HTMLElement>('.menu-container')!;
			// A menu opens on a click on its ⋮, when it has one, or on a right click.
			const trigger = menu.querySelector<HTMLElement>(':scope > .menu-trigger');
			if (trigger) trigger.click();
			else menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			const entry = await waitFor(`menu entry ${icon}`, () =>
				[...menu.querySelectorAll<HTMLElement>('.context-menu .menu-item')].find((item) =>
					icon.split('|').some((name) => item.querySelector(`i.${name}`)),
				),
			);
			entry.click();
			await settle();
		},

		async clickAfterClosingMenu(name, container) {
			const menu = find(sheetElement(name), container);
			menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			await waitFor('the open context menu', () => menu.querySelector('.context-menu'));
			await documentNamed(name).sheet.close();
			await settle();
			const click = new MouseEvent('click', { bubbles: true, cancelable: true });
			document.body.dispatchEvent(click);
			return click.defaultPrevented;
		},

		setPromptInput(cssClass, selector, value, event) {
			const field = htmlOf(promptsOf(cssClass)[0])!.querySelector<HTMLInputElement>(selector);
			if (!field) throw new Error(`No ${selector} in ${cssClass}`);
			field.value = value;
			field.dispatchEvent(new Event(event, { bubbles: true }));
		},

		async clickPrompt(cssClass, selector) {
			const app = await waitFor(cssClass, () => promptsOf(cssClass)[0]);
			find(htmlOf(app)!, selector).click();
			// The prompt closes once it resolves.
			for (let tries = 0; tries < 25 && app.rendered; tries++) await sleep(200);
			await settle();
		},

		async pickImage(name, path) {
			const sheet = documentNamed(name).sheet;
			const image = find(htmlOf(sheet)!, 'img[data-edit="img"]');
			image.click();
			const picker = await waitFor('file picker', () =>
				[...Object.values(ui.windows), ...foundry.applications.instances.values()].find(
					(app: { constructor: { name: string }; rendered: boolean }) => app.constructor.name.includes('FilePicker'),
				),
			);
			// The user picks a file: the picker calls back with its path.
			await picker.callback(path);
			await picker.close();
			await settle();
			return { pickerShown: true, img: documentNamed(name).img };
		},

		readMessages() {
			const messages = createdMessages.splice(0).map((id) => game.messages.get(id));
			return messages.map((message: { speaker: { alias?: string; actor?: string }; rolls: unknown[]; content: string }) => ({
				speaker: game.actors.get(message.speaker.actor ?? '')?.name ?? message.speaker.alias ?? '',
				rolls: message.rolls.length,
				content: message.content,
			}));
		},

		storyPoints() {
			return game.settings.get('genesys', 'storyPoints');
		},

		async clickStoryPoints(selector) {
			const tracker = foundry.applications.instances.get('story-point-tracker');
			find(htmlOf(tracker)!, selector).click();
			await settle();
		},

		async editGMStoryPoints(input, close = 'Enter') {
			const tracker = htmlOf(foundry.applications.instances.get('story-point-tracker'))!;
			// A right-click on the GM pool's count opens its input (§#619).
			find(tracker, '.gm .points').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			const field = await waitFor('the GM pool input', () => tracker.querySelector<HTMLInputElement>('.gm input.points'));
			field.value = input;
			field.dispatchEvent(new Event('input', { bubbles: true }));
			// The headless page may not hold the focus, so the blur is dispatched rather than left to `blur()`.
			field.dispatchEvent(
				close === 'blur' ? new FocusEvent('blur') : new KeyboardEvent('keydown', { key: close, bubbles: true, cancelable: true }),
			);
			await settle();
			return !!tracker.querySelector('input.points');
		},

		async clickStoryPointsTogether(selectors) {
			const tracker = htmlOf(foundry.applications.instances.get('story-point-tracker'))!;
			// The buttons are found first: the clicks then go in one go, before any write lands and the tracker renders.
			const buttons = selectors.map((selector) => find(tracker, selector));
			for (const button of buttons) button.click();
			await settle();
		},

		async rightClickStoryPoints(pool) {
			const tracker = htmlOf(foundry.applications.instances.get('story-point-tracker'))!;
			find(tracker, `.${pool} .points`).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			await settle();
			const input = tracker.querySelector<HTMLInputElement>(`.${pool} input.points`);
			// The input closes on Escape, writing nothing.
			input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
			await settle();
			return !!input;
		},

		storyPointPools() {
			const tracker = htmlOf(foundry.applications.instances.get('story-point-tracker'))!;
			const pool = (id: string) => {
				const count = tracker.querySelector<HTMLElement>(`.${id} .points`)!;
				return {
					shown: text(count),
					// The count is a button where the user may spend from the pool, named by the pool and its count.
					spend: count.matches('button') ? { name: count.ariaLabel, tooltip: count.dataset.tooltip ?? null } : null,
					// The GM's + that stood there until 0.6.0-rc.1, or any other.
					beside: [...tracker.querySelectorAll<HTMLElement>(`.${id} .count button:not(.points)`)].map(
						(button) => button.ariaLabel ?? '',
					),
				};
			};
			return { gm: pool('gm'), player: pool('player') };
		},

		async focusStoryPoints(pool) {
			const tracker = htmlOf(foundry.applications.instances.get('story-point-tracker'))!;
			find(tracker, `.${pool} button.points`).focus();
		},

		async setStoryPoints(points) {
			await game.settings.set('genesys', 'storyPoints', points);
			foundry.applications.instances.get('story-point-tracker')?.render(true);
			await settle();
		},

		async storeAs050(values) {
			for (const [key, value] of Object.entries(values)) {
				const id = `genesys.${key}`;
				const json = JSON.stringify(value);
				if (game.settings.settings.get(id).scope === 'client') {
					localStorage.setItem(id, json);
					continue;
				}
				const setting = game.settings.get('genesys', key, { document: true });
				if (setting._id) await setting.update({ value: json });
				else await foundry.documents.Setting.create({ key: id, value: json });
			}
			await settle();
		},

		async trySettings(values) {
			const tried = [];
			for (const [key, value] of values) {
				let refused = false;
				try {
					await game.settings.set('genesys', key, value);
				} catch {
					// The refusal is what the step reads.
					refused = true;
				}
				tried.push({ key, refused, holds: game.settings.get('genesys', key) });
			}
			await settle();
			return tried;
		},

		storyPointLog() {
			return { writes: storyPointWrites.splice(0), messages: storyPointMessages.splice(0) };
		},

		journal(name) {
			const system = actor(name).system;
			return { availableXP: system.availableXP, entries: system.experienceJournal.entries.length };
		},

		effectSheet: {
			async create() {
				const effect = { name: 'E2E Edited', changes: effectChanges, transfer: true };
				await actor('Hero').createEmbeddedDocuments('ActiveEffect', [effect]);
				await actor('Bearer').createEmbeddedDocuments('Item', [{ name: 'E2E Charm', type: 'gear', effects: [effect] }]);
			},

			async open(owner) {
				const app = editedEffect(owner).sheet;
				if (app.rendered) await app.close();
				await settle();
				await render(app, (root) => root.querySelector('[name$="changes.0.key"]'));
			},

			async state(owner) {
				const app = editedEffect(owner).sheet;
				const element = htmlOf(app)!;
				// v14 names the fields `system.changes.N.…`, v13 `changes.N.…`.
				const select = (name: string) => element.querySelector<HTMLSelectElement>(`select[name$="${name}"]`)!;
				const options = (parent: Element) => [...parent.querySelectorAll('option')];
				const charSelect = select('changes.1.char');
				const keyGroup = select('changes.0.key').querySelector('optgroup')!;
				return {
					template: app.template ?? app.constructor.PARTS?.changes?.template ?? '',
					charSelect: {
						options: options(charSelect).map((option) => text(option)),
						values: options(charSelect).map((option) => option.value),
						selected: charSelect.value,
					},
					keyGroup: {
						label: keyGroup.label,
						options: options(keyGroup).map((option) => text(option)),
						values: options(keyGroup).map((option) => option.value),
					},
					keySelected: select('changes.0.key').value,
					keyOptions: [...select('changes.0.key').children].map((child) =>
						child instanceof HTMLOptGroupElement
							? { label: child.label, options: options(child).map((option) => `${option.value}=${text(option)}`) }
							: `${(child as HTMLOptionElement).value}=${text(child)}`,
					),
					skillSelects: [0, 3, 4].map((index) => {
						const values = options(select(`changes.${index}.skill`)).map((option) => option.value);
						return {
							index,
							selected: select(`changes.${index}.skill`).value,
							custom: values.includes('E2E Custom Skill'),
							changeCase: values.includes('ranged (light)'),
							compendiumCase: values.includes('Ranged (Light)'),
						};
					}),
				};
			},

			async edit(owner) {
				const element = () => htmlOf(editedEffect(owner).sheet)!;
				setSelect(element(), 'select[name$="changes.0.key"]', 'system.characteristics.presence');
				// v13: a change has a numeric mode, which v14 replaced with a type.
				if (game.release.generation < 14) setSelect(element(), 'select[name="changes.0.mode"]', '5');
				else setSelect(element(), 'select[name="system.changes.0.type"]', 'override');
				setSelect(element(), 'select[name$="changes.1.char"]', 'presence');
				setSelect(element(), 'input[name$="changes.2.value"]', 'SS');
				setSelect(element(), 'select[name$="changes.3.skill"]', 'Cool');
				await settle();
				// Adding or deleting a change submits the others and renders the sheet again.
				find(element(), '[data-action="addChange"]').click();
				await waitFor('added change', () => element()?.querySelector('[name$="changes.6.key"]'));
				await settle();
				setSelect(element(), 'select[name$="changes.6.key"]', 'genesys.pool.check.target');
				setSelect(element(), 'input[name$="changes.6.value"]', 'B');
				await settle();
				find(element(), 'li[data-index="5"] [data-action="deleteChange"]').click();
				await waitFor('deleted change', () => !element()?.querySelector('[name$="changes.6.key"]'));
				await settle();
			},

			async submit(owner) {
				const app = editedEffect(owner).sheet;
				await app.submit();
				await settle();
			},

			changes(owner) {
				const source = editedEffect(owner)._source;
				// v13: an effect keeps its changes in `changes`, with a numeric mode; v14 in `system.changes`, with a type.
				if (game.release.generation < 14) {
					return source.changes.map((change: { key: string; mode: number; value: string }) => [
						change.key,
						change.mode,
						change.value,
					]);
				}
				return source.system.changes.map((change: { key: string; type: string; value: unknown }) => [
					change.key,
					change.type,
					change.value,
				]);
			},
		},

		async setLanguage(lang) {
			await game.i18n.setLanguage(lang);
		},

		effectRows(name) {
			return effectRows(sheetElement(name)).map((row) => {
				const icon = row.element.querySelector('.buttons i:is(.fa-toggle-on, .fa-toggle-off)');
				const toggle = icon?.closest('button');
				return {
					section: row.section,
					name: row.name,
					source: row.source,
					tooltip: row.tooltip,
					buttons: [...row.element.querySelectorAll('.buttons i')].map((icon) => icon.classList[1]),
					toggle: {
						name: toggle?.getAttribute('aria-label') ?? null,
						icon: icon?.classList[1] ?? null,
						pressed: toggle?.getAttribute('aria-pressed') ?? null,
					},
				};
			});
		},

		async effectButtons(name) {
			const rows: Omit<EffectRow, 'toggle'>[] = [];
			for (const row of effectRows(sheetElement(name))) {
				// The row's own buttons, then the entries of its ⋮ menu, where Edit and Delete went in #577.
				const buttons = [...row.element.querySelectorAll('.buttons i')].map((icon) => icon.classList[1]);
				if (window.e2e.hasRowMenu(row.element)) {
					const container = row.element;
					container.querySelector<HTMLElement>(':scope > .menu-trigger')!.click();
					const menu = await waitFor('the menu of an effect', () => container.querySelector(':scope > [role="menu"]'));
					buttons.push(...[...menu.querySelectorAll('.menu-icon i')].map((icon) => icon.classList[1]));
					document.body.click();
					await settle();
				}
				rows.push({ section: row.section, name: row.name, source: row.source, tooltip: row.tooltip, buttons });
			}
			return rows;
		},

		addEffect(name, section) {
			return addEffect(sheetElement(name), section);
		},

		effectsData(name) {
			return [...documentNamed(name).effects].map(
				(effect: { name: string; disabled: boolean; duration: Record<string, unknown> }) => ({
					name: effect.name,
					disabled: effect.disabled,
					rounds: durationRounds(effect),
				}),
			);
		},

		source(name) {
			const source = find(sheetElement(name), '.source');
			const style = getComputedStyle(source);
			return {
				html: source.innerHTML,
				links: source.querySelectorAll('a.content-link').length,
				rolls: source.querySelectorAll('a.inline-roll').length,
				checks: source.querySelectorAll('a[data-skill-check]').length,
				italic: style.fontStyle === 'italic',
				smaller: parseFloat(style.fontSize) < parseFloat(getComputedStyle(source.parentElement!).fontSize),
			};
		},

		async sourceBeforeEnrichment(name) {
			const app = documentNamed(name).sheet;
			if (app.rendered) await app.close();
			await settle();
			// The system enriches through the configured TextEditor class, which a module may replace.
			const editor = foundry.applications.ux.TextEditor.implementation as unknown as {
				enrichHTML: (...args: unknown[]) => Promise<string>;
			};
			const enrichHTML = editor.enrichHTML;
			// The enrichment takes this long, so that the sheet shows before it ends.
			editor.enrichHTML = async (...args: unknown[]) => {
				await sleep(1500);
				return enrichHTML.apply(editor, args);
			};
			try {
				await app.render(true);
				await waitFor(`source of ${name}`, () => app.rendered && htmlOf(app)?.querySelector('.source'));
				const before = htmlOf(app)!.querySelector('.source')!.innerHTML;
				// A source never enriched leaves the step's assertion to fail, rather than the wait to stop the scenario.
				await waitFor(`the enriched source of ${name}`, () => htmlOf(app)!.querySelector('.source a.content-link')).catch(
					() => undefined,
				);
				return { before, afterLinks: htmlOf(app)!.querySelectorAll('.source a.content-link').length };
			} finally {
				editor.enrichHTML = enrichHTML;
			}
		},

		async update(name, data) {
			await documentNamed(name).update(data);
			await settle();
		},

		crewTab(vehicle) {
			const tab = sheetElement(vehicle).querySelector('.tab-crew')!;
			const names = (parent: Element) => [...parent.querySelectorAll('.actor-tile-mini .name')].map((name) => text(name));
			return {
				passengers: names(tab.querySelector('.passengers')!),
				members: [...tab.querySelectorAll('.roles .role-section')].map((role) =>
					[...role.querySelectorAll<HTMLElement>('.role-member .actor-tile-normal')].map((tile) => tile.dataset.tooltip ?? ''),
				),
			};
		},

		async notification(words) {
			// Notifications show a few at a time: wait for this one to show.
			for (let tries = 0; tries < 50; tries++) {
				const found = notifications().find((message) => message.includes(words));
				if (found) return found;
				await sleep(200);
			}
			return '';
		},

		async charactersSkillsEmptied(name) {
			// A Skills Compendium without skills: the character is created without skills.
			const skills = CONFIG.genesys.skills;
			CONFIG.genesys.skills = [];
			try {
				const [created] = await Actor.createDocuments([{ name: `E2E ${name}`, type: 'character' }]);
				await settle();
				return { skills: created.items.filter((item: { type: string }) => item.type === 'skill').length };
			} finally {
				CONFIG.genesys.skills = skills;
			}
		},

		async sendToChat(name, item) {
			const element = sheetElement(name);
			const isAdversary = !!element.querySelector('.adversary-sheet');
			const owned = documentNamed(name).items.getName(`E2E ${item}`);
			// Send to chat is an entry of the row's ⋮ menu since #577, a button of its own on a talent's row before.
			const sendFrom = async (row: HTMLElement) => {
				const button = row.querySelector<HTMLElement>('button.send-to-chat-link, button:has(> i.fa-comment)');
				if (window.e2e.hasRowMenu(row) || !button) await window.e2e.rowMenu(row, 'fa-comment');
				else button.click();
			};
			if (isAdversary) {
				const row = [
					...element.querySelectorAll<HTMLElement>('.adversary-items .talent > .menu-container, .adversary-items .weapon'),
				].find((row) => text(row).includes(`E2E ${item}`));
				if (!row) throw new Error(`No row for ${item}`);
				await sendFrom(row);
			} else if (['talent', 'ability'].includes(owned.type)) {
				const row = [...element.querySelectorAll<HTMLElement>('.talent')].find((row) =>
					text(row.querySelector('.name')).includes(`E2E ${item}`),
				);
				if (!row) throw new Error(`No talent row for ${item}`);
				await sendFrom(row);
			} else {
				await helpers.menu(name, '.inventory-item', `E2E ${item}`, 'fa-comment');
			}
			await settle();
		},

		cards() {
			return helpers.readMessages().map((message) => {
				const card = document.createElement('div');
				card.innerHTML = message.content;
				const content: Record<string, string> = {};
				for (const field of ['activation', 'rank', 'effectiveTier', 'damage', 'firing-arc', 'skill']) {
					const span = card.querySelector(`span.${field}`);
					if (span) content[field] = text(span);
				}
				const quality = card.querySelector<HTMLElement>('.quality');
				if (quality) content.qualityTooltipLinks = String((quality.dataset.tooltip?.match(/content-link/g) ?? []).length);
				return { speaker: message.speaker, content };
			});
		},

		async setUserCharacter(user, character) {
			await game.users.getName(user).update({ character: character ? actor(character).id : null });
			await settle();
		},

		qualityDescription(name) {
			return documentNamed(name)._source.system.qualities[0].description;
		},

		async settingsHintLink() {
			const sheet = game.settings.sheet;
			const link = (await render(sheet)).querySelector<HTMLAnchorElement>('a[href*="kornifex/FVTT-Genesys/wiki"]');
			const href = link?.href ?? null;
			await sheet.close();
			return href;
		},

		async createDialog(documentName) {
			const directory = documentName === 'Actor' ? ui.actors : ui.items;
			await ui.sidebar.changeTab(directory.tabName, 'primary');
			const button = await waitFor('the create button', () =>
				htmlOf(directory)?.querySelector<HTMLElement>('[data-action="createEntry"]'),
			);
			const opened = new Set(foundry.applications.instances.values());
			// Foundry logs a compatibility warning through `logger`: `foundry.utils` is a module namespace, which can't be wrapped.
			const warnings: string[] = [];
			const warn = logger.warn;
			logger.warn = (...args: unknown[]) => {
				const message = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
				if (message.includes('createDialog')) warnings.push(message);
				return warn.apply(logger, args);
			};
			try {
				button.click();
				const dialog = await waitFor('the create dialog', () =>
					[...foundry.applications.instances.values()].find(
						(app: { element?: HTMLElement }) => !opened.has(app) && app.element?.querySelector('select[name="type"]'),
					),
				);
				await settle();
				const select = dialog.element.querySelector('select[name="type"]') as HTMLSelectElement;
				const state = {
					position: { left: dialog.position.left, top: dialog.position.top, width: dialog.position.width },
					asked: { left: window.innerWidth - 630, top: button.offsetTop, width: 320 },
					types: [...select.options].map((option) => option.value).sort(),
					declaredTypes: game.documentTypes[documentName].filter((type: string) => type !== CONST.BASE_DOCUMENT_TYPE).sort(),
					groups: select.querySelectorAll('optgroup').length,
					warnings,
				};
				await dialog.close();
				return state;
			} finally {
				logger.warn = warn;
			}
		},

		async emptyDefaults() {
			const holder = await Actor.create({ name: 'E2E Defaults Holder', type: 'character' });
			const actor = async (type: string) => (await Actor.create({ name: `E2E Defaults ${type}`, type }))._source.system;
			const item = async (type: string) => (await Item.create({ name: `E2E Defaults ${type}`, type }))._source.system;
			const owned = async (type: string) =>
				(await holder.createEmbeddedDocuments('Item', [{ name: `E2E Defaults ${type}`, type }]))[0]._source.system;
			const character = await actor('character');
			const vehicle = await actor('vehicle');
			const equipment = ['armor', 'consumable', 'container', 'gear', 'weapon', 'vehicleWeapon'];
			const containers: Record<string, unknown> = {};
			for (const type of equipment) containers[type] = [(await item(type)).container, (await owned(type)).container];
			return {
				character: { illustration: character.illustration, details: character.details },
				vehicle: { illustration: vehicle.illustration, complement: vehicle.complement, consumables: vehicle.consumables },
				containers,
				activationDetail: { ability: (await item('ability')).activation.detail, talent: (await owned('talent')).activation.detail },
			};
		},

		welcomeCount() {
			return game.messages.contents.filter((candidate: { content: string }) => candidate.content.includes('Project Documentation'))
				.length;
		},

		welcomeLink() {
			const message = game.messages.contents.findLast((candidate: { content: string }) =>
				candidate.content.includes('Project Documentation'),
			);
			if (!message) return null;
			const card = document.createElement('div');
			card.innerHTML = message.content;
			return [...card.querySelectorAll('a')].find((link) => text(link) === 'Project Documentation')?.getAttribute('href') ?? null;
		},

		welcomeReleaseNotes() {
			const message = game.messages.contents.findLast((candidate: { content: string }) =>
				candidate.content.includes('"https://github.com/kornifex/FVTT-Genesys/wiki"'),
			);
			if (!message) return null;
			const card = document.createElement('div');
			card.innerHTML = message.content;
			const link = [...card.querySelectorAll('a')].find((link) => link.getAttribute('href')?.includes('/releases/'));
			return link ? { href: link.getAttribute('href'), text: text(link) } : null;
		},

		welcomeDocumentationText() {
			const href = 'https://github.com/kornifex/FVTT-Genesys/wiki';
			const message = game.messages.contents.findLast((candidate: { content: string }) => candidate.content.includes(`"${href}"`));
			if (!message) return null;
			const card = document.createElement('div');
			card.innerHTML = message.content;
			const link = [...card.querySelectorAll('a')].find((link) => link.getAttribute('href') === href);
			return link ? text(link) : null;
		},

		trackedAttributeLabels(name, translations) {
			// The token configuration reads the bars and values of the actor's system data this way (TokenApplication).
			const TokenDocument = foundry.utils.getDocumentClass('Token');
			// Foundry reads a key as a path in its nested translations.
			const originals = Object.keys(translations).map((key) => [key, foundry.utils.getProperty(game.i18n.translations, key)]);
			for (const [key, translation] of Object.entries(translations))
				foundry.utils.setProperty(game.i18n.translations, key, translation);
			try {
				const attributes = TokenDocument.getTrackedAttributes(documentNamed(name).system);
				return TokenDocument.getTrackedAttributeChoices(attributes).map((choice: { label: string }) => choice.label);
			} finally {
				for (const [key, original] of originals) foundry.utils.setProperty(game.i18n.translations, key, original);
			}
		},

		async descriptionHeadings(name) {
			const tags = ['h1', 'h2', 'h3', 'h4'];
			await helpers.update(name, {
				'system.description': `${tags.map((tag) => `<${tag}>E2E ${tag}</${tag}>`).join('')}<p>E2E text.</p>`,
			});
			await helpers.open(name);
			const element = await waitFor(`the headings of ${name}`, () =>
				sheetElement(name).querySelector('.vue-app .editor-content h4') ? sheetElement(name) : undefined,
			);
			const headings = Object.fromEntries(
				tags.map((tag) => [tag, headingStyle(element.querySelector<HTMLElement>(`.editor-content ${tag}`)!)]),
			);
			await helpers.close(name);
			return headings;
		},

		async journalHeadings() {
			const tags = ['h3', 'h4'];
			const journal = await CONFIG.JournalEntry.documentClass.create({
				name: 'E2E Headings',
				pages: [
					{
						name: 'E2E Page',
						type: 'text',
						text: { content: '<h3>E2E h3</h3><p>E2E text.</p><h4>E2E h4</h4><p>E2E text.</p>' },
					},
				],
			});
			const page = journal!.pages.contents[0];
			// The page's content in the journal, and the editor's in the page's own sheet.
			const shownIn = { page: '.journal-page-content', editor: '.journal-page-content .ProseMirror' };
			const read = (root: Element, content: string) =>
				Object.fromEntries(tags.map((tag) => [tag, headingStyle(root.querySelector<HTMLElement>(`${content} ${tag}`)!)]));
			try {
				const shown = await render(journal!.sheet, (root) => !!root.querySelector(`${shownIn.page} h4`));
				const inPage = read(shown, shownIn.page);
				await journal!.sheet.close();
				const editor = await render(page.sheet, (root) => !!root.querySelector(`${shownIn.editor} h4`));
				return { page: inPage, editor: read(editor, shownIn.editor) };
			} finally {
				await page.sheet.close();
				await journal!.sheet.close();
				await journal!.delete();
			}
		},

		async cardHeadings() {
			const tags = ['h1', 'h2', 'h3', 'h4'];
			const description = `${tags.map((tag) => `<${tag}>E2E ${tag}</${tag}>`).join('')}<p>E2E text.</p>`;
			const items = await actor('Hero').createEmbeddedDocuments('Item', [
				{ name: 'E2E Headings Gear', type: 'gear', system: { description } },
				{ name: 'E2E Headings Talent', type: 'talent', system: { description, tier: 1, ranked: 'no' } },
			]);
			const posted = createdMessages.length;
			await helpers.open('Hero');
			await helpers.sendToChat('Hero', 'Headings Gear');
			await helpers.sendToChat('Hero', 'Headings Talent');
			await helpers.close('Hero');
			await actor('Hero').deleteEmbeddedDocuments(
				'Item',
				items.map((item: { id: string }) => item.id),
			);
			const content = await foundry.applications.handlebars.renderTemplate('systems/genesys/templates/chat/rolls/skill.hbs', {
				description: '<h3>E2E h3</h3><p>E2E text.</p>',
				results: { faces: {}, extraSymbols: {} },
				card: { symbols: [], summary: [] },
			});
			await CONFIG.ChatMessage.documentClass.create({ content });
			await CONFIG.ChatMessage.documentClass.create({ content: '<h3>E2E h3</h3><p>E2E text.</p>' });
			// The messages stay: Foundry throws when one is deleted while its notification slides in.
			const [gear, talent, check, message] = createdMessages.splice(posted);
			// The heading in the message's content, as the chat log shows it rather than its notification.
			const heading = (id: string, tag: string) =>
				waitFor(`the ${tag} of the message ${id}`, () =>
					[...document.querySelectorAll<HTMLElement>(`[data-message-id="${id}"] .message-content ${tag}`)].find(
						(element) => !element.closest('#chat-notifications'),
					),
				);
			return {
				gear: Object.fromEntries(await Promise.all(tags.map(async (tag) => [tag, headingStyle(await heading(gear, tag))]))),
				talent: headingStyle(await heading(talent, 'h3')),
				check: headingStyle(await heading(check, 'h3')),
				message: headingStyle(await heading(message, 'h3')),
			};
		},

		async cleanUp() {
			await helpers.closeAll();
			await window.e2e.deleteSetUp('Actor', 'Item');
		},

		async fieldLooks(name) {
			const looks: Record<string, number> = {};
			const count = (look: string) => (looks[look] = (looks[look] ?? 0) + 1);
			const seen = new Set<Element>();
			const tabs = [...sheetElement(name).querySelectorAll<HTMLElement>('.sheet-tabs [data-tab]')].map((tab) => tab.dataset.tab!);
			// A tab's fields may render only while it shows.
			for (const tab of tabs.length ? tabs : [null]) {
				if (tab) await helpers.clickTab(name, tab);
				const fields = sheetElement(name).querySelectorAll<HTMLElement>(
					'.vue-app input[type="text"], .vue-app input[type="number"], .vue-app select',
				);
				for (const field of fields) {
					if (seen.has(field)) continue;
					seen.add(field);
					const style = getComputedStyle(field);
					const border = `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`;
					count(
						`${field.tagName.toLowerCase()} ${style.boxShadow} | ${style.backgroundColor} | ${border} | ${style.borderTopLeftRadius}`,
					);
					if (field.getAttribute('name')?.startsWith('system.characteristics.')) count(`characteristic ${style.textAlign}`);
					for (const option of field.querySelectorAll('option')) {
						const optionStyle = getComputedStyle(option);
						count(`option ${optionStyle.backgroundColor} | ${optionStyle.color}`);
					}
				}
			}
			if (tabs.length) await helpers.clickTab(name, tabs[0]);
			return looks;
		},

		async unregisteredChangeType() {
			const [effect] = await actor('Hero').createEmbeddedDocuments('ActiveEffect', [
				{
					name: 'E2E Unregistered',
					// The effect stays off: Foundry would look for a handler of the unregistered type to apply it.
					disabled: true,
					system: {
						changes: [
							{ key: 'system.characteristics.brawn', type: 'e2eremoved', value: '1' },
							{ key: 'system.characteristics.agility', type: 'add', value: '1' },
						],
					},
				},
			]);
			try {
				const element = await render(effect.sheet, (root) => root.querySelector('[name="system.changes.1.value"]'));
				const shown = element.querySelector<HTMLSelectElement>('select[name="system.changes.0.type"]')?.value ?? null;
				setSelect(element, 'input[name="system.changes.1.value"]', '2');
				await settle();
				await effect.sheet.submit();
				await settle();
				const stored = effect._source.system.changes.map(
					(change: { key: string; type: string; value: unknown }) =>
						`${change.key} ${change.type} ${JSON.stringify(change.value)}`,
				);
				return { shown, stored };
			} finally {
				await effect.sheet.close();
				await effect.delete();
				await settle();
			}
		},

		async sourceAsShown(name) {
			const app = documentNamed(name).sheet;
			if (app.rendered) await app.close();
			await settle();
			const shown: string[] = [];
			const record = () => {
				const source = document.getElementById(app.id)?.querySelector('.source');
				if (!source) return;
				const content = source.querySelector('a.content-link')
					? 'enriched'
					: text(source) === ''
						? 'empty'
						: text(source).includes('@UUID[')
							? 'raw'
							: `other: ${text(source)}`;
				if (shown.at(-1) !== content) shown.push(content);
			};
			// A MutationObserver's callback runs before the browser paints what the mutations changed.
			const observer = new MutationObserver(record);
			observer.observe(document.body, { childList: true, subtree: true, characterData: true });
			try {
				await app.render(true);
				// A source never enriched leaves the step's assertion to fail, rather than the wait to stop the scenario.
				await waitFor(`the enriched source of ${name}`, () => htmlOf(app)?.querySelector('.source a.content-link')).catch(
					() => undefined,
				);
				record();
			} finally {
				observer.disconnect();
			}
			return shown;
		},

		async markQuality(speaker, attack) {
			await helpers.closeAll();
			const speakerId = actor(speaker).id;
			const message = game.messages.contents.findLast(
				(candidate: { speaker: { actor?: string }; rolls: unknown[]; content: string }) =>
					candidate.speaker.actor === speakerId && candidate.rolls.length > 0 === attack && candidate.content.includes('quality'),
			);
			if (!message) return false;
			// v13: the sidebar is collapsed in the headless window.
			ui.sidebar.expand();
			ui.sidebar.changeTab('chat', 'primary');
			const quality = await waitFor('the quality in the chat log', () =>
				[...document.querySelectorAll<HTMLElement>(`[data-message-id="${message.id}"] .quality`)].find(
					(element) => !element.closest('#chat-notifications') && element.getBoundingClientRect().width > 0,
				),
			);
			for (const marked of document.querySelectorAll<HTMLElement>('[data-e2e="hovered-quality"]')) delete marked.dataset.e2e;
			quality.dataset.e2e = 'hovered-quality';
			quality.scrollIntoView({ block: 'center' });
			await settle();
			return true;
		},

		async shownTooltip() {
			const tooltip = await waitFor('the tooltip', () => document.querySelector<HTMLElement>('#tooltip.active'), 3000).catch(
				() => null,
			);
			return { text: text(tooltip), links: tooltip?.querySelectorAll('a.content-link').length ?? 0 };
		},

		async tooltipHidden() {
			await waitFor('the tooltip to hide', () => !document.querySelector('#tooltip.active'), 3000).catch(() => undefined);
		},

		async closeAnimation(name) {
			const app = documentNamed(name).sheet;
			const element = await render(app);
			await settle();
			const open = Math.round(element.getBoundingClientRect().height);
			// ApplicationV2 closes a window by setting its max-height to 0, then waits for the transition's end, or 1s. Reading
			// its height at each frame of that transition missed the collapse on a loaded machine, where few frames land before
			// the element leaves the DOM (#653). The observer runs in the microtask right after the style change, before any
			// frame: it takes the transitions the change started, ends them, and reads the height the window collapses to.
			let closing: Omit<SheetClosing, 'open'> = { transitions: [], closed: open, minHeight: '' };
			const observer = new MutationObserver(() => {
				if (element.style.maxHeight !== '0px') return;
				observer.disconnect();
				const transitions = element
					.getAnimations()
					.filter((animation): animation is CSSTransition => animation instanceof CSSTransition);
				for (const transition of transitions) transition.finish();
				closing = {
					transitions: transitions.map((transition) => transition.transitionProperty).sort(),
					closed: Math.round(element.getBoundingClientRect().height),
					minHeight: getComputedStyle(element).minHeight,
				};
			});
			observer.observe(element, { attributes: true, attributeFilter: ['style'] });
			await app.close();
			observer.disconnect();
			await settle();
			return { open, ...closing };
		},

		renderedText(name, selector, which = 1) {
			const pseudo = (element: Element, which: '::before' | '::after') => {
				const style = getComputedStyle(element, which);
				if (style.display === 'none' || ['none', 'normal'].includes(style.content)) return '';
				return style.content.replace(/^"(.*)"$/, '$1');
			};
			const drawn = (node: Node): string => {
				if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
				// An icon hidden from screen readers draws a glyph of its font, no text.
				if (!(node instanceof Element) || getComputedStyle(node).display === 'none' || node.matches('[aria-hidden="true"]'))
					return '';
				return `${pseudo(node, '::before')}${[...node.childNodes].map(drawn).join('')}${pseudo(node, '::after')}`;
			};
			return drawn(find(sheetElement(name), selector, which))
				.replace(/\s+/g, ' ')
				.trim();
		},

		async attackWithVehicleWeapon(vehicle, weapon) {
			await helpers.open(vehicle);
			await helpers.clickTab(vehicle, 'combat');
			find(sheetElement(vehicle), '.tab-combat .weapon .name button:not(.description-toggle)', `E2E ${weapon}`).click();
			// The prompt shows a spinner while it counts its chance to succeed, which may roll dice: the attack's dice are
			// fixed after it.
			await waitFor('the dice prompt', () => {
				const prompt = document.querySelector('.app-dice-prompt');
				return prompt?.querySelector('.roll-button') && !prompt.querySelector('.chance-to-succeed .fa-spinner');
			});
			await settle();
		},

		async rollDicePrompt() {
			find(document.body, '.app-dice-prompt .roll-button').click();
			await settle();
		},

		lastMessage(selectors) {
			const content = document.createElement('div');
			content.innerHTML = game.messages.contents.at(-1)?.content ?? '';
			return selectors.flatMap((selector) => [...content.querySelectorAll(selector)].map((element) => text(element)));
		},
	};

	window.sheetsE2E = helpers;
}

/**
 * The links of a paragraph long enough to wrap, as laid out: how many lines they take, the least vertical gap between
 * the boxes of two links on consecutive lines in px (negative when they overlap, null on one line), the paragraph's line
 * height and font, and a link's height.
 */
export type LinkLines = { lines: number; gap: number | null; lineHeight: string; font: string; linkHeight: number };

type LinkLineHelpers = {
	/**
	 * Writes a paragraph of links in a gear's description, a character's Motivation, a nemesis's description and its
	 * talent's, opens their sheets, lays the links out, then puts the texts back.
	 */
	sheetLinkLines(): Promise<Record<string, LinkLines>>;
	/**
	 * Writes the same paragraph in a journal's text page, and lays its links out in the journal; then opens the page's own
	 * sheet, and reads the line height of the paragraph in its editor, which shows the links' source.
	 */
	journalLinkLines(): Promise<LinkLines & { editorLineHeight: string }>;
};

declare global {
	interface Window {
		linkLinesE2E: LinkLineHelpers;
	}
}

/** What the parts of the scenario share: its clients and the helpers `run` builds on them. */
export type SheetsContext = {
	e2e: ScenarioContext;
	gm: Client;
	player: Client;
	page: () => Page;
	recordCompatibilityWarnings: (client: Client) => void;
};
