/** @file The accessibility check of #534, axe-core on each tab of each sheet type and on each prompt, in both Styles: its findings are logged, and those a slice of #534 fixed asserted (#574: button names; #576: an open actions menu; #581: labels, the prompts' target sizes; #583: text contrast, in both Styles), with a keyboard step per sheet type and per prompt (#581); the tabs, the focus ring and reduced motion of each sheet type (#575); the headings each tab of each sheet type starts its sections with (#584), and the Talents tab's bars (#623); each kind of row that rolls, from the keyboard: its name rolls, its icon opens its sheet (#578); and each kind of row's ⋮ menu, from the keyboard, its entries in their order (#577); and each counter's − and +, whole (#622), and shown where the mouse goes, a right-click on the + taking nothing off (#645). */
import type { ScenarioContext } from '../scenario.ts';

/**
 * A Style the check runs in, and the rules it runs there: a Style only changes colours, so Realms of Terrinoth runs only
 * the rules that read them, and the WCAG 2.2 AA ones run in Genesys.
 */
type Style = { key: string; name: string; checks: string; rules?: string[] };
const STYLES: Style[] = [
	{ key: 'genesys', name: 'Genesys', checks: 'WCAG 2.2 AA' },
	{ key: 'terrinoth', name: 'Realms of Terrinoth', checks: 'colours', rules: ['color-contrast', 'link-in-text-block'] },
];

/** A point of the page, in the viewport's pixels, as the mouse of Playwright takes it. */
type Point = { x: number; y: number };
/** Where {@link AccessibilityHelpers.counterStepPoints} finds a − or + of a counter, and the points around it. */
type CounterStepPoints = { step: Point; value: Point; away: Point; beside?: Point };

type AccessibilityHelpers = {
	/** Deletes what the previous run left, then creates an actor of each type, a world item of each type, and a crew. */
	setUp(): Promise<void>;
	/** The names of the documents whose sheet the check opens, actors first. */
	sheets(): string[];
	/** The item types, each the name of its world item. */
	itemTypes(): string[];
	/** Renders a document's sheet and returns its window's selector and the tabs of its nav, the shown one first. */
	openSheet(name: string): Promise<{ selector: string; tabs: string[] }>;
	/** Shows a tab of a rendered sheet, by its nav, and returns its panel's selector. */
	showTab(selector: string, tab: string): Promise<string>;
	/** The names of the prompts the check opens. */
	prompts(): string[];
	/** Opens a prompt from a sheet, and returns its window's selector once it has rendered its content. */
	openPrompt(prompt: string): Promise<string>;
	/** Closes every window but the Story Point tracker. */
	closeAll(): Promise<void>;
	/** Opens the menu of the Hero's Sword row in the Inventory tab from its ⋮ (#576), and returns the menu's selector. */
	openRowMenu(): Promise<string>;
	/** Shows the pages in a Style, by its key, as the world setting does, without writing the setting. */
	setStyle(style: string): Promise<void>;
	/**
	 * Readies a keyboard step on an action of a sheet (#574), by the sheet's name: renders the sheet on the action's tab,
	 * and focuses the control before the action's button in Tab order, so that one Tab reaches it.
	 */
	readyKeyboardAction(sheet: string): Promise<void>;
	/** Whether the action's button has focus, and whether the action has run since it was readied. */
	keyboardAction(): { focused: boolean; ran: boolean };
	/** Whether the sheet of the last action readied is still open. */
	keyboardSheetOpen(): boolean;
	/** Gives back the data the last action readied wrote, so that the parts after it find the world as it was. */
	undoKeyboardAction(): Promise<void>;
	/** Readies a mouse click on the Story Point tracker's player pool, with 2 points in it and the game unpaused. */
	readySpend(): Promise<void>;
	/** The points left in the player pool, whether the spend button has focus, and whether the game is paused. */
	spendState(): { player: number; focused: boolean; paused: boolean };
	/** Gives back the Story Points and the pause the tracker's step found. */
	restoreSpend(): Promise<void>;
	/**
	 * Readies the tab steps on a sheet (#575), by its document's name: renders it on its first tab, marks its third tab for
	 * a click with the mouse, and focuses the control before the first tab in Tab order, so that one Tab reaches it.
	 */
	readyTabs(sheet: string): Promise<void>;
	/** Readies a field step on the sheet of the tab steps (#575): focuses the control before its name field in Tab order. */
	readyNameField(): void;
	/** What has the focus: a tab, by its id, or a field, by its name, and the focus ring it shows; and the tab shown. */
	focusState(): Promise<{ focused: string | null; ring: string; shown: string | null }>;
	/** The tab the tab steps marked for a click: whether it is shown and has the focus, and the focus ring it shows. */
	clickedTab(): Promise<{ shown: boolean; focused: boolean; ring: string }>;
	/**
	 * Opens a document's sheet, or a prompt by its name, and returns the elements of its Vue app that have a transition, as
	 * `div.tile > a 0.25s`, with the classes Vue gives the rows of a TransitionGroup while they move or not.
	 */
	transitions(name: string): Promise<string[]>;
	/**
	 * Opens a document's sheet, shows each of its tabs, and returns each tab's outline: its section headings, as `h3
	 * Attacks`, and the empty state of each empty list, in their order. The headings of a description are left out.
	 */
	outlines(name: string): Promise<Record<string, string[]>>;
	/**
	 * Opens a document's sheet, shows each of its tabs, and returns each tab's rows of column labels, each as its labels
	 * but its heading, as `Name | Skill | Damage`.
	 */
	columnRows(name: string): Promise<Record<string, string[]>>;
	/**
	 * Shows the Skills tab of a vehicle's sheet grouped by crew member, then by skill, and returns each grouping's outline,
	 * with its rows of column labels, and whether a member's name takes its heading's colour.
	 */
	vehicleSkills(name: string): Promise<{ byMember: string[]; nameInHeadingColour: boolean; bySkill: string[]; bySkillColumns: string[] }>;
	/**
	 * Creates the actors whose rows roll (#578): a character in Character Creation with XP to spend, a rival, a Minion
	 * Group and a vehicle whose crew is the character, each with a skill, a weapon or a Critical Injury to roll.
	 */
	setUpRollRows(): Promise<void>;
	/** Deletes the actors {@link setUpRollRows} created. */
	deleteRollRows(): Promise<void>;
	/**
	 * Readies a keyboard step on a row that rolls (#578), by its key in `ROLL_ROWS`: renders its sheet on its tab, focuses
	 * the row's name, its icon, or the ↑ beside a characteristic, and gives what the control shows: whether it has focus,
	 * whether a name holds a die (none does since #638), the tooltip of a name and the name of an icon.
	 */
	readyRollRow(row: string, control: RollRowControl): Promise<{ focused: boolean; die?: boolean; tooltip?: string; label?: string }>;
	/**
	 * What the control readied last opened once the page settles, then closes it: the Dice Prompt's check, and the sheets
	 * of the documents opened, by name.
	 */
	rollRowOutcome(): Promise<{ dicePrompt: RolledCheck | null; opened: string[] }>;
	/**
	 * Creates the actors whose rows the ⋮ steps of #577 open, with the optional rule of super-characteristics on, for a
	 * characteristic's menu.
	 */
	setUpRowMenus(): Promise<void>;
	/** Deletes the actors {@link setUpRowMenus} created, and gives back the rule as it was. */
	deleteRowMenus(): Promise<void>;
	/**
	 * Creates an actor of each type whose counters all show their − and + (#622): its wounds, strain or hull trauma at 1,
	 * and, for the character and the vehicle, an item of quantity 2 with Minor damage, and for the character a Container
	 * holding another.
	 */
	setUpCounters(): Promise<void>;
	/** Deletes the actors {@link setUpCounters} created. */
	deleteCounters(): Promise<void>;
	/**
	 * Renders an actor's sheet on its Inventory tab with its Containers open; shows the − and + of each counter there by
	 * focusing it, and gives each, by its row's name, its counter's name and its sign, as `whole`, or as the points of it
	 * where something else shows: `hidden at left, center`.
	 */
	counterSteps(actor: string): Promise<Record<string, string>>;
	/**
	 * Renders an actor's sheet as {@link counterSteps} does, with nothing focused, for the pointer steps of #645, and gives
	 * the name of each − and + of its counters, as `counterSteps` names them.
	 */
	readyCounterPointer(actor: string): Promise<string[]>;
	/**
	 * Where a − or + of the sheet readied last shows, by its name, measured while its counter has the focus (where it
	 * shows no room, as before #645, it shows only then): its centre, its value's centre, and a point away from the
	 * counter, the centre of the sheet's title. With the name of a field, also a point of that field beside the − or +.
	 */
	counterStepPoints(step: string, field?: string): CounterStepPoints;
	/**
	 * Whether a − or + of the sheet readied last shows at a point, to a screen reader too, and takes the pointer there,
	 * `shown`; else `hidden` (from a screen reader too), `under <element>` for what takes the pointer there, or where the
	 * eye and a screen reader disagree, `hidden, but read` or `shown, but not read`.
	 */
	counterStepState(step: string, point: Point): string;
	/** Focuses the value of the counter of a − or + of the sheet readied last, or takes the focus out of it. */
	focusCounter(step: string, focus: boolean): void;
	/** The current wounds, the wound threshold of an actor, and the name of the field that has the focus. */
	woundsOf(actor: string): { wounds: number; threshold: number; focused: string | null };
	/** An actor's item's quantity, and whether its row on the sheet readied last shows its menu open. */
	inventoryRow(actor: string, item: string): { quantity: number; menu: boolean };
	/**
	 * Readies a keyboard step on a row's ⋮ (#577), by its key in `ROW_MENUS`: renders its sheet on its tab, opens what
	 * holds it, and focuses the ⋮. Whether it took the focus, and its name: null for a row without one.
	 */
	readyRowMenu(row: string): Promise<{ focused: boolean; name: string | null }>;
	/**
	 * The menu of the ⋮ readied last: whether it is open, its entries' labels, `---` for a separator, and what has the
	 * focus: the ⋮, an entry by its label, or null for anything else; no menu when the row readied has no ⋮.
	 */
	rowMenuState(): { open: boolean; entries: string[]; focused: string | null };
	/** Hovers the name of a row that rolls, by its key in `ROLL_ROWS`, and gives the tooltip Foundry shows. */
	rollRowTooltip(row: string): Promise<string>;
	/** The Roller's Brawn, and the XP they have left. */
	rollerBrawn(): { brawn: number; xp: number };
	/**
	 * Readies a keyboard step on a prompt (§#581): focuses the button of a sheet that opens it, for Enter to press, and
	 * gives true; or, for a prompt a drop opens, readies what the drop needs (a character without a Career for the Career
	 * skills) and gives false.
	 */
	readyPromptOpener(prompt: string): Promise<boolean>;
	/** Opens a prompt a drop opens. */
	dropForPrompt(prompt: string): Promise<void>;
	/** Waits until a prompt shows its content. */
	promptShown(prompt: string): Promise<void>;
	/** Waits until no window of a prompt is open, for 3 s at most. */
	promptClosed(prompt: string): Promise<void>;
	/**
	 * Where the focus is, and whether the prompt is open: in the prompt, the control's kind (`select skill`, `input radio`,
	 * `button select-skill`); `opener` on the button that opened it; null elsewhere.
	 */
	promptFocus(prompt: string): { open: boolean; focused: string | null };
	/** What answering a prompt changes, read before and after a step. */
	promptOutcome(prompt: string): unknown;
	/** The crew member prompt's rows: which one's radio is checked, which shows as selected, and their check marks. */
	crewChoice(): { checked: number[]; selected: number[]; marks: number[] };
	/** The name of the control with the focus. */
	focusedName(): string | null;
	/** The Dice Prompt's pool: its Boost dice, and its Difficulty's label. */
	dicePromptPool(): { boost: number; difficulty: string };
	/** How many actors bear the Minion's name: the Minion, and the clones a clone prompt made of it under that name. */
	minionCopies(): number;
	/**
	 * Gives back the Ship's roles and the Hero's journal as they were before the prompt steps answered, and deletes the
	 * Minion's clones.
	 */
	undoPromptAnswers(): Promise<void>;
};

/** The control of a row a keyboard step of #578 focuses. */
type RollRowControl = 'name' | 'icon' | 'raise';

/** A check a Dice Prompt opened for: the actor rolling it, its skill or characteristic, and its kind of roll. */
type RolledCheck = { actor: string | null; check: string | null; type: string };

/** The selector a step marks the button it clicks with the mouse with. */
const POINTER_TARGET = '[data-e2e-pointer]';

/**
 * The action each sheet type's keyboard step runs (#574), by the name of the document whose sheet it opens: the step's
 * code, and what its name says the action does.
 */
const KEYBOARD_ACTIONS: { sheet: string; code: string; target: string; result: string }[] = [
	{ sheet: 'Hero', code: 'K1', target: 'the chevron of a talent', result: "opens the talent's description" },
	{ sheet: 'Minion', code: 'K2', target: "a talent's ⋮", result: 'opens its menu' },
	{ sheet: 'Rival', code: 'K3', target: "a talent's ⋮", result: 'opens its menu' },
	{ sheet: 'Nemesis', code: 'K4', target: "a talent's ⋮", result: 'opens its menu' },
	{ sheet: 'Ship', code: 'K5', target: "the Crew tab's Add", result: 'adds a Role' },
	{ sheet: 'weapon', code: 'K6', target: "the Effects tab's Add", result: 'adds an effect' },
];

/**
 * The sheets of the tab steps (#575), by the name of the document whose sheet each opens: the step's code, and the tabs
 * the steps go through, the first three of the sheet's.
 */
const TAB_STEPS: { sheet: string; code: string; tabs: string[] }[] = [
	{ sheet: 'Hero', code: 'T1', tabs: ['skills', 'combat', 'talents'] },
	{ sheet: 'Rival', code: 'T2', tabs: ['stats', 'miscellaneous', 'effects'] },
	{ sheet: 'Ship', code: 'T3', tabs: ['skills', 'combat', 'inventory'] },
	{ sheet: 'weapon', code: 'T4', tabs: ['description', 'data', 'effects'] },
];

/**
 * The rows whose name rolls (#578), by their key in the page's targets: the step's number, where the row is, the tooltip
 * its name shows, the check its name opens, and the document whose sheet its icon opens, for a row that shows one, with
 * the icon's name when it opens no item's sheet. An inventory row is the exception, Equipped or not: its name opens its
 * sheet, as a weapon attacks from the Combat tab alone (#641).
 */
const ROLL_ROWS: {
	key: string;
	code: number;
	row: string;
	tooltip: string;
	check: RolledCheck | null;
	opens?: string;
	iconLabel?: string;
	/** Whether the row is a heading, whose icon alone the steps press. */
	heading?: boolean;
}[] = [
	{
		key: 'skill',
		code: 1,
		row: "a skill on a character's Skills tab",
		tooltip: 'Roll E2E Brawl',
		check: { actor: 'E2E Roller', check: 'E2E Brawl', type: 'skill' },
		opens: 'E2E Brawl',
		iconLabel: "Open the skill's sheet",
	},
	{
		key: 'characteristic',
		code: 2,
		row: "a character's Brawn, which XP could raise",
		tooltip: 'Roll Brawn',
		check: { actor: 'E2E Roller', check: 'brawn', type: 'skill' },
	},
	{
		key: 'profile',
		code: 3,
		row: "a Weapon Profile on a character's Combat tab",
		tooltip: 'Attack with E2E Blade',
		check: { actor: 'E2E Roller', check: 'E2E Brawl', type: 'attack' },
		opens: 'E2E Blade',
	},
	{
		key: 'injury',
		code: 4,
		row: "a character's Critical Injury",
		tooltip: 'Roll Resilience to heal E2E Gash',
		check: { actor: 'E2E Roller', check: 'Resilience', type: 'skill' },
		opens: 'E2E Gash',
	},
	{ key: 'inventory', code: 5, row: "an Equipped weapon on a character's Inventory tab", tooltip: '', check: null, opens: 'E2E Blade' },
	{ key: 'carried', code: 6, row: 'a Carried weapon on the Inventory tab', tooltip: '', check: null, opens: 'E2E Spare' },
	{
		key: 'rivalSkill',
		code: 7,
		row: "a rival's skill",
		tooltip: 'Roll E2E Brawl',
		check: { actor: 'E2E Roller Rival', check: 'E2E Brawl', type: 'skill' },
		opens: 'E2E Brawl',
		iconLabel: "Open the skill's sheet",
	},
	{
		key: 'minionSkill',
		code: 8,
		row: "a Minion Group's skill",
		tooltip: 'Roll E2E Brawl',
		check: { actor: 'E2E Roller Minion', check: 'E2E Brawl', type: 'skill' },
		opens: 'E2E Brawl',
		iconLabel: "Open the skill's sheet",
	},
	{
		key: 'rivalWeapon',
		code: 9,
		row: "a rival's weapon",
		tooltip: 'Attack with E2E Blade',
		check: { actor: 'E2E Roller Rival', check: 'E2E Brawl', type: 'attack' },
	},
	{
		key: 'memberSkill',
		code: 10,
		row: "a crew member's skill on a vehicle's Skills tab, by crew member",
		tooltip: 'Roll E2E Gunnery',
		check: { actor: 'E2E Roller', check: 'E2E Gunnery', type: 'skill' },
		opens: 'E2E Gunnery',
		iconLabel: "Open the skill's sheet",
	},
	{
		key: 'crewSkill',
		code: 11,
		row: "a crew member on a vehicle's Skills tab, by skill",
		tooltip: 'Roll E2E Gunnery',
		check: { actor: 'E2E Roller', check: 'E2E Gunnery', type: 'skill' },
		opens: 'E2E Roller',
		iconLabel: "Open the actor's sheet",
	},
	{
		key: 'vehicleWeapon',
		code: 12,
		row: "a weapon on a vehicle's Combat tab",
		tooltip: 'Attack with E2E Harpoon',
		check: { actor: 'E2E Roller', check: 'E2E Gunnery', type: 'attack' },
		opens: 'E2E Harpoon',
	},
	{
		key: 'hit',
		code: 13,
		row: "a vehicle's Critical Hit",
		tooltip: 'Roll Mechanics to repair E2E Breach',
		check: { actor: 'E2E Roller', check: 'Mechanics', type: 'skill' },
		opens: 'E2E Breach',
	},
	// The headings of a vehicle's Skills tab: their names open a sheet, or name a skill.
	{
		key: 'memberHeading',
		code: 14,
		row: "a crew member's heading on a vehicle's Skills tab, by crew member",
		heading: true,
		tooltip: '',
		check: null,
		opens: 'E2E Roller',
		iconLabel: "Open the actor's sheet",
	},
	{
		key: 'skillHeading',
		code: 15,
		row: "a skill's heading on a vehicle's Skills tab, by skill",
		heading: true,
		tooltip: '',
		check: null,
		opens: 'E2E Gunnery',
		iconLabel: "Open the skill's sheet",
	},
];

// The tail every row's menu ends with, where its document has a chat card.
const CHAT_TAIL = ['Send to chat', 'Edit', 'Delete'];

/**
 * The rows whose ⋮ the steps of #577 open from the keyboard, by their key in the page's targets: the step's number,
 * where the row is, and the entries its menu shows, in order: the row's own, a separator, Send to chat, Edit, Delete.
 */
const ROW_MENUS: { key: string; code: number; row: string; entries: string[] }[] = [
	{
		key: 'inventory',
		code: 1,
		row: "a carried gear on a character's Inventory tab",
		entries: ['Drop', 'Put in E2E Row Pack', '---', ...CHAT_TAIL],
	},
	{ key: 'contents', code: 2, row: "a Container's contents", entries: ['Take out of E2E Row Pack', '---', ...CHAT_TAIL] },
	{ key: 'talent', code: 3, row: "a character's talent, which offers no Delete", entries: ['Send to chat', 'Edit'] },
	{ key: 'ability', code: 4, row: "a character's ability added by hand", entries: CHAT_TAIL },
	{ key: 'injury', code: 5, row: "a character's Critical Injury", entries: ['Edit', 'Delete'] },
	{
		key: 'skill',
		code: 6,
		row: "a character's skill",
		entries: ['Mark As Career Skill', 'Rank Up (Free)', 'Rank Down (Free)', '---', 'Edit', 'Delete'],
	},
	{ key: 'archetype', code: 7, row: "a character's Archetype, past its Starting XP", entries: ['Edit'] },
	{ key: 'career', code: 8, row: "a character's Career", entries: ['Edit', 'Delete'] },
	{ key: 'effect', code: 9, row: "a character's own Active Effect", entries: ['Edit', 'Delete'] },
	{ key: 'journal', code: 10, row: 'an entry of the Experience Journal', entries: ['Undo the entry'] },
	{
		key: 'rivalSkill',
		code: 11,
		row: "a rival's skill",
		entries: ['Rank Up (Free)', 'Rank Down (Free)', '---', 'Edit', 'Delete'],
	},
	{ key: 'rivalTalent', code: 12, row: "a rival's talent", entries: CHAT_TAIL },
	{ key: 'rivalAbility', code: 13, row: "a rival's ability", entries: CHAT_TAIL },
	// §#638: its name attacks, so its menu has no Perform Check.
	{ key: 'rivalWeapon', code: 14, row: "a rival's weapon", entries: CHAT_TAIL },
	{ key: 'rivalGear', code: 15, row: "a rival's gear", entries: CHAT_TAIL },
	{ key: 'rivalInjury', code: 16, row: "a rival's Critical Injury", entries: ['Edit', 'Delete'] },
	{ key: 'characteristic', code: 17, row: "a rival's Brawn, under the optional rule", entries: ['Mark As Super-Characteristic'] },
	{ key: 'role', code: 18, row: "a vehicle's Role", entries: ['Delete'] },
	{
		key: 'passenger',
		code: 19,
		row: "a passenger's tile on a vehicle's Crew tab",
		entries: ['Assign to Gunners', '---', 'Edit', 'Remove from Crew'],
	},
	{
		key: 'member',
		code: 20,
		row: "a Role member's tile on a vehicle's Crew tab",
		entries: ['Move to passengers', '---', 'Edit', 'Remove from Crew'],
	},
	{ key: 'hit', code: 21, row: "a vehicle's Critical Hit", entries: ['Edit', 'Delete'] },
];

/**
 * §#622: the counters of each actor type's sheet, by the name `counterSteps` reads them under, each with a − and a +.
 */
const COUNTER_STEPS: { code: number; name: string; what: string; steps: string[] }[] = [
	{
		code: 1,
		name: 'Tally Hero',
		what: "a character's wounds and strain, an inventory row, a Container and its contents",
		steps: [
			'Current Wounds',
			'Current Strain',
			'E2E Tally Rope: Quantity',
			'E2E Tally Rope: Damage',
			'E2E Tally Pack: Damage',
			'E2E Tally Flint: Quantity',
			'E2E Tally Flint: Damage',
		].flatMap((counter) => [`${counter} −`, `${counter} +`]),
	},
	{ code: 2, name: 'Tally Minion', what: "an independent Minion Group's wounds", steps: ['Current Wounds −', 'Current Wounds +'] },
	{ code: 3, name: 'Tally Rival', what: "a rival's wounds", steps: ['Current Wounds −', 'Current Wounds +'] },
	{
		code: 4,
		name: 'Tally Nemesis',
		what: "a nemesis's wounds and strain",
		steps: ['Current Wounds −', 'Current Wounds +', 'Current Strain −', 'Current Strain +'],
	},
	{
		code: 5,
		name: 'Tally Ship',
		what: "a vehicle's hull trauma and system strain, and an inventory row",
		steps: ['Current Hull Trauma', 'Current System Strain', 'E2E Tally Crate: Quantity', 'E2E Tally Crate: Damage'].flatMap(
			(counter) => [`${counter} −`, `${counter} +`],
		),
	},
];

declare global {
	interface Window {
		accessibilityE2E: AccessibilityHelpers;
	}
}

/**
 * Installs `window.accessibilityE2E`. Playwright sends this function's source to the page, so it uses nothing from this
 * module.
 */
function installAccessibilityHelpers() {
	const { actor, apps, drop, htmlOf, render, settle, text, waitFor } = window.e2e;

	const ITEM_TYPES = Object.keys(CONFIG.Item.dataModels);
	const ACTORS = ['Hero', 'Minion', 'Rival', 'Nemesis', 'Ship'];

	const documentNamed = (name: string) => game.actors.getName(`E2E ${name}`) ?? game.items.getName(`E2E ${name}`);
	const selectorOf = (app: { id: string }) => `#${CSS.escape(app.id)}`;
	const find = (root: ParentNode, selector: string) => {
		const found = root.querySelector<HTMLElement>(selector);
		if (!found) throw new Error(`No ${selector}`);
		return found;
	};
	const sheet = async (name: string) => render(actor(name).sheet);
	// A tab's section headings, as `h3 Attacks`, and the empty state of each empty list, in their order. The headings of a
	// description are left out.
	const outline = (panel: Element) =>
		[...panel.querySelectorAll('h1, h2, h3, h4, h5, h6, .list-empty')]
			.filter((element) => !element.closest('.enriched, prose-mirror'))
			.map((element) => (element.matches('.list-empty') ? text(element) : `${element.tagName.toLowerCase()} ${text(element)}`));
	// A tab's rows of column labels, each as its labels but its heading.
	const columnRows = (panel: Element) =>
		[...panel.querySelectorAll('.columns')].map((row) =>
			[...row.children]
				.filter((child) => !child.matches('h3, h4, h5'))
				.map(text)
				.filter(Boolean)
				.join(' | '),
		);
	// Opens a document's sheet, reads each of its tabs, then closes it.
	const eachTab = async (name: string, read: (panel: Element) => string[]) => {
		const { selector, tabs } = await helpers.openSheet(name);
		const readings: Record<string, string[]> = {};
		for (const tab of tabs) readings[tab] = read(find(document, await helpers.showTab(selector, tab)));
		await helpers.closeAll();
		return readings;
	};
	// A tab's link in the sheet's own nav, not in a nav of one of its tabs.
	const tabLinks = (root: Element) => [
		...(root.querySelector('nav.sheet-tabs')?.querySelectorAll<HTMLElement>(':scope > [data-tab]') ?? []),
	];
	/**
	 * Each prompt the check opens: its window's class, whether its content has rendered, and the gesture on a sheet that
	 * opens it.
	 */
	const PROMPTS: Record<string, { cssClass: string; ready: (root: Element) => boolean; open: () => Promise<void> }> = {
		dice: {
			cssClass: 'app-dice-prompt',
			// The prompt shows a spinner while it counts its chance to succeed.
			ready: (root) => !!root.querySelector('.roll-button') && !root.querySelector('.chance-to-succeed .fa-spinner'),
			async open() {
				await window.e2e.showTab('Hero', 'skills');
				find(await sheet('Hero'), '.tab[data-tab="skills"] button.skill-name').click();
			},
		},
		awardXP: {
			cssClass: 'app-award-xp-prompt',
			ready: (root) => !!root.querySelector('.award-xp-prompt button'),
			async open() {
				await window.e2e.showTab('Hero', 'journal');
				find(await sheet('Hero'), '.xp-journal .columns button').click();
			},
		},
		careerSkill: {
			cssClass: 'app-career-skill-prompt',
			ready: (root) => !!root.querySelector('.career-skill-prompt .select-skill'),
			async open() {
				drop(await sheet('Hero'), { type: 'Item', uuid: documentNamed('career').uuid });
			},
		},
		cloneActor: {
			cssClass: 'app-clone-actor-prompt',
			ready: (root) => !!root.querySelector('.submit-button'),
			async open() {
				// Dropping an actor that makes unlinked tokens on a Role offers to clone it.
				drop(find(await sheet('Ship'), '.tab-crew .roles .role-section'), { type: 'Actor', uuid: actor('Minion').uuid });
			},
		},
		crewMember: {
			cssClass: 'app-select-crew-member-prompt',
			ready: (root) => !!root.querySelector('.member-skill-option'),
			async open() {
				// Two crew members can fire the Cannon.
				await window.e2e.showTab('Ship', 'combat');
				find(await sheet('Ship'), '.tab-combat .weapon .name button:not(.description-toggle)').click();
			},
		},
		patient: {
			cssClass: 'app-select-patient-prompt',
			ready: (root) => !!root.querySelector('.patient-option'),
			async open() {
				// The Hero heals with Medicine, targeting no one: the prompt asks for the patient (§#686).
				await window.e2e.showTab('Hero', 'skills');
				find(await sheet('Hero'), '.tab[data-tab="skills"] .skill .heal').click();
			},
		},
	};

	/**
	 * The keyboard step's action of each sheet: its tab, its button, and what the action changes, read before and after.
	 */
	// A talent's Send to chat went into its ⋮ menu in #577: the step opens the menu instead.
	const talentMenu = (root: Element) =>
		[...root.querySelectorAll('.adversary-items .talent')]
			.find((row) => row.textContent?.includes('E2E Grit'))
			?.querySelector<HTMLElement>('.menu-trigger') ?? null;
	type KeyboardAction = {
		tab: string;
		button: (root: Element) => HTMLElement | null;
		state: (button: HTMLElement) => unknown;
		/** Gives back the data the action wrote, from its state before it ran. */
		undo?: (before: unknown) => Promise<unknown>;
	};
	const KEYBOARD: Record<string, KeyboardAction> = {
		Hero: {
			tab: 'talents',
			button: (root) =>
				[...root.querySelectorAll('.tab-talents .talent')]
					.find((row) => row.textContent?.includes('E2E Grit'))
					?.querySelector<HTMLElement>('.description-toggle') ?? null,
			state: (button) => button.getAttribute('aria-expanded'),
		},
		Minion: { tab: 'stats', button: talentMenu, state: (button) => button.getAttribute('aria-expanded') },
		Rival: { tab: 'stats', button: talentMenu, state: (button) => button.getAttribute('aria-expanded') },
		Nemesis: { tab: 'stats', button: talentMenu, state: (button) => button.getAttribute('aria-expanded') },
		Ship: {
			tab: 'crew',
			button: (root) => root.querySelector<HTMLElement>('.tab-crew .heading-row button'),
			state: () => actor('Ship').system.roles.length,
			// The Role added comes last.
			undo: (before) => actor('Ship').update({ 'system.roles': actor('Ship')._source.system.roles.slice(0, before) }),
		},
		weapon: {
			tab: 'effects',
			button: (root) => root.querySelector<HTMLElement>('.effects-view > .columns .buttons button'),
			state: () => documentNamed('weapon').effects.size,
			// The effect added comes last; the headings part reads this weapon's Effects tab empty.
			undo: (before) => {
				const weapon = documentNamed('weapon');
				const added = weapon.effects.contents.slice(before).map((effect: { id: string }) => effect.id);
				return weapon.deleteEmbeddedDocuments('ActiveEffect', added);
			},
		},
	};
	// The action readied last, its sheet's window, and what it changes as it was before.
	let keyboard:
		| { button: HTMLElement; selector: string; before: unknown; state: KeyboardAction['state']; undo: KeyboardAction['undo'] }
		| undefined;
	// The Story Points and the pause the tracker's step found, to give back.
	let spendFound: { points: { player: number; gm: number }; paused: boolean } | undefined;
	// §#581: the button of a sheet that opens each prompt a button opens, on its tab.
	const PROMPT_OPENERS: Record<string, { sheet: string; tab: string; selector: string }> = {
		dice: { sheet: 'Hero', tab: 'skills', selector: '.tab[data-tab="skills"] button.skill-name' },
		awardXP: { sheet: 'Hero', tab: 'journal', selector: '.xp-journal .columns button' },
		crewMember: { sheet: 'Ship', tab: 'combat', selector: '.tab-combat .weapon .name button:not(.description-toggle)' },
	};
	// The opener the last prompt step focused, and the data the prompt steps' answers change, as they found it.
	let promptOpener: HTMLElement | undefined;
	let promptFound: { roles: unknown; entries: unknown } | undefined;
	const shownPrompt = (prompt: string) =>
		apps(PROMPTS[prompt].cssClass).find((app: { rendered: boolean }) => app.rendered) as { element: HTMLElement } | undefined;
	// The kind of a control, as a step names it: an input by its type, a select by its name, a button by its first class.
	const controlKind = (control: Element) => {
		const detail = {
			input: control.getAttribute('type'),
			select: control.getAttribute('name'),
			button: control.classList[0] ?? null,
		}[control.localName];
		return detail ? `${control.localName} ${detail}` : control.localName;
	};

	// The controls Tab reaches in a window's content, in their order on the page: none of the hidden tabs and folds, nor the
	// inactive tabs of a tab list, which the arrow keys reach.
	const tabbable = (root: Element) =>
		[...root.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')].filter(
			(element) =>
				element.tabIndex >= 0 &&
				!(element as HTMLButtonElement).disabled &&
				element.getClientRects().length > 0 &&
				getComputedStyle(element).visibility === 'visible',
		);
	// Focuses the control before a target in Tab order, or the window's content before its first control.
	const focusBefore = (selector: string, target: HTMLElement, what: string) => {
		const content = find(document, `${selector} .window-content`);
		const controls = tabbable(content);
		const index = controls.indexOf(target);
		if (index < 0) throw new Error(`Tab doesn't reach ${what}`);
		const before = controls[index - 1];
		if (before) {
			before.focus();
		} else {
			focusContent(content);
		}
	};
	// Focuses a window's content, before its first control, until the focus leaves it: its tabindex then goes as it was.
	function focusContent(content: HTMLElement) {
		const tabindex = content.getAttribute('tabindex');
		content.tabIndex = -1;
		content.focus();
		content.addEventListener(
			'blur',
			() => (tabindex === null ? content.removeAttribute('tabindex') : content.setAttribute('tabindex', tabindex)),
			{ once: true },
		);
	}
	// Marks the element a step clicks with the mouse.
	const markForPointer = (target: HTMLElement) => {
		for (const marked of document.querySelectorAll<HTMLElement>('[data-e2e-pointer]')) delete marked.dataset.e2ePointer;
		target.dataset.e2ePointer = '';
	};
	// A Palette colour's name, when a computed colour is one of those the focus ring draws with.
	const colourName = (colour: string) => {
		const probe = document.body.appendChild(document.createElement('span'));
		try {
			for (const name of ['blue', 'paper']) {
				probe.style.color = `var(--genesys-${name})`;
				if (getComputedStyle(probe).color === colour) return name;
			}
			return colour;
		} finally {
			probe.remove();
		}
	};
	// The focus ring an element shows (#575): its outline, and the gap its box shadow draws between it and the element.
	const ringOf = (element: Element) => {
		const style = getComputedStyle(element);
		if (style.outlineStyle === 'none' || parseFloat(style.outlineWidth) === 0) return 'no outline';
		const outline = `${style.outlineWidth} ${style.outlineStyle} ${colourName(style.outlineColor)} outline`;
		// A box shadow computes to its colour, then its offsets, blur and spread: `rgb(…) 0px 0px 0px 2px`.
		const shadow = /^(rgba?\([^)]*\)) 0px 0px 0px (\S+)$/.exec(style.boxShadow);
		return shadow ? `${outline}, ${shadow[2]} ${colourName(shadow[1])} gap` : `${outline}, box shadow ${style.boxShadow}`;
	};
	// The window of the tab steps.
	let tabSteps: string | undefined;
	// The classes Vue gives the rows of a TransitionGroup while they move, enter and leave: the inventory's, a Role's
	// members' and the Crew tab's.
	const TRANSITION_GROUP_CLASSES = ['inv', 'mems', 'crew-trans'].flatMap((name) =>
		['move', 'enter-active', 'leave-active'].map((state) => `${name}-${state}`),
	);

	// The rows that roll (#578), by their key in `ROLL_ROWS`: the actor whose sheet shows the row, its tab, the row, and
	// in it the name that rolls, the icon that opens a sheet, and the ↑ that raises a characteristic.
	const rowWith = (root: Element, selector: string, name: string) =>
		[...root.querySelectorAll(selector)].find((row) => row.textContent?.includes(name));
	type RollRowTarget = {
		sheet: string;
		tab: string;
		row: (root: Element) => Element | undefined;
		name: string;
		icon?: string;
		raise?: string;
		/** Whether the vehicle's skills show grouped by skill, rather than by crew member. */
		bySkill?: boolean;
	};
	const ROLL_ROW_TARGETS: Record<string, RollRowTarget> = {
		skill: {
			sheet: 'Roller',
			tab: 'skills',
			row: (root) => rowWith(root, '.tab-skills .skill.row', 'E2E Brawl'),
			name: '.skill-name',
			icon: '.skill-icon',
		},
		characteristic: {
			sheet: 'Roller',
			tab: 'skills',
			// Brawn comes first.
			row: (root) => root.querySelector('.tab-skills .characteristic-field') ?? undefined,
			name: '.characteristic-label .roll-link',
			raise: '.characteristic-label .raise',
		},
		profile: {
			sheet: 'Roller',
			tab: 'combat',
			row: (root) => rowWith(root, '.tab-combat .weapon:not(.columns)', 'E2E Blade'),
			name: '.name .roll-link',
			icon: '.item-icon',
		},
		injury: {
			sheet: 'Roller',
			tab: 'combat',
			row: (root) => rowWith(root, '.critical-injuries .injury:not(.columns)', 'E2E Gash'),
			name: '.name .roll-link',
			icon: '.item-icon',
		},
		inventory: {
			sheet: 'Roller',
			tab: 'inventory',
			row: (root) => rowWith(root, '.inventory-item', 'E2E Blade'),
			name: '.name button',
			// The button in the picture's wrapper, which the row's drag starts on.
			icon: '.item-icon button',
		},
		carried: {
			sheet: 'Roller',
			tab: 'inventory',
			row: (root) => rowWith(root, '.inventory-item', 'E2E Spare'),
			name: '.name button',
			icon: '.item-icon button',
		},
		blaster: {
			sheet: 'Roller',
			tab: 'combat',
			row: (root) => rowWith(root, '.tab-combat .weapon:not(.columns)', 'E2E Blaster'),
			name: '.name .roll-link',
		},
		memberHeading: {
			sheet: 'Roller Ship',
			tab: 'skills',
			row: (root) => rowWith(root, '.members-container > section', 'E2E Roller'),
			name: '.member-name',
			icon: '.member-image',
		},
		skillHeading: {
			sheet: 'Roller Ship',
			tab: 'skills',
			bySkill: true,
			row: (root) => rowWith(root, '.skills-container > section', 'E2E Gunnery'),
			name: '.skill-details-name',
			icon: '.skill-details-image',
		},
		rivalSkill: {
			sheet: 'Roller Rival',
			tab: 'stats',
			row: (root) => rowWith(root, '.adversary-items .skill', 'E2E Brawl'),
			name: '.skill-name',
			icon: '.skill-icon',
		},
		minionSkill: {
			sheet: 'Roller Minion',
			tab: 'stats',
			row: (root) => rowWith(root, '.adversary-items .skill', 'E2E Brawl'),
			name: '.skill-name',
			icon: '.skill-icon',
		},
		rivalWeapon: {
			sheet: 'Roller Rival',
			tab: 'stats',
			row: (root) => rowWith(root, '.adversary-items .weapon', 'E2E Blade'),
			name: '.weapon-attack',
		},
		memberSkill: {
			sheet: 'Roller Ship',
			tab: 'skills',
			row: (root) => rowWith(root, '.member-skill', 'E2E Gunnery'),
			name: '.skill-name',
			icon: '.skill-icon',
		},
		crewSkill: {
			sheet: 'Roller Ship',
			tab: 'skills',
			bySkill: true,
			row: (root) => rowWith(root, '.skill-content-details', 'E2E Roller'),
			name: '.skill-name',
			icon: '.skill-icon',
		},
		vehicleWeapon: {
			sheet: 'Roller Ship',
			tab: 'combat',
			row: (root) => rowWith(root, '.tab-combat .weapon:not(.columns)', 'E2E Harpoon'),
			name: '.name .roll-link',
			icon: '.item-icon',
		},
		hit: {
			sheet: 'Roller Ship',
			tab: 'combat',
			row: (root) => rowWith(root, '.critical-hits .critical-hit:not(.columns)', 'E2E Breach'),
			name: '.name .roll-link',
			icon: '.item-icon',
		},
	};
	const ROLL_ACTORS = ['Roller Ship', 'Roller Minion', 'Roller Rival', 'Roller'];

	// The rows whose ⋮ the steps of #577 open, by their key in `ROW_MENUS`: the actor whose sheet shows the row, its tab,
	// and the row, or the menu's own container; `open` first opens what holds the row, as a Container does its contents.
	type RowMenuTarget = {
		sheet: string;
		tab: string;
		row: (root: Element) => Element | null | undefined;
		open?: (root: Element) => Promise<void>;
	};
	const ROW_MENU_TARGETS: Record<string, RowMenuTarget> = {
		inventory: { sheet: 'Rower', tab: 'inventory', row: (root) => rowWith(root, '.inventory-item:not(.mini)', 'E2E Row Rope') },
		contents: {
			sheet: 'Rower',
			tab: 'inventory',
			row: (root) => rowWith(root, '.inventory-item.mini', 'E2E Row Flint'),
			async open(root) {
				const toggle = rowWith(root, '.inventory-item:not(.mini)', 'E2E Row Pack')?.querySelector<HTMLElement>(
					'.description-toggle',
				);
				if (toggle?.getAttribute('aria-expanded') === 'false') {
					toggle.click();
					await waitFor('the Pack opened', () => toggle.getAttribute('aria-expanded') === 'true');
				}
			},
		},
		talent: { sheet: 'Rower', tab: 'talents', row: (root) => rowWith(root, '.tab-talents .talent', 'E2E Row Grit') },
		ability: { sheet: 'Rower', tab: 'talents', row: (root) => rowWith(root, '.tab-talents .talent', 'E2E Row Nimble') },
		injury: { sheet: 'Rower', tab: 'combat', row: (root) => rowWith(root, '.critical-injuries .injury:not(.columns)', 'E2E Row Gash') },
		skill: { sheet: 'Rower', tab: 'skills', row: (root) => rowWith(root, '.tab-skills .skill.row', 'E2E Row Brawl') },
		archetype: { sheet: 'Rower', tab: 'skills', row: (root) => root.querySelector('.character-meta .archetype') },
		career: { sheet: 'Rower', tab: 'skills', row: (root) => root.querySelector('.character-meta .career') },
		effect: { sheet: 'Rower', tab: 'effects', row: (root) => rowWith(root, '.effects-view .effect', 'E2E Row Ward') },
		journal: { sheet: 'Rower', tab: 'journal', row: (root) => rowWith(root, '.xp-journal .entries .entry', 'E2E Row award') },
		rivalSkill: { sheet: 'Rower Rival', tab: 'stats', row: (root) => rowWith(root, '.adversary-items .skill', 'E2E Row Brawl') },
		rivalTalent: { sheet: 'Rower Rival', tab: 'stats', row: (root) => rowWith(root, '.adversary-items .talent', 'E2E Row Grit') },
		rivalAbility: { sheet: 'Rower Rival', tab: 'stats', row: (root) => rowWith(root, '.adversary-items .talent', 'E2E Row Nimble') },
		rivalWeapon: { sheet: 'Rower Rival', tab: 'stats', row: (root) => rowWith(root, '.adversary-items .weapon', 'E2E Row Blade') },
		rivalGear: { sheet: 'Rower Rival', tab: 'stats', row: (root) => rowWith(root, '.adversary-items .inventory-item', 'E2E Row Rope') },
		rivalInjury: {
			sheet: 'Rower Rival',
			tab: 'miscellaneous',
			row: (root) => rowWith(root, '.adversary-items .injury', 'E2E Row Gash'),
		},
		// Brawn comes first.
		characteristic: { sheet: 'Rower Rival', tab: 'stats', row: (root) => root.querySelector('.characteristic-field') },
		role: { sheet: 'Rower Ship', tab: 'crew', row: (root) => root.querySelector('.tab-crew .role-section .role-name') },
		passenger: {
			sheet: 'Rower Ship',
			tab: 'crew',
			row: (root) => rowWith(root, '.tab-crew .passengers .actor-tile-mini', 'E2E Rower Mate'),
		},
		member: { sheet: 'Rower Ship', tab: 'crew', row: (root) => root.querySelector('.tab-crew .role-member .actor-tile-normal') },
		hit: {
			sheet: 'Rower Ship',
			tab: 'combat',
			row: (root) => rowWith(root, '.critical-hits .critical-hit:not(.columns)', 'E2E Row Breach'),
		},
	};
	const ROW_MENU_ACTORS = ['Rower Ship', 'Rower Rival', 'Rower', 'Rower Mate', 'Rower Hand'];
	// The ⋮ readied last, and the world setting the characteristic's menu needs, as found.
	let rowMenuTrigger: HTMLElement | undefined;
	let superCharacteristicsFound: unknown;
	const menuContainerOf = (row: Element) => (row.matches('.menu-container') ? row : row.querySelector(':scope > .menu-container'));
	const COUNTER_ACTORS = ['Tally Hero', 'Tally Minion', 'Tally Rival', 'Tally Nemesis', 'Tally Ship'];
	// The points of an element where something else shows: its centre, and the middle of each edge, 1 px in, which a round
	// button covers too. A point that hits another element is one an ancestor's clip, or a neighbour above it, hides.
	const hiddenPoints = (element: HTMLElement) => {
		element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		const box = element.getBoundingClientRect();
		const x = (box.left + box.right) / 2;
		const y = (box.top + box.bottom) / 2;
		const points: Record<string, [number, number]> = {
			center: [x, y],
			left: [box.left + 1, y],
			right: [box.right - 1, y],
			top: [x, box.top + 1],
			bottom: [x, box.bottom - 1],
		};
		return Object.entries(points).flatMap(([point, [px, py]]) => {
			const hit = document.elementFromPoint(px, py);
			return element.contains(hit) ? [] : [{ point, hit }];
		});
	};
	// Renders an actor's sheet for the counter steps, on its Inventory tab with its Containers open, and gives its selector.
	const openCounters = async (name: string) => {
		const { selector, tabs } = await helpers.openSheet(name);
		const root = find(document, tabs.includes('inventory') ? await helpers.showTab(selector, 'inventory') : selector);
		for (const toggle of root.querySelectorAll<HTMLElement>(
			'.inventory-item > .details > .description-toggle[aria-expanded="false"]',
		)) {
			toggle.click();
		}
		await settle();
		return selector;
	};
	// Each − and + of the counters a sheet shows, with its counter's value, by its row's name, its counter's name and its
	// sign: `E2E Tally Rope: Quantity +`. The combat stats sit above the tabs: the Inventory tab's panel doesn't hold them.
	const counterStepsOf = (selector: string) => {
		const steps = new Map<string, { value: HTMLElement; step: HTMLElement }>();
		for (const counter of find(document, selector).querySelectorAll<HTMLElement>('.counter.interactive')) {
			if (!counter.checkVisibility()) continue;
			const value = find(counter, '[role="spinbutton"]');
			const row = counter.closest('.inventory-item')?.querySelector('.name');
			for (const step of counter.querySelectorAll<HTMLElement>(':scope > .step')) {
				const sign = step.classList.contains('decrease') ? '−' : '+';
				steps.set(`${row ? `${text(row)}: ` : ''}${value.getAttribute('aria-label')} ${sign}`, { value, step });
			}
		}
		return steps;
	};
	// The sheet the pointer steps of #645 readied last, and a − or + of it by its name, found again after each render.
	let counterSheet: string | undefined;
	const counterStep = (key: string) => {
		const found = counterSheet && counterStepsOf(counterSheet).get(key);
		if (!found) throw new Error(`No counter step ${key}`);
		return found;
	};
	// `whole`, or the points hidden and what shows at the first: `hidden at left, center under div.value`.
	const shownWhole = (element: HTMLElement) => {
		const hidden = hiddenPoints(element);
		if (!hidden.length) return 'whole';
		const { hit } = hidden[0];
		const above = hit ? [hit.tagName.toLowerCase(), ...hit.classList].join('.') : 'nothing';
		return `hidden at ${hidden.map(({ point }) => point).join(', ')} under ${above}`;
	};
	// The windows open before the control readied last was pressed.
	let windowsBefore = new Set<unknown>();

	const helpers: AccessibilityHelpers = {
		async setUp() {
			await helpers.closeAll();
			await window.e2e.deleteSetUp('Actor', 'Item');
			const career = ['Cool', 'Ranged', 'Stealth', 'Perception', 'Charm'];
			await Item.createDocuments(
				ITEM_TYPES.map((type) => ({
					name: `E2E ${type}`,
					type,
					// The Career's sheet reads its skills as the skills dropped on it store them.
					system: { career: { careerSkills: career.map((name) => ({ name, type: 'skill', system: { source: '' } })) } }[type],
				})),
			);
			// Rows in each list of the actors' tabs, for the check to read.
			const quality = { name: 'E2E Pierce', description: '<p>Pierces.</p>', isRated: true, rating: 1 };
			const owned = [
				{
					name: 'E2E Sword',
					type: 'weapon',
					system: { skills: ['Melee'], baseDamage: 3, qualities: [quality], state: 'equipped' },
				},
				{ name: 'E2E Mail', type: 'armor', system: { state: 'equipped' } },
				{ name: 'E2E Rope', type: 'gear' },
				{ name: 'E2E Grit', type: 'talent', system: { tier: 1, ranked: 'yes', rank: 2, description: '<p>Grit holds.</p>' } },
				{ name: 'E2E Tough', type: 'ability', system: { activation: { type: 'passive', detail: '' } } },
				{ name: 'E2E Bruised', type: 'injury', system: { severity: 'easy' } },
			];
			const gunnery = { name: 'Gunnery', type: 'skill', system: { characteristic: 'agility', rank: 1 } };
			await Actor.createDocuments([
				{ name: 'E2E Hero', type: 'character', items: owned },
				{ name: 'E2E Minion', type: 'minion', items: owned, prototypeToken: { actorLink: false } },
				{ name: 'E2E Rival', type: 'rival', items: owned },
				{ name: 'E2E Nemesis', type: 'nemesis', items: owned },
				{ name: 'E2E Gunner', type: 'character', items: [gunnery] },
				{ name: 'E2E Loader', type: 'character', items: [gunnery] },
				// For the headings only: talents and an ability in each group of the Talents tab, and actors without items,
				// whose lists show their empty state.
				{
					name: 'E2E Talented',
					type: 'character',
					items: [
						{ name: 'E2E Lunge', type: 'talent', system: { tier: 1, activation: { type: 'active', detail: '' } } },
						{ name: 'E2E Parry', type: 'talent', system: { tier: 1, activation: { type: 'active', detail: 'Out of turn' } } },
						{ name: 'E2E Grit', type: 'talent', system: { tier: 1, activation: { type: 'passive', detail: '' } } },
						{ name: 'E2E Sprint', type: 'ability', system: { activation: { type: 'active', detail: 'Maneuver' } } },
					],
				},
				{ name: 'E2E Blank Hero', type: 'character' },
				{ name: 'E2E Blank Rival', type: 'rival' },
				{ name: 'E2E Blank Ship', type: 'vehicle' },
			]);
			// For the headings only: a weapon with an extra Weapon Profile, which its sheet heads.
			await Item.create({ name: 'E2E Profiled Weapon', type: 'weapon', system: { extraProfiles: [{ name: 'Thrown' }] } });
			await Actor.create({
				name: 'E2E Ship',
				type: 'vehicle',
				items: [
					{ name: 'E2E Cannon', type: 'vehicleWeapon', system: { skills: ['Gunnery'], baseDamage: 6, state: 'equipped' } },
					{ name: 'E2E Hull Breach', type: 'injury', system: { severity: 'hard' } },
				],
				system: {
					roles: [
						{
							id: foundry.utils.randomID(),
							name: 'Gunner',
							skills: ['Gunnery'],
							members: [actor('Gunner').uuid, actor('Loader').uuid],
						},
					],
				},
			});
		},

		sheets: () => [...ACTORS, ...ITEM_TYPES],

		itemTypes: () => ITEM_TYPES,

		async openSheet(name) {
			const app = documentNamed(name).sheet;
			const root = await render(app, (root) => !!root.querySelector('.window-content > *'));
			await settle();
			const links = tabLinks(root);
			const shown = links.find((link) => link.classList.contains('active')) ?? links[0];
			const tabs = [shown, ...links.filter((link) => link !== shown)].flatMap((link) => (link ? [link.dataset.tab!] : []));
			return { selector: selectorOf(app), tabs };
		},

		async showTab(selector, tab) {
			const root = find(document, selector);
			const link = tabLinks(root).find((link) => link.dataset.tab === tab);
			if (!link) throw new Error(`No ${tab} tab in ${selector}`);
			link.click();
			const panel = `${selector} .tab[data-tab="${tab}"]`;
			await waitFor(`the ${tab} tab`, () => document.querySelector(`${panel}.active`));
			await settle();
			return panel;
		},

		prompts: () => Object.keys(PROMPTS),

		async openPrompt(prompt) {
			const { cssClass, ready, open } = PROMPTS[prompt];
			await open();
			const app = await waitFor(`the ${prompt} prompt`, () => apps(cssClass).find((app: { rendered: boolean }) => app.rendered));
			await waitFor(`the content of the ${prompt} prompt`, () => {
				const root = htmlOf(app);
				return root && ready(root);
			});
			await settle();
			return selectorOf(app);
		},

		async closeAll() {
			for (const app of Object.values(PROMPTS).flatMap(({ cssClass }) => apps(cssClass))) await app.close();
			await window.e2e.closeSetUp();
			await settle();
		},

		async openRowMenu() {
			await window.e2e.showTab('Hero', 'inventory');
			const root = await sheet('Hero');
			const row = [...root.querySelectorAll('.tab-inventory .inventory-item')].find((row) =>
				text(row.querySelector('.name button')).startsWith('E2E Sword'),
			);
			if (!row) throw new Error('No row of the Sword');
			find(row, ':scope > .actions > .menu-trigger').click();
			const selector = `${selectorOf(actor('Hero').sheet)} .tab-inventory [role="menu"]`;
			await waitFor('the menu of the Sword', () => document.querySelector(selector));
			await settle();
			return selector;
		},

		async setStyle(style) {
			document.documentElement.dataset.genesysStyle = style;
			// The colours change through the sheets' transitions, which a check reading them mid-way would get wrong.
			await settle();
		},

		async readyKeyboardAction(sheet) {
			const { tab, button, state, undo } = KEYBOARD[sheet];
			const { selector, tabs } = await helpers.openSheet(sheet);
			const panel = tabs[0] === tab ? `${selector} .tab[data-tab="${tab}"]` : await helpers.showTab(selector, tab);
			const target = button(find(document, panel));
			if (!target) throw new Error(`No action button for the keyboard step on ${sheet}`);
			focusBefore(selector, target, `the action button on ${sheet}`);
			keyboard = { button: target, selector, before: state(target), state, undo };
			// Marked for a step that clicks it with the mouse instead.
			markForPointer(target);
		},

		async readyTabs(sheet) {
			const { selector } = await helpers.openSheet(sheet);
			const [first, , third] = tabLinks(find(document, selector));
			if (!third) throw new Error(`No third tab on ${sheet}`);
			await helpers.showTab(selector, first.dataset.tab!);
			// Tab doesn't reach tabs that are links without an `href`, as before #575: the step then starts from the window's
			// content, and its assertion tells where Tab goes.
			if (tabbable(find(document, `${selector} .window-content`)).includes(first)) {
				focusBefore(selector, first, `the tabs of ${sheet}`);
			} else {
				focusContent(find(document, `${selector} .window-content`));
			}
			markForPointer(third);
			tabSteps = selector;
		},

		readyNameField() {
			if (!tabSteps) throw new Error('No tab steps readied');
			focusBefore(tabSteps, find(document, `${tabSteps} input[name="name"]`), 'the name field');
		},

		async focusState() {
			if (!tabSteps) throw new Error('No tab steps readied');
			const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
			const root = find(document, tabSteps);
			// Foundry fades a field's outline in: the ring is read once it has.
			await Promise.all(focused?.getAnimations().map((animation) => animation.finished) ?? []);
			return {
				focused:
					focused && root.contains(focused) ? focused.dataset.tab ?? focused.getAttribute('name') ?? focused.localName : null,
				ring: focused ? ringOf(focused) : 'no focus',
				shown: root.querySelector<HTMLElement>('.sheet-body > .tab.active')?.dataset.tab ?? null,
			};
		},

		async clickedTab() {
			const tab = find(document, '[data-e2e-pointer]');
			const panel = find(document, `${tabSteps} .sheet-body > .tab[data-tab="${tab.dataset.tab}"]`);
			await Promise.all(tab.getAnimations().map((animation) => animation.finished));
			return { shown: panel.classList.contains('active'), focused: document.activeElement === tab, ring: ringOf(tab) };
		},

		async transitions(name) {
			const selector = PROMPTS[name] ? await helpers.openPrompt(name) : (await helpers.openSheet(name)).selector;
			const elements = [...find(document, `${selector} .vue-app`).querySelectorAll('*')];
			const moving = new Set<string>();
			const read = () => {
				for (const element of elements) {
					for (const pseudo of [null, '::before', '::after']) {
						const durations = getComputedStyle(element, pseudo).transitionDuration.split(', ');
						const longest = Math.max(...durations.map((duration) => parseFloat(duration)));
						if (longest > 0) {
							// An element's kind leaves out the TransitionGroup classes the check gives every element.
							const kind = (node: Element | null) =>
								node
									? [
											node.localName,
											...[...node.classList].filter((name) => !TRANSITION_GROUP_CLASSES.includes(name)),
										].join('.')
									: '?';
							moving.add(`${kind(element.parentElement)} > ${kind(element)}${pseudo ?? ''} ${longest}s`);
						}
					}
				}
			};
			read();
			for (const element of elements) element.classList.add(...TRANSITION_GROUP_CLASSES);
			try {
				read();
			} finally {
				for (const element of elements) element.classList.remove(...TRANSITION_GROUP_CLASSES);
			}
			await helpers.closeAll();
			return [...moving].sort();
		},

		keyboardAction() {
			if (!keyboard) throw new Error('No keyboard action readied');
			return { focused: document.activeElement === keyboard.button, ran: keyboard.state(keyboard.button) !== keyboard.before };
		},

		keyboardSheetOpen() {
			return !!keyboard && !!document.querySelector(keyboard.selector);
		},

		async undoKeyboardAction() {
			if (!keyboard?.undo || keyboard.state(keyboard.button) === keyboard.before) return;
			await keyboard.undo(keyboard.before);
			await settle();
		},

		async readySpend() {
			spendFound = { points: game.settings.get('genesys', 'storyPoints'), paused: game.paused };
			await game.settings.set('genesys', 'storyPoints', { ...spendFound.points, player: 2 });
			if (game.paused) game.togglePause(false, { broadcast: true });
			// The players' pool's count, a button that spends one of its points (§#619).
			const button = await waitFor('the player pool spend button', () =>
				document.querySelector<HTMLElement>('#story-point-tracker .player button.points'),
			);
			for (const marked of document.querySelectorAll<HTMLElement>('[data-e2e-pointer]')) delete marked.dataset.e2ePointer;
			button.dataset.e2ePointer = '';
			await settle();
		},

		spendState() {
			const button = document.querySelector('#story-point-tracker .player button.points');
			return {
				player: game.settings.get('genesys', 'storyPoints').player,
				focused: !!button && document.activeElement === button,
				paused: game.paused,
			};
		},

		async restoreSpend() {
			if (!spendFound) return;
			await game.settings.set('genesys', 'storyPoints', spendFound.points);
			if (game.paused !== spendFound.paused) game.togglePause(spendFound.paused, { broadcast: true });
			spendFound = undefined;
			await settle();
		},

		outlines: (name) => eachTab(name, outline),

		columnRows: (name) => eachTab(name, columnRows),

		async vehicleSkills(name) {
			const { selector } = await helpers.openSheet(name);
			const panel = find(document, await helpers.showTab(selector, 'skills'));
			const heading = find(panel, '.member-heading');
			const nameInHeadingColour = getComputedStyle(find(heading, '.member-name')).color === getComputedStyle(heading).color;
			const byMember = outline(panel);
			const select = find(panel, '.grouping-mode select') as HTMLSelectElement;
			select.value = 'skill';
			select.dispatchEvent(new Event('change'));
			await waitFor('the skills grouped by skill', () => panel.querySelector('.skills-container'));
			await settle();
			const result = { byMember, nameInHeadingColour, bySkill: outline(panel), bySkillColumns: columnRows(panel) };
			await helpers.closeAll();
			return result;
		},

		async setUpRollRows() {
			await helpers.deleteRollRows();
			const brawl = { name: 'E2E Brawl', type: 'skill', system: { category: 'combat', characteristic: 'brawn', rank: 1 } };
			const blade = { name: 'E2E Blade', type: 'weapon', system: { skills: ['E2E Brawl'], baseDamage: 3, state: 'equipped' } };
			await Actor.createDocuments([
				{
					name: 'E2E Roller',
					type: 'character',
					// XP in Character Creation, so that a raise of Brawn is affordable.
					system: { characteristics: { brawn: 2 }, experienceJournal: { entries: [{ amount: 100, type: 'Starting' }] } },
					items: [
						brawl,
						{ name: 'E2E Gunnery', type: 'skill', system: { category: 'combat', characteristic: 'agility', rank: 1 } },
						blade,
						{ name: 'E2E Spare', type: 'weapon', system: { skills: ['E2E Brawl'], baseDamage: 2, state: 'carried' } },
						// A name HTML would cut short.
						{
							name: 'E2E Blaster <Mk II>',
							type: 'weapon',
							system: { skills: ['E2E Brawl'], baseDamage: 5, state: 'equipped' },
						},
						{ name: 'E2E Gash', type: 'injury', system: { severity: 'average' } },
					],
				},
				{ name: 'E2E Roller Rival', type: 'rival', items: [brawl, blade] },
				{ name: 'E2E Roller Minion', type: 'minion', items: [brawl], prototypeToken: { actorLink: false } },
			]);
			await Actor.create({
				name: 'E2E Roller Ship',
				type: 'vehicle',
				items: [
					{ name: 'E2E Harpoon', type: 'vehicleWeapon', system: { skills: ['E2E Gunnery'], baseDamage: 4, state: 'equipped' } },
					{ name: 'E2E Breach', type: 'injury', system: { severity: 'hard' } },
				],
				system: {
					roles: [
						{
							id: foundry.utils.randomID(),
							name: 'Crew',
							skills: ['E2E Gunnery', 'Mechanics'],
							members: [actor('Roller').uuid],
						},
					],
				},
			});
			await settle();
		},

		async deleteRollRows() {
			const ids = ROLL_ACTORS.flatMap((name) => game.actors.getName(`E2E ${name}`)?.id ?? []);
			if (ids.length) await Actor.deleteDocuments(ids);
			await settle();
		},

		async readyRollRow(key, control) {
			const target = ROLL_ROW_TARGETS[key];
			// Only the row's sheet stays open, so that a sheet the control opens shows as opened: the Roller's, from the
			// vehicle's crew.
			for (const app of [...foundry.applications.instances.values()]) {
				if (app.rendered && app.document && app.document !== actor(target.sheet)) await app.close();
			}
			await window.e2e.showTab(target.sheet, target.tab);
			const root = await render(actor(target.sheet).sheet);
			const grouping = root.querySelector<HTMLSelectElement>('.tab-skills .grouping-mode select');
			const groupedBy = target.bySkill ? 'skill' : 'member';
			if (target.tab === 'skills' && grouping && grouping.value !== groupedBy) {
				grouping.value = groupedBy;
				grouping.dispatchEvent(new Event('change'));
			}
			const row = await waitFor(`the ${key} row`, () => target.row(root));
			const selector = { name: target.name, icon: target.icon, raise: target.raise }[control];
			if (!selector) throw new Error(`The ${key} row has no ${control}`);
			const element = find(row, selector);
			windowsBefore = new Set(foundry.applications.instances.values());
			element.focus();
			const focused = document.activeElement === element;
			return control === 'name'
				? {
						focused,
						die: !!element.querySelector('.fa-dice-d20'),
						tooltip: element.dataset.tooltipText ?? '',
					}
				: { focused, label: element.getAttribute('aria-label') ?? '' };
		},

		async rollRowOutcome() {
			await settle();
			const opened = [...foundry.applications.instances.values()].filter(
				(app: { rendered: boolean }) => app.rendered && !windowsBefore.has(app),
			);
			const prompt = opened.find((app: { options: { classes: string[] } }) => app.options.classes.includes('app-dice-prompt'));
			const dicePrompt = prompt
				? { actor: prompt.actor?.name ?? null, check: prompt.skillName || prompt.characteristic || null, type: prompt.roll.type }
				: null;
			const sheets = opened.flatMap((app: { document?: { name: string } }) => (app.document ? [app.document.name] : []));
			for (const app of opened) await app.close();
			await settle();
			return { dicePrompt, opened: sheets };
		},

		async setUpRowMenus() {
			await helpers.deleteRowMenus();
			superCharacteristicsFound = window.e2e.settings(['useSuperCharacteristics']);
			// The characteristic's Mark as Super-Characteristic menu shows under the optional rule only.
			await window.e2e.setSettings({ useSuperCharacteristics: true });
			const brawl = { name: 'E2E Row Brawl', type: 'skill', system: { category: 'combat', characteristic: 'brawn', rank: 1 } };
			const grit = { name: 'E2E Row Grit', type: 'talent' };
			const nimble = { name: 'E2E Row Nimble', type: 'ability' };
			const rope = { name: 'E2E Row Rope', type: 'gear', system: { state: 'carried' } };
			const gash = { name: 'E2E Row Gash', type: 'injury', system: { severity: 'easy' } };
			await Actor.createDocuments([
				{
					name: 'E2E Rower',
					type: 'character',
					// An XP award past the Starting XP: the Archetype can't be removed any more, the Career still can.
					system: {
						experienceJournal: {
							entries: [
								{ amount: 100, type: 'Starting' },
								{ amount: 10, type: 'Award', data: { reason: 'E2E Row award' } },
							],
						},
					},
					items: [
						brawl,
						grit,
						nimble,
						gash,
						rope,
						{ name: 'E2E Row Pack', type: 'container', system: { state: 'carried' } },
						{ name: 'E2E Row Lineage', type: 'archetype' },
						{ name: 'E2E Row Calling', type: 'career' },
					],
					effects: [{ name: 'E2E Row Ward', img: 'icons/svg/aura.svg' }],
				},
				{
					name: 'E2E Rower Rival',
					type: 'rival',
					items: [
						brawl,
						grit,
						nimble,
						gash,
						rope,
						{ name: 'E2E Row Blade', type: 'weapon', system: { skills: ['E2E Row Brawl'], baseDamage: 3 } },
					],
				},
				{ name: 'E2E Rower Mate', type: 'character' },
				{ name: 'E2E Rower Hand', type: 'character' },
			]);
			const rower = actor('Rower');
			await rower.createEmbeddedDocuments('Item', [
				{ name: 'E2E Row Flint', type: 'gear', system: { state: 'carried', container: rower.items.getName('E2E Row Pack').id } },
			]);
			await Actor.create({
				name: 'E2E Rower Ship',
				type: 'vehicle',
				items: [{ name: 'E2E Row Breach', type: 'injury', system: { severity: 'hard' } }],
				system: {
					passengers: { list: [{ uuid: actor('Rower Mate').uuid, sort: 100000 }] },
					roles: [{ id: foundry.utils.randomID(), name: 'Gunners', skills: [], members: [actor('Rower Hand').uuid] }],
				},
			});
			await settle();
		},

		async deleteRowMenus() {
			await helpers.closeAll();
			const ids = ROW_MENU_ACTORS.flatMap((name) => game.actors.getName(`E2E ${name}`)?.id ?? []);
			if (ids.length) await Actor.deleteDocuments(ids);
			if (superCharacteristicsFound) await window.e2e.setSettings(superCharacteristicsFound as Record<string, unknown>);
			superCharacteristicsFound = undefined;
			await settle();
		},

		async setUpCounters() {
			await helpers.deleteCounters();
			// A fresh world's permanent migration notifications would cover the top of a sheet, and the − and + there.
			ui.notifications.clear();
			// A quantity of 2 and Minor damage, which each step up or down (a Container has no quantity).
			const item = (name: string, type = 'gear', system: object = {}) => ({
				name: `E2E Tally ${name}`,
				type,
				system: { state: 'carried', quantity: 2, damage: 'minor', ...system },
			});
			await Actor.createDocuments([
				{
					name: 'E2E Tally Hero',
					type: 'character',
					system: { wounds: { value: 1, max: 12 }, strain: { value: 1, max: 10 } },
					items: [item('Rope'), item('Pack', 'container')],
				},
				// An independent Minion Group shows its wounds as its tokens do, on a counter.
				{
					name: 'E2E Tally Minion',
					type: 'minion',
					system: { groupSize: 3, wounds: { value: 1, threshold: 5 } },
					flags: { genesys: { independentMinion: true } },
				},
				{ name: 'E2E Tally Rival', type: 'rival', system: { wounds: { value: 1, max: 10 } } },
				{ name: 'E2E Tally Nemesis', type: 'nemesis', system: { wounds: { value: 1, max: 12 }, strain: { value: 1, max: 10 } } },
				{
					name: 'E2E Tally Ship',
					type: 'vehicle',
					system: { hullTrauma: { value: 1, max: 10 }, systemStrain: { value: 1, max: 10 } },
					items: [item('Crate')],
				},
			]);
			const hero = actor('Tally Hero');
			await hero.createEmbeddedDocuments('Item', [item('Flint', 'gear', { container: hero.items.getName('E2E Tally Pack').id })]);
			await settle();
		},

		async deleteCounters() {
			await helpers.closeAll();
			const ids = COUNTER_ACTORS.flatMap((name) => game.actors.getName(`E2E ${name}`)?.id ?? []);
			if (ids.length) await Actor.deleteDocuments(ids);
			await settle();
		},

		async counterSteps(name) {
			const steps: Record<string, string> = {};
			for (const [key, { value, step }] of counterStepsOf(await openCounters(name))) {
				value.focus();
				steps[key] = shownWhole(step);
				value.blur();
			}
			await helpers.closeAll();
			return steps;
		},

		async readyCounterPointer(name) {
			counterSheet = await openCounters(name);
			(document.activeElement as HTMLElement | null)?.blur();
			return [...counterStepsOf(counterSheet).keys()];
		},

		counterStepPoints(key, field) {
			const { value, step } = counterStep(key);
			const centre = (box: DOMRect) => ({ x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 });
			value.focus();
			step.scrollIntoView({ block: 'nearest', inline: 'nearest' });
			const box = step.getBoundingClientRect();
			value.blur();
			const points: CounterStepPoints = {
				step: centre(box),
				value: centre(value.getBoundingClientRect()),
				away: centre(find(document, `${counterSheet} .window-header`).getBoundingClientRect()),
			};
			if (field) {
				// A point of the field 4 px out of the − or +, on the side it reaches over, kept within the field.
				const fieldBox = find(document, `${counterSheet} [name="${field}"]`).getBoundingClientRect();
				const x = step.classList.contains('decrease') ? box.left - 4 : box.right + 4;
				points.beside = {
					x: Math.min(Math.max(x, fieldBox.left + 2), fieldBox.right - 2),
					y: Math.min(Math.max(points.step.y, fieldBox.top + 2), fieldBox.bottom - 2),
				};
			}
			return points;
		},

		counterStepState(key, { x, y }) {
			const { step } = counterStep(key);
			// A screen reader reads it unless it has no box or is `aria-hidden`.
			const read = step.checkVisibility() && step.getAttribute('aria-hidden') !== 'true';
			if (!step.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return read ? 'hidden, but read' : 'hidden';
			if (!read) return 'shown, but not read';
			const hit = document.elementFromPoint(x, y);
			if (step.contains(hit)) return 'shown';
			return `under ${hit ? [hit.tagName.toLowerCase(), ...hit.classList].join('.') : 'nothing'}`;
		},

		focusCounter(key, focus) {
			const { value } = counterStep(key);
			if (focus) value.focus();
			else value.blur();
		},

		inventoryRow(owner, name) {
			const row = [...find(document, counterSheet!).querySelectorAll('.inventory-item')].find(
				(row) => text(row.querySelector('.name')) === name,
			);
			if (!row) throw new Error(`No inventory row ${name}`);
			return { quantity: actor(owner).items.getName(name).system.quantity, menu: !!row.querySelector('[role="menu"]') };
		},

		woundsOf(name) {
			const { system } = actor(name);
			return {
				wounds: system.wounds.value,
				threshold: system.wounds.max,
				focused: document.activeElement?.getAttribute('name') ?? null,
			};
		},

		async readyRowMenu(key) {
			const target = ROW_MENU_TARGETS[key];
			// Only the row's sheet stays open, so that its ⋮ is the one the keys reach.
			for (const app of [...foundry.applications.instances.values()]) {
				if (app.rendered && app.document && app.document !== actor(target.sheet)) await app.close();
			}
			await window.e2e.showTab(target.sheet, target.tab);
			const root = await render(actor(target.sheet).sheet);
			await target.open?.(root);
			const row = await waitFor(`the ${key} row`, () => target.row(root));
			// A row without a ⋮, as before #577, leaves the focus where it was: the step reads no menu.
			const trigger = menuContainerOf(row)?.querySelector<HTMLElement>(':scope > .menu-trigger') ?? undefined;
			rowMenuTrigger = trigger;
			trigger?.focus();
			return { focused: !!trigger && document.activeElement === trigger, name: trigger?.getAttribute('aria-label') ?? null };
		},

		rowMenuState() {
			if (!rowMenuTrigger) return { open: false, entries: [], focused: null };
			const menu = rowMenuTrigger.parentElement?.querySelector(':scope > [role="menu"]');
			const active = document.activeElement;
			return {
				open: !!menu,
				entries: [...(menu?.children ?? [])].map((entry) =>
					entry.matches('hr') ? '---' : text(entry.querySelector('.menu-label')),
				),
				focused:
					active === rowMenuTrigger
						? '⋮'
						: active?.closest('[role="menuitem"]')
							? text(active.querySelector('.menu-label'))
							: null,
			};
		},

		async rollRowTooltip(key) {
			const target = ROLL_ROW_TARGETS[key];
			await window.e2e.showTab(target.sheet, target.tab);
			const root = await render(actor(target.sheet).sheet);
			const row = await waitFor(`the ${key} row`, () => target.row(root));
			const element = find(row, target.name);
			// Hovering the element, as TooltipManager listens for it, shows its tooltip after a delay.
			const manager = (game as { tooltip: { element: Element | null; tooltip: HTMLElement; deactivate(): void } }).tooltip;
			element.dispatchEvent(new PointerEvent('pointerenter'));
			await waitFor('the tooltip', () => manager.element === element);
			const shown = manager.tooltip.textContent ?? '';
			manager.deactivate();
			return shown;
		},

		rollerBrawn() {
			const roller = actor('Roller');
			return { brawn: roller.system._source.characteristics.brawn, xp: roller.system.availableXP };
		},

		async readyPromptOpener(prompt) {
			promptFound ??= {
				roles: foundry.utils.deepClone(actor('Ship')._source.system.roles),
				entries: foundry.utils.deepClone(actor('Hero')._source.system.experienceJournal.entries),
			};
			const opener = PROMPT_OPENERS[prompt];
			promptOpener = undefined;
			if (!opener) {
				// A character without a Career, whose drop asks for its Free Ranks.
				if (prompt === 'careerSkill') {
					await game.actors.getName('E2E Recruit')?.delete();
					await Actor.create({ name: 'E2E Recruit', type: 'character' });
				}
				// The Minion leaves the Role a previous answer put it in: a Crew it is in offers no clone.
				if (prompt === 'cloneActor') await actor('Ship').update({ 'system.roles': promptFound.roles });
				await settle();
				return false;
			}
			await window.e2e.showTab(opener.sheet, opener.tab);
			promptOpener = find(await sheet(opener.sheet), opener.selector);
			promptOpener.focus();
			return true;
		},

		async dropForPrompt(prompt: string) {
			if (prompt === 'careerSkill') drop(await sheet('Recruit'), { type: 'Item', uuid: documentNamed('career').uuid });
			else await PROMPTS[prompt].open();
		},

		async promptShown(prompt: string) {
			await waitFor(`the content of the ${prompt} prompt`, () => {
				const root = shownPrompt(prompt)?.element;
				return root && PROMPTS[prompt].ready(root);
			});
			await settle();
		},

		async promptClosed(prompt: string) {
			// A prompt that a key leaves open fails the step's expectation rather than stopping the scenario.
			for (let waited = 0; waited < 3000 && apps(PROMPTS[prompt].cssClass).length > 0; waited += 100) await window.e2e.sleep(100);
			await settle();
		},

		promptFocus(prompt: string) {
			const open = !!shownPrompt(prompt);
			const active = document.activeElement;
			if (active && active === promptOpener) return { open, focused: 'opener' };
			const inPrompt = active?.closest(`.${PROMPTS[prompt].cssClass}`);
			return { open, focused: active && inPrompt ? controlKind(active) : null };
		},

		promptOutcome(prompt: string) {
			switch (prompt) {
				case 'dice':
					return game.messages.size;
				case 'awardXP':
					return actor('Hero').system.experienceJournal.entries.length;
				case 'careerSkill':
					return actor('Recruit')
						.items.filter((item: { type: string }) => item.type === 'skill')
						.reduce((ranks: number, skill: { system: { rank: number } }) => ranks + skill.system.rank, 0);
				case 'cloneActor':
					return actor('Ship').system.roles[0].members.length;
				default:
					// The crew member's choice opens a Dice Prompt for them.
					return apps('app-dice-prompt').map((app: { actor?: { name: string } }) => window.e2e.unprefixed(app.actor?.name ?? ''));
			}
		},

		crewChoice() {
			const rows = [...document.querySelectorAll('.app-select-crew-member-prompt .member-skill-option')];
			const where = (test: (row: Element) => boolean) => rows.flatMap((row, index) => (test(row) ? [index] : []));
			return {
				checked: where((row) => !!row.querySelector<HTMLInputElement>('input[type="radio"]')?.checked),
				selected: where((row) => row.classList.contains('selected-option')),
				marks: where((row) => !!row.querySelector('.fa-check-circle')),
			};
		},

		focusedName() {
			const active = document.activeElement as HTMLElement | null;
			return active ? active.getAttribute('aria-label') ?? text(active) : null;
		},

		dicePromptPool() {
			const root = shownPrompt('dice')?.element;
			if (!root) throw new Error('No Dice Prompt');
			return {
				boost: root.querySelectorAll('.preview .positive button[aria-label="Remove 1 Boost die"]').length,
				difficulty: text(find(root, '.pool-modifications-difficulty > span')),
			};
		},

		minionCopies: () => game.actors.filter((doc: { name: string }) => doc.name === 'E2E Minion').length,

		async undoPromptAnswers() {
			await game.actors.getName('E2E Recruit')?.delete();
			const clones = game.actors.filter(
				(doc: { name: string; id: string }) => doc.name === 'E2E Minion' && doc.id !== actor('Minion').id,
			);
			if (clones.length) await Actor.deleteDocuments(clones.map((clone: { id: string }) => clone.id));
			if (promptFound) {
				await actor('Ship').update({ 'system.roles': promptFound.roles });
				await actor('Hero').update({ 'system.experienceJournal.entries': promptFound.entries });
				promptFound = undefined;
			}
			await settle();
		},
	};

	window.accessibilityE2E = helpers;
}

/**
 * §#578: on each row that rolls, the name rolls the check from the keyboard, with a die before it and a tooltip naming
 * the check, and the icon opens the sheet; a characteristic's label rolls while a raise is affordable, which the ↑ beside
 * it makes.
 */
async function rollLinks(e2e: ScenarioContext) {
	const { gm } = e2e;
	await e2e.step('#578 actors whose rows roll set up', () => gm.evaluate(() => window.accessibilityE2E.setUpRollRows()));
	// Focuses a row's control, presses Enter, and gives what the control showed and what it opened.
	const press = async (key: string, control: RollRowControl) => {
		const shown = await gm.evaluate((args) => window.accessibilityE2E.readyRollRow(args.key, args.control), { key, control });
		await gm.page.keyboard.press('Enter');
		return { ...shown, ...(await gm.evaluate(() => window.accessibilityE2E.rollRowOutcome())) };
	};
	try {
		for (const { key, code, row, tooltip, check, opens, iconLabel, heading } of ROLL_ROWS) {
			let pressed: unknown;
			// A heading's icon alone is under test.
			if (!heading) {
				await e2e.step(`#578 A${code} ${row}: its name focused, then Enter`, async () => {
					pressed = await press(key, 'name');
				});
				if (check) {
					e2e.expect(
						// §#638: the name shows no die, which crowded every list.
						`#578 A${code} the name of ${row} shows no die and the tooltip "${tooltip}", and Enter on it opens the Dice Prompt of its check`,
						pressed,
						{ focused: true, die: false, tooltip, dicePrompt: check, opened: [] },
					);
				} else {
					e2e.expect(`#578 A${code} the name of ${row} shows no die, and Enter on it opens its sheet`, pressed, {
						focused: true,
						die: false,
						tooltip: '',
						dicePrompt: null,
						opened: [opens],
					});
				}
			}
			if (!opens) continue;
			await e2e.step(`#578 B${code} ${row}: its icon focused, then Enter`, async () => {
				pressed = await press(key, 'icon');
			});
			const label = iconLabel ?? "Open the item's sheet";
			e2e.expect(`#578 B${code} the icon of ${row} is named "${label}", and Enter on it opens the sheet of ${opens}`, pressed, {
				focused: true,
				label,
				dicePrompt: null,
				opened: [opens],
			});
		}

		let shownTooltip: unknown;
		await e2e.step('#578 E1 the name of the Equipped "E2E Blaster <Mk II>" hovered on the Combat tab', async () => {
			shownTooltip = await gm.evaluate(() => window.accessibilityE2E.rollRowTooltip('blaster'));
		});
		e2e.expect(
			"#578 E1 a name's tooltip shows the item's name as text, brackets included, as Foundry renders `data-tooltip-text`",
			shownTooltip,
			'Attack with E2E Blaster <Mk II>',
		);

		let before: unknown;
		let raised: unknown;
		await e2e.step('#578 C1 the ↑ beside Brawn focused, then Enter', async () => {
			before = await gm.evaluate(() => window.accessibilityE2E.rollerBrawn());
			raised = await press('characteristic', 'raise');
		});
		e2e.expect(
			'#578 C1 a characteristic\'s ↑ is named "Raise the characteristic", and Enter on it raises the characteristic for its XP, opening nothing',
			{ before, pressed: raised, after: await gm.evaluate(() => window.accessibilityE2E.rollerBrawn()) },
			{
				before: { brawn: 2, xp: 100 },
				pressed: { focused: true, label: 'Raise the characteristic', dicePrompt: null, opened: [] },
				after: { brawn: 3, xp: 70 },
			},
		);
	} finally {
		await gm.evaluate(() => window.accessibilityE2E.deleteRollRows());
	}
}

/**
 * §#577: each kind of row's ⋮, from the keyboard: Enter opens its menu on its first entry, its entries in their order, and
 * Escape closes it and gives the focus back to the ⋮.
 */
async function rowActions(e2e: ScenarioContext) {
	const { gm } = e2e;
	await e2e.step('#577 actors whose rows have a menu set up', () => gm.evaluate(() => window.accessibilityE2E.setUpRowMenus()));
	try {
		for (const { key, code, row, entries } of ROW_MENUS) {
			let opened: unknown;
			let closed: unknown;
			await e2e.step(`#577 K${code} ${row}: its ⋮ focused, Enter, then Escape`, async () => {
				const { name } = await gm.evaluate((key) => window.accessibilityE2E.readyRowMenu(key), key);
				await gm.page.keyboard.press('Enter');
				opened = { name, ...(await gm.evaluate(() => window.accessibilityE2E.rowMenuState())) };
				await gm.page.keyboard.press('Escape');
				closed = await gm.evaluate(() => window.accessibilityE2E.rowMenuState());
			});
			e2e.expect(
				`#577 K${code} the ⋮ of ${row} is named Actions, Enter opens its menu on its first entry, which lists ${entries.join(', ')}, and Escape closes it on the ⋮`,
				{ opened, closed },
				{
					opened: { name: 'Actions', open: true, entries, focused: entries[0] },
					closed: { open: false, entries: [], focused: '⋮' },
				},
			);
		}
	} finally {
		await gm.evaluate(() => window.accessibilityE2E.deleteRowMenus());
	}
}

/**
 * §#622: each counter's − and +, which show over its neighbours while the counter has the focus or the pointer, show
 * whole in both Styles: no ancestor clips them, and no neighbour covers them.
 */
async function counterSteps(e2e: ScenarioContext) {
	const { gm } = e2e;
	await e2e.step('#622 actors whose counters show their − and + set up', () =>
		gm.evaluate(() => window.accessibilityE2E.setUpCounters()),
	);
	try {
		for (const { code, name, what, steps } of COUNTER_STEPS) {
			const byStyle: Record<string, Record<string, string>> = {};
			await e2e.step(`#622 W${code} ${what}: each counter focused, in each Style`, async () => {
				for (const style of STYLES) {
					await gm.evaluate((key) => window.accessibilityE2E.setStyle(key), style.key);
					byStyle[style.name] = await gm.evaluate((name) => window.accessibilityE2E.counterSteps(name), name);
				}
			});
			const whole = Object.fromEntries(steps.map((step) => [step, 'whole']));
			e2e.expect(
				`#622 W${code} the − and + of ${what} show whole in both Styles`,
				byStyle,
				Object.fromEntries(STYLES.map((style) => [style.name, whole])),
			);
		}
	} finally {
		await gm.evaluate(() => window.accessibilityE2E.deleteCounters());
	}
}

/**
 * §#648: each counter's − and + show where the pointer goes, straight from outside the counter and back, with the mouse
 * of the browser, whose hit testing finds what takes the pointer (#645), and while the focus is in its value; hidden,
 * they are hidden from a screen reader too, also once the − went away from under the pointer; a right-click on the +
 * takes nothing off, and opens the menu of the row the counter sits in; and the field a − reaches over keeps a click
 * beside it.
 */
async function counterPointer(e2e: ScenarioContext) {
	const { gm } = e2e;
	const { mouse, keyboard } = gm.page;
	await e2e.step('#648 actors whose counters show their − and + set up for the pointer', () =>
		gm.evaluate(() => window.accessibilityE2E.setUpCounters()),
	);
	const points = (step: string, field?: string) =>
		gm.evaluate((args) => window.accessibilityE2E.counterStepPoints(args.step, args.field), { step, field });
	const state = (step: string, point: Point) =>
		gm.evaluate((args) => window.accessibilityE2E.counterStepState(args.step, args.point), { step, point });
	try {
		for (const { code, name, what, steps } of COUNTER_STEPS) {
			const states: Record<string, Record<string, string>> = {};
			await e2e.step(
				`#648 H${code} ${what}: the pointer moved from the sheet's title onto each − and +, away, and back, then its value focused and blurred`,
				async () => {
					for (const step of await gm.evaluate((name) => window.accessibilityE2E.readyCounterPointer(name), name)) {
						const at = await points(step);
						await mouse.move(at.away.x, at.away.y);
						const away = await state(step, at.step);
						await mouse.move(at.step.x, at.step.y);
						const over = await state(step, at.step);
						await mouse.move(at.away.x, at.away.y);
						await mouse.move(at.step.x, at.step.y);
						const back = await state(step, at.step);
						await mouse.move(at.away.x, at.away.y);
						const focus = (focus: boolean) =>
							gm.evaluate((args) => window.accessibilityE2E.focusCounter(args.step, args.focus), { step, focus });
						await focus(true);
						const focused = await state(step, at.step);
						await focus(false);
						states[step] = { away, over, back, focused, blurred: await state(step, at.step) };
					}
					await gm.evaluate(() => window.accessibilityE2E.closeAll());
				},
			);
			e2e.expect(
				`#648 H${code} each − and + of ${what} shows where the pointer goes, from outside its counter and back`,
				states,
				Object.fromEntries(
					steps.map((step) => [step, { away: 'hidden', over: 'shown', back: 'shown', focused: 'shown', blurred: 'hidden' }]),
				),
			);
		}

		let typed: unknown;
		// Before R1, whose right-click on the + takes the wounds down to 0 on a build before #645, where no − shows.
		await e2e.step("#648 T1 a rival's wound threshold clicked beside the − of its wounds, then 11 typed and Tab pressed", async () => {
			await gm.evaluate(() => window.accessibilityE2E.readyCounterPointer('Tally Rival'));
			const at = await points('Current Wounds −', 'system.wounds.max');
			// The − shows first, as it does when the pointer reaches the threshold from the counter.
			await mouse.move(at.step.x, at.step.y);
			await mouse.click(at.beside!.x, at.beside!.y);
			const clicked = await gm.evaluate(() => window.accessibilityE2E.woundsOf('Tally Rival'));
			await keyboard.press('Control+A');
			await keyboard.type('11');
			await keyboard.press('Tab');
			await e2e.settle();
			typed = {
				focused: clicked.focused,
				threshold: (await gm.evaluate(() => window.accessibilityE2E.woundsOf('Tally Rival'))).threshold,
			};
		});
		e2e.expect("#648 T1 the wound threshold a rival's − reaches over takes a click beside the −, and the value typed", typed, {
			focused: 'system.wounds.max',
			threshold: 11,
		});

		// Through the value, the way a pointer showed the − and + before #645 too, so that the right-clicks are tested on
		// both builds.
		let clicks: Record<string, number> = {};
		await e2e.step(
			"#648 R1 the + of a rival's wounds clicked, then right-clicked, and its − right-clicked, with the mouse",
			async () => {
				await gm.evaluate(() => window.accessibilityE2E.readyCounterPointer('Tally Rival'));
				const wounds = async () => (await gm.evaluate(() => window.accessibilityE2E.woundsOf('Tally Rival'))).wounds;
				const press = async (step: string, button: 'left' | 'right') => {
					const at = await points(step);
					await mouse.move(at.value.x, at.value.y);
					await mouse.move(at.step.x, at.step.y);
					await mouse.click(at.step.x, at.step.y, { button });
					await e2e.settle();
					return wounds();
				};
				clicks = {
					before: await wounds(),
					'+ clicked': await press('Current Wounds +', 'left'),
					'+ right-clicked': await press('Current Wounds +', 'right'),
					'− right-clicked': await press('Current Wounds −', 'right'),
				};
			},
		);
		e2e.expect("#648 R1 a click on the + of a rival's wounds adds one, and a right-click on its + or its − takes nothing off", clicks, {
			before: 1,
			'+ clicked': 2,
			'+ right-clicked': 2,
			'− right-clicked': 2,
		});

		// The row a counter sits in opens its menu on a right-click anywhere on it, the counter included.
		let row: unknown;
		await e2e.step("#648 R2 the + of an inventory row's quantity right-clicked with the mouse", async () => {
			await gm.evaluate(() => window.accessibilityE2E.readyCounterPointer('Tally Hero'));
			const at = await points('E2E Tally Rope: Quantity +');
			await mouse.move(at.value.x, at.value.y);
			await mouse.move(at.step.x, at.step.y);
			await mouse.click(at.step.x, at.step.y, { button: 'right' });
			await e2e.settle();
			row = await gm.evaluate(() => window.accessibilityE2E.inventoryRow('Tally Hero', 'E2E Tally Rope'));
			await keyboard.press('Escape');
			await gm.evaluate(() => window.accessibilityE2E.closeAll());
		});
		e2e.expect("#648 R2 a right-click on the + of an inventory row's quantity takes nothing off, and opens the row's menu", row, {
			quantity: 2,
			menu: true,
		});

		// The − goes once the value can't go lower, from under the pointer: the pointer leaving after it still hides the +.
		let left: unknown;
		await e2e.step("#648 L1 the − of a nemesis's wounds clicked down to 0 with the mouse, then the pointer moved away", async () => {
			await gm.evaluate(() => window.accessibilityE2E.readyCounterPointer('Tally Nemesis'));
			const minus = await points('Current Wounds −');
			const plus = await points('Current Wounds +');
			await mouse.move(minus.value.x, minus.value.y);
			await mouse.move(minus.step.x, minus.step.y);
			await mouse.click(minus.step.x, minus.step.y);
			await e2e.settle();
			await mouse.move(minus.away.x, minus.away.y);
			left = {
				wounds: (await gm.evaluate(() => window.accessibilityE2E.woundsOf('Tally Nemesis'))).wounds,
				'+': await state('Current Wounds +', plus.step),
			};
		});
		e2e.expect(
			"#648 L1 once a nemesis's wounds are down to 0 and the pointer has left, the + is hidden, from a screen reader too",
			left,
			{
				wounds: 0,
				'+': 'hidden',
			},
		);
	} finally {
		await gm.evaluate(() => window.accessibilityE2E.deleteCounters());
	}
}

/**
 * §#584: each tab of each sheet type starts each of its sections with a heading, an h3, its groups with an h4 and their
 * own groups with an h5; and an empty list says so under its heading. The sheets' lists hold a row each, the blank
 * actors' none.
 */
async function headings(e2e: ScenarioContext) {
	const { gm } = e2e;
	// The outlines of the tabs of each sheet named, read in one step.
	const outlines = async (step: string, names: string[]) => {
		const read: Record<string, Record<string, string[]>> = {};
		await e2e.step(step, async () => {
			for (const name of names) read[name] = await gm.evaluate((name) => window.accessibilityE2E.outlines(name), name);
		});
		return read;
	};
	const motivations = ['h3 Motivations', 'h4 Strength', 'h4 Flaw', 'h4 Desire', 'h4 Fear'];
	const effects = ['h3 Temporary Effects', 'None.', 'h3 Passive Effects', 'None.', 'h3 Inactive Effects', 'None.'];
	const skillCategories = ['h3 General Skills', 'h3 Magic Skills', 'h3 Combat Skills', 'h3 Social Skills', 'h3 Knowledge Skills'];
	const journal = [...motivations, 'h3 Character Illustration', 'h3 Character Description', 'h3 Notes', 'h3 XP Journal'];

	const characters = await outlines('#584 H1 the sheets of a character and of one with talents in each group shown, tab by tab', [
		'Hero',
		'Talented',
	]);
	e2e.expect("#584 H1 each tab of a character's sheet starts each section with an h3, and each group in it with an h4", characters.Hero, {
		skills: skillCategories,
		combat: ['h3 Attacks', 'h3 Maneuvers', 'h3 Armor', 'h3 Critical Injuries'],
		talents: ['h3 Special Abilities', 'h4 Passive', 'h3 Talents', 'h4 Passive'],
		inventory: ['h3 Equipped', 'h3 Carried', 'h3 Dropped'],
		effects,
		journal,
	});
	e2e.expect(
		'#584 H1 the Talents tab heads each activation with an h4, and each activation detail of the active ones with an h5',
		characters.Talented?.talents,
		['h3 Special Abilities', 'h4 Active', 'h5 maneuver', 'h3 Talents', 'h4 Active', 'h5 out of turn', 'h4 Passive'],
	);

	const adversary = {
		stats: ['h3 Skills', 'None.', 'h3 Talents', 'h3 Abilities', 'h3 Equipment'],
		miscellaneous: ['h3 Critical Injuries', ...motivations],
		effects,
	};
	e2e.expect(
		"#584 H2 each tab of an adversary's sheet starts each section with an h3, and each group in it with an h4",
		await outlines('#584 H2 the sheets of a Minion Group, a Rival and a Nemesis shown, tab by tab', ['Minion', 'Rival', 'Nemesis']),
		{
			Minion: { ...adversary, stats: ['h3 Skills (group only)', ...adversary.stats.slice(1)] },
			Rival: adversary,
			Nemesis: adversary,
		},
	);

	e2e.expect(
		"#584 H3 each tab of a vehicle's sheet starts each section with an h3, and each group in it with an h4",
		(await outlines("#584 H3 a vehicle's sheet shown, tab by tab", ['Ship'])).Ship,
		{
			skills: ['h3 E2E Gunner', 'h4 Role Skills', 'h3 E2E Loader', 'h4 Role Skills'],
			combat: ['h3 Attacks', 'h3 Critical Hits'],
			inventory: ['h3 Equipped', 'h3 Carried'],
			crew: ['h3 Roles', 'h3 Passengers'],
			effects,
			details: ['h3 Description', 'h3 Illustration', 'h3 Information'],
		},
	);
	let vehicleSkills: Awaited<ReturnType<typeof window.accessibilityE2E.vehicleSkills>> | undefined;
	await e2e.step("#584 H3 the vehicle's Skills tab shown grouped by crew member, then by skill", async () => {
		vehicleSkills = await gm.evaluate(() => window.accessibilityE2E.vehicleSkills('Ship'));
	});
	e2e.expect(
		"#584 H3 grouped by skill, the vehicle's Skills tab heads each skill with an h3, over its columns' labels",
		{ outline: vehicleSkills?.bySkill, columns: vehicleSkills?.bySkillColumns },
		{ outline: ['h3 Gunnery'], columns: ['Crew Member | Role | Skill'] },
	);
	e2e.expect(
		"#584 H3 a crew member's name, which opens their sheet, reads in its heading's colour rather than a link's",
		vehicleSkills?.nameInHeadingColour,
		true,
	);

	const itemTypes = await gm.evaluate(() => window.accessibilityE2E.itemTypes());
	const items = await outlines("#584 H4 each item type's sheet, and a weapon's with an extra Weapon Profile, shown, tab by tab", [
		...itemTypes,
		'Profiled Weapon',
	]);
	// Only an Archetype's and a Career's descriptions, an extra Weapon Profile and an Additional Effect's attack part have
	// sections; every Effects tab does. A spell and an Additional Effect have no Effects tab: an Additional Effect gives its
	// qualities as data only (§#704), and a spell's own would apply to its caster for as long as they own it, not while it lasts.
	const expectedItems = Object.fromEntries(
		[...itemTypes, 'Profiled Weapon'].map((name) => {
			const outline: Record<string, string[]> =
				name === 'spell' || name === 'additionalEffect' ? { description: [], data: [] } : { description: [], data: [], effects };
			if (name === 'archetype') outline.description = ['h3 Archetype Abilities'];
			if (name === 'career') outline.description = ['h3 Career Skills'];
			if (name === 'Profiled Weapon') outline.data = ['h3 Weapon Profile'];
			if (name === 'additionalEffect') outline.data = ['h3 For an Attack'];
			return [name, outline];
		}),
	);
	e2e.expect("#584 H4 each tab of an item's sheet starts each of its sections with an h3", items, expectedItems);

	const blanks = await outlines('#584 E1 the sheets of a character, a Rival and a vehicle without items shown, tab by tab', [
		'Blank Hero',
		'Blank Rival',
		'Blank Ship',
	]);
	e2e.expect(
		'#584 E1 an empty list says so under its heading: Attacks, Armor, Critical Injuries, Special Abilities and Talents on a character',
		{ combat: blanks['Blank Hero']?.combat, talents: blanks['Blank Hero']?.talents },
		{
			combat: ['h3 Attacks', 'None.', 'h3 Maneuvers', 'h3 Armor', 'None.', 'h3 Critical Injuries', 'None.'],
			talents: ['h3 Special Abilities', 'None.', 'h3 Talents', 'None.'],
		},
	);
	e2e.expect(
		'#584 E1 an empty list says so under its heading: Skills, Talents, Abilities, Equipment and Critical Injuries on an adversary',
		{ stats: blanks['Blank Rival']?.stats, miscellaneous: blanks['Blank Rival']?.miscellaneous },
		{
			stats: ['h3 Skills', 'None.', 'h3 Talents', 'None.', 'h3 Abilities', 'None.', 'h3 Equipment', 'None.'],
			miscellaneous: ['h3 Critical Injuries', 'None.', ...motivations],
		},
	);
	e2e.expect(
		'#584 E1 an empty list says so under its heading: Attacks and Critical Hits on a vehicle, and each category of Effects',
		{ combat: blanks['Blank Ship']?.combat, effects: blanks['Blank Ship']?.effects },
		{ combat: ['h3 Attacks', 'None.', 'h3 Critical Hits', 'None.'], effects },
	);
	e2e.expect(
		"#584 E1 the lists left out keep their heading alone: the inventory's sections, the Crew tab, the XP Journal, a vehicle's skills",
		{
			heroInventory: blanks['Blank Hero']?.inventory,
			heroJournal: blanks['Blank Hero']?.journal,
			shipInventory: blanks['Blank Ship']?.inventory,
			shipCrew: blanks['Blank Ship']?.crew,
			shipSkills: blanks['Blank Ship']?.skills,
		},
		{
			heroInventory: ['h3 Equipped', 'h3 Carried', 'h3 Dropped'],
			heroJournal: journal,
			shipInventory: ['h3 Equipped', 'h3 Carried'],
			shipCrew: ['h3 Roles', 'h3 Passengers'],
			shipSkills: [],
		},
	);

	const columns: Record<string, Record<string, string[]>> = {};
	await e2e.step('#584 E2 the column labels of a character and a vehicle, with items and without, read tab by tab', async () => {
		for (const name of ['Hero', 'Blank Hero', 'Ship', 'Blank Ship']) {
			columns[name] = await gm.evaluate((name) => window.accessibilityE2E.columnRows(name), name);
		}
	});
	e2e.expect(
		"#584 E2 a list with rows shows its columns' labels, the Combat tabs' Critical among them",
		{ hero: columns.Hero?.combat, ship: columns.Ship?.combat },
		{
			hero: ['Name | Skill | Damage | Critical | Range', 'Name | Soak | Defense', 'Severity | Injury'],
			ship: ['Name | Skill | Damage | Critical | Range | Firing Arc', 'Severity | Hit'],
		},
	);
	e2e.expect(
		'#584 E2 an empty list shows no column labels; an empty Effects category keeps its Add button alone',
		{
			heroCombat: columns['Blank Hero']?.combat,
			heroEffects: columns['Blank Hero']?.effects,
			shipCombat: columns['Blank Ship']?.combat,
			shipEffects: columns['Blank Ship']?.effects,
		},
		{ heroCombat: [], heroEffects: ['Add', 'Add', 'Add'], shipCombat: [], shipEffects: ['Add', 'Add', 'Add'] },
	);
}

/**
 * §#581: each prompt from the keyboard alone. It opens with the focus in its first field (the first control a prompt
 * without a field has); Escape there closes it without an answer and Enter answers it; the focus then goes back to the
 * button that opened it. A pool is built and rolled in the Dice Prompt with Tab, Enter and Space, and a crew member is
 * chosen with the arrow keys.
 */
async function promptKeys(e2e: ScenarioContext) {
	const { gm } = e2e;
	const press = (key: string) => gm.page.keyboard.press(key);
	const focus = (prompt: string) => gm.evaluate((prompt) => window.accessibilityE2E.promptFocus(prompt), prompt);
	const outcome = (prompt: string) => gm.evaluate((prompt) => window.accessibilityE2E.promptOutcome(prompt), prompt);
	const closed = (prompt: string) => gm.evaluate((prompt) => window.accessibilityE2E.promptClosed(prompt), prompt);
	const focusedName = () => gm.evaluate(() => window.accessibilityE2E.focusedName());
	const closeAll = () => gm.evaluate(() => window.accessibilityE2E.closeAll());
	// Readies the opening of a prompt, then opens it as its user does from the keyboard, with Enter on the button that
	// opens it (true), or with the drop that does.
	const ready = (prompt: string) => gm.evaluate((prompt) => window.accessibilityE2E.readyPromptOpener(prompt), prompt);
	const trigger = async (prompt: string, byButton: boolean) => {
		if (byButton) await press('Enter');
		else await gm.evaluate((prompt) => window.accessibilityE2E.dropForPrompt(prompt), prompt);
		await gm.evaluate((prompt) => window.accessibilityE2E.promptShown(prompt), prompt);
	};
	// Presses a key until the focus is on the control a test finds, 40 times at most; whether it got there.
	const pressUntil = async (key: string, reached: () => Promise<boolean>) => {
		for (let presses = 0; presses < 40; presses++) {
			if (await reached()) return true;
			await press(key);
		}
		return reached();
	};
	const changed = (before: unknown, after: unknown) => JSON.stringify(before) !== JSON.stringify(after);

	// Each prompt, the control its focus starts on, and the keys that answer it once it is open.
	const answering: { prompt: string; code: string; first: string; keys: string; answer: () => Promise<void> }[] = [
		{ prompt: 'dice', code: '1', first: 'select skill', keys: 'Enter in its first field', answer: () => press('Enter') },
		{
			prompt: 'awardXP',
			code: '2',
			first: 'input number',
			keys: 'an amount typed, then Enter',
			answer: async () => {
				await gm.page.keyboard.type('5');
				await press('Enter');
			},
		},
		{
			prompt: 'careerSkill',
			code: '3',
			first: 'button select-skill',
			keys: 'Space on as many skills as it grants Free Ranks, Tab to Done, then Enter',
			answer: async () => {
				const ranks = await gm.evaluate(() => CONFIG.genesys.settings.freeCareerSkillRanks as number);
				for (let pick = 0; pick < ranks; pick++) {
					await press('Space');
					await press('Tab');
				}
				await pressUntil('Tab', async () => (await focus('careerSkill')).focused === 'button prompt-submit');
				await press('Enter');
			},
		},
		{ prompt: 'cloneActor', code: '4', first: 'input radio', keys: 'Enter on its first choice', answer: () => press('Enter') },
		{
			prompt: 'crewMember',
			code: '5',
			first: 'input radio',
			keys: 'Enter after the arrow keys chose a crew member',
			answer: () => press('Enter'),
		},
	];

	try {
		for (const { prompt, code, first, keys, answer } of answering) {
			let byButton = false;
			let opened: unknown = null;
			let before: unknown = null;
			await e2e.step(`#581 E${code} ${prompt} prompt opened from the keyboard, then Escape pressed in its first field`, async () => {
				byButton = await ready(prompt);
				before = await outcome(prompt);
				await trigger(prompt, byButton);
				opened = await focus(prompt);
				await press('Escape');
				await closed(prompt);
			});
			e2e.expect(
				`#581 E${code} the ${prompt} prompt opens with the focus on its first control, and Escape there closes it without an answer${byButton ? ', the focus back on the button that opened it' : ''}`,
				{ opened, after: await focus(prompt), answered: changed(before, await outcome(prompt)) },
				{ opened: { open: true, focused: first }, after: { open: false, focused: byButton ? 'opener' : null }, answered: false },
			);
			await closeAll();

			let crewChoice: unknown = null;
			await e2e.step(`#581 A${code} ${prompt} prompt opened from the keyboard, then answered with ${keys}`, async () => {
				byButton = await ready(prompt);
				before = await outcome(prompt);
				await trigger(prompt, byButton);
				if (prompt === 'crewMember') {
					await press('ArrowDown');
					crewChoice = await gm.evaluate(() => window.accessibilityE2E.crewChoice());
				}
				await answer();
				await closed(prompt);
			});
			// The crew member's choice opens a Dice Prompt for them, which keeps the focus.
			const focusAfter = prompt === 'crewMember' ? null : byButton ? 'opener' : null;
			e2e.expect(
				`#581 A${code} ${keys} answers the ${prompt} prompt and closes it${focusAfter ? ', the focus back on the button that opened it' : ''}`,
				{ after: await focus(prompt), answered: changed(before, await outcome(prompt)) },
				{ after: { open: false, focused: focusAfter }, answered: true },
			);
			if (prompt === 'crewMember') {
				e2e.expect(
					'#581 C1 ArrowDown in the crew member prompt checks the second member, which shows a check mark and the tint',
					crewChoice,
					{ checked: [1], selected: [1], marks: [1] },
				);
				e2e.expect('#581 C1 Enter rolls for the member the arrow keys chose', await outcome(prompt), ['Loader']);

				let diceOpened: unknown = null;
				await e2e.step("#581 C2 Escape pressed in the Dice Prompt the crew member's choice opened", async () => {
					// A crew prompt left unanswered opens no Dice Prompt: the step's expectation fails rather than the scenario.
					await gm.evaluate(async () => {
						const shown = () => window.e2e.apps('app-dice-prompt').some((app: { rendered: boolean }) => app.rendered);
						for (let waited = 0; waited < 3000 && !shown(); waited += 100) await window.e2e.sleep(100);
						if (shown()) await window.accessibilityE2E.promptShown('dice');
					});
					diceOpened = await focus('dice');
					await press('Escape');
					await closed('dice');
				});
				e2e.expect(
					"#581 C2 the Dice Prompt a crew member's choice opens takes the focus, and Escape there gives it back to the button that opened the crew member prompt",
					{ opened: diceOpened, after: await focus('dice') },
					{ opened: { open: true, focused: 'select skill' }, after: { open: false, focused: 'opener' } },
				);
			}
			await closeAll();
		}

		let copies: number[] = [];
		await e2e.step(
			'#581 A6 cloneActor prompt opened by a drop, Clone chosen with an arrow key, then Select double-clicked',
			async () => {
				await ready('cloneActor');
				const minions = () => gm.evaluate(() => window.accessibilityE2E.minionCopies());
				copies = [await minions()];
				await trigger('cloneActor', false);
				await press('ArrowRight');
				// The primary button, which keeps this class on both builds.
				await gm.page.dblclick('.app-clone-actor-prompt .submit-button');
				await closed('cloneActor');
				await gm.evaluate(() => window.e2e.settle());
				copies.push(await minions());
			},
		);
		e2e.expect("#581 A6 a double click on the clone prompt's Select makes one clone", copies[1] - copies[0], 1);

		let built: unknown = null;
		let messages = 0;
		await e2e.step(
			'#581 D1 Dice Prompt opened from the keyboard: a Boost die added, Hard chosen, then rolled, with Tab, Shift+Tab and Enter',
			async () => {
				messages = (await outcome('dice')) as number;
				await trigger('dice', await ready('dice'));
				const pool = () => gm.evaluate(() => window.accessibilityE2E.dicePromptPool());
				const found = await pool();
				const boost = await pressUntil('Shift+Tab', async () => (await focusedName()) === 'Add 1 Boost die');
				await press('Enter');
				const hard = await pressUntil('Tab', async () => (await focusedName()) === 'Hard');
				await press('Enter');
				const roll = await pressUntil('Tab', async () => (await focus('dice')).focused === 'button prompt-submit');
				const shown = await pool();
				built = { reached: { boost, hard, roll }, boostAdded: shown.boost - found.boost, difficulty: shown.difficulty };
				await press('Enter');
				await closed('dice');
			},
		);
		e2e.expect(
			'#581 D1 a pool is built and rolled in the Dice Prompt from the keyboard alone: a die of the dice box, the Difficulty, the roll',
			{ built, rolled: ((await outcome('dice')) as number) - messages, after: await focus('dice') },
			{
				built: { reached: { boost: true, hard: true, roll: true }, boostAdded: 1, difficulty: 'Difficulty: Hard' },
				rolled: 1,
				after: { open: false, focused: 'opener' },
			},
		);
	} finally {
		await closeAll();
		await gm.evaluate(() => window.accessibilityE2E.undoPromptAnswers());
	}
}

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	await gm.evaluate(installAccessibilityHelpers);
	await e2e.step('setup', () => gm.evaluate(() => window.accessibilityE2E.setUp()));
	const worldStyle = await gm.evaluate(() => document.documentElement.dataset.genesysStyle ?? 'genesys');

	// The checks of the running part that found a button without a name (#574), which every action has since.
	let unnamedButtons: string[] = [];
	// The violations of the running part's checks of a field without a label (#581) and of a target under 24 px, by check.
	let unlabelledFields: Record<string, string[]> = {};
	let smallTargets: Record<string, string[]> = {};
	// The running part's checks that found text under 4.5:1 (#583), in either Style.
	let lowContrasts: Record<string, string[]> = {};
	const violated = (findings: Record<string, unknown>, rules: string[]) =>
		Object.keys(findings).filter(
			(finding) => rules.some((rule) => finding.startsWith(`${rule} (`)) && !finding.endsWith('(needs review)'),
		);
	// Checks an element in each Style, and logs what each check finds.
	const check = async (label: string, selector: string) => {
		for (const style of STYLES) {
			await gm.evaluate((key) => window.accessibilityE2E.setStyle(key), style.key);
			const checked = `axe ${label}, ${style.checks} in ${style.name}`;
			const findings = await gm.axe(selector, style.rules);
			e2e.log(checked, findings);
			if (Object.keys(findings).some((rule) => rule.startsWith('button-name '))) unnamedButtons.push(checked);
			const unlabelled = violated(findings, ['label', 'select-name']);
			if (unlabelled.length) unlabelledFields[checked] = unlabelled;
			const small = violated(findings, ['target-size']);
			if (small.length) smallTargets[checked] = small;
			const contrasts = violated(findings, ['color-contrast']);
			if (contrasts.length) lowContrasts[checked] = contrasts;
		}
	};
	const expectContrasts = (name: string) => {
		e2e.expect(name, lowContrasts, {});
		lowContrasts = {};
	};
	const expectNamedButtons = (name: string) => {
		e2e.expect(name, unnamedButtons, []);
		unnamedButtons = [];
	};
	// The rules a sheet's tab list violates (#575), as `Hero in Genesys: aria-required-children (critical)`. What axe-core
	// can't decide, such as the tabs' contrast over the nav's gradient (#583), is logged alone.
	const tabListViolations: string[] = [];
	const checkTabList = async (name: string, selector: string) => {
		for (const style of STYLES) {
			await gm.evaluate((key) => window.accessibilityE2E.setStyle(key), style.key);
			const findings = await gm.axe(`${selector} nav.sheet-tabs`, style.rules);
			e2e.log(`axe ${name} sheet's tab list, ${style.checks} in ${style.name}`, findings);
			for (const rule of Object.keys(findings).filter((rule) => !rule.endsWith('(needs review)'))) {
				tabListViolations.push(`${name} in ${style.name}: ${rule}`);
			}
		}
	};
	const expectLabelledFields = (name: string) => {
		e2e.expect(name, unlabelledFields, {});
		unlabelledFields = {};
	};
	const expectTargetSizes = (name: string) => {
		e2e.expect(name, smallTargets, {});
		smallTargets = {};
	};

	// Each window is checked in a step of its own, which logs the errors its rendering threw after its findings.
	try {
		await e2e.part('sheets', async () => {
			for (const name of await gm.evaluate(() => window.accessibilityE2E.sheets())) {
				await e2e.step(`${name} sheet checked and closed`, async () => {
					const { selector, tabs } = await gm.evaluate((name) => window.accessibilityE2E.openSheet(name), name);
					// The first tab is checked with the rest of the window, the others alone.
					await check(`${name} sheet${tabs[0] ? `, ${tabs[0]} tab` : ''}`, `${selector} .window-content`);
					if (tabs[0]) await checkTabList(name, selector);
					for (const tab of tabs.slice(1)) {
						const panel = await gm.evaluate((args) => window.accessibilityE2E.showTab(args.selector, args.tab), {
							selector,
							tab,
						});
						await check(`${name} sheet, ${tab} tab`, panel);
					}
					await gm.evaluate(() => window.accessibilityE2E.closeAll());
				});
			}
			expectNamedButtons('#574 A1 no tab of any sheet type has a button without a name');
			e2e.expect("#575 A1 no sheet type's tab list violates an accessibility rule", tabListViolations, []);
			expectLabelledFields('#581 L1 no tab of any sheet type has a field or a select without a label');
			expectContrasts('#583 C1 no tab of any sheet type has text under 4.5:1, in either Style');
			// The sheets' small targets go to #577 and #579, which rewrite their buttons.
			smallTargets = {};
		});

		await e2e.part('prompts', async () => {
			for (const prompt of await gm.evaluate(() => window.accessibilityE2E.prompts())) {
				await e2e.step(`${prompt} prompt checked and closed`, async () => {
					const selector = await gm.evaluate((prompt) => window.accessibilityE2E.openPrompt(prompt), prompt);
					await check(`${prompt} prompt`, `${selector} .window-content`);
					await gm.evaluate(() => window.accessibilityE2E.closeAll());
				});
			}
			expectNamedButtons('#574 A2 no prompt has a button without a name');
			expectLabelledFields('#581 L2 no prompt has a field or a select without a label');
			expectTargetSizes('#581 L3 no prompt has a target under 24 px, the Difficulty dice included');
			expectContrasts('#583 C2 no prompt has text under 4.5:1, in either Style');
		});

		// §#576: an open actions menu, which its sheet's check never finds open.
		await e2e.part('rowMenu', async () => {
			let findings: Record<string, Record<string, number>> = {};
			await e2e.step("#576 M1 the menu of the Hero's Sword row opened from its ⋮, then checked", async () => {
				const selector = await gm.evaluate(() => window.accessibilityE2E.openRowMenu());
				findings = await gm.axe(selector);
				await gm.evaluate(() => window.accessibilityE2E.closeAll());
			});
			// What axe-core couldn't decide is logged for a person to look at, as the sheets' checks log it: the contrast of the
			// entries over the menu's background image, and the size of the entries.
			e2e.log('axe the open actions menu of an inventory row, WCAG 2.2 AA in the world Style', findings);
			e2e.expect(
				'#576 M1 an open actions menu violates no accessibility rule',
				Object.keys(findings).filter((rule) => !rule.endsWith(' (needs review)')),
				[],
			);
		});
		await e2e.part('storyPointTracker', async () => {
			await e2e.step('Story Point tracker checked', () => check('Story Point tracker', '#story-point-tracker'));
			expectNamedButtons('#574 A3 the Story Point tracker has no button without a name');
			expectContrasts('#583 C3 the Story Point tracker has no text under 4.5:1, in either Style');
		});

		// §#574: an action of each sheet type is reached with Tab and run with Enter.
		await e2e.part('keyboard', async () => {
			for (const { sheet, code, target, result } of KEYBOARD_ACTIONS) {
				let reached = false;
				await e2e.step(`#574 ${code} ${sheet} sheet: Tab pressed to reach ${target}, then Enter`, async () => {
					await gm.evaluate((sheet) => window.accessibilityE2E.readyKeyboardAction(sheet), sheet);
					await gm.page.keyboard.press('Tab');
					reached = (await gm.evaluate(() => window.accessibilityE2E.keyboardAction())).focused;
					await gm.page.keyboard.press('Enter');
				});
				e2e.expect(
					`#574 ${code} on the ${sheet} sheet, Tab reaches ${target}, and Enter ${result}`,
					{ reached, ran: (await gm.evaluate(() => window.accessibilityE2E.keyboardAction())).ran },
					{ reached: true, ran: true },
				);
				// Foundry's keybindings, Escape's included, skip a page whose focus is on a button of a form.
				if (code === 'K1') {
					await e2e.step('#574 E1 Escape pressed while the chevron has focus', () => gm.page.keyboard.press('Escape'));
					e2e.expect(
						'#574 E1 Escape leaves a sheet open while one of its buttons has focus',
						await gm.evaluate(() => window.accessibilityE2E.keyboardSheetOpen()),
						true,
					);
				}
				await gm.evaluate(() => window.accessibilityE2E.closeAll());
				// The Role and the effect added go, so that the parts after this one find the world as it was (#584's headings).
				await gm.evaluate(() => window.accessibilityE2E.undoKeyboardAction());
			}
		});

		// §#574: a click with the mouse leaves the focus to Foundry's keybindings, which skip a page whose focus is on a
		// button of a form.
		await e2e.part('pointerFocus', async () => {
			let afterClick: unknown = null;
			await e2e.step('#574 P1 the chevron of a talent on the Hero sheet clicked with the mouse', async () => {
				await gm.evaluate(() => window.accessibilityE2E.readyKeyboardAction('Hero'));
				await gm.page.click(POINTER_TARGET);
				afterClick = await gm.evaluate(() => window.accessibilityE2E.keyboardAction());
			});
			e2e.expect('#574 P1 a click with the mouse runs the action and leaves the button without focus', afterClick, {
				focused: false,
				ran: true,
			});
			await e2e.step('#574 P2 Escape pressed after the click', () => gm.page.keyboard.press('Escape'));
			e2e.expect(
				'#574 P2 Escape closes the sheet after a click on one of its buttons',
				await gm.evaluate(() => window.accessibilityE2E.keyboardSheetOpen()),
				false,
			);
			await gm.evaluate(() => window.accessibilityE2E.closeAll());

			try {
				await e2e.step("#574 P3 the players' Story Points clicked with the mouse on the tracker, then Space pressed", async () => {
					await gm.evaluate(() => window.accessibilityE2E.readySpend());
					await gm.page.click(POINTER_TARGET);
					await gm.evaluate(() => window.e2e.settle());
					afterClick = await gm.evaluate(() => window.accessibilityE2E.spendState());
					await gm.page.keyboard.press('Space');
				});
				e2e.expect(
					"#574 P3 a click spends one of the players' Story Points and leaves the button without focus: Space then pauses the game, and spends no other",
					{ afterClick, afterSpace: await gm.evaluate(() => window.accessibilityE2E.spendState()) },
					{ afterClick: { player: 1, focused: false, paused: false }, afterSpace: { player: 1, focused: false, paused: true } },
				);
			} finally {
				await gm.evaluate(() => window.accessibilityE2E.restoreSpend());
			}
		});

		// §#575: the tabs of each sheet type follow the WAI-ARIA tabs pattern, and a control the keyboard reaches shows the
		// focus ring, which a click on a tab leaves off.
		await e2e.part('tabs', async () => {
			type FocusState = Awaited<ReturnType<typeof window.accessibilityE2E.focusState>>;
			const ring = '2px solid blue outline, 2px paper gap';
			for (const { sheet, code, tabs } of TAB_STEPS) {
				const [first, second, third] = tabs;
				let reached: FocusState | undefined;
				let moved: FocusState | undefined;
				await e2e.step(`#575 ${code} ${sheet} sheet: Tab pressed to reach its tabs, then the right arrow`, async () => {
					await gm.evaluate((sheet) => window.accessibilityE2E.readyTabs(sheet), sheet);
					await gm.page.keyboard.press('Tab');
					reached = await gm.evaluate(() => window.accessibilityE2E.focusState());
					await gm.page.keyboard.press('ArrowRight');
					moved = await gm.evaluate(() => window.accessibilityE2E.focusState());
				});
				e2e.expect(
					`#575 ${code} on the ${sheet} sheet, Tab reaches the tab shown, with the focus ring, and the right arrow moves to the next tab and shows its panel`,
					{ reached, moved },
					{ reached: { focused: first, ring, shown: first }, moved: { focused: second, ring, shown: second } },
				);

				let clicked: unknown;
				await e2e.step(`#575 ${code} ${sheet} sheet: its ${third} tab clicked with the mouse`, async () => {
					await gm.page.click(POINTER_TARGET);
					clicked = await gm.evaluate(() => window.accessibilityE2E.clickedTab());
				});
				e2e.expect(`#575 ${code} on the ${sheet} sheet, a tab clicked shows its panel, without the focus ring`, clicked, {
					shown: true,
					focused: false,
					ring: 'no outline',
				});

				let field: FocusState | undefined;
				await e2e.step(`#575 ${code} ${sheet} sheet: Tab pressed to reach its name field`, async () => {
					await gm.evaluate(() => window.accessibilityE2E.readyNameField());
					await gm.page.keyboard.press('Tab');
					field = await gm.evaluate(() => window.accessibilityE2E.focusState());
				});
				e2e.expect(`#575 ${code} on the ${sheet} sheet, the name field reached with Tab shows the focus ring`, field, {
					focused: 'name',
					ring,
					shown: third,
				});
				await gm.evaluate(() => window.accessibilityE2E.closeAll());
			}
		});

		// §#575: under `prefers-reduced-motion`, nothing moves on a sheet or a prompt, with #516 C1's emulation.
		await e2e.part('reducedMotion', async () => {
			const moving: Record<string, string[]> = {};
			await e2e.step('#575 M1 each sheet type and the crew member prompt read under prefers-reduced-motion', async () => {
				await gm.page.emulateMedia({ reducedMotion: 'reduce' });
				try {
					for (const name of [...(await gm.evaluate(() => window.accessibilityE2E.sheets())), 'crewMember']) {
						moving[name] = await gm.evaluate((name) => window.accessibilityE2E.transitions(name), name);
					}
				} finally {
					await gm.page.emulateMedia({ reducedMotion: null });
				}
			});
			e2e.expect(
				'#575 M1 under prefers-reduced-motion, no element of a sheet or a prompt has a transition, the rows of a TransitionGroup included',
				Object.fromEntries(Object.entries(moving).filter(([, elements]) => elements.length > 0)),
				{},
			);
		});

		await e2e.part('headings', () => headings(e2e));

		// The Talents tab's groups are bars again (#623), on a character with a talent in each group, whose details the
		// sheets' check doesn't see: the Hero's talents are all passive.
		await e2e.part('talentBars', async () => {
			let bars: string[] = [];
			await e2e.step('#623 B1 the Talents tab of a character with talents in each group shown, in each Style', async () => {
				const { selector } = await gm.evaluate(() => window.accessibilityE2E.openSheet('Talented'));
				const panel = await gm.evaluate((selector) => window.accessibilityE2E.showTab(selector, 'talents'), selector);
				bars = await gm.evaluate(
					(panel) =>
						[...document.querySelectorAll(`${panel} :is(h4, h5)`)].map(
							(heading) =>
								`${heading.tagName.toLowerCase()} ${heading.textContent?.trim()}: ${getComputedStyle(heading).backgroundColor === 'rgba(0, 0, 0, 0)' ? 'text' : 'bar'}`,
						),
					panel,
				);
				await check('Talented sheet, talents tab', panel);
				await gm.evaluate(() => window.accessibilityE2E.closeAll());
			});
			e2e.expect('#623 B1 the Talents tab shows each activation and each activation detail as a bar', bars, [
				'h4 Active: bar',
				'h5 maneuver: bar',
				'h4 Active: bar',
				'h5 out of turn: bar',
				'h4 Passive: bar',
			]);
			expectContrasts("#623 B2 the Talents tab's bars keep their text at 4.5:1, in either Style");
		});

		await e2e.part('rollLinks', () => rollLinks(e2e));

		await e2e.part('rowActions', () => rowActions(e2e));

		await e2e.part('counterSteps', () => counterSteps(e2e));

		await e2e.part('counterPointer', () => counterPointer(e2e));

		// Last: the rolls it posts pop chat notifications, whose buttons would sit beside the Story Point tracker's.
		await e2e.part('promptKeys', () => promptKeys(e2e));
	} finally {
		await gm.evaluate((key) => window.accessibilityE2E.setStyle(key), worldStyle);
	}
}
