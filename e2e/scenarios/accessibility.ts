/** @file The accessibility check of #534, axe-core on each tab of each sheet type and on each prompt, in both Styles: its findings are logged, not asserted, since the slices of #534 fix them, each asserting the rules it fixes. */
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
	/** Shows the pages in a Style, by its key, as the world setting does, without writing the setting. */
	setStyle(style: string): Promise<void>;
};

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
	const { actor, apps, drop, htmlOf, render, settle, waitFor } = window.e2e;

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
				find(await sheet('Hero'), '.tab[data-tab="skills"] a.name').click();
			},
		},
		awardXP: {
			cssClass: 'app-award-xp-prompt',
			ready: (root) => !!root.querySelector('.award-xp-prompt > button'),
			async open() {
				await window.e2e.showTab('Hero', 'journal');
				find(await sheet('Hero'), '.xp-journal .entries-header a').click();
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
				find(await sheet('Ship'), '.tab-combat .weapon .name a').click();
			},
		},
	};

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
			]);
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

		async setStyle(style) {
			document.documentElement.dataset.genesysStyle = style;
			// The colours change through the sheets' transitions, which a check reading them mid-way would get wrong.
			await settle();
		},
	};

	window.accessibilityE2E = helpers;
}

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	await gm.evaluate(installAccessibilityHelpers);
	await e2e.step('setup', () => gm.evaluate(() => window.accessibilityE2E.setUp()));
	const worldStyle = await gm.evaluate(() => document.documentElement.dataset.genesysStyle ?? 'genesys');

	// Checks an element in each Style, and logs what each check finds.
	const check = async (label: string, selector: string) => {
		for (const style of STYLES) {
			await gm.evaluate((key) => window.accessibilityE2E.setStyle(key), style.key);
			e2e.log(`axe ${label}, ${style.checks} in ${style.name}`, await gm.axe(selector, style.rules));
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
		});

		await e2e.part('prompts', async () => {
			for (const prompt of await gm.evaluate(() => window.accessibilityE2E.prompts())) {
				await e2e.step(`${prompt} prompt checked and closed`, async () => {
					const selector = await gm.evaluate((prompt) => window.accessibilityE2E.openPrompt(prompt), prompt);
					await check(`${prompt} prompt`, `${selector} .window-content`);
					await gm.evaluate(() => window.accessibilityE2E.closeAll());
				});
			}
		});

		await e2e.part('storyPointTracker', async () => {
			await e2e.step('Story Point tracker checked', () => check('Story Point tracker', '#story-point-tracker'));
		});
	} finally {
		await gm.evaluate((key) => window.accessibilityE2E.setStyle(key), worldStyle);
	}
}
