/** @file #215, #246, #269, #300, #343 and #380: the token each actor type is created with, adversary drops and talent ranks, the adversary's defense cap, token bar changes within the rules' bounds, whole wounds and strain, the characteristic values in their circle, a minion's sheet following its independence, and the silhouette of characters and Adversaries. */
import type { ConfirmDialog } from '../page.ts';
import type { ScenarioContext } from '../scenario.ts';
import { dagger } from '../weaponProfiles.ts';

/** The names of the adversaries the scenario drops on, without their `E2E ` prefix. */
type Adversary = 'Grunts' | 'Rival' | 'Nemesis';

/**
 * What an action did to an actor: its items after it, as `<type> <name> <rank>`, the item writes it made, as
 * `<create|update|delete> <name> <rank>`, and the notifications it showed.
 */
type Observed = { items: string[]; writes: string[]; notifications: string[] };

/**
 * The Dice Prompt as the user sees it: its pool preview, positive then negative (`PAA|DD`), and its Pool
 * Modification rows (`S+` adds a Setback).
 */
type PromptState = { pool: string; modifications: { name: string; mods: string }[] };

type PrototypeToken = { bar1: string | null; bar2: string | null; actorLink: boolean; disposition: number };

type MenuTarget = { actor: string; kind: 'skill' | 'talent'; name: string };

/**
 * The silhouette field of an actor's sheet: where it sits, its label, value and bounds.
 */
type SilhouetteField = {
	place: 'character meta' | 'adversary header' | 'elsewhere';
	label: string;
	value: string;
	min: string;
	step: string;
};

/**
 * The description area of an adversary's sheet, on its Stats tab, in px: its height, the bottom of its edit toggle, shown
 * as on hover (null on a sheet the user can't edit), the bottom of its last paragraph (null without one), and its line
 * height. A sheet that shows no area gives a height of 0.
 */
type DescriptionArea = { height: number; toggleBottom: number | null; textBottom: number | null; lineHeight: number };

/**
 * The open description editor of an adversary's sheet: its height in px, whether it shows its HTML source, whether it
 * scrolls inside, the scroll and client heights of the part showing its rich text or its HTML source, and the computed
 * `position` of the HTML source's scroller (null in rich text).
 */
type OpenEditor = {
	height: number;
	source: boolean;
	scrolls: boolean;
	content: { scrollHeight: number; clientHeight: number };
	sourcePosition: string | null;
};

type AdversariesHelpers = {
	setUp(): Promise<void>;
	cleanUp(): Promise<void>;
	items(actor: string): string[];
	/** The bars, link and disposition of an actor's prototype token. */
	prototypeToken(actor: string): PrototypeToken;
	/** Drops a world item on an actor's sheet, as from the sidebar. */
	drop(args: { actor: string; item: string }): Promise<Observed>;
	/** The labels of the context menu of an adversary's skill or talent. */
	menu(target: MenuTarget): Promise<string[]>;
	/**
	 * Clicks an entry of the context menu of an adversary's skill or talent, and answers the dialog it opens when an
	 * answer is given; the dialog read, null when none opened.
	 */
	clickMenu(args: MenuTarget & { label: string; answer?: 'yes' | 'no' }): Promise<Observed & { dialog?: ConfirmDialog | null }>;
	/** Clicks a skill of an adversary's sheet and reads the Dice Prompt it opens. */
	rollSkill(args: { actor: string; skill: string }): Promise<PromptState>;
	/** Targets an actor's token, clicks a weapon of the attacker's sheet and reads the Dice Prompt it opens. */
	attack(args: { actor: string; weapon: string; target: string }): Promise<PromptState>;
	/** The values of the inputs of an actor's sheet, by name. */
	sheetInputs(args: { actor: string; names: string[] }): Promise<Record<string, string>>;
	/** The silhouette field of an actor's sheet, null when it has none. */
	silhouetteField(actor: string): Promise<SilhouetteField | null>;
	/** The element and computed `text-align` of each characteristic value of an actor's sheet, by label. */
	characteristicAlignment(args: { actor: string }): Promise<Record<string, string>>;
	/** Types a value in a number field of an actor's sheet, then returns the value stored. */
	typeInSheet(args: { actor: string; name: string; value: string; path: string }): Promise<unknown>;
	update(args: { actor: string; data: object }): Promise<void>;
	/** Types a change in a bar of the Token HUD of an actor's token, then returns the value stored. */
	hud(args: { actor: string; bar: 'bar1' | 'bar2'; input: string; path: string }): Promise<unknown>;
	/**
	 * The rows of an adversary's weapons in its equipment list: each one's name, as the row reads it before the weapon
	 * details in brackets, those details, and its qualities.
	 */
	weaponRows(actor: string): Promise<{ name: string; details: string[]; qualities: string[] }[]>;
	/**
	 * Targets an actor's token, clicks the weapon row of that name on the attacker's sheet, and reads the skill and the
	 * defense rows of the Dice Prompt it opens; null when the sheet has no such row.
	 */
	attackFromRow(args: { actor: string; row: string; target: string }): Promise<{
		skill: string;
		defense: PromptState['modifications'];
	} | null>;
	/** Gives a user the Observer permission on actors: the user can view their sheets but not edit them. */
	grantObserver(args: { user: string; actors: string[] }): Promise<void>;
	descriptionArea(args: { actor: string }): Promise<DescriptionArea>;
	/** Clicks the edit toggle of an adversary's description and returns its editor once open. */
	openDescription(args: { actor: string }): Promise<OpenEditor>;
	/** Clicks the HTML source button of the menu of an adversary's open description editor, and returns the editor. */
	toggleDescriptionSource(args: { actor: string }): Promise<OpenEditor>;
	/** Clicks the save button of the menu of an adversary's open description editor, and returns the area once closed. */
	saveDescription(args: { actor: string }): Promise<DescriptionArea>;
};

declare global {
	interface Window {
		adversariesE2E: AdversariesHelpers;
	}
}

/**
 * Installs `window.adversariesE2E`. Playwright sends this function's source to the page, so it uses nothing from this
 * module.
 */
function installAdversariesHelpers() {
	const { settle, waitFor, render, text, unprefixed, htmlOf, actor, token, target, apps, drop, poolPreview, poolModification } =
		window.e2e;
	const sheet = (name: string) => render(actor(name).sheet, (root) => root.querySelector('input'));
	const itemRow = (item: { type: string; name: string; system: { rank?: number } }) =>
		[item.type, unprefixed(item.name), item.system.rank].filter((part) => part !== undefined).join(' ');

	// The item writes made since the last action, on any actor.
	const writes: string[] = [];
	for (const action of ['create', 'update', 'delete']) {
		Hooks.on(`${action}Item`, (item: { type: string; name: string; system: { rank?: number }; parent?: unknown }) => {
			if (item.parent) writes.push(`${action} ${itemRow(item).replace(`${item.type} `, '')}`);
		});
	}
	// The notifications since the last call: an action's, once called before and after it.
	const notifications = window.e2e.recordNotifications();
	const observe = async (name: string, action: () => unknown): Promise<Observed> => {
		writes.length = 0;
		notifications();
		await action();
		await settle();
		return {
			items: window.adversariesE2E.items(name),
			writes: [...writes],
			notifications: notifications(),
		};
	};

	const menuContainer = async ({ actor: name, kind, name: itemName }: MenuTarget) => {
		const root = await sheet(name);
		const selector = kind === 'skill' ? '.skill.menu-container' : '.talent > .menu-container';
		const label = kind === 'skill' ? ':scope > a > span' : ':scope > label > a';
		return waitFor(`the ${kind} ${itemName} of ${name}`, () =>
			[...root.querySelectorAll<HTMLElement>(selector)].find((container) =>
				text(container.querySelector(label)).startsWith(`E2E ${itemName}`),
			),
		);
	};
	const openMenu = async (target: MenuTarget) => {
		const container = await menuContainer(target);
		container.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
		return waitFor('the context menu', () =>
			[...container.querySelectorAll<HTMLElement>(':scope > .context-menu .menu-item')].length
				? [...container.querySelectorAll<HTMLElement>(':scope > .context-menu .menu-item')]
				: undefined,
		);
	};

	// The links of an adversary's weapon rows, and the name each row reads before its weapon details in brackets.
	const weaponLinks = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('.adversary-items .weapon.menu-container > a')];
	const weaponRowName = (link: Element) => {
		const name = link.cloneNode(true) as HTMLElement;
		name.querySelector('.weapon-details')?.remove();
		return text(name).replace(/ \(\)$/, '');
	};

	const closePrompts = async () => {
		for (const app of apps('app-dice-prompt')) await app.close();
	};
	const readPrompt = async (): Promise<PromptState> => {
		const app = await waitFor('the Dice Prompt', () => apps('app-dice-prompt').length === 1 && apps('app-dice-prompt')[0]);
		const root = await waitFor('the Dice Prompt preview', () => htmlOf(app)?.querySelector('.preview') && htmlOf(app));
		// The pool is built once the check is resolved.
		await settle();
		const state = {
			pool: poolPreview(root),
			modifications: [...root.querySelectorAll('.pool-modifications-effects')].map((row) => ({
				name: text(row.querySelector('label')),
				mods: [...row.querySelectorAll(':scope > div > a')].map((mod) => poolModification(mod)).join(' '),
			})),
		};
		await closePrompts();
		return state;
	};

	// The Stats tab of an adversary's sheet, once its editor shows the description, which it enriches first.
	const statsTab = (name: string) =>
		render(actor(name).sheet, (root) => {
			const tab = root.querySelector('.tab.active[data-tab="stats"] .stats-tab');
			const area = tab?.querySelector('.description-area');
			return tab && (!area || area.querySelector(actor(name).system.description ? 'prose-mirror p' : 'prose-mirror'));
		});
	const measureArea = (root: HTMLElement): DescriptionArea => {
		const area = root.querySelector<HTMLElement>('.stats-tab .description-area');
		if (!area) return { height: 0, toggleBottom: null, textBottom: null, lineHeight: 0 };
		const top = area.getBoundingClientRect().top;
		const toggle = area.querySelector<HTMLButtonElement>('prose-mirror > button.toggle:enabled');
		let toggleBottom = null;
		if (toggle) {
			// The edit toggle shows on hover only.
			const display = toggle.style.display;
			toggle.style.display = 'block';
			toggleBottom = toggle.getBoundingClientRect().bottom - top;
			toggle.style.display = display;
		}
		const paragraph = area.querySelector('prose-mirror p:last-of-type');
		const style = getComputedStyle(area);
		return {
			height: area.getBoundingClientRect().height,
			toggleBottom,
			textBottom: paragraph ? paragraph.getBoundingClientRect().bottom - top : null,
			lineHeight: parseFloat(style.lineHeight) || 1.2 * parseFloat(style.fontSize),
		};
	};
	// The Editor component's wrapper, which holds the <prose-mirror> element and scrolls what its box can't show.
	const editorOf = (root: HTMLElement) => root.querySelector<HTMLElement>('.stats-tab .adversary-description > .editor');
	// The HTML source shows in a <code-mirror>, which scrolls in its .cm-scroller.
	const sourceOf = (editor: HTMLElement) =>
		editor.querySelector<HTMLElement>(':scope > prose-mirror > code-mirror.source-editor .cm-scroller');
	const measureEditor = (editor: HTMLElement): OpenEditor => {
		const source = sourceOf(editor);
		const content = source ?? editor.querySelector<HTMLElement>('.editor-container .ProseMirror')!;
		return {
			height: Math.round(editor.getBoundingClientRect().height),
			source: !!source,
			scrolls: editor.scrollHeight > editor.clientHeight,
			content: { scrollHeight: content.scrollHeight, clientHeight: content.clientHeight },
			sourcePosition: source ? getComputedStyle(source).position : null,
		};
	};
	const openEditor = async (name: string) => {
		const root = await statsTab(name);
		return waitFor(`the open description editor of ${name}`, () => {
			const editor = editorOf(root);
			return editor?.querySelector(':scope > prose-mirror.active .editor-container .ProseMirror') && editor;
		});
	};

	window.adversariesE2E = {
		async setUp() {
			await window.adversariesE2E.cleanUp();
			await window.e2e.ensureScene();

			const characteristics = (values: number[]) =>
				Object.fromEntries(
					['brawn', 'agility', 'intellect', 'cunning', 'willpower', 'presence'].map((name, index) => [name, values[index]]),
				);
			const skill = (name: string, characteristic: string, rank: number) => ({
				name: `E2E ${name}`,
				type: 'skill',
				system: { characteristic, rank, category: 'general' },
			});
			await Item.createDocuments([
				skill('Stealth', 'agility', 3),
				{ name: 'E2E Toughened', type: 'talent', system: { ranked: 'yes', rank: 1 } },
				{ name: 'E2E Grit', type: 'talent', system: { ranked: 'no', rank: 1 } },
				{ name: 'E2E Swarm', type: 'ability' },
				{ name: 'E2E Gash', type: 'injury' },
			]);
			const weapon = (name: string, skills: string[], range: string) => ({
				name: `E2E ${name}`,
				type: 'weapon',
				system: { skills, range, state: 'equipped', baseDamage: 3, critical: 3 },
			});
			await Actor.createDocuments([
				{
					name: 'E2E Grunts',
					type: 'minion',
					system: { characteristics: characteristics([2, 3, 2, 2, 2, 2]), groupSize: 3, wounds: { value: 0, threshold: 5 } },
				},
				{ name: 'E2E Rival', type: 'rival', system: { wounds: { value: 0, max: 10 } } },
				{ name: 'E2E Nemesis', type: 'nemesis', system: { wounds: { value: 0, max: 12 }, strain: { value: 0, max: 10 } } },
				{
					name: 'E2E Attacker',
					type: 'rival',
					system: { characteristics: characteristics([2, 2, 2, 2, 2, 2]) },
					items: [
						skill('Melee', 'brawn', 1),
						skill('Ranged', 'agility', 1),
						weapon('Knife', ['E2E Melee'], 'engaged'),
						weapon('Bow', ['E2E Ranged'], 'medium'),
					],
				},
				{
					name: 'E2E Hero',
					type: 'character',
					system: { wounds: { value: 0, max: 12 }, strain: { value: 0, max: 10 } },
					// A character created with skills gets none from the Skills Compendium.
					items: [skill('Cool', 'presence', 0)],
				},
				{ name: 'E2E Wagon', type: 'vehicle', system: { hullTrauma: { value: 0, max: 10 }, systemStrain: { value: 0, max: 10 } } },
				{
					name: 'E2E Chronicle',
					type: 'rival',
					system: { description: Array.from({ length: 25 }, (_, index) => `<p>Paragraph ${index + 1}</p>`).join('') },
				},
			]);
			const bars: Record<string, string[]> = {
				Grunts: ['wounds'],
				Rival: ['wounds'],
				Nemesis: ['wounds', 'strain'],
				Hero: ['wounds', 'strain'],
				Wagon: ['trauma', 'strain'],
			};
			await canvas.scene.createEmbeddedDocuments(
				'Token',
				await Promise.all(
					Object.entries(bars).map(async ([name, [bar1, bar2]], index) => ({
						...(await actor(name).getTokenDocument()).toObject(),
						actorLink: true,
						bar1: { attribute: bar1 },
						bar2: { attribute: bar2 ?? null },
						x: 100 + 200 * index,
						y: 900,
					})),
				),
			);
		},

		async cleanUp() {
			await closePrompts();
			await window.e2e.closeSetUp();
			canvas.hud?.token?.clear();
			target(null);
			await window.e2e.deleteSetUp('Token', 'Actor', 'Item');
		},

		items(name) {
			return actor(name)
				.items.contents.map(itemRow)
				.sort((left: string, right: string) => left.localeCompare(right));
		},

		prototypeToken(name) {
			const { bar1, bar2, actorLink, disposition } = actor(name).prototypeToken;
			return { bar1: bar1.attribute, bar2: bar2.attribute, actorLink, disposition };
		},

		async drop({ actor: name, item }) {
			const root = await sheet(name);
			return observe(name, () =>
				drop(root.querySelector('.sheet-body')!, { type: 'Item', uuid: game.items.getName(`E2E ${item}`).uuid }),
			);
		},

		async menu(target) {
			const labels = (await openMenu(target)).map((item) => text(item.querySelector('.menu-label')));
			document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
			// The menu closes with an animation.
			await settle();
			return labels;
		},

		async clickMenu({ label, answer, ...target }) {
			const item = (await openMenu(target)).find((element) => text(element.querySelector('.menu-label')) === label);
			if (!item) throw new Error(`No menu item ${label} for ${JSON.stringify(target)}`);
			let dialog: ConfirmDialog | null = null;
			const observed = await observe(target.actor, async () => {
				item.click();
				if (answer) {
					await settle();
					dialog = await window.e2e.answerConfirm(answer);
				}
			});
			return answer ? { ...observed, dialog } : observed;
		},

		async rollSkill({ actor: name, skill }) {
			await closePrompts();
			const container = await menuContainer({ actor: name, kind: 'skill', name: skill });
			container.querySelector<HTMLElement>(':scope > a')!.click();
			return readPrompt();
		},

		async attack({ actor: name, weapon, target: targetName }) {
			await closePrompts();
			target(targetName);
			const root = await sheet(name);
			const link = await waitFor(`the weapon ${weapon}`, () =>
				[...root.querySelectorAll<HTMLElement>('.weapon.menu-container > a')].find((element) =>
					text(element).includes(`E2E ${weapon}`),
				),
			);
			link.click();
			const state = await readPrompt();
			target(null);
			return state;
		},

		async sheetInputs({ actor: name, names }) {
			const root = await sheet(name);
			return Object.fromEntries(
				names.map((inputName) => [inputName, root.querySelector<HTMLInputElement>(`input[name="${inputName}"]`)?.value ?? '']),
			);
		},

		async silhouetteField(name) {
			const root = await sheet(name);
			const input = root.querySelector<HTMLInputElement>('input[name="system.silhouette"]');
			if (!input) return null;
			const place = input.closest('.character-meta')
				? 'character meta'
				: input.closest('.adversary-sheet > header')
					? 'adversary header'
					: 'elsewhere';
			// An adversary's label holds its input, a character's sits before it.
			const label = input.closest('label') ?? input.previousElementSibling;
			return { place, label: text(label), value: input.value, min: input.min, step: input.step };
		},

		async characteristicAlignment({ actor: name }) {
			const root = await sheet(name);
			return Object.fromEntries(
				[...root.querySelectorAll('.characteristic-field')].map((field) => {
					const value = field.querySelector(':scope > .value > input, :scope > .value > div')!;
					return [text(field.querySelector('label')), `${value.localName} ${getComputedStyle(value).textAlign}`];
				}),
			);
		},

		async typeInSheet({ actor: name, name: inputName, value, path }) {
			const root = await sheet(name);
			const input = await waitFor(`the field ${inputName}`, () => root.querySelector<HTMLInputElement>(`input[name="${inputName}"]`));
			input.value = value;
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
			return foundry.utils.getProperty(actor(name), path);
		},

		async update({ actor: name, data }) {
			await actor(name).update(data);
		},

		async hud({ actor: name, bar, input: change, path }) {
			const hud = canvas.hud.token;
			hud.clear();
			await settle();
			const bound = token(name);
			const current = String(bound.document.getBarAttribute(bar).value);
			await hud.bind(bound);
			// The HUD shows the bar's current value once it is bound to this token.
			const input = await waitFor(`the Token HUD's ${bar} of ${name}`, () => {
				const found = document.querySelector<HTMLInputElement>(`#token-hud input[name="${bar}"]`);
				return found?.value === current && found;
			});
			input.value = change;
			// The HUD submits a bar's input when it changes.
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
			hud.clear();
			return foundry.utils.getProperty(actor(name), path);
		},

		async weaponRows(name) {
			const root = await sheet(name);
			return weaponLinks(root).map((link) => ({
				name: weaponRowName(link),
				details: [...link.querySelectorAll('.weapon-details > span:not(.weapon-qualities)')].map(text),
				qualities: [...link.querySelectorAll('.weapon-qualities > *')].map(text),
			}));
		},

		async attackFromRow({ actor: name, row, target: targetName }) {
			await closePrompts();
			const root = await sheet(name);
			// A build without Weapon Profiles shows no row for an extra profile.
			const link = weaponLinks(root).find((candidate) => weaponRowName(candidate) === row);
			if (!link) return null;
			target(targetName);
			link.click();
			const select = await waitFor('the Dice Prompt skill select', () => {
				const open = apps('app-dice-prompt');
				return open.length === 1 && htmlOf(open[0])?.querySelector<HTMLSelectElement>('select[name=skill]');
			});
			// The skill is selected once the check is resolved.
			await settle();
			const skill = text(select.selectedOptions[0]);
			const { modifications } = await readPrompt();
			target(null);
			return { skill, defense: modifications.filter(({ name }) => name.endsWith('Defense')) };
		},

		async grantObserver({ user, actors }) {
			const userId = game.users.getName(user).id;
			for (const name of actors) {
				await actor(name).update({ [`ownership.${userId}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER });
			}
		},

		async descriptionArea({ actor: name }) {
			return measureArea(await statsTab(name));
		},

		async openDescription({ actor: name }) {
			const root = await statsTab(name);
			editorOf(root)!.querySelector<HTMLElement>(':scope > prose-mirror > button.toggle')!.click();
			const editor = await openEditor(name);
			await settle();
			return measureEditor(editor);
		},

		async toggleDescriptionSource({ actor: name }) {
			const editor = await openEditor(name);
			const source = !sourceOf(editor);
			editor.querySelector<HTMLElement>('menu button[data-action="source-code"]')!.click();
			await waitFor(`the ${source ? 'HTML source' : 'rich text'} of the description of ${name}`, () => !!sourceOf(editor) === source);
			await settle();
			return measureEditor(editor);
		},

		async saveDescription({ actor: name }) {
			const editor = await openEditor(name);
			editor.querySelector<HTMLElement>('menu button[data-action="save"]')!.click();
			const root = await statsTab(name);
			await waitFor(`the closed description editor of ${name}`, () =>
				editorOf(root)?.querySelector(':scope > prose-mirror.inactive'),
			);
			await settle();
			return measureArea(root);
		},
	};
}

// The scenario edits a token's bars in its HUD, on the canvas.
export const needsCanvas = true;

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	await gm.evaluate(installAdversariesHelpers);
	await gm.evaluate(() => window.adversariesE2E.setUp());

	const adversaries: Adversary[] = ['Grunts', 'Rival', 'Nemesis'];
	const drop = (actor: string, item: string) => gm.evaluate((args) => window.adversariesE2E.drop(args), { actor, item });
	const menu = (actor: string, kind: 'skill' | 'talent', name: string) =>
		gm.evaluate((args) => window.adversariesE2E.menu(args), { actor, kind, name });
	const clickMenu = (actor: string, kind: 'skill' | 'talent', name: string, label: string, answer?: 'yes' | 'no') =>
		gm.evaluate((args) => window.adversariesE2E.clickMenu(args), { actor, kind, name, label, ...(answer ? { answer } : {}) });
	const update = (actor: string, data: object) => gm.evaluate((args) => window.adversariesE2E.update(args), { actor, data });
	const byAdversary = async <T>(names: Adversary[], action: (name: Adversary) => Promise<T>) => {
		const results: Partial<Record<Adversary, T>> = {};
		for (const name of names) results[name] = await action(name);
		return results;
	};

	// Each actor type's data model sets its prototype token when the actor is created.
	const prototypeTokens = await gm.evaluate(() =>
		Object.fromEntries(
			['Grunts', 'Rival', 'Nemesis', 'Hero', 'Wagon'].map((name) => [name, window.adversariesE2E.prototypeToken(name)]),
		),
	);
	e2e.expect('#246 an actor created gets the token bars, link and disposition of its type', prototypeTokens, {
		Grunts: { bar1: 'wounds', bar2: 'members', actorLink: false, disposition: -1 },
		Rival: { bar1: 'wounds', bar2: null, actorLink: false, disposition: -1 },
		Nemesis: { bar1: 'wounds', bar2: 'strain', actorLink: true, disposition: -1 },
		Hero: { bar1: 'wounds', bar2: 'strain', actorLink: true, disposition: 1 },
		Wagon: { bar1: 'trauma', bar2: 'strain', actorLink: true, disposition: -1 },
	});

	// A: drops on a minion, a rival and a nemesis (§#131).
	const skillDrops = await byAdversary(adversaries, async (name) => [await drop(name, 'Stealth'), await drop(name, 'Stealth')]);
	const rivalSkillDrops = (name: Adversary) => ({
		first: skillDrops[name]![0],
		second: skillDrops[name]![1],
	});
	e2e.expect(
		'#131 A1 a new skill dropped on a rival or nemesis is created at rank 1 in one write, and raised to rank 2 by a second drop',
		{ Rival: rivalSkillDrops('Rival'), Nemesis: rivalSkillDrops('Nemesis') },
		Object.fromEntries(
			['Rival', 'Nemesis'].map((name) => [
				name,
				{
					first: { items: ['skill Stealth 1'], writes: ['create Stealth 1'], notifications: [] },
					second: { items: ['skill Stealth 2'], writes: ['update Stealth 2'], notifications: [] },
				},
			]),
		),
	);
	e2e.expect("#131 A2 a skill dropped on a minion keeps the skill's own rank, and a second drop is refused silently", skillDrops.Grunts, [
		{ items: ['skill Stealth 3'], writes: ['create Stealth 3'], notifications: [] },
		{ items: ['skill Stealth 3'], writes: [], notifications: [] },
	]);

	// Each drop below is checked by its writes and notifications, and by the actor's items after the second drop.
	const dropTwice = (item: string) =>
		byAdversary(adversaries, async (name) => {
			const first = await drop(name, item);
			const second = await drop(name, item);
			return { first: { writes: first.writes, notifications: first.notifications }, second };
		});
	const eachAdversary = (expected: (name: Adversary) => unknown) => Object.fromEntries(adversaries.map((name) => [name, expected(name)]));
	const stealth = (name: Adversary) => `skill Stealth ${name === 'Grunts' ? 3 : 2}`;
	const created = (write: string) => ({ writes: [write], notifications: [] });

	e2e.expect(
		'#131 A3 a ranked talent dropped twice on a minion, a rival and a nemesis reaches rank 2',
		await dropTwice('Toughened'),
		eachAdversary((name) => ({
			first: created('create Toughened 1'),
			second: { items: [stealth(name), 'talent Toughened 2'], writes: ['update Toughened 2'], notifications: [] },
		})),
	);
	e2e.expect(
		'#131 A4 a non-ranked talent dropped on an adversary that has it is refused with "Unable to add", its rank unchanged',
		await dropTwice('Grit'),
		eachAdversary((name) => ({
			first: created('create Grit 1'),
			second: {
				items: [stealth(name), 'talent Grit 1', 'talent Toughened 2'],
				writes: [],
				notifications: ['info: Unable to add E2E Grit; It is not a ranked talent, and you already have it!'],
			},
		})),
	);
	e2e.expect(
		'#131 A5 an ability dropped on an adversary that has it is refused silently',
		await dropTwice('Swarm'),
		eachAdversary((name) => ({
			first: created('create Swarm'),
			second: { items: ['ability Swarm', stealth(name), 'talent Grit 1', 'talent Toughened 2'], writes: [], notifications: [] },
		})),
	);
	e2e.expect(
		'#131 A6 a Critical Injury dropped on an adversary is created',
		await byAdversary(adversaries, async (name) => (await drop(name, 'Gash')).writes),
		eachAdversary(() => ['create Gash']),
	);

	// B: the menus of an adversary's talents and skills (§#131).
	e2e.expect(
		"#131 B1 a non-ranked talent's menu on an adversary offers no Rank Up and Rank Down, a ranked talent's does",
		await byAdversary(adversaries, async (name) => ({
			Grit: await menu(name, 'talent', 'Grit'),
			Toughened: await menu(name, 'talent', 'Toughened'),
		})),
		Object.fromEntries(
			adversaries.map((name) => [name, { Grit: ['Edit', 'Delete'], Toughened: ['Rank Up', 'Rank Down', 'Edit', 'Delete'] }]),
		),
	);
	e2e.expect(
		'#131 B2 the skill menu of a rival or nemesis says "Rank Up (Free)" and "Rank Down (Free)", a minion\'s has no ranks',
		await byAdversary(adversaries, (name) => menu(name, 'skill', 'Stealth')),
		{
			Grunts: ['Edit', 'Delete'],
			Rival: ['Rank Up (Free)', 'Rank Down (Free)', 'Edit', 'Delete'],
			Nemesis: ['Rank Up (Free)', 'Rank Down (Free)', 'Edit', 'Delete'],
		},
	);

	// C: rank changes from the menus (§#114, §#131).
	const freeRanks = await byAdversary(['Rival', 'Nemesis'], async (name) => {
		const writes: string[][] = [];
		writes.push((await clickMenu(name, 'skill', 'Stealth', 'Rank Up (Free)')).writes);
		for (let step = 0; step < 4; step++) writes.push((await clickMenu(name, 'skill', 'Stealth', 'Rank Down (Free)')).writes);
		return writes;
	});
	e2e.expect(
		"#114 C1 Free Rank Up and Down on a rival's or nemesis's skill change its rank by one, and Rank Down at 0 leaves 0",
		freeRanks,
		Object.fromEntries(
			['Rival', 'Nemesis'].map((name) => [
				name,
				[['update Stealth 3'], ['update Stealth 2'], ['update Stealth 1'], ['update Stealth 0'], []],
			]),
		),
	);

	const talentRanks = await byAdversary(adversaries, async (name) => {
		const writes: string[][] = [(await clickMenu(name, 'talent', 'Toughened', 'Rank Up')).writes];
		let last: Observed | undefined;
		for (let step = 0; step < 3; step++) {
			// The last Rank Down deletes the talent, once Yes is answered (§#252).
			last = await clickMenu(name, 'talent', 'Toughened', 'Rank Down', step === 2 ? 'yes' : undefined);
			writes.push(last.writes);
		}
		return { writes, talents: last!.items.filter((item) => item.startsWith('talent')) };
	});
	e2e.expect(
		'#131 C2 Rank Up and Rank Down a ranked talent of a minion, a rival and a nemesis change its rank, and delete it below rank 1',
		talentRanks,
		eachAdversary(() => ({
			writes: [['update Toughened 3'], ['update Toughened 2'], ['update Toughened 1'], ['delete Toughened 1']],
			talents: ['talent Grit 1'],
		})),
	);

	// §#252: the Delete of an adversary's menus asks first.
	const answer = (yesOrNo: 'yes' | 'no') => gm.evaluate((value) => window.e2e.answerConfirm(value), yesOrNo);
	const rivalTalents = async () =>
		(await gm.evaluate(() => window.adversariesE2E.items('Rival'))).filter((item) => item.startsWith('talent'));
	let asked: Awaited<ReturnType<typeof answer>> = null;
	await e2e.step("#252 E1 the Rival's Grit deleted from its menu, and No answered", async () => {
		await clickMenu('Rival', 'talent', 'Grit', 'Delete');
		asked = await answer('no');
	});
	e2e.expect(
		"#252 E1 an adversary talent's Delete asks in Foundry's deletion dialog, which names the talent, No by default, and No keeps it",
		{ asked, talents: await rivalTalents() },
		{
			asked: {
				application: 'DialogV2',
				title: 'Delete Item: E2E Grit',
				content: 'Are You Sure? This Item will be permanently deleted and cannot be recovered.',
				buttons: ['yes', 'no'],
				defaultButton: 'no',
			},
			talents: ['talent Grit 1'],
		},
	);
	await e2e.step("#252 E2 the Rival's Grit deleted from its menu, and Yes answered", async () => {
		await clickMenu('Rival', 'talent', 'Grit', 'Delete');
		asked = await answer('yes');
	});
	e2e.expect("#252 E2 Yes deletes the adversary's talent", await rivalTalents(), []);

	// §#252: a Rank Down that deletes a talent asks first, as the inventory's step down to deletion does.
	let rankDown: Awaited<ReturnType<typeof clickMenu>> | undefined;
	await e2e.step('#252 E3 Toughened dropped on the Nemesis at rank 1, then its Rank Down clicked, and No answered', async () => {
		await drop('Nemesis', 'Toughened');
		rankDown = await clickMenu('Nemesis', 'talent', 'Toughened', 'Rank Down', 'no');
	});
	e2e.expect(
		"#252 E3 an adversary talent's Rank Down below rank 1 asks in the step's own dialog, No by default, and No keeps the talent at rank 1",
		{ dialog: rankDown?.dialog, writes: rankDown?.writes, talents: rankDown?.items.filter((item) => item.startsWith('talent')) },
		{
			dialog: {
				application: 'DialogV2',
				title: 'Confirm Removal',
				content: 'This will remove the item. Do you want to proceed?',
				buttons: ['yes', 'no'],
				defaultButton: 'no',
			},
			writes: [],
			talents: ['talent Grit 1', 'talent Toughened 1'],
		},
	);
	await e2e.step("#252 E4 the Nemesis's Toughened Rank Down clicked again, and Yes answered", async () => {
		rankDown = await clickMenu('Nemesis', 'talent', 'Toughened', 'Rank Down', 'yes');
	});
	e2e.expect(
		'#252 E4 Yes deletes the talent below rank 1',
		{ writes: rankDown?.writes, talents: rankDown?.items.filter((item) => item.startsWith('talent')) },
		{ writes: ['delete Toughened 1'], talents: ['talent Grit 1'] },
	);

	// The Grunts have Agility 3, three members of wound threshold 5, and the skill Stealth at rank 3 of its own.
	const rollStealth = () => gm.evaluate(() => window.adversariesE2E.rollSkill({ actor: 'Grunts', skill: 'Stealth' }));
	const threeStanding = await rollStealth();
	await update('Grunts', { 'system.wounds.value': 6 });
	const twoStanding = await rollStealth();
	e2e.expect(
		"#131 C3 a minion rolls a skill at its group's skill rank, one per member standing beyond the first",
		{ threeStanding: threeStanding.pool, twoStanding: twoStanding.pool },
		{ threeStanding: 'PPA|DD', twoStanding: 'PAA|DD' },
	);
	await update('Grunts', { 'system.wounds.value': 0 });

	// D: an adversary's defense above 4 (§#194). The Rival's defense is raised by an Active Effect.
	await update('Grunts', { 'system.defense': { melee: 6, ranged: 5 } });
	await update('Rival', { 'system.defense': { melee: 2, ranged: 1 } });
	await gm.evaluate(() =>
		game.actors.getName('E2E Rival').createEmbeddedDocuments('ActiveEffect', [
			{
				name: 'E2E Shield',
				changes: [
					{ key: 'system.defense.melee', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: '3' },
					{ key: 'system.defense.ranged', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: '4' },
				],
			},
		]),
	);
	await update('Nemesis', { 'system.defense': { melee: 5, ranged: 3 } });
	const defenseRows = await byAdversary(adversaries, async (name) => {
		const rows: Record<string, PromptState['modifications']> = {};
		for (const weapon of ['Knife', 'Bow']) {
			rows[weapon] = (
				await gm.evaluate((args) => window.adversariesE2E.attack(args), { actor: 'Attacker', weapon, target: name })
			).modifications.filter(({ name }) => name.endsWith('Defense'));
		}
		return rows;
	});
	const defenseRow = (range: string, count: number) => [
		{ name: `From Target: ${range} Defense`, mods: Array(count).fill('S+').join(' ') },
	];
	e2e.expect(
		'#194 D1 an attack against an adversary with a defense above 4, typed in or raised by an Active Effect, adds four Setback',
		defenseRows,
		{
			Grunts: { Knife: defenseRow('Melee', 4), Bow: defenseRow('Ranged', 4) },
			Rival: { Knife: defenseRow('Melee', 4), Bow: defenseRow('Ranged', 4) },
			Nemesis: { Knife: defenseRow('Melee', 4), Bow: defenseRow('Ranged', 3) },
		},
	);
	e2e.expect(
		'#194 D2 the adversary sheet shows the defense above 4 that the attack counts as 4',
		await byAdversary(adversaries, (actor) =>
			gm.evaluate((args) => window.adversariesE2E.sheetInputs(args), {
				actor,
				names: ['system.defense.melee', 'system.defense.ranged'],
			}),
		),
		{
			Grunts: { 'system.defense.melee': '6', 'system.defense.ranged': '5' },
			Rival: { 'system.defense.melee': '5', 'system.defense.ranged': '5' },
			Nemesis: { 'system.defense.melee': '5', 'system.defense.ranged': '3' },
		},
	);

	// E: token bar changes from the Token HUD (§#195).
	const hud = async (actor: string, bar: 'bar1' | 'bar2', path: string, from: number, input: string) => {
		await update(actor, { [path]: from });
		return gm.evaluate((args) => window.adversariesE2E.hud(args), { actor, bar, input, path });
	};
	const WOUNDS = 'system.wounds.value';
	const STRAIN = 'system.strain.value';
	e2e.expect(
		'#195 E1 a character with wound threshold 12 from the Token HUD: -5 on 2 wounds leaves 0, +10 on 20 leaves 24, 30 typed leaves 24, +5 on 9 strain leaves 14',
		{
			'-5 on 2 wounds': await hud('Hero', 'bar1', WOUNDS, 2, '-5'),
			'+10 on 20 wounds': await hud('Hero', 'bar1', WOUNDS, 20, '+10'),
			'30 typed on 5 wounds': await hud('Hero', 'bar1', WOUNDS, 5, '30'),
			'+5 on 9 strain': await hud('Hero', 'bar2', STRAIN, 9, '+5'),
		},
		{ '-5 on 2 wounds': 0, '+10 on 20 wounds': 24, '30 typed on 5 wounds': 24, '+5 on 9 strain': 14 },
	);
	e2e.expect(
		"#195 E2 from the Token HUD a rival's wounds go past their threshold; a nemesis's strain, a Minion Group's wounds and a vehicle's hull trauma and system strain stop at 0",
		{
			'rival +15 on 8 wounds': await hud('Rival', 'bar1', WOUNDS, 8, '+15'),
			'nemesis -5 on 3 strain': await hud('Nemesis', 'bar2', STRAIN, 3, '-5'),
			'minion -5 on 3 wounds': await hud('Grunts', 'bar1', WOUNDS, 3, '-5'),
			'vehicle -3 on 1 hull trauma': await hud('Wagon', 'bar1', 'system.hullTrauma.value', 1, '-3'),
			'vehicle =-2 typed on 4 system strain': await hud('Wagon', 'bar2', 'system.systemStrain.value', 4, '=-2'),
		},
		{
			'rival +15 on 8 wounds': 23,
			'nemesis -5 on 3 strain': 0,
			'minion -5 on 3 wounds': 0,
			'vehicle -3 on 1 hull trauma': 0,
			'vehicle =-2 typed on 4 system strain': 0,
		},
	);

	// The character sheet's number fields (§#195).
	const typeInSheet = (path: string, value: string) =>
		gm.evaluate((args) => window.adversariesE2E.typeInSheet(args), { actor: 'Hero', name: path, value, path });
	e2e.expect(
		"#195 E3 the character sheet's wounds field takes a value past twice the wound threshold",
		await typeInSheet(WOUNDS, '40'),
		40,
	);
	e2e.expect(
		"#195 E4 a value below 0 typed in the character sheet's current wounds or strain field becomes 0",
		{ '-3 typed on 40 wounds': await typeInSheet(WOUNDS, '-3'), '-3 typed on 14 strain': await typeInSheet(STRAIN, '-3') },
		{ '-3 typed on 40 wounds': 0, '-3 typed on 14 strain': 0 },
	);

	// Rivals' and nemeses' wounds and strain are whole numbers, as a character's are (§#269).
	const typeInAdversary = (actor: Adversary, path: string, value: string) =>
		gm.evaluate((args) => window.adversariesE2E.typeInSheet(args), { actor, name: path, value, path });
	e2e.expect(
		"#269 E5 a fraction typed in a rival's or a nemesis's wounds or strain field is stored rounded to a whole number",
		{
			'rival wound threshold 12.4': await typeInAdversary('Rival', 'system.wounds.max', '12.4'),
			'nemesis current strain 2.6': await typeInAdversary('Nemesis', STRAIN, '2.6'),
		},
		{ 'rival wound threshold 12.4': 12, 'nemesis current strain 2.6': 3 },
	);
	e2e.expect(
		"#269 E6 a rival's or a nemesis's wounds and strain stored as fractions, before they were whole numbers, read rounded",
		await gm.evaluate(() => {
			const read = (type: string, system: object) => {
				const { wounds, strain } = new Actor.implementation({ name: 'E2E Fractions', type, system }).system;
				return { wounds: { ...wounds }, ...(strain && { strain: { ...strain } }) };
			};
			return {
				rival: read('rival', { wounds: { value: 2.6, max: 10.4 } }),
				nemesis: read('nemesis', { wounds: { value: 1.2, max: 12.6 }, strain: { value: 0.4, max: 13.2 } }),
			};
		}),
		{
			rival: { wounds: { value: 3, max: 10 } },
			nemesis: { wounds: { value: 1, max: 13 }, strain: { value: 0, max: 13 } },
		},
	);

	// F: the characteristic values in their circle (§#300).
	const alignment = (actor: string) => gm.evaluate((args) => window.adversariesE2E.characteristicAlignment(args), { actor });
	const characteristics = (element: string) =>
		Object.fromEntries(
			['Brawn', 'Agility', 'Intellect', 'Cunning', 'Willpower', 'Presence'].map((label) => [label, `${element} center`]),
		);
	e2e.expect(
		"#300 F1 an adversary's and a vehicle's editable characteristic values are centered in their circle, like a character's read-only ones",
		{
			Grunts: await alignment('Grunts'),
			Rival: await alignment('Rival'),
			Nemesis: await alignment('Nemesis'),
			Hero: await alignment('Hero'),
			Wagon: await alignment('Wagon'),
		},
		{
			Grunts: characteristics('input'),
			Rival: characteristics('input'),
			Nemesis: characteristics('input'),
			Hero: characteristics('div'),
			Wagon: { Silhouette: 'input center', Speed: 'input center', Handling: 'input center' },
		},
	);

	// K: a rival's weapon with an extra Weapon Profile has a row per profile in its equipment list, each attacking with
	// its profile (§#366). The Attacker has Brawn and Agility 2.
	await e2e.step('#366 GM gives the Attacker a dagger with a Thrown profile', async () => {
		await gm.evaluate(
			(item) => game.actors.getName('E2E Attacker').createEmbeddedDocuments('Item', [item]),
			dagger({ main: ['E2E Melee'], thrown: ['E2E Ranged'] }),
		);
		await update('Nemesis', { 'system.defense': { melee: 2, ranged: 1 } });
	});
	e2e.expect(
		"#366 K1 the rival's equipment list shows a row per profile of the dagger, each with its own Attack Skill, damage, Critical rating, range and qualities",
		(await gm.evaluate(() => window.adversariesE2E.weaponRows('Attacker'))).filter(({ name }) => name.startsWith('E2E Dagger')),
		[
			{ name: 'E2E Dagger', details: ['E2E Melee', 'Damage 3', 'Critical 3', 'Range [Engaged]'], qualities: [] },
			{
				name: 'E2E Dagger (Thrown)',
				details: ['E2E Ranged', 'Damage 4', 'Critical 4', 'Range [Short]'],
				qualities: ['Accurate 1', 'Limited Ammo 1'],
			},
		],
	);
	const attackFromRow = (row: string) =>
		gm.evaluate((args) => window.adversariesE2E.attackFromRow(args), { actor: 'Attacker', row, target: 'Nemesis' });
	let profileAttacks: Record<string, unknown> = {};
	await e2e.step('#366 K2 GM attacks the Nemesis from the Dagger (Thrown) row, then from the Dagger row', async () => {
		profileAttacks = { thrown: await attackFromRow('E2E Dagger (Thrown)'), main: await attackFromRow('E2E Dagger') };
	});
	e2e.expect(
		"#366 K2 the Dagger (Thrown) row attacks with the Thrown profile's skill against the target's ranged defense, and the Dagger row with the main profile's against its melee defense",
		profileAttacks,
		{
			thrown: { skill: 'E2E Ranged (Ag)', defense: [{ name: 'From Target: Ranged Defense', mods: 'S+' }] },
			main: { skill: 'E2E Melee (Br)', defense: [{ name: 'From Target: Melee Defense', mods: 'S+ S+' }] },
		},
	);

	// G: a minion's open sheet follows its independentMinion flag (§#343).
	const woundFields = async () => {
		const names = ['system.wounds.threshold', 'system.wounds.value'];
		const fields = await gm.evaluate((args) => window.adversariesE2E.sheetInputs(args), { actor: 'Grunts', names });
		return names.filter((name) => fields[name] !== '');
	};
	const dependent = await woundFields();
	await e2e.step('#343 GM marks the minion of an open sheet as independent', () =>
		update('Grunts', { 'flags.genesys.independentMinion': true }),
	);
	e2e.expect(
		"#343 A3 a minion's open sheet follows its independentMinion flag: an independent minion's wounds take a current value",
		{ dependent, independent: await woundFields() },
		{ dependent: ['system.wounds.threshold'], independent: ['system.wounds.value'] },
	);

	// H: an adversary's empty description (§#359). The Grunts, the Rival and the Nemesis have none.
	const descriptionArea = (client: typeof gm, actor: string) =>
		client.evaluate((args) => window.adversariesE2E.descriptionArea(args), { actor });
	const openDescription = (actor: string) => gm.evaluate((args) => window.adversariesE2E.openDescription(args), { actor });
	const toggleSource = (actor: string) => gm.evaluate((args) => window.adversariesE2E.toggleDescriptionSource(args), { actor });
	const saveDescription = (actor: string) => gm.evaluate((args) => window.adversariesE2E.saveDescription(args), { actor });
	const compact = ({ height, toggleBottom, lineHeight }: DescriptionArea) => ({
		toggleFits: toggleBottom !== null && toggleBottom <= height + 0.5,
		atMostOneLineAndTheToggle: toggleBottom !== null && height <= toggleBottom + lineHeight,
	});
	const COMPACT = { toggleFits: true, atMostOneLineAndTheToggle: true };

	const editableAreas = await byAdversary(adversaries, (actor) => descriptionArea(gm, actor));
	e2e.log('the empty description areas of the GM', editableAreas);
	e2e.expect(
		"#359 H1 an empty description on a minion's, a rival's and a nemesis' sheet the user can edit takes the room of its edit toggle, and one line at most",
		Object.fromEntries(adversaries.map((name) => [name, compact(editableAreas[name]!)])),
		eachAdversary(() => COMPACT),
	);

	const player = await e2e.player();
	await player.evaluate(installAdversariesHelpers);
	await gm.evaluate((args) => window.adversariesE2E.grantObserver(args), { user: e2e.playerUser, actors: adversaries });
	await e2e.settle();
	const observedAreas = await byAdversary(adversaries, (actor) => descriptionArea(player, actor));
	e2e.log('the empty description areas of an observer', observedAreas);
	e2e.expect(
		"#359 H2 an empty description on a minion's, a rival's and a nemesis' sheet the user can't edit takes no room",
		Object.fromEntries(adversaries.map((name) => [name, observedAreas[name]!.height])),
		eachAdversary(() => 0),
	);
	await player.evaluate(() => window.e2e.closeSetUp());

	const openEmpty = await openDescription('Rival');
	e2e.log('the open editor of an empty description', openEmpty);
	e2e.expect(
		"#359 H3 the opened editor of an empty description takes the editor's minimum height, 150px or more",
		{ source: openEmpty.source, atLeast150: openEmpty.height >= 150 },
		{ source: false, atLeast150: true },
	);
	e2e.expect(
		'#359 H4 saving an empty description closes its editor, back to the room of its edit toggle',
		compact(await saveDescription('Rival')),
		COMPACT,
	);

	// I: a description of 25 paragraphs, in rich text and in HTML source (§#359).
	const closedText = await descriptionArea(gm, 'Chronicle');
	e2e.log('the description area of 25 paragraphs', closedText);
	e2e.expect(
		'#359 I1 a description of 25 paragraphs, its editor closed, shows them all: its last paragraph ends within its area',
		closedText.textBottom !== null && closedText.textBottom <= closedText.height + 0.5,
		true,
	);
	const richText = await openDescription('Chronicle');
	e2e.log('the open editor of 25 paragraphs, in rich text', richText);
	e2e.expect(
		'#359 I2 the opened editor of 25 paragraphs grows with its rich text, without scrolling inside',
		{ source: richText.source, scrolls: richText.scrolls },
		{ source: false, scrolls: false },
	);
	const htmlSource = await toggleSource('Chronicle');
	e2e.log('the open editor of 25 paragraphs, in HTML source', htmlSource);
	e2e.expect(
		'#359 I3 the HTML source editor of 25 paragraphs shows every line: its scrolling content is as tall as its HTML',
		{
			source: htmlSource.source,
			scrolls: htmlSource.scrolls,
			showsEveryLine: htmlSource.content.scrollHeight === htmlSource.content.clientHeight,
			// CodeMirror's base theme positions the scroller, which holds its cursor and selection layers.
			sourcePosition: htmlSource.sourcePosition,
		},
		{ source: true, scrolls: false, showsEveryLine: true, sourcePosition: 'relative' },
	);
	e2e.expect(
		'#359 I4 back in rich-text mode, the editor of 25 paragraphs is as tall as before its HTML source',
		await toggleSource('Chronicle'),
		richText,
	);
	const savedText = await saveDescription('Chronicle');
	e2e.expect(
		'#359 I5 saving the description of 25 paragraphs closes its editor, back to the height of its area before',
		Math.round(savedText.height),
		Math.round(closedText.height),
	);

	// J: the silhouette of characters and Adversaries (§#380).
	const characterAndAdversaries = ['Hero', 'Grunts', 'Rival', 'Nemesis'];
	e2e.expect(
		'#380 J1 a character or an Adversary stored before it had a silhouette reads 1, and a new one is created at 1',
		await gm.evaluate((names) => {
			const stored = (name: string) => {
				const data = game.actors.getName(`E2E ${name}`).toObject();
				delete data.system.silhouette;
				return new Actor.implementation(data).system.silhouette;
			};
			return {
				stored: Object.fromEntries(names.map((name) => [name, stored(name)])),
				created: Object.fromEntries(names.map((name) => [name, game.actors.getName(`E2E ${name}`)._source.system.silhouette])),
			};
		}, characterAndAdversaries),
		{
			stored: { Hero: 1, Grunts: 1, Rival: 1, Nemesis: 1 },
			created: { Hero: 1, Grunts: 1, Rival: 1, Nemesis: 1 },
		},
	);
	const silhouetteFields: Record<string, unknown> = {};
	for (const actor of characterAndAdversaries) {
		silhouetteFields[actor] = await gm.evaluate((name) => window.adversariesE2E.silhouetteField(name), actor);
	}
	const expectedSilhouetteField = (place: string) => ({ place, label: 'Silhouette', value: '1', min: '0', step: '1' });
	e2e.expect("#380 J2 the silhouette is edited in the character's meta block and under an Adversary's name", silhouetteFields, {
		Hero: expectedSilhouetteField('character meta'),
		Grunts: expectedSilhouetteField('adversary header'),
		Rival: expectedSilhouetteField('adversary header'),
		Nemesis: expectedSilhouetteField('adversary header'),
	});
	const typeSilhouette = (actor: string, value: string) =>
		gm.evaluate((args) => window.adversariesE2E.typeInSheet(args), {
			actor,
			name: 'system.silhouette',
			value,
			path: 'system.silhouette',
		});
	e2e.expect(
		'#380 J3 a silhouette typed in a sheet is stored, from 0 and without maximum; a negative one becomes 0, a fraction is rounded',
		{
			'Grunts 0': await typeSilhouette('Grunts', '0'),
			'Nemesis 12': await typeSilhouette('Nemesis', '12'),
			'Hero -2': await typeSilhouette('Hero', '-2'),
			'Rival 2.6': await typeSilhouette('Rival', '2.6'),
		},
		{ 'Grunts 0': 0, 'Nemesis 12': 12, 'Hero -2': 0, 'Rival 2.6': 3 },
	);

	await update('Attacker', { 'system.silhouette': 3 });
	await update('Hero', { 'system.silhouette': 1 });
	e2e.expect(
		'#380 J4 a silhouette 3 Adversary attacking a silhouette 1 character lists a target Pool Modification adding one Difficulty die',
		(
			await gm.evaluate((args) => window.adversariesE2E.attack(args), { actor: 'Attacker', weapon: 'Knife', target: 'Hero' })
		).modifications.filter(({ name }) => name.includes('Silhouette')),
		[{ name: 'From Target: Silhouette (1 vs 3)', mods: 'D+' }],
	);

	await gm.evaluate(() => window.adversariesE2E.cleanUp());
}
