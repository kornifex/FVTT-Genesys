/** @file The sheet and chat card items of the test checklist (#37), each step named after its section: `#95 A1 …` for §#95. */
import type { Client, ScenarioContext } from '../scenario.ts';
import { thrownProfile } from '../weaponProfiles.ts';

/**
 * A row of an Effects tab.
 */
type EffectRow = {
	section: string;
	name: string;
	source: string;
	tooltip: string | null;
	buttons: string[];
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
type ChangeRow = [string, number | string, unknown];

type Position = { left: number; top: number; width: number };

/**
 * A directory's create dialog: where it opened and where the directory asked, the types its select lists and those the
 * system declares, its option groups, and the `createDialog` compatibility warnings logged while it opened.
 */
type CreateDialog = { position: Position; asked: Position; types: string[]; declaredTypes: string[]; groups: number; warnings: string[] };

type Size = { width: number; height: number };

/**
 * The Data tab of a weapon's sheet at a window height: the window's height; the blank between the last row of each of
 * its blocks and the next block (each Weapon Profile's, then the Add Weapon Profile button's), beyond that block's top
 * margin; the height its blocks span; and the top of each row of the main profile, from the tab's top.
 */
type WeaponDataLayout = { window: number; gaps: number[]; content: number; mainRows: number[] };

/**
 * A `<prose-mirror>` editor of a sheet: its toggle button (`null` when it has none), whether it is open, the text it
 * shows, and the document links in it.
 */
type EditorState = { toggle: 'enabled' | 'disabled' | null; open: boolean; text: string; links: number };

/**
 * The look of a heading: its size against its parent's, its margins in rem, its weight, line height, colour, shadow and
 * bottom rule.
 */
type HeadingStyle = { size: number; margin: string; weight: string; lineHeight: string; color: string; shadow: string; border: string };

type SheetsHelpers = {
	/** Deletes what the previous run left, then creates the actors and the world items, one of each item type. */
	setUp(player: string): Promise<void>;
	closeAll(): Promise<void>;
	/** Renders the sheet of an actor, a world item, or an owned item (`Actor/Item`), and returns its window's state. */
	open(name: string): Promise<{ appV2: boolean; title: string; headerTitle: string }>;
	close(name: string): Promise<void>;
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
	/** A field of a document, as stored. */
	stored(name: string, field: string): unknown;
	isRendered(name: string): boolean;
	/** Renders a sheet with hooks on the render events of AppV1 and AppV2, and returns the ones that fired. */
	renderHooks(name: string): Promise<{ fired: string[]; htmlIsElement: boolean }>;
	/** The fields of a sheet a user could change. */
	editableFields(name: string): { inputs: number; textareas: number; enabled: number; editableTextareas: number };
	itemNames(actor: string): string[];
	/** Drops a world document on a sheet, on the element a selector finds in it. */
	drop(name: string, document: { type: 'Actor' | 'Item'; name: string }, selector?: string): Promise<void>;
	/** The open prompts of a class, as `<class>: <title>` with whether they are ApplicationV2 windows. */
	prompts(cssClass: string): { appV2: boolean; title: string }[];
	closePrompts(cssClass: string): Promise<void>;
	/** Opens a prompt through its class's static method, closes it, and tells when its promise resolved. */
	promptResolution(): Promise<{ resolved: boolean; value: unknown; elementStillShown: boolean }>;
	/** Clicks an element of a sheet: the n-th match (from 1) of a selector, or the one whose text holds a name. */
	click(name: string, selector: string, which?: number | string): Promise<void>;
	/** Drags an element of a sheet, found as {@link click} finds it, and drops it on another. */
	drag(name: string, from: string, which: string, to: string): Promise<void>;
	/** Opens the context menu of an element of a sheet and clicks its entry with an icon. */
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
	/** Types a count into the GM pool, as the GM does after right-clicking it. */
	editGMStoryPoints(input: string): Promise<void>;
	/** Right-clicks the GM pool then the players' pool, and returns the pools that show an input, then leaves them as they were. */
	editBothStoryPointPools(): Promise<string[]>;
	setStoryPoints(points: { gm: number; player: number }): Promise<void>;
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
	/** Reads the look of an `h3` in a journal's text page, which the sheets' styles must leave alone. */
	journalHeading(): Promise<HeadingStyle>;
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
	 * Closes an open sheet while sampling its window's height at each frame: its height when open, the lowest it took
	 * while closing, and the properties of its element whose CSS transition ran.
	 */
	closeAnimation(name: string): Promise<{ open: number; lowest: number; frames: number; transitions: string[] }>;
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
function installSheetsHelpers() {
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
				{ name: 'E2E Observed', type: 'character' },
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
			return text(element);
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
			const fields = [...content.querySelectorAll<HTMLInputElement>('input, select, button')];
			const textareas = [...content.querySelectorAll<HTMLTextAreaElement>('textarea')];
			return {
				inputs: fields.length,
				textareas: textareas.length,
				enabled: fields.filter((field) => !field.disabled).length,
				editableTextareas: textareas.filter((textarea) => !textarea.disabled && !textarea.readOnly).length,
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
			// A menu opens on a click or a right click, and the other closes it.
			menu.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
			await settle();
			if (!menu.querySelector('.context-menu')) {
				menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			}
			const entry = await waitFor(`menu entry ${icon}`, () =>
				[...menu.querySelectorAll<HTMLElement>('.context-menu .menu-item')].find((item) => item.querySelector(`i.${icon}`)),
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

		async editGMStoryPoints(input) {
			const tracker = htmlOf(foundry.applications.instances.get('story-point-tracker'))!;
			find(tracker, '.points').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			const field = await waitFor('the GM pool input', () => tracker.querySelector<HTMLInputElement>('input.points'));
			field.value = input;
			field.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
		},

		async editBothStoryPointPools() {
			const tracker = htmlOf(foundry.applications.instances.get('story-point-tracker'))!;
			const pools = [...tracker.querySelectorAll('.tracker')];
			for (const pool of pools) {
				find(pool, '.points').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
				await settle();
			}
			const edited = ['gm', 'player'].filter((_, index) => pools[index].querySelector('input.points'));
			// An input closes on a change, here to the count it holds.
			for (const input of tracker.querySelectorAll('input.points')) input.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
			return edited;
		},

		async setStoryPoints(points) {
			await game.settings.set('genesys', 'storyPoints', points);
			foundry.applications.instances.get('story-point-tracker')?.render(true);
			await settle();
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
			return effectRows(sheetElement(name)).map((row) => ({
				section: row.section,
				name: row.name,
				source: row.source,
				tooltip: row.tooltip,
				buttons: [...row.element.querySelectorAll('.buttons i')].map((icon) => icon.classList[1]),
			}));
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
			if (isAdversary) {
				const row = [...element.querySelectorAll<HTMLElement>('.adversary-items .talent, .adversary-items .weapon')].find((row) =>
					text(row).includes(`E2E ${item}`),
				);
				if (!row) throw new Error(`No row for ${item}`);
				row.querySelector<HTMLElement>('a.send-to-chat-link')!.click();
			} else if (['talent', 'ability'].includes(owned.type)) {
				const row = [...element.querySelectorAll<HTMLElement>('.talent')].find((row) =>
					text(row.querySelector('.name')).includes(`E2E ${item}`),
				);
				if (!row) throw new Error(`No talent row for ${item}`);
				[...row.querySelectorAll('a')].find((link) => link.querySelector('i.fa-comment'))!.click();
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

		async journalHeading() {
			const journal = await CONFIG.JournalEntry.documentClass.create({
				name: 'E2E Headings',
				pages: [{ name: 'E2E Page', type: 'text', text: { content: '<h3>E2E h3</h3><p>E2E text.</p>' } }],
			});
			try {
				const element = await render(journal!.sheet);
				const heading = await waitFor('the journal heading', () => element.querySelector<HTMLElement>('.journal-entry-page h3'));
				return headingStyle(heading);
			} finally {
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
			const open = element.getBoundingClientRect().height;
			const transitions = new Set<string>();
			element.addEventListener('transitionrun', (event) => {
				if (event.target === element) transitions.add(event.propertyName);
			});
			let lowest = open;
			let frames = 0;
			const sample = () => {
				if (!element.isConnected) return;
				lowest = Math.min(lowest, element.getBoundingClientRect().height);
				frames++;
				requestAnimationFrame(sample);
			};
			requestAnimationFrame(sample);
			await app.close();
			await settle();
			return { open: Math.round(open), lowest: Math.round(lowest), frames, transitions: [...transitions].sort() };
		},

		renderedText(name, selector, which = 1) {
			const pseudo = (element: Element, which: '::before' | '::after') => {
				const style = getComputedStyle(element, which);
				if (style.display === 'none' || ['none', 'normal'].includes(style.content)) return '';
				return style.content.replace(/^"(.*)"$/, '$1');
			};
			const drawn = (node: Node): string => {
				if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
				if (!(node instanceof Element) || getComputedStyle(node).display === 'none') return '';
				return `${pseudo(node, '::before')}${[...node.childNodes].map(drawn).join('')}${pseudo(node, '::after')}`;
			};
			return drawn(find(sheetElement(name), selector, which))
				.replace(/\s+/g, ' ')
				.trim();
		},

		async attackWithVehicleWeapon(vehicle, weapon) {
			await helpers.open(vehicle);
			await helpers.clickTab(vehicle, 'combat');
			find(sheetElement(vehicle), '.tab-combat .weapon .name a', `E2E ${weapon}`).click();
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

	// §#97: a GM who updates from an older version is welcomed with the documentation link. Reloading runs the ready hook
	// again; a last version of 0.0.0 skips the migrations.
	await e2e.step('#97 GM reloads after an update', async () => {
		await gm.evaluate(() => game.settings.set('genesys', 'alphaVersion', '0.0.0'));
		await gm.reload();
	});
	await gm.evaluate(installSheetsHelpers);
	e2e.expect(
		"#97 A1 the welcome message's Project Documentation link opens the fork's wiki",
		await gm.evaluate(() => window.sheetsE2E.welcomeLink()),
		'https://github.com/kornifex/FVTT-Genesys/wiki',
	);

	// §#347: the welcome shows for a version newer than the last one welcomed only. A GM back on an older version, as
	// after a downgrade, isn't welcomed again.
	const welcomes = await gm.evaluate(() => window.sheetsE2E.welcomeCount());
	await e2e.step('#347 GM reloads on a version older than the last one welcomed', async () => {
		await gm.evaluate(() => game.settings.set('genesys', 'alphaVersion', '99.0.0'));
		await gm.reload();
	});
	await gm.evaluate(installSheetsHelpers);
	e2e.expect(
		'#347 A1 a GM back on an older version is not welcomed again',
		(await gm.evaluate(() => window.sheetsE2E.welcomeCount())) - welcomes,
		0,
	);

	// §#348: the welcome message is written in the language of the GM, from the language files.
	const language = await gm.evaluate(() => game.settings.get('core', 'language'));
	await e2e.step('#348 A2 GM reloads in French after an update', async () => {
		await gm.evaluate(async () => {
			await game.settings.set('core', 'language', 'fr');
			await game.settings.set('genesys', 'alphaVersion', '0.0.0');
		});
		await gm.reload();
	});
	await gm.evaluate(installSheetsHelpers);
	e2e.expect(
		"#348 A2 in French, the welcome message's documentation link reads Documentation du projet",
		await gm.evaluate(() => window.sheetsE2E.welcomeDocumentationText()),
		'Documentation du projet',
	);
	await e2e.step('GM reloads in their own language', async () => {
		await gm.evaluate((language) => game.settings.set('core', 'language', language), language);
		await gm.reload();
	});
	await gm.evaluate(installSheetsHelpers);
	await gm.evaluate(() => game.settings.set('genesys', 'alphaVersion', game.system.version));

	const player = await e2e.player();
	await player.evaluate(installSheetsHelpers);
	recordCompatibilityWarnings(player);
	await e2e.step('setup', () => gm.evaluate((name) => window.sheetsE2E.setUp(name), e2e.playerUser));

	// §#348: the token configuration names an actor's bars and values in the game's language. Replacing their
	// translations tells a localized label from the English one it used to show raw.
	e2e.expect(
		"#348 A1 the token configuration names a Minion Group's bars and values from the language files",
		await gm.evaluate(() =>
			window.sheetsE2E.trackedAttributeLabels('Minion', {
				'Genesys.Labels.Wounds': 'E2E Wounds',
				'Genesys.Labels.RemainingMembers': 'E2E Remaining Members',
				'Genesys.Labels.Soak': 'E2E Soak',
			}),
		),
		['E2E Wounds', 'E2E Remaining Members', 'E2E Soak'],
	);

	// §#95: the sheets and prompts are ApplicationV2 windows.
	const actorTypes = ['Hero', 'Minion', 'Rival', 'Nemesis', 'Vehicle'];
	const itemTypes = await gm.evaluate(() => Object.keys(CONFIG.Item.dataModels));
	const windows: Record<string, unknown> = {};
	let header: unknown;
	await e2e.step('#95 GM opens each actor and item sheet', async () => {
		for (const name of [...actorTypes, ...itemTypes]) {
			windows[name] = await gm.evaluate((name) => window.sheetsE2E.open(name), name);
			if (name === 'Hero') header = await gm.evaluate(() => window.sheetsE2E.header('Hero'));
			await gm.evaluate((name) => window.sheetsE2E.close(name), name);
		}
	});
	const titled = (title: string) => ({ appV2: true, title, headerTitle: title });
	e2e.expect(
		'#95 A1 every actor sheet is an ApplicationV2 window titled "<type>: <name>"',
		Object.fromEntries(actorTypes.map((name) => [name, windows[name]])),
		{
			Hero: titled('Character: E2E Hero'),
			Minion: titled('Minion: E2E Minion'),
			Rival: titled('Rival: E2E Rival'),
			Nemesis: titled('Nemesis: E2E Nemesis'),
			Vehicle: titled('Vehicle: E2E Vehicle'),
		},
	);
	const itemLabels = await gm.evaluate(
		(types) => Object.fromEntries(types.map((type) => [type, game.i18n.localize(CONFIG.Item.typeLabels[type])])),
		itemTypes,
	);
	e2e.expect(
		'#95 A2 every item sheet is an ApplicationV2 window titled "<type>: <name>"',
		Object.fromEntries(itemTypes.map((type) => [type, windows[type]])),
		Object.fromEntries(itemTypes.map((type) => [type, titled(`${itemLabels[type]}: E2E ${type}`)])),
	);
	e2e.log('item type labels', itemLabels);

	// v13: core's header has no ownership or detach entry, which v14's ApplicationV2 header adds to the controls menu.
	const headerControls =
		e2e.version < 14
			? ['configurePrototypeToken', 'configureSheet', 'showPortraitArtwork', 'showTokenArtwork']
			: ['configureOwnership', 'configurePrototypeToken', 'configureSheet', 'detach', 'showPortraitArtwork', 'showTokenArtwork'];
	e2e.expect(
		'#95 A3 the AppV2 header holds the controls menu, with the prototype token and artwork entries, and the copy-UUID and sheet-config buttons',
		header,
		{ buttons: ['close', 'copyUuid', 'toggleControls'], controls: headerControls },
	);

	// §#95: ApplicationV2 gives text fields and selects Foundry's look, with an inset shadow in a light theme. The sheets
	// give them the flat look of AppV1's fields, which the components are written over.
	const fieldLooks: Record<string, Record<string, number>> = {};
	await e2e.step('#95 GM opens each sheet and reads the look of its fields on each tab', async () => {
		for (const name of [...actorTypes, ...itemTypes]) {
			await gm.evaluate((name) => window.sheetsE2E.open(name), name);
			fieldLooks[name] = await gm.evaluate((name) => window.sheetsE2E.fieldLooks(name), name);
			await gm.evaluate((name) => window.sheetsE2E.close(name), name);
		}
	});
	// A look reads `<tag> <shadow> | <background> | <border> | <radius>`, or `option <background> | <colour>`. A field
	// either takes AppV1's flat look, or a component draws it itself without a border, as a name in a header or a value in
	// a circle; neither has a shadow.
	const flat = 'none | rgba(0, 0, 0, 0.05) | 1px solid rgb(122, 121, 113) | 3px';
	const lookKinds = (looks: Record<string, number>) => {
		const kinds = new Set<string>();
		for (const look of Object.keys(looks)) {
			const [tag, ...rest] = look.split(' ');
			const style = rest.join(' ');
			if (tag === 'option' || tag === 'characteristic') kinds.add(look);
			else if (style === flat) kinds.add(`${tag} flat`);
			else if (/^none \| .+ \| 0px none .+ \| 0px$/.test(style)) kinds.add(`${tag} drawn by its component`);
			else kinds.add(look);
		}
		return [...kinds].sort();
	};
	e2e.log('#95 field looks', fieldLooks);
	const optionLook = 'option rgb(247, 243, 232) | rgb(0, 0, 0)';
	const characterLooks = ['input drawn by its component'];
	const adversaryLooks = ['characteristic center', 'input drawn by its component', 'input flat'];
	const itemLooks = ['input drawn by its component', 'input flat'];
	const withSelects = [...itemLooks, optionLook, 'select flat'].sort();
	e2e.expect(
		"#95 B1 every sheet's text fields and selects have the system's flat look or their component's, with no shadow, and an archetype's characteristic values aren't centred",
		Object.fromEntries(Object.entries(fieldLooks).map(([name, looks]) => [name, lookKinds(looks)])),
		{
			Hero: characterLooks,
			Minion: adversaryLooks,
			Rival: adversaryLooks,
			Nemesis: adversaryLooks,
			Vehicle: [...characterLooks, optionLook, 'select flat'].sort(),
			ability: withSelects,
			archetype: ['characteristic start', ...itemLooks],
			armor: itemLooks,
			career: itemLooks,
			consumable: itemLooks,
			container: itemLooks,
			injury: withSelects,
			gear: itemLooks,
			skill: withSelects,
			talent: withSelects,
			quality: withSelects,
			weapon: withSelects,
			vehicleWeapon: withSelects,
		},
	);

	// #304: a minimized sheet collapses to its header, as wide as Foundry's --minimized-width (200px), and keeps its
	// minimum size while open.
	const sizedSheets = ['Hero', 'Rival', 'gear', 'archetype'];
	const roundTrips: Record<string, { open: Size; minimized: Size; headerHeight: number; maximized: Size }> = {};
	const belowMinimum: Record<string, Size> = {};
	await e2e.step('#304 GM minimizes and maximizes a character, a rival, a gear and an archetype sheet', async () => {
		for (const name of sizedSheets) {
			await gm.evaluate((name) => window.sheetsE2E.open(name), name);
			roundTrips[name] = await gm.evaluate((name) => window.sheetsE2E.minimizeAndMaximize(name), name);
			belowMinimum[name] = await gm.evaluate((name) => window.sheetsE2E.resizeBelowMinimum(name), name);
			await gm.evaluate((name) => window.sheetsE2E.close(name), name);
		}
	});
	e2e.expect(
		'#304 A1 a minimized sheet collapses to its header, and takes its size back once maximized',
		Object.fromEntries(
			sizedSheets.map((name) => [name, { minimized: roundTrips[name].minimized, maximized: roundTrips[name].maximized }]),
		),
		Object.fromEntries(
			sizedSheets.map((name) => [
				name,
				{ minimized: { width: 200, height: roundTrips[name].headerHeight }, maximized: roundTrips[name].open },
			]),
		),
	);
	e2e.expect('#304 A2 an open sheet keeps its minimum size', belowMinimum, {
		Hero: { width: 580, height: 600 },
		Rival: { width: 580, height: 600 },
		gear: { width: 320, height: 200 },
		archetype: { width: 580, height: 600 },
	});

	// §#315: ApplicationV2 closes a window by bringing its max-height to 0 through a transition, which a minimum height
	// on the window would block. Its height is read at each frame while it closes.
	const closings: Record<string, { open: number; lowest: number; frames: number; transitions: string[] }> = {};
	await e2e.step('#315 GM closes a character, a rival, a gear and an archetype sheet', async () => {
		for (const name of sizedSheets) closings[name] = await gm.evaluate((name) => window.sheetsE2E.closeAnimation(name), name);
	});
	e2e.log('#315 closings', closings);
	e2e.expect(
		"#315 A1 a closing sheet collapses through its max-height's transition, to a tenth of its height or less",
		Object.fromEntries(
			Object.entries(closings).map(([name, { open, lowest, transitions }]) => [
				name,
				{ transitions, collapsed: lowest <= open / 10 },
			]),
		),
		Object.fromEntries(sizedSheets.map((name) => [name, { transitions: ['max-height'], collapsed: true }])),
	);

	// #346: ApplicationV2 gives headings a larger size, a darker colour and wide margins. A description's headings keep
	// AppV1's look, and a journal's are left alone.
	let headings: Record<string, HeadingStyle> | undefined;
	let journalHeading: HeadingStyle | undefined;
	await e2e.step('#346 GM opens a skill whose description holds headings, and a journal page', async () => {
		headings = await gm.evaluate(() => window.sheetsE2E.descriptionHeadings('skill'));
		journalHeading = await gm.evaluate(() => window.sheetsE2E.journalHeading());
	});
	const appV1Heading = (size: number, border: string) => ({
		size,
		margin: '0 0 0.5 0',
		weight: '400',
		lineHeight: 'normal',
		// AppV1's text colour, which the sheets' windows give their content.
		color: 'rgb(25, 24, 19)',
		shadow: 'none',
		border,
	});
	const underline = (width: string) => `${width} solid rgb(120, 46, 34)`;
	e2e.expect(
		"#346 A1 a description's headings look as in an AppV1 window: the window's text colour, no shadow, AppV1's sizes, margins and rules",
		headings,
		{
			h1: appV1Heading(2, underline('2px')),
			h2: appV1Heading(1.5, underline('1px')),
			h3: appV1Heading(1.25, underline('1px')),
			h4: appV1Heading(1, 'none'),
		},
	);
	e2e.expect(
		"#346 A2 a journal page's h3 keeps Foundry's look",
		journalHeading,
		// Foundry draws a journal page's headings without a bottom rule.
		{
			size: 1.25,
			margin: '0 0 0.5 0',
			weight: '400',
			lineHeight: '17.5px',
			color: 'rgb(239, 230, 216)',
			shadow: 'none',
			border: 'none',
		},
	);

	// #430: Foundry gives a chat message's headings its own sizes and colours. The headings of a description in the
	// system's cards look as in the sheet that shows it, and a plain message's are left alone.
	let cardHeadings: Awaited<ReturnType<SheetsHelpers['cardHeadings']>> | undefined;
	await e2e.step(
		"#430 GM sends a gear's and a talent's card, then a check's card and a plain message, all holding headings",
		async () => {
			cardHeadings = await gm.evaluate(() => window.sheetsE2E.cardHeadings());
		},
	);
	// The card's text colour, which its headings take as a sheet's do.
	const cardHeading = (size: number, border: string) => ({ ...appV1Heading(size, border), color: 'rgb(17, 17, 17)' });
	e2e.expect(
		"#430 A1 a gear card's description headings look as in its sheet: the card's text colour, AppV1's sizes, margins and rules",
		cardHeadings?.gear,
		{
			h1: cardHeading(2, underline('2px')),
			h2: cardHeading(1.5, underline('1px')),
			h3: cardHeading(1.25, underline('1px')),
			h4: cardHeading(1, 'none'),
		},
	);
	e2e.expect(
		"#430 A2 a talent card's and a check card's description h3 look as in a sheet",
		{ talent: cardHeadings?.talent, check: cardHeadings?.check },
		{ talent: cardHeading(1.25, underline('1px')), check: cardHeading(1.25, underline('1px')) },
	);
	e2e.expect("#430 A3 a plain chat message's h3 keeps Foundry's look", cardHeadings?.message, {
		size: 2,
		margin: '0 0 1 0',
		weight: '700',
		lineHeight: '28px',
		color: 'rgb(34, 34, 34)',
		shadow: 'none',
		border: 'none',
	});

	// Prompts and the story point tracker.
	await gm.evaluate(() => window.sheetsE2E.open('Hero'));
	await e2e.step('#95 GM opens the dice prompt with /gendr and the award XP prompt from the journal', async () => {
		await gm.evaluate(() => ui.chat.processMessage('/gendr'));
		await gm.evaluate(() => window.sheetsE2E.clickTab('Hero', 'journal'));
		await gm.evaluate(() => window.sheetsE2E.click('Hero', '.xp-journal .entries-header a'));
	});
	e2e.expect(
		'#95 A4 every prompt and the story point tracker is an ApplicationV2 window',
		await gm.evaluate(() => ({
			dicePrompt: window.sheetsE2E.prompts('app-dice-prompt'),
			awardXP: window.sheetsE2E.prompts('app-award-xp-prompt'),
			storyPointTracker: foundry.applications.instances.get('story-point-tracker') instanceof foundry.applications.api.ApplicationV2,
		})),
		{
			dicePrompt: [{ appV2: true, title: 'Dice Pool' }],
			awardXP: [{ appV2: true, title: 'Rewards' }],
			storyPointTracker: true,
		},
	);
	await gm.evaluate(() => window.sheetsE2E.closePrompts('app-dice-prompt'));

	// Enter in a prompt: no native form submission, which would reload the page.
	await gm.evaluate(() => {
		(window as unknown as { e2eMarker: boolean }).e2eMarker = true;
	});
	await gm.page.focus('.app-award-xp-prompt .amount input');
	await e2e.step('#95 GM presses Enter in the award XP prompt', () => gm.page.keyboard.press('Enter'));
	e2e.expect(
		'#95 A5 Enter in a prompt submits no native form',
		await gm.evaluate(() => (window as unknown as { e2eMarker?: boolean }).e2eMarker ?? false),
		true,
	);
	e2e.log('award XP prompts open after Enter', await gm.evaluate(() => window.sheetsE2E.prompts('app-award-xp-prompt').length));
	await gm.evaluate(() => window.sheetsE2E.click('Hero', '.xp-journal .entries-header a'));
	e2e.expect('#95 A6 a prompt resolves when it starts closing', await gm.evaluate(() => window.sheetsE2E.promptResolution()), {
		resolved: true,
		value: null,
		elementStillShown: true,
	});

	// Render hooks.
	e2e.expect(
		'#95 A7 an actor sheet fires the AppV2 render hooks with an element, not renderActorSheet',
		await gm.evaluate(() => window.sheetsE2E.renderHooks('Hero')),
		{
			fired: [
				'renderApplicationV2',
				'renderDocumentSheetV2',
				'renderActorSheetV2',
				'renderGenesysActorSheet',
				'renderCharacterSheet',
			],
			htmlIsElement: true,
		},
	);
	e2e.expect(
		'#95 A8 an item sheet fires the AppV2 render hooks with an element, not renderItemSheet',
		await gm.evaluate(() => window.sheetsE2E.renderHooks('gear')),
		{ fired: ['renderApplicationV2', 'renderDocumentSheetV2', 'renderItemSheetV2', 'renderGenesysItemSheet'], htmlIsElement: true },
	);

	// Tabs, fields, and a field closed without leaving it.
	await e2e.step('#95 GM switches tabs, closes and reopens the sheets', async () => {
		await gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.clickTab('Hero', 'talents');
			await sheets.open('Vehicle');
			await sheets.clickTab('Vehicle', 'crew');
			await sheets.open('weapon');
			await sheets.clickTab('weapon', 'data');
			for (const name of ['Hero', 'Vehicle', 'weapon']) await sheets.close(name);
			for (const name of ['Hero', 'Vehicle', 'weapon']) await sheets.open(name);
		});
	});
	e2e.expect(
		'#95 A9 a reopened sheet shows the tab it was closed on',
		await gm.evaluate(() => ({
			Hero: window.sheetsE2E.activeTab('Hero'),
			Vehicle: window.sheetsE2E.activeTab('Vehicle'),
			weapon: window.sheetsE2E.activeTab('weapon'),
		})),
		{ Hero: 'talents', Vehicle: 'crew', weapon: 'data' },
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	await e2e.step('#95 GM edits a name and a number field', async () => {
		await gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.open('Rival');
			await sheets.changeField('Rival', 'input[name="system.characteristics.brawn"]', '4');
			await sheets.changeField('Rival', 'input[name="name"]', 'E2E Rival Renamed');
			await sheets.open('weapon');
			await sheets.clickTab('weapon', 'data');
			await sheets.changeField('weapon', 'input[name="system.baseDamage"]', '7');
		});
	});
	e2e.expect(
		'#95 A10 a field change updates the document',
		await gm.evaluate(() => ({
			rival: game.actors.getName('E2E Rival Renamed')?.system.characteristics.brawn ?? null,
			weaponDamage: game.items.getName('E2E weapon').system.baseDamage,
		})),
		{ rival: 4, weaponDamage: 7 },
	);
	await gm.evaluate(() => window.sheetsE2E.update('Rival Renamed', { name: 'E2E Rival' }));
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	await gm.evaluate(async () => {
		await window.sheetsE2E.open('Rival');
		await window.sheetsE2E.markField('Rival', 'input[name="name"]', 'rival-name');
	});
	await page().fill('[data-e2e="rival-name"]', 'E2E Rival Closed');
	// Foundry's keybindings skip a focused field, so Escape can't close a sheet that way: the field keeps its text unsaved.
	await e2e.step('#95 GM presses Escape while the name field has the focus', () => page().keyboard.press('Escape'));
	e2e.expect(
		'#95 A21 Escape leaves a sheet open while one of its fields has the focus, with the text typed and not yet saved',
		await gm.evaluate(() => ({
			open: window.sheetsE2E.isRendered('Rival'),
			focused: document.activeElement === document.querySelector('[data-e2e="rival-name"]'),
			typed: document.querySelector<HTMLInputElement>('[data-e2e="rival-name"]')?.value ?? null,
			saved: !!game.actors.getName('E2E Rival Closed'),
		})),
		{ open: true, focused: true, typed: 'E2E Rival Closed', saved: false },
	);
	await e2e.step('#95 GM closes the sheet while the name field has the focus', () =>
		gm.evaluate(() => game.actors.getName('E2E Rival').sheet.close()),
	);
	e2e.expect(
		'#95 A22 a field edited then closed without leaving it is saved',
		await gm.evaluate(() => !!game.actors.getName('E2E Rival Closed')),
		true,
	);
	await e2e.step('#95 GM reopens the sheet and presses Escape with no field focused', async () => {
		await gm.evaluate(() => window.sheetsE2E.open('Rival Closed'));
		await page().keyboard.press('Escape');
	});
	e2e.expect(
		'#95 A23 Escape closes a sheet once none of its fields has the focus',
		await gm.evaluate(() => window.sheetsE2E.isRendered('Rival Closed')),
		false,
	);
	await gm.evaluate(() => window.sheetsE2E.update('Rival Closed', { name: 'E2E Rival' }));

	// §#260: the sheets edit their enriched text in Foundry's `<prose-mirror>` element, which their form submits.
	const editors = [
		{ sheet: 'Hero', tab: 'journal', field: 'system.notes' },
		{ sheet: 'Hero', tab: 'journal', field: 'system.motivations.strength.description' },
		{ sheet: 'Nemesis', tab: 'stats', field: 'system.description' },
		{ sheet: 'Nemesis', tab: 'miscellaneous', field: 'system.motivations.fear.description' },
		{ sheet: 'Vehicle', tab: 'details', field: 'system.description' },
		{ sheet: 'weapon', tab: 'description', field: 'system.description' },
		{ sheet: 'career', tab: 'description', field: 'system.description' },
		{ sheet: 'archetype', tab: 'description', field: 'system.description' },
	];
	const bearerLink = await gm.evaluate(() => `@UUID[${game.actors.getName('E2E Bearer').uuid}]{E2E Bearer}`);
	await e2e.step('#260 GM writes a link in each editor with the keyboard, and saves it', async () => {
		for (const [index, { sheet, tab, field }] of editors.entries()) {
			const mark = `editor-${index}`;
			await gm.evaluate(
				async ({ sheet, tab, field, mark }) => {
					await window.sheetsE2E.open(sheet);
					await window.sheetsE2E.clickTab(sheet, tab);
					await window.sheetsE2E.openEditor(sheet, field, mark);
				},
				{ sheet, tab, field, mark },
			);
			await page().click(`[data-e2e="${mark}"]`);
			await page().keyboard.type(`E2E ${index} ${bearerLink}`);
			await gm.evaluate(({ sheet, field }) => window.sheetsE2E.saveEditor(sheet, field), { sheet, field });
		}
	});
	e2e.expect(
		'#260 A1 an editor saves its text to its field, a nested one included',
		await gm.evaluate((editors) => editors.map(({ sheet, field }) => window.sheetsE2E.stored(sheet, field)), editors),
		editors.map((_, index) => `<p>E2E ${index} ${bearerLink}</p>`),
	);
	e2e.expect(
		'#260 A2 a saved editor closes and shows its new text enriched, with its toggle button',
		await gm.evaluate((editors) => Promise.all(editors.map(({ sheet, field }) => window.sheetsE2E.editor(sheet, field))), editors),
		editors.map((_, index) => ({ toggle: 'enabled', open: false, text: `E2E ${index} E2E Bearer`, links: 1 })),
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	await gm.evaluate(async () => {
		await window.sheetsE2E.open('Nemesis');
		// The sheet reopens on the tab it was closed on.
		await window.sheetsE2E.clickTab('Nemesis', 'stats');
		await window.sheetsE2E.openEditor('Nemesis', 'system.description', 'nemesis-description');
	});
	await page().click('[data-e2e="nemesis-description"]');
	await page().keyboard.press('ControlOrMeta+a');
	await page().keyboard.type('E2E typing');
	await e2e.step('#260 GM changes another field of the sheet while an editor is open', () =>
		gm.evaluate(() => window.sheetsE2E.changeField('Nemesis', 'input[name="system.characteristics.brawn"]', '3')),
	);
	e2e.expect(
		'#260 A3 the open editor stays open with its text, which the form saves with the other field',
		await gm.evaluate(async () => ({
			open: (await window.sheetsE2E.editor('Nemesis', 'system.description')).open,
			typed: window.e2e.text(document.querySelector('[data-e2e="nemesis-description"]')),
			stored: window.sheetsE2E.stored('Nemesis', 'system.description'),
			brawn: window.sheetsE2E.stored('Nemesis', 'system.characteristics.brawn'),
		})),
		{ open: true, typed: 'E2E typing', stored: '<p>E2E typing</p>', brawn: 3 },
	);
	await page().click('[data-e2e="nemesis-description"]');
	await page().keyboard.press('ControlOrMeta+a');
	await page().keyboard.type('E2E closed');
	await e2e.step('#260 GM closes the sheet while an editor is open', () => gm.evaluate(() => window.sheetsE2E.close('Nemesis')));
	e2e.expect(
		'#260 A4 closing a sheet saves the text of its open editor',
		await gm.evaluate(() => window.sheetsE2E.stored('Nemesis', 'system.description')),
		'<p>E2E closed</p>',
	);

	// §#95 as a player who can't edit the sheet.
	await e2e.step('#95 player opens a sheet they observe, one they see limited, and their own', () =>
		player.evaluate(async () => {
			for (const name of ['Observed', 'Limited', 'Hero']) await window.sheetsE2E.open(name);
		}),
	);
	e2e.expect(
		"#95 A11 a sheet the player can't edit has its fields disabled and its text areas read-only",
		await player.evaluate(() => ({
			Observed: window.sheetsE2E.editableFields('Observed'),
			Limited: window.sheetsE2E.editableFields('Limited'),
		})),
		await player.evaluate(() => {
			const counts = (name: string) => {
				const fields = window.sheetsE2E.editableFields(name);
				return { ...fields, enabled: 0, editableTextareas: 0 };
			};
			return { Observed: counts('Observed'), Limited: counts('Limited') };
		}),
	);
	e2e.expect(
		"#260 A5 the editor of a sheet the player can't edit has its toggle button disabled",
		await player.evaluate(() => window.sheetsE2E.editor('Observed', 'system.notes')),
		{ toggle: 'disabled', open: false, text: '', links: 0 },
	);
	await e2e.step('#95 player drops a weapon on the sheet they observe and on their own', () =>
		player.evaluate(async () => {
			await window.sheetsE2E.drop('Observed', { type: 'Item', name: 'weapon' });
			await window.sheetsE2E.drop('Hero', { type: 'Item', name: 'weapon' });
		}),
	);
	e2e.expect(
		"#95 A12 a drop on a sheet the player can't edit is ignored",
		await gm.evaluate(() => ({
			Observed: window.sheetsE2E.itemNames('Observed'),
			Hero: window.sheetsE2E.itemNames('Hero').includes('E2E weapon'),
		})),
		{ Observed: [], Hero: true },
	);
	await player.evaluate(() => window.sheetsE2E.closeAll());

	// §#95 as GM: the session of the checklist's "To test".
	await e2e.step('#95 GM changes the image of a character from the file picker', () =>
		gm.evaluate(async () => {
			await window.sheetsE2E.open('Bearer');
		}),
	);
	e2e.expect(
		'#95 A13 GM: a picked image becomes the actor image',
		await gm.evaluate(() => window.sheetsE2E.pickImage('Bearer', 'icons/svg/mystery-man.svg')),
		{ pickerShown: true, img: 'icons/svg/mystery-man.svg' },
	);
	// The Archetype and the Career go first: a character who spent XP can't change them.
	await e2e.step('#95 GM drops an archetype, a career, a skill and an item on a character', () =>
		gm.evaluate(async () => {
			for (const name of ['archetype', 'career', 'skill', 'weapon']) await window.sheetsE2E.drop('Bearer', { type: 'Item', name });
		}),
	);
	e2e.expect(
		'#95 A14 GM: the career skill prompt opens for a dropped career',
		await gm.evaluate(() => window.sheetsE2E.prompts('app-career-skill-prompt')),
		[{ appV2: true, title: 'Career Skills' }],
	);
	await gm.evaluate(() => window.sheetsE2E.closePrompts('app-career-skill-prompt'));
	const journal = await gm.evaluate(() => window.sheetsE2E.journal('Bearer'));
	await e2e.step('#95 GM awards 50 XP from the journal', () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.clickTab('Bearer', 'journal');
			await sheets.click('Bearer', '.xp-journal .entries-header a');
			sheets.setPromptInput('app-award-xp-prompt', '.amount input', '50', 'input');
			sheets.setPromptInput('app-award-xp-prompt', '.reason textarea', 'E2E', 'input');
			await sheets.clickPrompt('app-award-xp-prompt', '.award-xp-prompt button');
		}),
	);
	e2e.expect(
		'#95 A15 GM: the award adds a journal entry and 50 available XP',
		await gm.evaluate(() => window.sheetsE2E.journal('Bearer')),
		{
			availableXP: journal.availableXP + 50,
			entries: journal.entries + 1,
		},
	);
	await e2e.step('#95 GM drops a talent on the character', () =>
		gm.evaluate(() => window.sheetsE2E.drop('Bearer', { type: 'Item', name: 'talent' })),
	);
	e2e.expect('#95 A16 GM: the dropped items are on the character', await gm.evaluate(() => window.sheetsE2E.itemNames('Bearer')), [
		'E2E archetype',
		'E2E career',
		'E2E skill',
		'E2E talent',
		'E2E weapon',
	]);
	await e2e.step('#95 GM drops a minion on a vehicle', () =>
		gm.evaluate(async () => {
			await window.sheetsE2E.open('Vehicle');
			await window.sheetsE2E.drop('Vehicle', { type: 'Actor', name: 'Minion' }, '.tab-crew .section-header');
		}),
	);
	e2e.expect(
		'#95 A17 GM: the clone prompt opens for an actor dropped on a vehicle',
		await gm.evaluate(() => window.sheetsE2E.prompts('app-clone-actor-prompt')),
		[{ appV2: true, title: 'Drop Confirmation' }],
	);
	await gm.evaluate(() => window.sheetsE2E.closePrompts('app-clone-actor-prompt'));
	await e2e.step('#95 GM drops items on a weapon, an armor, an archetype and a career sheet', () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			for (const name of ['weapon', 'armor', 'archetype', 'career']) await sheets.open(name);
			await sheets.drop('weapon', { type: 'Item', name: 'quality' });
			await sheets.drop('weapon', { type: 'Item', name: 'skill' });
			await sheets.drop('armor', { type: 'Item', name: 'quality' });
			await sheets.drop('archetype', { type: 'Item', name: 'ability' });
			await sheets.drop('career', { type: 'Item', name: 'skill' });
		}),
	);
	e2e.expect(
		'#95 A18 GM: the item sheets take the dropped items',
		await gm.evaluate(() => {
			const system = (name: string) => game.items.getName(`E2E ${name}`).system;
			return {
				weapon: [system('weapon').skills, system('weapon').qualities.map((quality: { name: string }) => quality.name)],
				armor: system('armor').qualities.map((quality: { name: string }) => quality.name),
				archetype: system('archetype').grantedItems.map((item: { name: string }) => item.name),
				career: system('career').careerSkills.map((skill: { name: string }) => skill.name),
			};
		}),
		{ weapon: [['E2E skill'], ['E2E quality']], armor: ['E2E quality'], archetype: ['E2E ability'], career: ['E2E skill'] },
	);
	await gm.evaluate(async () => {
		await window.sheetsE2E.closeAll();
		window.sheetsE2E.readMessages();
	});
	await e2e.step('#95 GM rolls a skill from the character sheet and a pool from /gendr', () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.open('Bearer');
			await sheets.clickTab('Bearer', 'skills');
			await sheets.click('Bearer', '.tab-skills a.name', 'Athletics');
			await sheets.clickPrompt('app-dice-prompt', '.roll-button');
			await ui.chat.processMessage('/gendr');
			await sheets.clickPrompt('app-dice-prompt', '.roll-button');
		}),
	);
	e2e.expect(
		'#95 A19 GM: the dice prompt rolls a check from a skill and from /gendr',
		await gm.evaluate(() => window.sheetsE2E.readMessages().map(({ speaker, rolls }) => ({ speaker, rolls }))),
		// A roll without an actor has no actor speaking.
		[
			{ speaker: 'E2E Bearer', rolls: 1 },
			{ speaker: '', rolls: 1 },
		],
	);
	const storyPoints = await gm.evaluate(() => window.sheetsE2E.storyPoints());
	await e2e.step('#95 GM sets the story points, spends one of the GM pool, then resets them', async () => {
		await gm.evaluate(() => window.sheetsE2E.setStoryPoints({ gm: 3, player: 2 }));
		await gm.evaluate(() => window.sheetsE2E.clickStoryPoints('a.points'));
	});
	const spent = await gm.evaluate(() => window.sheetsE2E.storyPoints());
	await gm.evaluate(() => window.sheetsE2E.clickStoryPoints('a:has(.fa-arrows-rotate)'));
	e2e.expect(
		'#95 A20 GM: spending a story point moves it from the GM pool to the players, and resetting gives one to each player',
		{ spent, reset: await gm.evaluate(() => window.sheetsE2E.storyPoints()) },
		{ spent: { gm: 2, player: 3 }, reset: { gm: 1, player: 1 } },
	);
	await e2e.step('#277 GM types letters, then a count, into the GM pool', () =>
		gm.evaluate(() => window.sheetsE2E.editGMStoryPoints('abc')),
	);
	const afterLetters = await gm.evaluate(() => window.sheetsE2E.storyPoints());
	await gm.evaluate(() => window.sheetsE2E.editGMStoryPoints('4'));
	e2e.expect(
		'#277 A1 GM: letters typed into a Story Point pool leave the pools unchanged, and a count sets that pool',
		{ afterLetters, afterCount: await gm.evaluate(() => window.sheetsE2E.storyPoints()) },
		{ afterLetters: { gm: 1, player: 1 }, afterCount: { gm: 4, player: 1 } },
	);

	// §#249: an open sheet of each actor and item type shows at once an edit another client made with `update`, to the
	// document or to one of its items. The character shows its current wounds, the other sheets their source.
	const assistant = await e2e.assistantGM();
	await assistant.evaluate(installSheetsHelpers);
	recordCompatibilityWarnings(assistant);
	await gm.evaluate(
		async (names) => {
			await window.sheetsE2E.closeAll();
			for (const name of names) await window.sheetsE2E.open(name);
		},
		[...actorTypes, ...itemTypes],
	);
	const editedSheets = [...actorTypes, ...itemTypes].filter((name) => name !== 'Hero');
	const shownEdits = (names: string[]) => {
		const sheets = window.sheetsE2E;
		return {
			wounds: sheets.fieldValue('Hero', 'system.wounds.value'),
			sources: Object.fromEntries(names.map((name) => [name, sheets.fieldValue(name, 'system.source')])),
			heroTalent: sheets.rowText('Hero', '.tab-talents .talent', 'E2E Ranked', '.name a'),
			heroSword: sheets.rowText('Hero', '.tab-inventory .inventory-item', 'E2E Sword', '.quantity'),
			nemesisTalent: sheets.rowText('Nemesis', '.adversary-items .talent', 'E2E Ranked', 'label a'),
			vehicleCannon: sheets.rowText('Vehicle', '.tab-inventory .inventory-item', 'E2E Cannon', '.quantity'),
		};
	};
	const editsBefore = await gm.evaluate(shownEdits, editedSheets);
	const editAll = (edits: { wounds: number; source: string; rank: number; quantity: number; names: string[] }) =>
		assistant.evaluate(async ({ wounds, source, rank, quantity, names }) => {
			const sheets = window.sheetsE2E;
			await sheets.update('Hero', { 'system.wounds.value': wounds });
			for (const name of names) await sheets.update(name, { 'system.source': source });
			for (const name of ['Hero/Ranked', 'Nemesis/Ranked']) await sheets.update(name, { 'system.rank': rank });
			for (const name of ['Hero/Sword', 'Vehicle/Cannon']) await sheets.update(name, { 'system.quantity': quantity });
		}, edits);
	await e2e.step('#249 Assistant GM edits each actor and item, and items of a character, a nemesis and a vehicle', () =>
		editAll({ wounds: 3, source: 'E2E Source 249', rank: 3, quantity: 4, names: editedSheets }),
	);
	e2e.expect(
		"#249 A1 GM: each open actor and item sheet shows at once another client's edit of its document and of its items",
		await gm.evaluate(shownEdits, editedSheets),
		{
			wounds: '3',
			sources: Object.fromEntries(editedSheets.map((name) => [name, 'E2E Source 249'])),
			heroTalent: 'E2E Ranked 3',
			heroSword: '4',
			nemesisTalent: 'E2E Ranked 3',
			vehicleCannon: '4',
		},
	);
	await e2e.step('#249 Assistant GM puts the edits back', () =>
		editAll({ wounds: Number(editsBefore.wounds), source: '', rank: 2, quantity: 1, names: editedSheets }),
	);
	e2e.expect('#249 A2 GM: the open sheets show the edits put back', await gm.evaluate(shownEdits, editedSheets), editsBefore);

	// §#249 from the sheet: a field changed in a sheet shows elsewhere in it at once, the source of an adversary or an
	// item above its description, the passenger capacity of a vehicle on its Crew tab. The character, the vehicle's crew
	// and a weapon's row have steps of their own (character.ts, inventory.ts, #82 A2 below).
	const sourceSheets = [...actorTypes.filter((name) => !['Hero', 'Vehicle'].includes(name)), ...itemTypes];
	const shownFromSheets = (names: string[]) => {
		const sheets = window.sheetsE2E;
		return {
			sources: Object.fromEntries(
				names.map((name) => [
					name,
					sheets.shownText(
						name,
						game.items.getName(`E2E ${name}`) ? '.tab[data-tab="description"] .source' : '.description-area .source',
					),
				]),
			),
			capacity: sheets.shownText('Vehicle', '.tab-crew .capacity-section span:last-child'),
		};
	};
	const fromSheetsBefore = await gm.evaluate(shownFromSheets, sourceSheets);
	const editInSheets = (edits: { source: string; capacity: string; names: string[] }) =>
		gm.evaluate(async ({ source, capacity, names }) => {
			const sheets = window.sheetsE2E;
			for (const name of names) await sheets.changeField(name, 'input[name="system.source"]', source);
			await sheets.changeField('Vehicle', 'input[name="system.passengers.threshold"]', capacity);
		}, edits);
	await e2e.step("#249 GM changes the source of each adversary and item, and a vehicle's passenger capacity, in their sheets", () =>
		editInSheets({ source: 'E2E Sheet Source', capacity: '7', names: sourceSheets }),
	);
	e2e.expect(
		'#249 A3 GM: a field changed in an adversary, item or vehicle sheet shows elsewhere in the sheet at once',
		await gm.evaluate(shownFromSheets, sourceSheets),
		{
			sources: Object.fromEntries(sourceSheets.map((name) => [name, 'E2E Sheet Source'])),
			capacity: fromSheetsBefore.capacity.replace(/\/\d+$/, '/7'),
		},
	);
	await e2e.step('#249 GM puts the fields back in the sheets', () =>
		editInSheets({ source: '', capacity: fromSheetsBefore.capacity.split('/')[1], names: sourceSheets }),
	);
	e2e.expect('#249 A4 GM: the sheets show the fields put back', await gm.evaluate(shownFromSheets, sourceSheets), fromSheetsBefore);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#250: a player's spend goes to the Acting GM alone, who writes it once and posts its message as the player.
	await gm.evaluate(() => window.sheetsE2E.setStoryPoints({ gm: 1, player: 2 }));
	// Setting the pools renders the GM's tracker alone.
	await player.evaluate(async () => {
		await foundry.applications.instances.get('story-point-tracker')?.render(true);
		await window.e2e.settle();
	});
	await player.evaluate(() => window.sheetsE2E.storyPointLog());
	const playerPoolMessage = await gm.evaluate(() => game.i18n.localize('Genesys.StoryPoints.ChatMessagePlayerPool'));
	await e2e.step('#250 player spends a Story Point, with a GM and an Assistant GM online', () =>
		player.evaluate(() => window.sheetsE2E.clickStoryPoints('a.points')),
	);
	e2e.expect(
		"#250 A1 with a GM and an Assistant GM online, a player's spend moves one point to the GM pool, written once by the GM, with one message from the player",
		{
			pools: await player.evaluate(() => window.sheetsE2E.storyPoints()),
			...(await player.evaluate(() => window.sheetsE2E.storyPointLog())),
		},
		{ pools: { gm: 2, player: 1 }, writes: [gm.user], messages: [`${e2e.playerUser}: ${playerPoolMessage}`] },
	);
	const noGMWarning = await player.evaluate(() => `warning: ${game.i18n.localize('Genesys.Notifications.NoGMForStoryPoint')}`);
	await e2e.step('#250 Assistant GM and GM leave', async () => {
		await assistant.leave();
		await gm.leave();
	});
	let refusal: string[] = [];
	await e2e.step('#250 player spends a Story Point, with no GM online', async () => {
		refusal = await player.evaluate(async () => {
			const notifications = window.e2e.recordNotifications();
			await window.sheetsE2E.clickStoryPoints('a.points');
			return notifications();
		});
	});
	e2e.expect(
		"#250 A2 with no GM online, a player's spend is refused with a warning, leaving the pools unchanged, with no message",
		{
			notifications: refusal,
			pools: await player.evaluate(() => window.sheetsE2E.storyPoints()),
			...(await player.evaluate(() => window.sheetsE2E.storyPointLog())),
		},
		{ notifications: [noGMWarning], pools: { gm: 2, player: 1 }, writes: [], messages: [] },
	);
	await e2e.step('#250 GM joins again', async () => {
		await gm.join();
		await gm.evaluate(installSheetsHelpers);
	});
	recordCompatibilityWarnings(gm);

	// §#343: the tracker edits one pool at a time.
	let edited: string[] = [];
	await e2e.step("#343 GM right-clicks the GM pool, then the players' pool", async () => {
		edited = await gm.evaluate(() => window.sheetsE2E.editBothStoryPointPools());
	});
	e2e.expect("#343 A1 GM: right-clicking a Story Point pool closes the other pool's input", edited, ['player']);

	// §#343: a context menu left open on a sheet that closes.
	await gm.evaluate(async () => {
		await window.sheetsE2E.open('Bearer');
		await window.sheetsE2E.clickTab('Bearer', 'skills');
	});
	let blocked: boolean | undefined;
	await e2e.step('#343 GM opens the context menu of a skill, closes the sheet, then clicks the page', async () => {
		blocked = await gm.evaluate(() => window.sheetsE2E.clickAfterClosingMenu('Bearer', '.tab-skills .skill.menu-container'));
	});
	e2e.expect('#343 A2 GM: a context menu left open on a closed sheet lets the next click through', blocked, false);

	await gm.evaluate((points) => window.sheetsE2E.setStoryPoints(points), storyPoints);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#32, §#40, §#49, §#85, §#140: the effect sheet.
	await e2e.step('effect sheet setup', () => gm.evaluate(() => window.sheetsE2E.effectSheet.create()));
	await e2e.step('#85 GM opens the effect sheet from the Effects tab of a character', () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			const { htmlOf, waitFor, effectRows, editEffect } = window.e2e;
			await sheets.open('Hero');
			await sheets.clickTab('Hero', 'effects');
			const hero = game.actors.getName('E2E Hero');
			editEffect(effectRows(hero.sheet).find((row) => row.name === 'E2E Edited')!);
			const effectSheet = hero.effects.getName('E2E Edited').sheet;
			await waitFor('the effect sheet', () => effectSheet.rendered && htmlOf(effectSheet)?.querySelector('[name$="changes.0.key"]'));
		}),
	);
	const englishCharacteristics = {
		options: ['Agility', 'Brawn', 'Cunning', 'Intellect', 'Presence', 'Willpower'],
		values: ['agility', 'brawn', 'cunning', 'intellect', 'presence', 'willpower'],
		selected: 'willpower',
	};
	const keyValues = [
		'system.characteristics.brawn',
		'system.characteristics.agility',
		'system.characteristics.intellect',
		'system.characteristics.cunning',
		'system.characteristics.willpower',
		'system.characteristics.presence',
		'system.silhouette',
		'system.speed',
		'system.handling',
		'system.defense',
		'system.armor',
	];
	// §#380: the silhouette applies to any actor.
	const keyGroup = (label: string, names: string[], silhouette: string, vehicle: string[]) => ({
		label,
		options: [...names.map((name) => `🧑 ${name}`), `🌐 ${silhouette}`, ...vehicle.map((name) => `🚗 ${name}`)],
		values: keyValues,
	});
	const state = await gm.evaluate(() => window.sheetsE2E.effectSheet.state('Hero'));
	e2e.expect(
		'#85 A1 the effect sheet renders from its template',
		state.template,
		'systems/genesys/templates/sheets/effect-changes-tab.hbs',
	);
	e2e.expect(
		"#140 A1 the dice pool characteristic select shows the characteristics' names sorted, and keeps its selection",
		state.charSelect,
		englishCharacteristics,
	);
	e2e.expect(
		'#140 A2 the key select lists the six characteristics in their order, then the vehicle characteristics, and keeps its selection',
		{ group: state.keyGroup, selected: state.keySelected },
		{
			group: keyGroup('Modify Characteristic', ['Brawn', 'Agility', 'Intellect', 'Cunning', 'Willpower', 'Presence'], 'Silhouette', [
				'Speed',
				'Handling',
				'Defense',
				'Armor',
			]),
			selected: 'system.characteristics.cunning',
		},
	);
	e2e.expect('#243 A1 the key select offers no key, then every key by group', state.keyOptions, [
		'=—',
		{
			label: 'Modify Characteristic',
			options: [
				'system.characteristics.brawn=🧑 Brawn',
				'system.characteristics.agility=🧑 Agility',
				'system.characteristics.intellect=🧑 Intellect',
				'system.characteristics.cunning=🧑 Cunning',
				'system.characteristics.willpower=🧑 Willpower',
				'system.characteristics.presence=🧑 Presence',
				'system.silhouette=🌐 Silhouette',
				'system.speed=🚗 Speed',
				'system.handling=🚗 Handling',
				'system.defense=🚗 Defense',
				'system.armor=🚗 Armor',
			],
		},
		{
			label: 'Modify Stat',
			options: [
				'system.soak=🧑 Soak Value',
				'system.wounds.max=🧑 Wound Threshold',
				'system.strain.max=🧑 Strain Threshold',
				'system.defense.melee=🧑 Melee Defense',
				'system.defense.ranged=🧑 Ranged Defense',
				'system.hullTrauma.max=🚗 Hull Trauma Threshold',
				'system.systemStrain.max=🚗 System Strain Threshold',
				'system.passengers.value=🚗 Passengers',
				'system.passengers.threshold=🚗 Passenger Capacity',
				'system.encumbrance.value=🌐 Encumbrance',
				'system.encumbrance.threshold=🌐 Encumbrance Threshold',
			],
		},
		{
			label: 'Modify Dice Pool',
			options: [
				'genesys.pool.check.self=👇 Any Check',
				'genesys.pool.char.self=👇 Uses Characteristic',
				'genesys.pool.skill.self=👇 Uses Skill',
				'genesys.pool.check.target=🎯 Any Check',
				'genesys.pool.char.target=🎯 Uses Characteristic',
				'genesys.pool.skill.target=🎯 Uses Skill',
			],
		},
	]);
	const skillSelect = (index: number, selected: string) => ({ index, selected, custom: true, changeCase: true, compendiumCase: false });
	e2e.expect(
		"#40 A1 every skill select lists the skills the effect's changes apply to, a compendium skill once with the change's case",
		state.skillSelects,
		[skillSelect(0, state.skillSelects[0]?.selected ?? ''), skillSelect(3, 'E2E Custom Skill'), skillSelect(4, 'ranged (light)')],
	);

	// v13: a change has a mode, which v14 replaced with a type; v14 also parses a value that holds JSON.
	const v14Types: Record<number, string> = { 0: 'custom', 2: 'add', 5: 'override' };
	const asStored = (changes: [string, number, string][]): ChangeRow[] =>
		e2e.version < 14
			? changes
			: changes.map(([key, mode, value]) => [key, v14Types[mode], /^\d+$/.test(value) ? Number(value) : value]);
	const savedChanges = asStored([
		['system.characteristics.cunning', 2, '1'],
		['genesys.pool.char.self.willpower', 0, 'B'],
		['genesys.pool.check.self.', 0, 'S'],
		['genesys.pool.skill.self.E2E Custom Skill', 0, 'A'],
		['genesys.pool.skill.target.ranged (light)', 0, 'D'],
		['genesys.pool.check.target.', 0, ''],
	]);
	await e2e.step('#32 GM saves the effect sheets of an actor and an item unchanged', () =>
		gm.evaluate(async () => {
			const effectSheet = window.sheetsE2E.effectSheet;
			await effectSheet.submit('Hero');
			await effectSheet.open('Bearer/Charm');
			await effectSheet.submit('Bearer/Charm');
		}),
	);
	e2e.expect(
		'#32 A1 saving an effect sheet keeps its Pool Modification keys and values, a skill outside the compendium included, and blanks a non-glyph value',
		await gm.evaluate(() => ({
			actor: window.sheetsE2E.effectSheet.changes('Hero'),
			item: window.sheetsE2E.effectSheet.changes('Bearer/Charm'),
		})),
		{ actor: savedChanges, item: savedChanges },
	);
	const editedChanges = asStored([
		['system.characteristics.presence', 5, '1'],
		['genesys.pool.char.self.presence', 0, 'B'],
		['genesys.pool.check.self.', 0, 'SS'],
		['genesys.pool.skill.self.Cool', 0, 'A'],
		['genesys.pool.skill.target.ranged (light)', 0, 'D'],
		['genesys.pool.check.target.', 0, 'B'],
	]);
	await e2e.step('#85 GM edits the key, mode, characteristic, skill and value of changes, adds one and deletes one', () =>
		gm.evaluate(async () => {
			const effectSheet = window.sheetsE2E.effectSheet;
			await effectSheet.open('Hero');
			await effectSheet.edit('Hero');
			await effectSheet.submit('Hero');
		}),
	);
	e2e.expect(
		'#85 A2 the edited changes are saved, a Pool Modification without characteristic or skill with an empty subject',
		await gm.evaluate(() => window.sheetsE2E.effectSheet.changes('Hero')),
		editedChanges,
	);
	await e2e.step('#140 GM opens the effect sheet in French', () =>
		gm.evaluate(async () => {
			await window.sheetsE2E.closeAll();
			await window.sheetsE2E.setLanguage('fr');
			await window.sheetsE2E.effectSheet.open('Bearer/Charm');
		}),
	);
	const french = await gm.evaluate(() => window.sheetsE2E.effectSheet.state('Bearer/Charm'));
	e2e.expect(
		"#140 A3 in French, the dice pool characteristic select shows the characteristics' French names sorted in French",
		french.charSelect,
		{
			options: ['Agilité', 'Intelligence', 'Présence', 'Ruse', 'Vigueur', 'Volonté'],
			values: ['agility', 'intellect', 'presence', 'cunning', 'brawn', 'willpower'],
			selected: 'willpower',
		},
	);
	e2e.expect(
		'#140 A4 in French, the key select lists the six characteristics in their order, then the vehicle characteristics',
		{ group: french.keyGroup, selected: french.keySelected },
		{
			group: keyGroup(
				'Caractéristique à modifier',
				['Vigueur', 'Agilité', 'Intelligence', 'Ruse', 'Volonté', 'Présence'],
				'Gabarit',
				['Vitesse', 'Maniabilité', 'Défense', 'Armure'],
			),
			selected: 'system.characteristics.cunning',
		},
	);
	await e2e.step("#85 GM edits, adds and deletes the changes of an item's effect", () =>
		gm.evaluate(async () => {
			const effectSheet = window.sheetsE2E.effectSheet;
			await effectSheet.edit('Bearer/Charm');
			await effectSheet.submit('Bearer/Charm');
		}),
	);
	e2e.expect(
		"#85 A3 the edited changes of an item's effect are saved",
		await gm.evaluate(() => window.sheetsE2E.effectSheet.changes('Bearer/Charm')),
		editedChanges,
	);

	// §#297: on v14, a change's type is one a module registers, and Foundry's form processing leaves a change of a type
	// no module registers as stored. A module removed leaves such a change; Foundry's types are cached once read, so the
	// effect is created with a type never registered rather than with one unregistered.
	if (e2e.version >= 14) {
		let unregistered: unknown;
		await e2e.step(
			'#297 GM opens the sheet of an effect whose change has a type no module registers, edits another change and saves it',
			async () => {
				unregistered = await gm.evaluate(() => window.sheetsE2E.unregisteredChangeType());
			},
		);
		e2e.expect(
			'#297 A1 a change whose type no module registers keeps its type in the sheet and when the sheet is saved, beside an edited change',
			unregistered,
			{
				shown: 'e2eremoved',
				stored: ['system.characteristics.brawn e2eremoved "1"', 'system.characteristics.agility add 2'],
			},
		);
	}

	// §#82 in French: the abilities' activation and the notification of a character created without skills.
	await e2e.step('#82 GM sends a passive and an active ability to chat in French, and creates a character without skills', () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.closeAll();
			sheets.readMessages();
			await sheets.open('Nemesis');
			await sheets.sendToChat('Nemesis', 'Passive');
			await sheets.sendToChat('Nemesis', 'Active');
		}),
	);
	const frenchCards = await gm.evaluate(() => window.sheetsE2E.cards().map((card) => card.content.activation));
	const noSkills = await gm.evaluate(() => window.sheetsE2E.charactersSkillsEmptied('Skilless'));
	e2e.expect(
		"#82 A1 in French, the abilities' cards read Passif and Actif, and a character created without skills is notified",
		{ cards: frenchCards, noSkills, notification: await gm.evaluate(() => window.sheetsE2E.notification('compendium')) },
		{
			cards: ['Passif', 'Actif (Maneuver)'],
			noSkills: { skills: 0 },
			notification:
				"Le personnage a été créé sans compétence initiale, car le compendium de compétences configuré n'en contient aucune.",
		},
	);
	await gm.evaluate(async () => {
		await window.sheetsE2E.closeAll();
		await window.sheetsE2E.setLanguage('en');
	});

	// §#101: the Effects tab adds an effect in each section.
	const added = ['Observed', 'Vehicle', 'Nemesis', 'gear'];
	await e2e.step('#101 GM adds an effect in each section of the Effects tab of a character, a vehicle, an adversary and an item', () =>
		gm.evaluate(async (names) => {
			const sheets = window.sheetsE2E;
			for (const name of names) {
				await sheets.open(name);
				await sheets.clickTab(name, 'effects');
				for (const section of [1, 2, 3]) await sheets.addEffect(name, section);
			}
		}, added),
	);
	const addedRows = await gm.evaluate(
		(names) =>
			Object.fromEntries(
				names.map((name) => [
					name,
					{
						rows: window.sheetsE2E.effectRows(name).map(({ section, name }) => [section, name]),
						effects: window.sheetsE2E.effectsData(name),
					},
				]),
			),
		added,
	);
	const addedFor = (name: string) => ({
		rows: [
			['Temporary Effects', name],
			['Passive Effects', name],
			['Inactive Effects', name],
		],
		effects: [
			{ name, disabled: false, rounds: 1 },
			{ name, disabled: false, rounds: null },
			{ name, disabled: true, rounds: null },
		],
	});
	e2e.expect(
		'#101 A1 Add in each section creates an effect named after the document, shown in the tab without reopening the sheet',
		addedRows,
		{
			Observed: addedFor('E2E Observed'),
			Vehicle: addedFor('E2E Vehicle'),
			Nemesis: addedFor('E2E Nemesis'),
			gear: addedFor('E2E gear'),
		},
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#101, §#82: enriched sources.
	const sources = ['Nemesis', 'gear', 'career', 'archetype'];
	const sourceText = await gm.evaluate(() => `@UUID[${game.actors.getName('E2E Hero').uuid}]{E2E Hero} [[/r 1d6]] @check[Athletics]`);
	await e2e.step('#101 GM writes a source with a link, an inline roll and a check link', () =>
		gm.evaluate(
			async ({ names, source }) => {
				for (const name of names) await window.sheetsE2E.update(name, { 'system.source': source });
			},
			{ names: sources, source: sourceText },
		),
	);
	const before: Record<string, unknown> = {};
	await e2e.step('#101 GM opens the sheets while their source is being enriched', async () => {
		for (const name of sources) before[name] = await gm.evaluate((name) => window.sheetsE2E.sourceBeforeEnrichment(name), name);
	});
	e2e.expect(
		'#101 A2 the source line shows its raw text before enrichment',
		before,
		Object.fromEntries(sources.map((name) => [name, { before: sourceText, afterLinks: 1 }])),
	);
	const editedSource = await gm.evaluate(() => `@UUID[${game.actors.getName('E2E Bearer').uuid}]{E2E Bearer} [[/r 2d6]] @check[Cool]`);
	await e2e.step('#101 GM edits the source of an adversary, an item, a career and an archetype', () =>
		gm.evaluate(
			async ({ names, source }) => {
				for (const name of names) {
					await window.sheetsE2E.open(name);
					await window.sheetsE2E.update(name, { 'system.source': source });
				}
			},
			{ names: sources, source: editedSource },
		),
	);
	const enriched = await gm.evaluate(
		(names) =>
			Object.fromEntries(
				names.map((name) => {
					const { links, rolls, checks, italic, smaller, html } = window.sheetsE2E.source(name);
					return [name, { links, rolls, checks, italic, smaller, edited: html.includes('E2E Bearer') }];
				}),
			),
		sources,
	);
	e2e.expect(
		'#101 A3 an edited source shows enriched right away, in small italics',
		enriched,
		Object.fromEntries(sources.map((name) => [name, { links: 1, rolls: 1, checks: 1, italic: true, smaller: true, edited: true }])),
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#101: with Foundry's own enrichment, as the table sees it, every content the source line shows from the sheet's
	// first paint on is its raw text or its enriched text, never an empty line.
	const shownSources: Record<string, string[]> = {};
	await e2e.step('#101 GM opens the sheets of an adversary, an item, a career and an archetype, watching their source line', async () => {
		for (const name of sources) shownSources[name] = await gm.evaluate((name) => window.sheetsE2E.sourceAsShown(name), name);
	});
	e2e.expect(
		"#101 A4 with Foundry's own enrichment, the source line shows its raw text, then its link, and never an empty line",
		shownSources,
		Object.fromEntries(sources.map((name) => [name, ['raw', 'enriched']])),
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#82: the Crew tab follows its passengers and role members.
	const crew = async (name: string, action: () => Promise<unknown>) => {
		await e2e.step(name, action);
		const tab = await gm.evaluate(() => window.sheetsE2E.crewTab('Vehicle'));
		e2e.log(`${name}: Crew tab`, tab);
		return tab;
	};
	await gm.evaluate(() => window.sheetsE2E.open('Vehicle'));
	await gm.evaluate(() => window.sheetsE2E.clickTab('Vehicle', 'crew'));
	const crewSteps = {
		passengersAdded: await crew('#82 GM adds two passengers and a role', () =>
			gm.evaluate(async () => {
				const sheets = window.sheetsE2E;
				await sheets.drop('Vehicle', { type: 'Actor', name: 'Hero' }, '.tab-crew .section-header');
				await sheets.drop('Vehicle', { type: 'Actor', name: 'Bearer' }, '.tab-crew .section-header');
				await sheets.click('Vehicle', '.tab-crew .section-header a');
			}),
		),
		memberAdded: await crew('#82 GM moves a passenger to the role', () =>
			gm.evaluate(() =>
				window.sheetsE2E.drag('Vehicle', '.tab-crew .passengers .actor-tile-mini', 'E2E Bearer', '.tab-crew .roles .role-section'),
			),
		),
		memberRemoved: await crew('#82 GM removes the role member', () =>
			gm.evaluate(() => window.sheetsE2E.menu('Vehicle', '.tab-crew .roles .role-member', 'E2E Bearer', 'fa-trash')),
		),
		passengerRemoved: await crew('#82 GM removes a passenger', () =>
			gm.evaluate(() => window.sheetsE2E.menu('Vehicle', '.tab-crew .passengers .actor-tile-mini', 'E2E Hero', 'fa-trash')),
		),
	};
	e2e.expect('#82 A2 the Crew tab follows the passengers and role members added and removed', crewSteps, {
		passengersAdded: { passengers: ['E2E Hero', 'E2E Bearer'], members: [[]] },
		memberAdded: { passengers: ['E2E Hero'], members: [['E2E Bearer']] },
		memberRemoved: { passengers: ['E2E Hero'], members: [[]] },
		passengerRemoved: { passengers: [], members: [[]] },
	});
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#102: the Effects tabs of actors and items.
	await e2e.step('#102 GM gives a character, an adversary and a vehicle an effect of their own and an item with an effect', () =>
		gm.evaluate(async () => {
			const change = { key: 'system.soak', mode: 2, value: '1' };
			for (const [name, type, state] of [
				['Bearer', 'gear', 'carried'],
				['Rival', 'gear', 'carried'],
				['Vehicle', 'vehicleWeapon', 'equipped'],
			]) {
				const owner = game.actors.getName(`E2E ${name}`);
				await owner.createEmbeddedDocuments('ActiveEffect', [{ name: 'E2E Own', changes: [change] }]);
				await owner.createEmbeddedDocuments('Item', [
					{ name: 'E2E Kit', type, system: { state }, effects: [{ name: 'E2E Kit effect', changes: [change], transfer: true }] },
				]);
			}
			await game.actors.getName('E2E Bearer').createEmbeddedDocuments('Item', [
				{
					name: 'E2E Mail',
					type: 'armor',
					system: { state: 'carried' },
					effects: [{ name: 'E2E Mail effect', changes: [change], transfer: true }],
				},
			]);
		}),
	);
	const ownerRows = await gm.evaluate(async () => {
		const rows: Record<string, unknown> = {};
		for (const name of ['Bearer', 'Rival', 'Vehicle']) {
			await window.sheetsE2E.open(name);
			rows[name] = window.sheetsE2E
				.effectRows(name)
				.filter((row) => row.name.startsWith('E2E Own') || row.name.startsWith('E2E Kit'))
				.map(({ name, source, buttons }) => ({ name, source, buttons }));
		}
		return rows;
	});
	const ownerRow = { name: 'E2E Own', source: 'None', buttons: ['fa-power-off', 'fa-edit', 'fa-trash'] };
	const kitRow = { name: 'E2E Kit effect', source: 'E2E Kit', buttons: ['fa-power-off', 'fa-edit'] };
	e2e.expect(
		"#102 A1 an actor's Effects tab lists its own effects and its items', with the item as source, and Delete only for its own",
		ownerRows,
		{ Bearer: [ownerRow, kitRow], Rival: [ownerRow, kitRow], Vehicle: [ownerRow, kitRow] },
	);
	// The item's effect as saved, but for `disabled` and the edit stamps.
	const kitEffect = () =>
		gm.evaluate(() => {
			const { disabled, _stats, ...rest } = game.actors
				.getName('E2E Rival')
				.items.getName('E2E Kit')
				.effects.getName('E2E Kit effect')._source;
			return { disabled, rest: JSON.stringify(rest) };
		});
	const kitBefore = await kitEffect();
	await e2e.step("#102 GM edits and powers off an item's effect from the Rival's Effects tab", () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			const { settle, effectRows, toggleEffect, editEffect } = window.e2e;
			await sheets.clickTab('Rival', 'effects');
			const row = () => effectRows(game.actors.getName('E2E Rival').sheet).find((row) => row.name === 'E2E Kit effect')!;
			// Which effect sheet opens is under test: the step waits for the click's work to end, not for a sheet.
			editEffect(row());
			await settle();
			await toggleEffect(row());
		}),
	);
	e2e.expect(
		'#102 A2 Edit opens the effect where it lives, and the power button toggles disabled only',
		await gm
			.evaluate(() => {
				const kit = game.actors.getName('E2E Rival').items.getName('E2E Kit');
				const effect = kit.effects.getName('E2E Kit effect');
				const opened = [...foundry.applications.instances.values(), ...Object.values(ui.windows)].filter(
					(app: { rendered: boolean; document?: { name: string } }) => app.rendered && app.document?.name === 'E2E Kit effect',
				);
				return {
					opened: opened.map((app: { document: { uuid: string } }) => app.document.uuid === effect.uuid),
					rival: game.actors.getName('E2E Rival').effects.map((own: { name: string }) => own.name),
				};
			})
			.then(async (found) => ({ ...found, effect: await kitEffect() })),
		{ opened: [true], rival: ['E2E Own'], effect: { disabled: true, rest: kitBefore.rest } },
	);
	e2e.expect("#102 A3 the item's effect was enabled before the power button", kitBefore.disabled, false);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	await e2e.step("#102 GM gives an owned item an effect with an origin and opens the item's Effects tab", () =>
		gm.evaluate(async () => {
			const kit = game.actors.getName('E2E Bearer').items.getName('E2E Kit');
			await kit.createEmbeddedDocuments('ActiveEffect', [{ name: 'E2E Origin', origin: kit.uuid }]);
			await window.sheetsE2E.open('Bearer/Kit');
			await window.sheetsE2E.clickTab('Bearer/Kit', 'effects');
			await window.sheetsE2E.open('Bearer/Mail');
			await window.sheetsE2E.clickTab('Bearer/Mail', 'effects');
		}),
	);
	e2e.expect(
		"#102 A4 on an item's Effects tab, Delete shows for every effect, those with an origin included",
		await gm.evaluate(() => window.sheetsE2E.effectRows('Bearer/Kit').map(({ name, buttons }) => ({ name, buttons }))),
		[
			{ name: 'E2E Kit effect', buttons: ['fa-power-off', 'fa-edit', 'fa-trash'] },
			{ name: 'E2E Origin', buttons: ['fa-power-off', 'fa-edit', 'fa-trash'] },
		],
	);
	e2e.expect(
		'#102 A5 an owned armor out of its Equipment State lists its effects under Inactive Effects, with the tooltip',
		await gm.evaluate(() =>
			window.sheetsE2E.effectRows('Bearer/Mail').map(({ section, name, tooltip }) => ({ section, name, tooltip })),
		),
		[{ section: 'Inactive Effects', name: 'E2E Mail effect', tooltip: 'Inactive while E2E Mail is Carried.' }],
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#130: chat cards are spoken by the sheet's actor.
	const sends = async (client: Client, sheets: [string, string[]][]) =>
		client.evaluate(async (sheets) => {
			for (const [name, items] of sheets) {
				await window.sheetsE2E.open(name);
				for (const item of items) await window.sheetsE2E.sendToChat(name, item);
			}
			await window.sheetsE2E.closeAll();
		}, sheets);
	await gm.evaluate(() => window.sheetsE2E.readMessages());
	await e2e.step('#130 GM without a character sends talents, abilities and weapons from a character, an adversary and a vehicle', () =>
		sends(gm, [
			['Hero', ['Ranked', 'Unranked', 'Active', 'Sword']],
			['Nemesis', ['Ranked', 'Unranked', 'Active', 'Sword']],
			['Vehicle', ['Cannon']],
		]),
	);
	const gmCards = await gm.evaluate(() => window.sheetsE2E.cards());
	await gm.evaluate((name) => window.sheetsE2E.setUserCharacter(name, 'Observed'), gm.user);
	await e2e.step('#130 GM with a character sends a talent from an adversary', () => sends(gm, [['Nemesis', ['Ranked']]]));
	const assignedCards = await gm.evaluate(() => window.sheetsE2E.cards());
	await gm.evaluate((name) => window.sheetsE2E.setUserCharacter(name, null), gm.user);
	await gm.evaluate((name) => window.sheetsE2E.setUserCharacter(name, 'Observed'), e2e.playerUser);
	await e2e.step('#130 player with another character sends a talent and a weapon from their character', () =>
		sends(player, [['Hero', ['Ranked', 'Sword']]]),
	);
	const playerCards = await gm.evaluate(() => window.sheetsE2E.cards());
	await gm.evaluate((name) => window.sheetsE2E.setUserCharacter(name, null), e2e.playerUser);
	// A ranked talent's effective tier is its tier plus its ranks above the first.
	const swordCard = { skill: 'Melee', damage: '3 + Br', qualityTooltipLinks: '1' };
	e2e.expect(
		"#130 A1 a card sent from a sheet is spoken by the sheet's actor, with the rank or N/A, damage, firing arc and quality tooltips",
		{ gm: gmCards, assigned: assignedCards, player: playerCards },
		{
			gm: [
				{ speaker: 'E2E Hero', content: { activation: 'Passive', rank: '2', effectiveTier: '2' } },
				{ speaker: 'E2E Hero', content: { activation: 'Passive', rank: 'N/A', effectiveTier: '2' } },
				{ speaker: 'E2E Hero', content: { activation: 'Active (Maneuver)' } },
				{ speaker: 'E2E Hero', content: swordCard },
				{ speaker: 'E2E Nemesis', content: { activation: 'Passive', rank: '2', effectiveTier: '2' } },
				{ speaker: 'E2E Nemesis', content: { activation: 'Passive', rank: 'N/A', effectiveTier: '2' } },
				{ speaker: 'E2E Nemesis', content: { activation: 'Active (Maneuver)' } },
				{ speaker: 'E2E Nemesis', content: swordCard },
				{
					speaker: 'E2E Vehicle',
					content: { 'firing-arc': 'Fore, Port', skill: 'Gunnery', damage: '6', qualityTooltipLinks: '1' },
				},
			],
			assigned: [{ speaker: 'E2E Nemesis', content: { activation: 'Passive', rank: '2', effectiveTier: '2' } }],
			player: [
				{ speaker: 'E2E Hero', content: { activation: 'Passive', rank: '2', effectiveTier: '2' } },
				{ speaker: 'E2E Hero', content: swordCard },
			],
		},
	);
	await e2e.step("#130 GM rolls an attack with the Nemesis's sword, then changes its quality's rating in the weapon sheet", () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.open('Nemesis');
			await sheets.click('Nemesis', '.adversary-items .weapon > a', 'E2E Sword');
			await sheets.clickPrompt('app-dice-prompt', '.roll-button');
			await sheets.open('Nemesis/Sword');
			await sheets.clickTab('Nemesis/Sword', 'data');
			const element = game.actors.getName('E2E Nemesis').items.getName('E2E Sword').sheet.element as HTMLElement;
			const rating = element.querySelector<HTMLInputElement>('.data-rated input')!;
			rating.value = '3';
			rating.dispatchEvent(new FocusEvent('blur'));
			await window.e2e.settle();
		}),
	);
	e2e.expect(
		"#130 A2 after a card and an attack, a quality's rating change keeps the @UUID enricher of its description",
		await gm.evaluate(() => ({
			rating: game.actors.getName('E2E Nemesis').items.getName('E2E Sword').system.qualities[0].rating,
			description: window.sheetsE2E.qualityDescription('Nemesis/Sword').replace(/Actor\.\w+/, 'Actor.<id>'),
			attack: window.sheetsE2E.readMessages().map(({ speaker, rolls }) => ({ speaker, rolls })),
		})),
		{ rating: 3, description: '<p>@UUID[Actor.<id>]{E2E Hero} pierces.</p>', attack: [{ speaker: 'E2E Nemesis', rolls: 1 }] },
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#130: a card's quality shows its description in Foundry's tooltip, under the pointer.
	const tooltips: Record<string, unknown> = {};
	await e2e.step(
		"#130 GM hovers the quality of a weapon's card, a vehicle weapon's card and an attack's card in the chat log",
		async () => {
			for (const [card, speaker, attack] of [
				['weapon', 'Hero', false],
				['vehicleWeapon', 'Vehicle', false],
				['attack', 'Nemesis', true],
			] as const) {
				const marked = await gm.evaluate(({ speaker, attack }) => window.sheetsE2E.markQuality(speaker, attack), {
					speaker,
					attack,
				});
				if (!marked) {
					tooltips[card] = null;
					continue;
				}
				await gm.page.hover('[data-e2e="hovered-quality"]');
				tooltips[card] = await gm.evaluate(() => window.sheetsE2E.shownTooltip());
				await gm.page.mouse.move(0, 0);
				await gm.evaluate(() => window.sheetsE2E.tooltipHidden());
			}
		},
	);
	const pierceTooltip = { text: 'E2E Hero pierces.', links: 1 };
	e2e.expect(
		"#130 A3 hovering a card's quality shows its description in Foundry's tooltip, with its link, on a weapon's, a vehicle weapon's and an attack's card",
		tooltips,
		{ weapon: pierceTooltip, vehicleWeapon: pierceTooltip, attack: pierceTooltip },
	);

	// §#134: the weapons of an adversary and a vehicle, and the drawn firing arcs and separators of the rows of both
	// weapon types.
	await e2e.step('#134 GM gives the Nemesis a weapon without a damage characteristic and one with a negative damage', () =>
		gm.evaluate(async () => {
			await window.e2e.actor('Nemesis').createEmbeddedDocuments('Item', [
				{ name: 'E2E Rock', type: 'weapon', system: { skills: ['Melee'], baseDamage: 2, damageCharacteristic: '-' } },
				{ name: 'E2E Shiv', type: 'weapon', system: { skills: ['Melee'], baseDamage: -1, damageCharacteristic: 'brawn' } },
			]);
			await window.sheetsE2E.open('Nemesis');
			await window.sheetsE2E.open('Hero');
			await window.sheetsE2E.clickTab('Hero', 'inventory');
			await window.sheetsE2E.open('Vehicle');
			await window.sheetsE2E.clickTab('Vehicle', 'inventory');
		}),
	);
	// The Nemesis has Brawn 3: an adversary's list reads the damage total.
	e2e.expect(
		"#134 N1 an adversary lists a weapon's damage with its characteristic, without one, and with a negative base damage",
		await gm.evaluate(() => {
			const { text, htmlOf, actor } = window.e2e;
			return [...htmlOf(actor('Nemesis').sheet)!.querySelectorAll('.adversary-items .weapon')].map((row) => text(row));
		}),
		[
			'E2E Sword (MeleeDamage 6Critical 0Range [Engaged]E2E Pierce 3)',
			'E2E Rock (MeleeDamage 2Critical 0Range [Engaged])',
			'E2E Shiv (MeleeDamage 2Critical 0Range [Engaged])',
		],
	);
	// The separators are drawn by CSS, after each part: a comma between two firing arcs, a semicolon between two details.
	e2e.expect(
		"#134 N2 the inventory rows of a weapon and of a vehicle weapon draw their details' semicolons, and the commas between the firing arcs",
		await gm.evaluate(() => ({
			weapon: window.sheetsE2E.renderedText('Hero', '.tab-inventory .inventory-item .details', 'E2E Sword'),
			vehicleWeapon: window.sheetsE2E.renderedText('Vehicle', '.tab-inventory .inventory-item .details', 'E2E Cannon'),
		})),
		{
			weapon: 'E2E SwordMelee;Damage Br+3 (3);Critical 0;Range [Engaged];E2E Pierce 1',
			vehicleWeapon: 'E2E CannonGunnery;Firing Arc Fore,Port;Damage 6;Critical 0;Range [Engaged];E2E Pierce 1',
		},
	);
	// The Combat tab lists the equipped vehicle weapons.
	const cannonState = await gm.evaluate(() => window.e2e.actor('Vehicle').items.getName('E2E Cannon').system.state);
	await gm.evaluate(async () => {
		await window.sheetsE2E.update('Vehicle/Cannon', { 'system.state': 'equipped' });
		await window.sheetsE2E.clickTab('Vehicle', 'combat');
	});
	e2e.expect(
		"#134 N3 a vehicle's Combat tab draws the commas between a weapon's firing arcs",
		await gm.evaluate(() => window.sheetsE2E.renderedText('Vehicle', '.tab-combat .weapon:not(.header)', 'E2E Cannon')),
		'E2E CannonGunnery60EngagedFore,PortE2E Pierce 1',
	);
	// Hero rolls Gunnery with Agility 2 and no rank: two Ability dice against the attack's two Difficulty dice.
	await e2e.step('#134 GM gives the Vehicle a Gunner, Hero, and opens the attack of its Cannon', () =>
		gm.evaluate(async () => {
			const { actor } = window.e2e;
			await window.sheetsE2E.update('Hero', { 'system.characteristics.agility': 2 });
			await window.sheetsE2E.update('Vehicle', {
				'system.roles': [{ id: foundry.utils.randomID(), name: 'E2E Gunner', skills: ['Gunnery'], members: [actor('Hero').uuid] }],
			});
			await window.sheetsE2E.attackWithVehicleWeapon('Vehicle', 'Cannon');
		}),
	);
	const attackPool = await gm.evaluate(() => window.e2e.poolPreview(document.querySelector('.app-dice-prompt')!));
	// The fourth face of an Ability die holds two Successes, a Difficulty die's a Threat: four Successes are left.
	await e2e.step("#134 GM rolls the Cannon's attack, every die on its fourth face", async () => {
		await gm.fixDice([4, 4, 4, 4].map((face) => ({ face, faces: 8 })));
		await gm.evaluate(() => window.sheetsE2E.rollDicePrompt());
	});
	e2e.expect(
		"#134 N4 an attack with a vehicle weapon posts its base damage plus a damage per Success left, without its gunner's characteristic",
		{
			pool: attackPool,
			summary: await gm.evaluate(() => window.sheetsE2E.lastMessage(['.summary-table .label', '.summary-table .count'])),
		},
		{ pool: 'AA|DD', summary: 'PROBE' },
	);
	await gm.evaluate(async (state) => {
		await window.e2e.actor('Nemesis').deleteEmbeddedDocuments(
			'Item',
			['E2E Rock', 'E2E Shiv'].map((name) => window.e2e.actor('Nemesis').items.getName(name).id),
		);
		await window.sheetsE2E.update('Vehicle', { 'system.roles': [] });
		await window.sheetsE2E.update('Vehicle/Cannon', { 'system.state': state });
		await window.sheetsE2E.update('Hero', { 'system.characteristics.agility': 0 });
		await window.sheetsE2E.closeAll();
	}, cannonState);

	// §#262: the directories' create dialogs. Foundry's `createDialog` gets the position the directory asks for, so the
	// dialog opens there, and the system doesn't pass a dialog option where v13 reads a database option.
	for (const documentName of ['Actor', 'Item'] as const) {
		const { position, asked, types, declaredTypes, groups, warnings } = await gm.evaluate(
			(name) => window.sheetsE2E.createDialog(name),
			documentName,
		);
		e2e.expect(
			`#262 A1 the ${documentName} directory's create dialog opens where the directory asks, lists every type ungrouped, and logs no createDialog warning`,
			{ position, types, groups, warnings },
			{ position: asked, types: declaredTypes, groups: 0, warnings: [] },
		);
	}

	// §#258: with no template.json, a field's initial is the only default Foundry gives a created document.
	const blank = { gender: '', age: '', height: '', build: '', hair: '', eyes: '', notableFeatures: '' };
	e2e.expect(
		'#258 A1 an actor or an item created with no system data stores the defaults template.json gave, an item outside any Container',
		await gm.evaluate(() => window.sheetsE2E.emptyDefaults()),
		{
			character: { illustration: 'icons/svg/mystery-man.svg', details: blank },
			vehicle: { illustration: 'icons/svg/mystery-man.svg', complement: '', consumables: '' },
			containers: Object.fromEntries(
				['armor', 'consumable', 'container', 'gear', 'weapon', 'vehicleWeapon'].map((type) => [type, ['', '']]),
			),
			activationDetail: { ability: '', talent: '' },
		},
	);

	// §#97: the Default Difficulty setting's hint.
	e2e.expect(
		"#97 A2 the Default Difficulty hint links to the fork's wiki page of the glyphs",
		await gm.evaluate(() => window.sheetsE2E.settingsHintLink()),
		'https://github.com/kornifex/FVTT-Genesys/wiki/Dice-Pool-Modification-Glyphs',
	);

	// B: a weapon's extra Weapon Profiles, edited on its Data tab, and listed on its card (§#366).
	await gm.evaluate(async () => {
		const sheets = window.sheetsE2E;
		await sheets.closeAll();
		for (const name of ['weapon', 'vehicleWeapon']) {
			await sheets.open(name);
			await sheets.clickTab(name, 'data');
		}
	});
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
	e2e.expect(
		"#366 B1 a weapon's Data tab ends with an Add Weapon Profile button, a vehicle weapon's has none",
		await gm.evaluate(() =>
			Object.fromEntries(
				['weapon', 'vehicleWeapon'].map((name) => [
					name,
					[...window.e2e.htmlOf(game.items.getName(`E2E ${name}`).sheet)!.querySelectorAll('.add-profile button')].map(
						window.e2e.text,
					),
				]),
			),
		),
		{ weapon: ['Add Weapon Profile'], vehicleWeapon: [] },
	);
	const mainBefore = (await weaponProfiles()).main;
	await e2e.step('#366 B2 GM adds a Weapon Profile, edits each of its fields, and drops a quality and a skill on its block', () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			// A build without Weapon Profiles has no Add Weapon Profile button.
			if (!window.e2e.htmlOf(game.items.getName('E2E weapon').sheet)!.querySelector('.add-profile button')) return;
			await sheets.click('weapon', '.add-profile button');
			await sheets.changeField('weapon', '.weapon-profile .profile-name', 'Thrown');
			await sheets.changeField('weapon', '.weapon-profile .profile-damage-characteristic', 'agility');
			await sheets.changeField('weapon', '.weapon-profile .profile-damage', '2');
			await sheets.changeField('weapon', '.weapon-profile .profile-critical', '4');
			await sheets.changeField('weapon', '.weapon-profile .profile-range', 'short');
			await sheets.drop('weapon', { type: 'Item', name: 'quality' }, '.weapon-profile');
			await sheets.drop('weapon', { type: 'Item', name: 'skill' }, '.weapon-profile .profile-skills');
		}),
	);
	e2e.expect(
		"#366 B2 the added profile stores each field changed on its block, and the quality and skill dropped on it, leaving the main profile's",
		await weaponProfiles(),
		{
			main: mainBefore,
			extraProfiles: [
				{
					name: 'Thrown',
					skills: ['E2E skill'],
					damageCharacteristic: 'agility',
					baseDamage: 2,
					critical: 4,
					range: 'short',
					qualities: [{ name: 'E2E quality', rating: 1 }],
					attackSkill: '',
				},
			],
			blocks: 1,
		},
	);
	await e2e.step("#366 B3 GM rates the profile's quality 3 and deletes its skill", () =>
		gm.evaluate(async () => {
			const sheet = window.e2e.htmlOf(game.items.getName('E2E weapon').sheet)!;
			const rating = sheet.querySelector<HTMLInputElement>('.weapon-profile .profile-qualities input');
			if (!rating) return;
			rating.value = '3';
			rating.dispatchEvent(new Event('blur'));
			await window.e2e.settle();
			await window.sheetsE2E.click('weapon', '.weapon-profile .profile-skills a');
		}),
	);
	const ratedAndUnskilled = await weaponProfiles();
	e2e.expect(
		"#366 B3 the profile's quality takes its new rating and its skill is deleted, leaving the main profile's",
		{
			main: ratedAndUnskilled.main,
			skills: ratedAndUnskilled.extraProfiles[0]?.skills,
			qualities: ratedAndUnskilled.extraProfiles[0]?.qualities,
		},
		{ main: mainBefore, skills: [], qualities: [{ name: 'E2E quality', rating: 3 }] },
	);
	await e2e.step('#366 B4 GM deletes the profile', () =>
		gm.evaluate(async () => {
			if (window.e2e.htmlOf(game.items.getName('E2E weapon').sheet)!.querySelector('.weapon-profile .delete-profile')) {
				await window.sheetsE2E.click('weapon', '.weapon-profile .delete-profile');
			}
		}),
	);
	e2e.expect('#366 B4 the deleted profile leaves the weapon and its sheet', await weaponProfiles(), {
		main: mainBefore,
		extraProfiles: [],
		blocks: 0,
	});
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	await e2e.step("#366 B5 GM gives the Hero's sword a Thrown profile and sends it to chat", () =>
		gm.evaluate(
			async (profile) => {
				const sheets = window.sheetsE2E;
				await sheets.update('Hero/Sword', { 'system.extraProfiles': [profile] });
				sheets.readMessages();
				await sheets.open('Hero');
				await sheets.sendToChat('Hero', 'Sword');
			},
			thrownProfile(['Ranged']),
		),
	);
	e2e.expect(
		"#366 B5 a weapon's card lists its main profile, then each extra profile named as its row, with its skill, range, damage, Critical rating and qualities",
		await gm.evaluate(() =>
			window.sheetsE2E.readMessages().map(({ content }) => {
				const { text } = window.e2e;
				const message = document.createElement('div');
				message.innerHTML = content;
				const card = message.querySelector('.item-card')!;
				return {
					main: [...card.querySelectorAll(':scope > .details-grid span')].map(text),
					mainQualities: [...card.querySelectorAll(':scope > .qualities .quality')].map(text),
					extraProfiles: [...card.querySelectorAll('.weapon-profile')].map((profile) => ({
						name: text(profile.querySelector('.profile-name')),
						details: [...profile.querySelectorAll('.details-grid span')].map(text),
						qualities: [...profile.querySelectorAll('.quality')].map(text),
					})),
				};
			}),
		),
		[
			{
				main: ['Melee', 'Engaged', '3 + Br', '0'],
				mainQualities: ['E2E Pierce 1'],
				extraProfiles: [
					{
						name: 'E2E Sword (Thrown)',
						details: ['Ranged', 'Short', '2 + Br', '4'],
						qualities: ['Accurate 1', 'Limited Ammo 1'],
					},
				],
			},
		],
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#428: a tab's own sections are as tall as it (nav.scss), and a tab is as tall as all its blocks together, or as the
	// window when that is taller: each Weapon Profile's block took the whole tab.
	const heights = [500, 950];
	let profiled: WeaponDataLayout[] = [];
	await e2e.step('#428 A1 GM gives the weapon a Thrown profile, then resizes its sheet to two heights', async () => {
		profiled = await gm.evaluate(
			async ({ profile, heights }) => {
				const sheets = window.sheetsE2E;
				await sheets.update('weapon', { 'system.extraProfiles': [profile] });
				await sheets.open('weapon');
				await sheets.clickTab('weapon', 'data');
				return sheets.weaponDataLayout('weapon', heights);
			},
			{ profile: thrownProfile(['Ranged']), heights },
		);
	});
	e2e.expect(
		"#428 A1 the Thrown profile's block follows right under the main profile's rows, and the Add Weapon Profile button under its own, at either window height",
		profiled.map(({ gaps }) => gaps),
		[
			[0, 0],
			[0, 0],
		],
	);
	e2e.expect(
		"#428 A2 the Data tab's blocks keep their height when the window grows",
		{ windowGrew: profiled[1].window > profiled[0].window, blocksGrew: profiled[1].content - profiled[0].content },
		{ windowGrew: true, blocksGrew: 0 },
	);
	let single: Record<string, WeaponDataLayout[]> = {};
	await e2e.step(
		'#428 A3 GM deletes the Thrown profile, then resizes the sheets of the weapon and the vehicle weapon to two heights',
		async () => {
			single = await gm.evaluate(async (heights) => {
				const sheets = window.sheetsE2E;
				await sheets.update('weapon', { 'system.extraProfiles': [] });
				await sheets.open('vehicleWeapon');
				await sheets.clickTab('vehicleWeapon', 'data');
				return {
					weapon: await sheets.weaponDataLayout('weapon', heights),
					vehicleWeapon: await sheets.weaponDataLayout('vehicleWeapon', heights),
				};
			}, heights);
		},
	);
	e2e.expect(
		"#428 A3 a weapon with no extra profile, and a vehicle weapon, keep their main profile's rows in place whatever the window's height",
		{ weapon: single.weapon[1].mainRows, vehicleWeapon: single.vehicleWeapon[1].mainRows },
		{ weapon: single.weapon[0].mainRows, vehicleWeapon: single.vehicleWeapon[0].mainRows },
	);
	e2e.expect(
		'#428 A4 a weapon with no extra profile shows its Add Weapon Profile button right under its main profile, at either window height',
		single.weapon.map(({ gaps }) => gaps),
		[[0], [0]],
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#439: the sheet takes a drop on its whole element; a skill or a quality dropped outside an extra profile's block
	// goes to the main profile.
	await e2e.step(
		"#439 GM drops a quality on the Data tab under the weapon's blocks and a skill on its header, the weapon having a Thrown profile",
		() =>
			gm.evaluate(
				async (profile) => {
					const sheets = window.sheetsE2E;
					await sheets.update('weapon', { 'system.extraProfiles': [profile], 'system.skills': [], 'system.qualities': [] });
					await sheets.open('weapon');
					await sheets.clickTab('weapon', 'data');
					await sheets.drop('weapon', { type: 'Item', name: 'quality' }, '.tab[data-tab="data"]');
					await sheets.drop('weapon', { type: 'Item', name: 'skill' }, '.window-header');
				},
				thrownProfile(['Ranged']),
			),
	);
	e2e.expect(
		"#439 A1 a quality dropped under the Data tab's blocks and a skill dropped on the window's header go to the main profile, leaving the extra profile's",
		await weaponProfiles(),
		{
			main: { skills: ['E2E skill'], qualities: [{ name: 'E2E quality', rating: 1 }] },
			extraProfiles: [
				{
					...thrownProfile(['Ranged']),
					qualities: [
						{ name: 'Accurate', rating: 1 },
						{ name: 'Limited Ammo', rating: 1 },
					],
				},
			],
			blocks: 1,
		},
	);
	await gm.evaluate(async () => {
		await window.sheetsE2E.update('weapon', { 'system.extraProfiles': [], 'system.skills': [], 'system.qualities': [] });
		await window.sheetsE2E.closeAll();
	});

	// §#423: v14 lets a user detach any window into its own browser window, moving its element into that window's
	// document. A Genesys sheet and the Dice Prompt keep working there.
	if (e2e.version >= 14) {
		const detachedErrors: string[] = [];
		page()
			.context()
			.on('page', (detached) => {
				detached.on('pageerror', (error) => detachedErrors.push(error.message));
				detached.on('console', (message) => {
					if (message.type() === 'error') detachedErrors.push(message.text());
				});
			});

		let sheet: unknown;
		await e2e.step('#423 GM detaches the sheet of Hero, uses it, then attaches it back', async () => {
			sheet = await gm.evaluate(async () => {
				const { settle, waitFor } = window.e2e;
				const actor = window.e2e.actor('Hero');
				const app = actor.sheet;
				await window.e2e.render(app);
				const look = () => {
					const style = (selector: string) => {
						const element = app.element.querySelector(selector)!;
						const computed = element.ownerDocument.defaultView!.getComputedStyle(element);
						return [computed.fontFamily, computed.color, computed.backgroundColor, computed.fontSize].join(' ');
					};
					return ['.window-content', 'nav.sheet-tabs [data-tab]', 'input[name="system.silhouette"]'].map(style);
				};
				const attachedLook = look();
				const silhouette = actor.system.silhouette;

				await app.detachWindow();
				await waitFor('the detached sheet', () => app.element.ownerDocument !== document && app.rendered);
				await settle();
				const root: HTMLElement = app.element;
				const detached = root.ownerDocument !== document;
				const sameLook = JSON.stringify(look()) === JSON.stringify(attachedLook);

				root.querySelector<HTMLElement>('nav.sheet-tabs [data-tab="talents"]')!.click();
				await settle();
				const tabShown = !!root.querySelector('.tab[data-tab="talents"].active');

				const field = () => root.querySelector<HTMLInputElement>('input[name="system.silhouette"]')!;
				await actor.update({ 'system.silhouette': silhouette + 1 });
				await settle();
				const updateShown = field().value === String(silhouette + 1);

				field().value = String(silhouette + 2);
				field().dispatchEvent(new Event('change', { bubbles: true }));
				await settle();
				const fieldWritten = actor.system.silhouette === silhouette + 2;

				await actor.update({ 'system.silhouette': silhouette });
				app.attachWindow();
				await settle();
				const attached = app.element.ownerDocument === document;
				await app.close();
				return { detached, sameLook, tabShown, updateShown, fieldWritten, attached };
			});
		});
		e2e.expect(
			"#423 A1 a detached sheet keeps its look, shows its tabs and its actor's updates, writes its fields, and attaches back",
			sheet,
			{
				detached: true,
				sameLook: true,
				tabShown: true,
				updateShown: true,
				fieldWritten: true,
				attached: true,
			},
		);

		let prompt: unknown;
		await e2e.step('#423 GM detaches the Dice Roller, adds a die and rolls', async () => {
			prompt = await gm.evaluate(async () => {
				const { settle, waitFor, poolPreview } = window.e2e;
				canvas?.tokens?.releaseAll();
				await ui.chat.processMessage('/gendr');
				const app = await waitFor('the Dice Roller', () =>
					[...foundry.applications.instances.values()].find((candidate: { element?: HTMLElement }) =>
						candidate.element?.querySelector('.dice-prompt'),
					),
				);
				await app.detachWindow();
				await waitFor('the detached Dice Roller', () => app.element.ownerDocument !== document && app.rendered);
				await settle();
				const root: HTMLElement = app.element;
				const detached = root.ownerDocument !== document;
				const before = poolPreview(root);
				root.querySelector<HTMLElement>('.dice-box [data-pool-entity]')!.click();
				await settle();
				const after = poolPreview(root);
				const messages = game.messages.size;
				root.querySelector<HTMLElement>('.roll-button')!.click();
				await settle();
				return { detached, poolChanged: before !== after, rolled: game.messages.size === messages + 1, closed: !app.rendered };
			});
		});
		e2e.expect('#423 A2 a detached Dice Roller changes its pool and rolls', prompt, {
			detached: true,
			poolChanged: true,
			rolled: true,
			closed: true,
		});
		e2e.expect('#423 A3 the detached windows log no error', detachedErrors, []);
	}

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
	await e2e.step('cleanup', () => gm.evaluate(() => window.sheetsE2E.cleanUp()));
}
