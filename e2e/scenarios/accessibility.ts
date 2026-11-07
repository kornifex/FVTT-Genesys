/** @file The accessibility check of #534, axe-core on each tab of each sheet type and on each prompt, in both Styles: its findings are logged, and those a slice of #534 fixed asserted (#574: button names; #576: an open actions menu), with a keyboard step per sheet type; the tabs, the focus ring and reduced motion of each sheet type (#575); and the headings each tab of each sheet type starts its sections with (#584). */
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
};

/** The selector a step marks the button it clicks with the mouse with. */
const POINTER_TARGET = '[data-e2e-pointer]';

/**
 * The action each sheet type's keyboard step runs (#574), by the name of the document whose sheet it opens: the step's
 * code, and what its name says the action does.
 */
const KEYBOARD_ACTIONS: { sheet: string; code: string; target: string; result: string }[] = [
	{ sheet: 'Hero', code: 'K1', target: 'the chevron of a talent', result: "opens the talent's description" },
	{ sheet: 'Minion', code: 'K2', target: "a talent's Send to chat", result: 'posts the talent' },
	{ sheet: 'Rival', code: 'K3', target: "a talent's Send to chat", result: 'posts the talent' },
	{ sheet: 'Nemesis', code: 'K4', target: "a talent's Send to chat", result: 'posts the talent' },
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
				find(await sheet('Hero'), '.tab[data-tab="skills"] button.name').click();
			},
		},
		awardXP: {
			cssClass: 'app-award-xp-prompt',
			ready: (root) => !!root.querySelector('.award-xp-prompt > button'),
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
	};

	/**
	 * The keyboard step's action of each sheet: its tab, its button, and what the action changes, read before and after.
	 */
	const talentSendToChat = (root: Element) =>
		[...root.querySelectorAll('.adversary-items .talent')]
			.find((row) => row.textContent?.includes('E2E Grit'))
			?.querySelector<HTMLElement>('.send-to-chat-link') ?? null;
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
		Minion: { tab: 'stats', button: talentSendToChat, state: () => game.messages.size },
		Rival: { tab: 'stats', button: talentSendToChat, state: () => game.messages.size },
		Nemesis: { tab: 'stats', button: talentSendToChat, state: () => game.messages.size },
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
			// The − of the players' pool's counter, which spends one of its points (§#580).
			const button = await waitFor('the player pool spend button', () =>
				document.querySelector<HTMLElement>('#story-point-tracker .player button.decrease'),
			);
			for (const marked of document.querySelectorAll<HTMLElement>('[data-e2e-pointer]')) delete marked.dataset.e2ePointer;
			button.dataset.e2ePointer = '';
			await settle();
		},

		spendState() {
			const button = document.querySelector('#story-point-tracker .player button.decrease');
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
	};

	window.accessibilityE2E = helpers;
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
		combat: ['h3 Attacks', 'h3 Armor', 'h3 Critical Injuries'],
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
	// Only an Archetype's and a Career's descriptions, and an extra Weapon Profile, have sections; every Effects tab does.
	const expectedItems = Object.fromEntries(
		[...itemTypes, 'Profiled Weapon'].map((name) => {
			const outline: Record<string, string[]> = { description: [], data: [], effects };
			if (name === 'archetype') outline.description = ['h3 Archetype Abilities'];
			if (name === 'career') outline.description = ['h3 Career Skills'];
			if (name === 'Profiled Weapon') outline.data = ['h3 Weapon Profile'];
			// A quality changes no data, and has no Effects tab.
			if (name === 'quality') delete outline.effects;
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
			combat: ['h3 Attacks', 'None.', 'h3 Armor', 'None.', 'h3 Critical Injuries', 'None.'],
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

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	await gm.evaluate(installAccessibilityHelpers);
	await e2e.step('setup', () => gm.evaluate(() => window.accessibilityE2E.setUp()));
	const worldStyle = await gm.evaluate(() => document.documentElement.dataset.genesysStyle ?? 'genesys');

	// The checks of the running part that found a button without a name (#574), which every action has since.
	let unnamedButtons: string[] = [];
	// Checks an element in each Style, and logs what each check finds.
	const check = async (label: string, selector: string) => {
		for (const style of STYLES) {
			await gm.evaluate((key) => window.accessibilityE2E.setStyle(key), style.key);
			const checked = `axe ${label}, ${style.checks} in ${style.name}`;
			const findings = await gm.axe(selector, style.rules);
			e2e.log(checked, findings);
			if (Object.keys(findings).some((rule) => rule.startsWith('button-name '))) unnamedButtons.push(checked);
		}
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
					// The pool's − shows while the pointer is on its counter (§#580).
					await gm.page.hover('#story-point-tracker .player .points');
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
	} finally {
		await gm.evaluate((key) => window.accessibilityE2E.setStyle(key), worldStyle);
	}
}
