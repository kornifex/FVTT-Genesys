/** @file #211: the Dice Prompt and checks: the pool a check rolls, its Pool Modifications, its links, its chance to succeed and its messages. */
import type { Client, ScenarioContext } from '../scenario.ts';

/**
 * A document whose sheet holds what a step clicks or reads, named without its `E2E ` prefix: an actor, an item it
 * owns, a world item or a journal entry.
 */
type Doc = { actor: string; item?: string } | { item: string } | { journal: string };

/**
 * The Dice Prompt as the user sees it.
 */
type PromptState = {
	/** The actor rolling, without its `E2E ` prefix. */
	actor: string | null;
	/** The dice and symbols of the pool preview, positive then negative: `PAA|DD`. */
	pool: string;
	characteristic: { value: string; disabled: boolean; options: string[] } | null;
	/** The selected skill option. */
	skill: string | null;
	/** The skill options by group label, '' for the options outside a group. */
	skills: Record<string, string[]> | null;
	/** The Pool Modification rows: their label, checkbox and modifications (`S+` adds a Setback). */
	modifications: { name: string; enabled: boolean; mods: string }[];
	/** The chance to succeed shown, `spinner` while it is computed, null when the prompt shows none. */
	chance: string | null;
};

/**
 * A chat message of a roll, as the user reads it.
 */
type MessageSummary = {
	id: string;
	speaker: string | null;
	description: string | null;
	formula: string | null;
	/** The net results row: `s a t` for a Success, an Advantage and a Triumph. */
	results: string;
	/** Each summary table, as text. */
	summaries: string[];
	whisper: number;
	blind: boolean;
};

type CheckLink = { skill: string | null; difficulty: string | null; text: string };

type DicePromptHelpers = {
	settings(user: string): Settings;
	restore(args: { user: string; settings: Settings }): Promise<void>;
	setUp(user: string): Promise<void>;
	setSetting(args: { key: string; value: unknown }): Promise<void>;
	update(args: { doc: Doc; data: object }): Promise<void>;
	/** The open Dice Prompts. */
	openPrompts(): number;
	waitForPrompt(): Promise<PromptState>;
	closePrompts(): Promise<void>;
	/** Picks an option of the prompt's select: a characteristic by value, a skill by the start of its text. */
	promptSelect(args: { name: 'characteristic' | 'skill'; option: string }): Promise<PromptState>;
	promptToggle(name: string): Promise<PromptState>;
	/** Clicks the dice box's buttons, named by glyph and operator: `A+` adds an Ability die, `A^` upgrades one. */
	promptAdd(keys: string[]): Promise<PromptState>;
	/** Removes a die or symbol of the pool preview, as a click on it does. */
	promptRemove(glyph: string): Promise<PromptState>;
	/** Waits until the prompt shows this chance to succeed, then returns the chance it shows. */
	promptChance(args: { expected: string; timeout: number }): Promise<string | null>;
	promptRoll(): Promise<MessageSummary>;
	lastMessage(): MessageSummary;
	/** Clicks the element at a path of a document's sheet, which it renders if needed. */
	click(args: { doc: Doc; path: string }): Promise<void>;
	change(args: { doc: Doc; path: string; value: string }): Promise<void>;
	texts(args: { doc: Doc; selector: string }): Promise<string[]>;
	/** The entries of the context menu of the element at a path. */
	menu(args: { doc: Doc; path: string }): Promise<string[]>;
	combatWeapons(actor: string): Promise<{ name: string; link: boolean; skill: string; choices: string[] | null }[]>;
	adversaryWeapons(actor: string): Promise<{ text: string; choices: string[] | null }[]>;
	inventoryWeapons(actor: string): Promise<{ name: string; attack: boolean; skill: string }[]>;
	closeSheets(): Promise<void>;
	links(doc: Doc | { message: string }): Promise<CheckLink[]>;
	clickLink(args: { doc: Doc | { message: string }; skill: string | null; difficulty?: string }): Promise<void>;
	pools(doc: Doc): Promise<{ text: string; icons: string }[]>;
	control(names: string[]): void;
	chatMessage(content: string): Promise<string>;
	notifications(): string[];
	clearNotifications(): void;
	/** Saves and submits an effect's sheet, then returns the effect's changes and the skill its sheet's select showed. */
	saveEffectSheet(args: { actor: string; item?: string; effect: string }): Promise<{ selected: string[]; changes: string[] }>;
	storyPoints(): { setting: { gm: number; player: number }; shown: string[]; spendable: boolean[] };
	clickStoryPoints(which: 'reset' | 'gm' | 'player'): Promise<void>;
	/** Creates the world compendium `E2E Skills`, holding the skill `E2E Lore`. */
	createSkillsPack(): Promise<void>;
	renameSkill(name: string): Promise<void>;
	/** Makes the chance worker receive a pool it can't count, or the pools again. */
	breakChanceWorker(broken: boolean): void;
};

type Settings = Record<string, unknown> & { character: string | null };

declare global {
	interface Window {
		dicePromptE2E: DicePromptHelpers;
	}
}

/**
 * Installs `window.dicePromptE2E`. Playwright sends this function's source to the page, so it uses nothing from this
 * module.
 */
function installDicePromptHelpers() {
	const { sleep, settle, waitFor, render, text, unprefixed, isSetUp, htmlOf, actor, token, apps, poolPreview, poolModification } =
		window.e2e;
	const recorded = window.e2e.recordNotifications();
	const documentOf = (doc: Doc) => {
		const found =
			'journal' in doc
				? game.journal.getName(`E2E ${doc.journal}`)
				: 'actor' in doc
					? doc.item
						? actor(doc.actor).items.getName(`E2E ${doc.item}`)
						: actor(doc.actor)
					: game.items.getName(`E2E ${doc.item}`);
		if (!found) throw new Error(`No document ${JSON.stringify(doc)}`);
		return found;
	};
	const sheet = (doc: Doc) => render(documentOf(doc).sheet);
	// A path is a list of selectors, each within the previous match, separated by ` >> `; `selector|text` matches the
	// first element whose text holds that text.
	const findIn = (root: Element, path: string) =>
		path.split(' >> ').reduce<Element | undefined>((parent, step) => {
			const [selector, containing] = step.split('|');
			return parent
				? [...parent.querySelectorAll(selector)].find((element) => containing === undefined || text(element).includes(containing))
				: undefined;
		}, root) as HTMLElement | undefined;
	const find = async (doc: Doc, path: string) => {
		const root = await sheet(doc);
		return waitFor(`${path} in ${JSON.stringify(doc)}`, () => findIn(root, path));
	};
	const linkRoot = async (doc: Doc | { message: string }) =>
		'message' in doc
			? waitFor(`the message ${doc.message}`, () =>
					[...document.querySelectorAll<HTMLElement>(`[data-message-id="${doc.message}"]`)].find((element) =>
						element.querySelector('a[data-skill-check]'),
					),
				)
			: sheet(doc);
	const thePrompt = () => {
		const open = apps('app-dice-prompt');
		if (open.length !== 1) throw new Error(`${open.length} Dice Prompts are open`);
		return open[0];
	};
	// The text of an element, with its select shown as its selected option in brackets.
	const withSelect = (element: Element | null) => {
		const copy = element?.cloneNode(true) as HTMLElement | undefined;
		const select = element?.querySelector('select');
		copy?.querySelector('select')?.replaceWith(`[${text(select?.selectedOptions[0])}]`);
		return text(copy);
	};
	const promptState = (): PromptState => {
		const app = thePrompt();
		const root = htmlOf(app)!;
		const characteristic = root.querySelector<HTMLSelectElement>('select[name=characteristic]');
		const skill = root.querySelector<HTMLSelectElement>('select[name=skill]');
		let skills: Record<string, string[]> | null = null;
		if (skill) {
			skills = {};
			for (const child of skill.children) {
				if (child instanceof HTMLOptGroupElement) skills[child.label] = [...child.children].map(text);
				else (skills[''] ??= []).push(text(child));
			}
		}
		const chance = root.querySelector('.chance-to-succeed');
		return {
			actor: app.actor ? unprefixed(app.actor.name) : null,
			pool: poolPreview(root),
			characteristic: characteristic && {
				value: characteristic.value,
				disabled: characteristic.disabled,
				options: [...characteristic.options].map((option) => option.value),
			},
			skill: skill ? text(skill.selectedOptions[0]) : null,
			skills,
			modifications: [...root.querySelectorAll('.pool-modifications-effects')].map((row) => ({
				name: text(row.querySelector('label')),
				enabled: row.querySelector('input')!.checked,
				mods: [...row.querySelectorAll(':scope > div > a')].map((mod) => poolModification(mod)).join(' '),
			})),
			chance: chance ? (chance.querySelector('.fa-spinner') ? 'spinner' : text(chance.querySelector('span'))) : null,
		};
	};
	const messageSummary = (message: {
		id: string;
		content: string;
		speaker?: { actor?: string };
		rolls: { formula: string }[];
		whisper: string[];
		blind: boolean;
	}): MessageSummary => {
		const content = document.createElement('div');
		content.innerHTML = message.content;
		const speaker = message.speaker?.actor ? game.actors.get(message.speaker.actor)?.name : undefined;
		return {
			id: message.id,
			speaker: speaker ? unprefixed(speaker) : null,
			description: content.querySelector('.roll-description')?.innerHTML.trim() ?? null,
			formula: message.rolls[0]?.formula ?? null,
			results: text(content.querySelector('.net-results')),
			summaries: [...content.querySelectorAll('.summary-table')].map(text),
			whisper: message.whisper.length,
			blind: message.blind,
		};
	};
	const SETTINGS = ['uncoupleSkills', 'useSuperCharacteristics', 'defaultDifficulty', 'skillsCompendium'];
	const realPostMessage = Object.getOwnPropertyDescriptor(Worker.prototype, 'postMessage')!.value as Worker['postMessage'];

	window.dicePromptE2E = {
		settings(user) {
			return { ...window.e2e.settings(SETTINGS), character: game.users.getName(user).character?.id ?? null };
		},

		async restore({ user, settings }) {
			await window.dicePromptE2E.closePrompts();
			await window.dicePromptE2E.closeSheets();
			await window.e2e.setSettings(Object.fromEntries(SETTINGS.map((key) => [key, settings[key]])));
			await game.users.getName(user).update({ character: settings.character });
			await game.packs.get('world.e2e-skills')?.deleteCompendium();
			for (const combat of [...game.combats]) await combat.delete();
			// The tokens of the actors the next scenario deletes.
			await window.e2e.deleteSetUp('Token');
		},

		async setUp(user) {
			await canvas.scene.deleteEmbeddedDocuments(
				'Token',
				canvas.scene.tokens
					.filter((token: { name: string }) => isSetUp(token) && !['E2E Hero', 'E2E Foe'].includes(token.name))
					.map((token: { id: string }) => token.id),
			);
			await Actor.deleteDocuments(
				game.actors
					.filter((doc: { name: string }) => isSetUp(doc) && !['E2E Hero', 'E2E Foe'].includes(doc.name))
					.map((doc: { id: string }) => doc.id),
			);
			await window.e2e.deleteSetUp('Item', 'JournalEntry');
			await game.packs.get('world.e2e-skills')?.deleteCompendium();
			await game.users.getName(user).update({ character: null });

			const { OBSERVER, OWNER } = CONST.DOCUMENT_OWNERSHIP_LEVELS;
			const playerOwns = { default: 0, [game.users.getName(user).id]: OWNER };
			const skill = (name: string, characteristic: string, rank: number) => ({
				name,
				type: 'skill',
				system: { characteristic, rank, category: 'general' },
			});
			const weapon = (name: string, skills: string[], range: string) => ({
				name: `E2E ${name}`,
				type: 'weapon',
				system: { skills, range, state: 'equipped', baseDamage: 3, critical: 3 },
			});
			const effect = (name: string, key: string, value: string) => ({
				name: `E2E ${name}`,
				changes: [{ key: `genesys.pool.${key}`, value, mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM }],
			});
			const characteristics = (values: number[]) =>
				Object.fromEntries(
					['brawn', 'agility', 'intellect', 'cunning', 'willpower', 'presence'].map((name, index) => [name, values[index]]),
				);

			// A document Foundry refuses comes back undefined: the notifications tell why.
			const created = async (documents: object[]) => {
				const result = await Actor.createDocuments(documents);
				if (result.length !== documents.length) {
					throw new Error(`Actors not created: ${JSON.stringify(recorded())}`);
				}
				return result;
			};
			const [ada] = await created([
				{
					name: 'E2E Ada',
					type: 'character',
					system: { characteristics: characteristics([3, 2, 2, 2, 4, 0]), notes: '<p>@check[Athletics,3]</p>' },
					// A character created with skills gets none from the Skills Compendium.
					items: [
						skill('Cool', 'presence', 1),
						skill('Melee', 'brawn', 3),
						skill('Brawl', 'brawn', 1),
						skill('Ranged (light)', 'agility', 2),
						weapon('Spear', ['Brawl', 'Melee', 'Ranged'], 'engaged'),
						weapon('Pistol', ['Ranged (Light)'], 'medium'),
						weapon('Stick', [], 'engaged'),
						weapon('Blaster', ['Piloting (Space)'], 'short'),
						weapon('Club', ['Melee', 'melee'], 'engaged'),
						{ name: 'E2E Gash', type: 'injury', system: { severity: 'average' } },
						{
							name: 'E2E Map',
							type: 'gear',
							system: { description: '<p>@check[Cool,2^1]</p>' },
							effects: [effect('Charm', 'skill.self.E2E Craft', 'a')],
						},
					],
					effects: [
						effect('Focus', 'check.self.', 'a'),
						effect('Poise', 'char.self.presence', 'S'),
						effect('Steady', 'char.self.willpower', 'B'),
						effect('Sights', 'skill.self.Ranged (Light)', 'B'),
						effect('Nerve', 'skill.self.Cool', 'B'),
						effect('Knack', 'skill.self.E2E Craft', 'B'),
					],
				},
			]);
			await created([
				{
					name: 'E2E Rival',
					type: 'rival',
					ownership: { default: OBSERVER },
					system: {
						characteristics: characteristics([2, 3, 2, 2, 2, 2]),
						defense: { melee: 1, ranged: 2 },
						description: '<p>@check[Athletics,3]</p>',
					},
					items: [skill('Melee', 'brawn', 2), weapon('Knife', ['Melee', 'Ranged'], 'engaged'), weapon('Twig', [], 'engaged')],
					effects: [
						effect('Hex', 'check.target.', 'S'),
						effect('Glare', 'char.target.presence', 'D'),
						// Named in another case than the skill it applies to.
						effect('Ward', 'skill.target.cool', 'h'),
					],
				},
				{ name: 'E2E Mark', type: 'character', items: [skill('Cool', 'presence', 0)] },
				{ name: 'E2E Wagon', type: 'vehicle', system: { defense: 2 }, effects: [effect('Smoke', 'check.target.', 'S')] },
				{
					name: 'E2E Skiff',
					type: 'vehicle',
					system: { roles: [{ id: 'gunner', name: 'Gunner', skills: ['Ranged (Light)', 'Gunnery'], members: [ada.uuid] }] },
					items: [
						{ name: 'E2E Cannon', type: 'vehicleWeapon', system: { skills: ['Gunnery'], range: 'medium', state: 'equipped' } },
					],
				},
				{
					name: 'E2E Grunts',
					type: 'minion',
					system: { characteristics: characteristics([2, 2, 2, 2, 2, 2]), groupSize: 3 },
					items: [skill('Melee', 'brawn', 0)],
				},
				// Characters created without skills get every skill of the Skills Compendium.
				{ name: 'E2E Bo', type: 'character', ownership: playerOwns, system: { notes: '<p>@check[Athletics,3]</p>' } },
				{ name: 'E2E Cy', type: 'character', ownership: playerOwns },
			]);
			const targets = ['Rival', 'Mark', 'Wagon', 'Bo', 'Cy'];
			await canvas.scene.createEmbeddedDocuments(
				'Token',
				await Promise.all(
					targets.map(async (name, index) => ({
						...(await actor(name).getTokenDocument()).toObject(),
						x: 100 + 200 * index,
						y: 500,
					})),
				),
			);

			await Item.createDocuments([
				{
					name: 'E2E Note',
					type: 'gear',
					ownership: { default: OBSERVER },
					system: { description: '<p>@check[Athletics,3]</p>' },
				},
			]);
			const links = ['Athletics,3', 'Cool,2^1', 'Athletics|Cool', 'Athletics,1^3', 'Athletics,2^3', 'Athletics,0^1', 'Athletics,7^6'];
			const pools = ['@pool[p]', '@pool[T]', '@pool[Pp]', '@pool[PA^]', '@POOL[PA^]', '@pool-mod[a]'];
			await CONFIG.JournalEntry.documentClass.create({
				name: 'E2E Links',
				ownership: { default: OBSERVER },
				pages: [
					{
						name: 'E2E Links',
						type: 'text',
						text: {
							content: [
								...links.map((link) => `<p>@check[${link}]</p>`),
								...pools.map((pool, index) => `<p class="e2e-pool">P${index + 1} ${pool}</p>`),
							].join(''),
						},
					},
				],
			});
		},

		async setSetting({ key, value }) {
			await game.settings.set('genesys', key, value);
			await settle();
		},

		async update({ doc, data }) {
			await documentOf(doc).update(data);
			await settle();
		},

		openPrompts: () => apps('app-dice-prompt').length,

		async waitForPrompt() {
			await waitFor('a Dice Prompt', () => {
				const open = apps('app-dice-prompt');
				return open.length === 1 && htmlOf(open[0])?.querySelector('.preview');
			});
			// The prompt resolves its check once mounted.
			await settle();
			return promptState();
		},

		async closePrompts() {
			await Promise.all(apps('app-dice-prompt').map((app: { close(): Promise<void> }) => app.close()));
			await waitFor(
				'the Dice Prompts to close',
				() => !apps('app-dice-prompt').length && !document.querySelector('.app-dice-prompt'),
			);
		},

		async promptSelect({ name, option }) {
			const select = htmlOf(thePrompt())!.querySelector<HTMLSelectElement>(`select[name=${name}]`)!;
			const picked =
				name === 'characteristic'
					? [...select.options].find((candidate) => candidate.value === option)
					: [...select.options].find((candidate) => text(candidate).startsWith(option));
			if (!picked) throw new Error(`No ${name} option ${option}`);
			select.value = picked.value;
			select.dispatchEvent(new Event('change'));
			await settle();
			return promptState();
		},

		async promptToggle(name) {
			const row = [...htmlOf(thePrompt())!.querySelectorAll('.pool-modifications-effects')].find((candidate) =>
				text(candidate.querySelector('label')).includes(name),
			);
			if (!row) throw new Error(`No Pool Modification ${name}`);
			row.querySelector('input')!.click();
			await settle();
			return promptState();
		},

		async promptAdd(keys) {
			const root = htmlOf(thePrompt())!;
			const buttons = [...root.querySelectorAll('.dice-box a')];
			for (const key of keys) {
				const button = buttons.find((candidate) => poolModification(candidate) === key);
				if (!button) throw new Error(`No dice box button ${key}`);
				const before = poolPreview(root);
				(button as HTMLElement).click();
				// Each button adds or upgrades a die or a symbol, which the pool preview shows.
				await waitFor(`the pool after ${key}`, () => poolPreview(root) !== before);
			}
			await settle();
			return promptState();
		},

		async promptRemove(glyph) {
			const root = htmlOf(thePrompt())!;
			const element = [...root.querySelectorAll<HTMLElement>('.preview .positive > *, .preview .negative > *')].find(
				(candidate) => text(candidate) === glyph,
			);
			if (!element) throw new Error(`No ${glyph} in the pool`);
			const before = poolPreview(root);
			element.click();
			await waitFor(`the pool without ${glyph}`, () => poolPreview(root) !== before);
			return promptState();
		},

		async promptChance({ expected, timeout }) {
			const start = Date.now();
			while (promptState().chance !== expected && Date.now() - start < timeout) await sleep(100);
			return promptState().chance;
		},

		async promptRoll() {
			const last = game.messages.contents.at(-1)?.id;
			htmlOf(thePrompt())!.querySelector<HTMLElement>('.roll-button')!.click();
			await waitFor('the roll message', () => game.messages.contents.at(-1)?.id !== last);
			await settle();
			return window.dicePromptE2E.lastMessage();
		},

		lastMessage: () => messageSummary(game.messages.contents.at(-1)),

		async click({ doc, path }) {
			(await find(doc, path)).click();
		},

		async change({ doc, path, value }) {
			const select = (await find(doc, path)) as HTMLSelectElement;
			select.value = value;
			select.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
		},

		async texts({ doc, selector }) {
			const root = await sheet(doc);
			return [...root.querySelectorAll(selector)].map(text);
		},

		async menu({ doc, path }) {
			const container = await find(doc, path);
			container.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			const items = await waitFor('the context menu', () => {
				const entries = [...container.querySelectorAll('.context-menu > *')];
				return entries.length ? entries.map(text) : undefined;
			});
			document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
			// The menu closes with an animation.
			await settle();
			return items;
		},

		async combatWeapons(name) {
			await find({ actor: name }, '.tab-combat .weapons .weapon:not(.header)');
			const root = await sheet({ actor: name });
			return [...root.querySelectorAll('.tab-combat .weapons .weapon:not(.header)')].map((row) => {
				const select = row.querySelector<HTMLSelectElement>('select.attack-skill');
				return {
					name: text(row.querySelector('.name')),
					link: !!row.querySelector('.name a'),
					skill: withSelect(row.querySelector('.skill')),
					choices: select ? [...select.options].map(text) : null,
				};
			});
		},

		async adversaryWeapons(name) {
			await find({ actor: name }, '.adversary-items .weapon');
			const root = await sheet({ actor: name });
			return [...root.querySelectorAll('.adversary-items .weapon')].map((row) => {
				const select = row.querySelector<HTMLSelectElement>('select.attack-skill');
				return {
					text: withSelect(row.querySelector(':scope > a')),
					choices: select ? [...select.options].map(text) : null,
				};
			});
		},

		async inventoryWeapons(name) {
			await find({ actor: name }, '.inventory-item');
			const root = await sheet({ actor: name });
			return [...root.querySelectorAll('.inventory-item')]
				.filter((row) => row.querySelector('[data-item-type=weapon]'))
				.map((row) => ({
					name: text(row.querySelector('.name a')),
					attack: !!row.querySelector('button.attack'),
					skill: text(row.querySelector('[data-item-type=weapon] > div')),
				}));
		},

		async closeSheets() {
			const documents = [
				...game.actors.filter(isSetUp),
				...game.actors.filter(isSetUp).flatMap((doc: { items: { contents: unknown[] } }) => doc.items.contents),
				...game.items.filter(isSetUp),
				...game.journal.filter(isSetUp),
			];
			for (const doc of documents) {
				if (doc.sheet?.rendered) await doc.sheet.close();
			}
			await settle();
		},

		async links(doc) {
			const root = await linkRoot(doc);
			await waitFor('a check link', () => root.querySelector('a[data-skill-check]'));
			return [...root.querySelectorAll<HTMLElement>('a')]
				.filter((link) => link.querySelector('.fa-dice-d20'))
				.map((link) => ({ skill: link.dataset.skillCheck ?? null, difficulty: link.dataset.difficulty ?? null, text: text(link) }));
		},

		async clickLink({ doc, skill, difficulty }) {
			const root = await linkRoot(doc);
			const link = await waitFor(`the link ${skill} ${difficulty}`, () =>
				[...root.querySelectorAll<HTMLElement>('a')].find(
					(candidate) =>
						candidate.querySelector('.fa-dice-d20') &&
						(candidate.dataset.skillCheck ?? null) === skill &&
						(difficulty === undefined || candidate.dataset.difficulty === difficulty),
				),
			);
			link.click();
		},

		async pools(doc) {
			const root = await sheet(doc);
			await waitFor('the pool paragraphs', () => root.querySelectorAll('p.e2e-pool').length === 6);
			return [...root.querySelectorAll('p.e2e-pool')].map((paragraph) => ({
				text: text(paragraph),
				// Each glyph is followed by the icon of its operator.
				icons: [...paragraph.querySelectorAll('.pool-modifications > i:not(.fas)')]
					.map((glyph) => poolModification(glyph, glyph.nextElementSibling))
					.join(' '),
			}));
		},

		control(names) {
			canvas.tokens.releaseAll();
			for (const name of names) token(name).control({ releaseOthers: false });
		},

		async chatMessage(content) {
			const message = await CONFIG.ChatMessage.documentClass.create({ content });
			return message.id;
		},

		// A notification asked with `localize` is recorded before Foundry localizes it.
		notifications: () =>
			recorded().map((notification) => {
				const [type, ...message] = notification.split(': ');
				return `${type}: ${game.i18n.localize(message.join(': '))}`;
			}),

		clearNotifications() {
			recorded();
		},

		async saveEffectSheet({ actor: actorName, item, effect }) {
			const parent = item ? actor(actorName).items.getName(`E2E ${item}`) : actor(actorName);
			const doc = parent.effects.getName(`E2E ${effect}`);
			const app = doc.sheet;
			const root = await render(app, (root) => root.tagName === 'FORM' || root.querySelector('form'));
			const form = root.tagName === 'FORM' ? (root as HTMLFormElement) : root.querySelector('form')!;
			const selected = [...form.querySelectorAll<HTMLSelectElement>('select')]
				.filter((select) => [...select.options].some((option) => option.value === 'E2E Craft'))
				.map((select) => select.value);
			await app.submit();
			await settle();
			if (app.rendered) await app.close();
			return { selected, changes: doc.changes.map((change: { key: string; value: string }) => `${change.key}=${change.value}`) };
		},

		storyPoints() {
			const trackers = [...document.querySelectorAll('#story-point-tracker .tracker')];
			return {
				setting: game.settings.get('genesys', 'storyPoints'),
				shown: trackers.map((tracker) => text(tracker.querySelector('.points'))),
				spendable: trackers.map((tracker) => tracker.querySelector('.points')?.tagName === 'A'),
			};
		},

		async clickStoryPoints(which) {
			const trackers = [...document.querySelectorAll('#story-point-tracker .tracker')];
			const target =
				which === 'reset' ? trackers[0].querySelector('header a') : trackers[which === 'gm' ? 0 : 1].querySelector('.points');
			const before = JSON.stringify(game.settings.get('genesys', 'storyPoints'));
			(target as HTMLElement).click();
			// A player's point is spent by the GM's client, then every tracker renders again: wait for the pools to change,
			// or for long enough to tell they don't.
			const start = Date.now();
			while (JSON.stringify(game.settings.get('genesys', 'storyPoints')) === before && Date.now() - start < 5000) await sleep(100);
			await settle();
		},

		async createSkillsPack() {
			const pack = await window.e2e.createCompendium({ label: 'E2E Skills', name: 'e2e-skills', type: 'Item' });
			await Item.create({ name: 'E2E Lore', type: 'skill', system: { characteristic: 'intellect' } }, { pack: pack.collection });
		},

		async renameSkill(name) {
			const pack = game.packs.get('world.e2e-skills');
			const [skill] = await pack.getDocuments();
			await skill.update({ name });
			await settle();
		},

		breakChanceWorker(broken) {
			Worker.prototype.postMessage = broken
				? function (this: Worker, _message: unknown, ...rest: unknown[]) {
						return (realPostMessage as (...args: unknown[]) => void).call(this, null, ...rest);
					}
				: realPostMessage;
		},
	};
}

// The Skills Compendium's skills, with the abbreviation of their characteristic.
const COMPENDIUM_SKILLS: [string, string][] = [
	['Alchemy', 'Int'],
	['Arcana', 'Int'],
	['Astrocartography', 'Int'],
	['Athletics', 'Br'],
	['Brawl', 'Br'],
	['Charm', 'Pr'],
	['Coercion', 'Will'],
	['Computers', 'Int'],
	['Cool', 'Pr'],
	['Coordination', 'Ag'],
	['Deception', 'Cun'],
	['Discipline', 'Will'],
	['Divine', 'Will'],
	['Driving', 'Ag'],
	['Gunnery', 'Ag'],
	['Knowledge', 'Int'],
	['Leadership', 'Pr'],
	['Mechanics', 'Int'],
	['Medicine', 'Int'],
	['Melee', 'Br'],
	['Melee (Heavy)', 'Br'],
	['Melee (Light)', 'Br'],
	['Negotiation', 'Pr'],
	['Operating', 'Int'],
	['Perception', 'Cun'],
	['Piloting', 'Ag'],
	['Primal', 'Cun'],
	['Ranged', 'Ag'],
	['Ranged (Heavy)', 'Ag'],
	['Ranged (Light)', 'Ag'],
	['Resilience', 'Br'],
	['Riding', 'Ag'],
	['Skulduggery', 'Cun'],
	['Stealth', 'Ag'],
	['Streetwise', 'Cun'],
	['Survival', 'Cun'],
	['Vigilance', 'Will'],
];

const unranked = (except: string[]) =>
	COMPENDIUM_SKILLS.filter(([name]) => !except.includes(name))
		.map(([name, abbreviation]) => `${name} (${abbreviation})`)
		.sort((left, right) => left.localeCompare(right, 'en'));

const SIX_CHARACTERISTICS = ['brawn', 'agility', 'intellect', 'cunning', 'willpower', 'presence'];

// The scenario controls and targets tokens on the canvas.
export const needsCanvas = true;

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	const player = await e2e.player();
	await e2e.setUpCombat({
		combatants: [
			{ name: 'Hero', type: 'character' },
			{ name: 'Foe', type: 'rival' },
		],
	});
	// §#100: the Skills Compendium is loaded again on a reload.
	await gm.reload();
	for (const client of [gm, player]) await client.evaluate(installDicePromptHelpers);
	const saved = await gm.evaluate((user) => window.dicePromptE2E.settings(user), e2e.playerUser);
	await gm.evaluate(
		(settings) => Promise.all(Object.entries(settings).map(([key, value]) => window.dicePromptE2E.setSetting({ key, value }))),
		{ uncoupleSkills: false, useSuperCharacteristics: false, defaultDifficulty: 'DD', skillsCompendium: 'genesys.crb-skills' },
	);
	try {
		await gm.evaluate((user) => window.dicePromptE2E.setUp(user), e2e.playerUser);
	} catch (error) {
		e2e.log('set up errors', gm.errors);
		throw error;
	}
	await e2e.step('set up');

	const opened = async (client: Client, action: () => Promise<unknown>) => {
		await client.evaluate(() => window.dicePromptE2E.closePrompts());
		await action();
		return client.evaluate(() => window.dicePromptE2E.waitForPrompt());
	};
	// What an action opened: how many Dice Prompts, and the notifications it gave.
	const noPrompt = async (client: Client, action: () => Promise<unknown>) => {
		await client.evaluate(() => window.dicePromptE2E.closePrompts());
		await client.evaluate(() => window.dicePromptE2E.clearNotifications());
		await action();
		await e2e.settle();
		return client.evaluate(() => ({
			prompts: window.dicePromptE2E.openPrompts(),
			notifications: window.dicePromptE2E.notifications(),
		}));
	};
	const click = (client: Client, doc: Doc, path: string) => () =>
		client.evaluate((args) => window.dicePromptE2E.click(args), { doc, path });
	const select = (name: 'characteristic' | 'skill', option: string) =>
		gm.evaluate((args) => window.dicePromptE2E.promptSelect(args), { name, option });
	const toggle = (name: string) => gm.evaluate((name) => window.dicePromptE2E.promptToggle(name), name);
	const roll = () => gm.evaluate(() => window.dicePromptE2E.promptRoll());
	const setSetting = (key: string, value: unknown) => gm.evaluate((args) => window.dicePromptE2E.setSetting(args), { key, value });
	const update = (doc: Doc, data: object) => gm.evaluate((args) => window.dicePromptE2E.update(args), { doc, data });
	const target = (name: string | null) => gm.evaluate((name) => window.e2e.target(name), name);
	const control = (client: Client, names: string[]) => client.evaluate((names) => window.dicePromptE2E.control(names), names);
	const ada = { actor: 'Ada' };
	const skillRoll = (skill: string) => click(gm, ada, `.tab-skills .skill a.name|${skill} (`);
	const characteristicRoll = (index: number) =>
		click(gm, ada, `.tab-skills .characteristics-row .characteristic-field:nth-child(${index}) label a`);
	const attack = (weapon: string) => click(gm, ada, `.tab-combat .weapon .name a|E2E ${weapon}`);
	const rows = (state: PromptState) => state.modifications;
	const named = (state: PromptState, prefix: string) => state.modifications.filter(({ name }) => name.startsWith(prefix));

	// A: the skills the prompt offers (§#49, §#100).
	const cool = await opened(gm, skillRoll('Cool'));
	e2e.expect('#49 A1 a character is offered its skills, then the Skills Compendium others as unranked', cool.skills, {
		'': ['—', 'Brawl (Br)', 'Cool (Pr)', 'Melee (Br)', 'Ranged (light) (Ag)'],
		Unranked: unranked(['Brawl', 'Cool', 'Melee', 'Ranged (Light)']),
	});

	// B: the characteristic menu (§#184, §#204, §#50).
	e2e.expect(
		'#184 B1 uncoupled skills off: a skill check is locked on its characteristic, without "—"',
		{ characteristic: cool.characteristic, skill: cool.skill, pool: cool.pool },
		{ characteristic: { value: 'presence', disabled: true, options: SIX_CHARACTERISTICS }, skill: 'Cool (Pr)', pool: 'A|DD' },
	);
	const willpowerCheck = await opened(gm, characteristicRoll(5));
	e2e.expect(
		'#184 B2 uncoupled skills off: a Characteristic Check opens the menu, with "—"',
		{
			characteristic: willpowerCheck.characteristic,
			skill: willpowerCheck.skill,
			pool: willpowerCheck.pool,
			rows: rows(willpowerCheck),
		},
		{
			characteristic: { value: 'willpower', disabled: false, options: ['-', ...SIX_CHARACTERISTICS] },
			skill: '—',
			pool: 'AAAA|DD',
			rows: [
				{ name: 'From Self: E2E Focus', enabled: false, mods: 'a+' },
				{ name: 'From Self: E2E Steady', enabled: false, mods: 'B+' },
			],
		},
	);
	await toggle('E2E Focus');
	await toggle('E2E Steady');
	const presenceCheck = await select('characteristic', 'presence');
	e2e.expect(
		'#50 B3 switching the characteristic lists its Pool Modifications, and keeps the state of those still listed',
		{ pool: presenceCheck.pool, rows: rows(presenceCheck) },
		{
			pool: 'a|DD',
			rows: [
				{ name: 'From Self: E2E Focus', enabled: true, mods: 'a+' },
				{ name: 'From Self: E2E Poise', enabled: false, mods: 'S+' },
			],
		},
	);
	const backToWillpower = await select('characteristic', 'willpower');
	e2e.expect(
		'#50 B4 switching back lists the first characteristic Pool Modification again, following auto-apply',
		{ pool: backToWillpower.pool, rows: rows(backToWillpower) },
		{
			pool: 'AAAAa|DD',
			rows: [
				{ name: 'From Self: E2E Focus', enabled: true, mods: 'a+' },
				{ name: 'From Self: E2E Steady', enabled: false, mods: 'B+' },
			],
		},
	);

	await setSetting('uncoupleSkills', true);
	const coolUncoupled = await opened(gm, skillRoll('Cool'));
	e2e.expect(
		'#184 B5 uncoupled skills on: a skill check offers the six characteristics, not "—", on its own',
		{ characteristic: coolUncoupled.characteristic, pool: coolUncoupled.pool, rows: rows(coolUncoupled).map(({ name }) => name) },
		{
			characteristic: { value: 'presence', disabled: false, options: SIX_CHARACTERISTICS },
			pool: 'A|DD',
			rows: ['From Self: E2E Focus', 'From Self: E2E Poise', 'From Self: E2E Nerve'],
		},
	);
	await toggle('E2E Nerve');
	const coolWillpower = await select('characteristic', 'willpower');
	e2e.expect(
		"#184 B6 uncoupled skills on: picking Willpower for Cool changes the pool and the characteristic's Pool Modifications",
		{
			characteristic: coolWillpower.characteristic?.value,
			skill: coolWillpower.skill,
			pool: coolWillpower.pool,
			rows: rows(coolWillpower),
		},
		{
			characteristic: 'willpower',
			skill: 'Cool (Pr)',
			pool: 'PAAAB|DD',
			rows: [
				{ name: 'From Self: E2E Focus', enabled: false, mods: 'a+' },
				{ name: 'From Self: E2E Steady', enabled: false, mods: 'B+' },
				{ name: 'From Self: E2E Nerve', enabled: true, mods: 'B+' },
			],
		},
	);
	const noSkill = await select('skill', '—');
	e2e.expect('#204 B7 uncoupled skills on: picking skill "—" offers "—" again, and picks it', noSkill.characteristic, {
		value: '-',
		disabled: false,
		options: ['-', ...SIX_CHARACTERISTICS],
	});
	const barePool = await select('characteristic', '-');
	e2e.expect(
		'#204 B8 "—" with no skill gives a bare pool',
		{ pool: barePool.pool, rows: rows(barePool) },
		{ pool: '|DD', rows: [{ name: 'From Self: E2E Focus', enabled: false, mods: 'a+' }] },
	);
	const attackUncoupled = await opened(gm, attack('Spear'));
	e2e.expect('#204 B9 uncoupled skills on: an attack offers the six characteristics, not "—"', attackUncoupled.characteristic, {
		value: 'brawn',
		disabled: false,
		options: SIX_CHARACTERISTICS,
	});
	await setSetting('uncoupleSkills', false);
	const gendr = await opened(gm, () => gm.evaluate(() => ui.chat.processMessage('/gendr')));
	e2e.expect(
		'#204 B10 /gendr opens a bare pool without characteristic and skill menus',
		{ actor: gendr.actor, pool: gendr.pool, characteristic: gendr.characteristic, skills: gendr.skills, rows: rows(gendr) },
		{ actor: null, pool: '|DD', characteristic: null, skills: null, rows: [] },
	);

	// C: Pool Modifications of the actor and of the target (§#32, §#40, §#49, §#201).
	await target('Rival');
	const coolAtRival = await opened(gm, skillRoll('Cool'));
	e2e.expect(
		'#32 C1 the prompt lists "From Self" and "From Target" Pool Modifications for check, characteristic and skill keys',
		rows(coolAtRival),
		[
			{ name: 'From Self: E2E Focus', enabled: false, mods: 'a+' },
			{ name: 'From Self: E2E Poise', enabled: false, mods: 'S+' },
			{ name: 'From Self: E2E Nerve', enabled: false, mods: 'B+' },
			{ name: 'From Target: E2E Hex', enabled: false, mods: 'S+' },
			{ name: 'From Target: E2E Glare', enabled: false, mods: 'D+' },
			{ name: 'From Target: E2E Ward', enabled: false, mods: 'h+' },
		],
	);
	const pistol = await opened(gm, attack('Pistol'));
	e2e.expect(
		'#49 C2 an attack rolls the owned "Ranged (light)" with the Pool Modification on "Ranged (Light)", and the ranged defense',
		{ skill: pistol.skill, pool: pistol.pool, rows: rows(pistol) },
		{
			skill: 'Ranged (light) (Ag)',
			pool: 'PP|DD',
			rows: [
				{ name: 'From Self: E2E Focus', enabled: false, mods: 'a+' },
				{ name: 'From Self: E2E Sights', enabled: false, mods: 'B+' },
				{ name: 'From Target: E2E Hex', enabled: false, mods: 'S+' },
				{ name: 'From Target: Ranged Defense', enabled: false, mods: 'S+ S+' },
			],
		},
	);
	await toggle('E2E Sights');
	await toggle('Ranged Defense');
	const pistolRoll = await roll();
	e2e.expect(
		'#49 C3 the attack rolls the owned skill with the toggled Pool Modifications',
		{ speaker: pistolRoll.speaker, description: pistolRoll.description, formula: pistolRoll.formula },
		{
			speaker: 'Ada',
			description:
				'Attacking with <strong>E2E Pistol</strong> using <strong>Ranged (light) (Ag<i class="fas fa-star hide-it"></i>)</strong>!',
			formula: '2dp + 0da + 2di + 1db + 2ds',
		},
	);

	// The target's defense against the attack's range, for an adversary and a character (§#32, §#40).
	const defenseRows = async (weapon: string) =>
		named(await opened(gm, attack(weapon)), 'From Target').filter(({ name }) => name.endsWith('Defense'));
	const defenses: Record<string, unknown> = {};
	const expectedDefenses: Record<string, unknown> = {};
	for (const targetName of ['Rival', 'Mark']) {
		await target(targetName);
		for (const defense of [0, 1, 2]) {
			await update({ actor: targetName }, { 'system.defense': { melee: defense, ranged: defense } });
			for (const [weapon, range] of [
				['Spear', 'Melee'],
				['Pistol', 'Ranged'],
			]) {
				defenses[`${targetName} ${defense} ${range}`] = await defenseRows(weapon);
				expectedDefenses[`${targetName} ${defense} ${range}`] =
					defense === 0
						? []
						: [{ name: `From Target: ${range} Defense`, enabled: false, mods: Array(defense).fill('S+').join(' ') }];
			}
		}
	}
	e2e.expect(
		"#32 C4 an attack adds one Setback per point of an adversary's or a character's defense against its range, none at 0",
		defenses,
		expectedDefenses,
	);

	// A targeted vehicle (§#201).
	await target('Wagon');
	const vehicleDefenses: Record<string, unknown> = {};
	for (const defense of [2, 5]) {
		await update({ actor: 'Wagon' }, { 'system.defense': defense });
		for (const weapon of ['Spear', 'Pistol']) vehicleDefenses[`${defense} ${weapon}`] = await defenseRows(weapon);
	}
	const vehicleRow = (range: string, count: number) => [
		{ name: `From Target: ${range} Defense`, enabled: false, mods: Array(count).fill('S+').join(' ') },
	];
	e2e.expect('#201 C5 an attack against a targeted vehicle adds one Setback per point of its defense, up to 4', vehicleDefenses, {
		'2 Spear': vehicleRow('Melee', 2),
		'2 Pistol': vehicleRow('Ranged', 2),
		'5 Spear': vehicleRow('Melee', 4),
		'5 Pistol': vehicleRow('Ranged', 4),
	});
	const coolAtWagon = await opened(gm, skillRoll('Cool'));
	e2e.expect('#201 C6 a check made while a vehicle is targeted lists its target Pool Modifications', named(coolAtWagon, 'From Target'), [
		{ name: 'From Target: E2E Smoke', enabled: false, mods: 'S+' },
	]);
	await target(null);
	await e2e.step('C end');

	// D: Attack Skills (§#49, §#196).
	const combatWeapons = (actor: string) => gm.evaluate((actor) => window.dicePromptE2E.combatWeapons(actor), actor);
	const inventoryWeapons = () => gm.evaluate(() => window.dicePromptE2E.inventoryWeapons('Ada'));
	const attackSkill = (doc: Doc) =>
		gm.evaluate((doc) => {
			const actor = game.actors.getName(`E2E ${'actor' in doc ? doc.actor : ''}`);
			return actor.items.getName(`E2E ${'item' in doc ? doc.item : ''}`).system.attackSkill;
		}, doc);
	e2e.expect(
		"#49 D1 the Combat tab shows each weapon's Attack Skill, a select for a weapon listing several",
		await combatWeapons('Ada'),
		[
			{ name: 'E2E Spear', link: true, skill: '[Melee]', choices: ['Brawl', 'Melee', 'Ranged'] },
			{ name: 'E2E Pistol', link: true, skill: 'Ranged (light)', choices: null },
			{ name: 'E2E Stick', link: false, skill: 'Skill Not Found', choices: null },
			{ name: 'E2E Blaster', link: true, skill: 'Piloting (Space)Skill Not Found', choices: null },
			{ name: 'E2E Club', link: true, skill: 'Melee', choices: null },
		],
	);
	e2e.expect(
		"#49 D2 the Inventory tab shows each weapon's Attack Skill, and no attack for a weapon without skill",
		await inventoryWeapons(),
		[
			{ name: 'E2E Spear', attack: true, skill: 'Melee' },
			{ name: 'E2E Pistol', attack: true, skill: 'Ranged (light)' },
			{ name: 'E2E Stick', attack: false, skill: '-' },
			{ name: 'E2E Blaster', attack: true, skill: 'Piloting (Space)' },
			{ name: 'E2E Club', attack: true, skill: 'Melee' },
		],
	);
	await gm.evaluate(() =>
		window.dicePromptE2E.change({
			doc: { actor: 'Ada' },
			path: '.tab-combat .weapon|E2E Spear >> select.attack-skill',
			value: 'Ranged',
		}),
	);
	e2e.expect(
		'#196 D3 choosing Ranged for the spear stores it, and both tabs show it',
		{
			stored: await attackSkill({ actor: 'Ada', item: 'Spear' }),
			combat: (await combatWeapons('Ada')).find(({ name }) => name === 'E2E Spear'),
			inventory: (await inventoryWeapons()).find(({ name }) => name === 'E2E Spear')?.skill,
		},
		{
			stored: 'Ranged',
			combat: { name: 'E2E Spear', link: true, skill: '[Ranged]', choices: ['Brawl', 'Melee', 'Ranged'] },
			inventory: 'Ranged',
		},
	);
	const spear = await opened(gm, attack('Spear'));
	e2e.expect(
		"#196 D4 the spear's attack opens on the chosen skill, the weapon's skills first in their group, owned or not",
		{ skill: spear.skill, pool: spear.pool, skills: spear.skills },
		{
			skill: 'Ranged (Ag)',
			pool: 'AA|DD',
			skills: {
				'': ['—', 'Cool (Pr)', 'Ranged (light) (Ag)'],
				'Weapon Skills': ['Brawl (Br)', 'Melee (Br)', 'Ranged (Ag)'],
				Unranked: unranked(['Brawl', 'Cool', 'Melee', 'Ranged', 'Ranged (Light)']),
			},
		},
	);
	const athletics = await select('skill', 'Athletics');
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	e2e.expect(
		'#196 D5 picking another skill in the prompt applies to that roll only',
		{ skill: athletics.skill, pool: athletics.pool, stored: await attackSkill({ actor: 'Ada', item: 'Spear' }) },
		{ skill: 'Athletics (Br)', pool: 'AAA|DD', stored: 'Ranged' },
	);
	await update({ actor: 'Ada', item: 'Spear' }, { 'system.skills': ['Brawl', 'Melee'] });
	e2e.expect(
		'#196 D6 a choice the weapon no longer lists falls back to the listed skill owned at the highest rank',
		{
			combat: (await combatWeapons('Ada')).find(({ name }) => name === 'E2E Spear'),
			inventory: (await inventoryWeapons()).find(({ name }) => name === 'E2E Spear')?.skill,
			prompt: (await opened(gm, attack('Spear'))).skill,
		},
		{
			combat: { name: 'E2E Spear', link: true, skill: '[Melee]', choices: ['Brawl', 'Melee'] },
			inventory: 'Melee',
			prompt: 'Melee (Br)',
		},
	);
	e2e.expect(
		'#49 D7 a weapon without skill offers no attack link on the Combat tab and no Attack button in the inventory',
		{
			combat: (await combatWeapons('Ada')).find(({ name }) => name === 'E2E Stick'),
			inventory: (await inventoryWeapons()).find(({ name }) => name === 'E2E Stick'),
		},
		{
			combat: { name: 'E2E Stick', link: false, skill: 'Skill Not Found', choices: null },
			inventory: { name: 'E2E Stick', attack: false, skill: '-' },
		},
	);

	// An adversary's weapons.
	e2e.expect(
		'#49 D8 the adversary sheet shows a select for a weapon listing several skills',
		await gm.evaluate(() => window.dicePromptE2E.adversaryWeapons('Rival')),
		[
			{ text: 'E2E Knife ([Melee]Damage 3Critical 3Range [Engaged])', choices: ['Melee', 'Ranged'] },
			{ text: 'E2E Twig (No skillDamage 3Critical 3Range [Engaged])', choices: null },
		],
	);
	e2e.expect(
		"#196 D9 clicking the knife's select doesn't roll",
		await noPrompt(gm, click(gm, { actor: 'Rival' }, '.adversary-items .weapon|E2E Knife >> select.attack-skill')),
		{ prompts: 0, notifications: [] },
	);
	await gm.evaluate(() =>
		window.dicePromptE2E.change({
			doc: { actor: 'Rival' },
			path: '.adversary-items .weapon|E2E Knife >> select.attack-skill',
			value: 'Ranged',
		}),
	);
	const knife = await opened(gm, click(gm, { actor: 'Rival' }, '.adversary-items .weapon|E2E Knife >> :scope > a'));
	e2e.expect(
		"#196 D10 the rival's knife attacks with the chosen Ranged",
		{ stored: await attackSkill({ actor: 'Rival', item: 'Knife' }), actor: knife.actor, skill: knife.skill },
		{ stored: 'Ranged', actor: 'Rival', skill: 'Ranged (Ag)' },
	);
	e2e.expect(
		"#49 D11 a rival's weapon without skill doesn't roll, and its menu has no check",
		{
			click: await noPrompt(gm, click(gm, { actor: 'Rival' }, '.adversary-items .weapon|E2E Twig >> :scope > a')),
			twig: await gm.evaluate(() =>
				window.dicePromptE2E.menu({ doc: { actor: 'Rival' }, path: '.adversary-items .weapon|E2E Twig' }),
			),
			knife: await gm.evaluate(() =>
				window.dicePromptE2E.menu({ doc: { actor: 'Rival' }, path: '.adversary-items .weapon|E2E Knife' }),
			),
		},
		{ click: { prompts: 0, notifications: [] }, twig: ['Edit', 'Delete'], knife: ['Edit', 'Perform Check', 'Delete'] },
	);

	// A vehicle's weapons and skills.
	const skiff = { actor: 'Skiff' };
	e2e.expect(
		"#196 D12 a vehicle weapon's Combat tab row has no Attack Skill select",
		await gm.evaluate(() =>
			window.dicePromptE2E.texts({ doc: { actor: 'Skiff' }, selector: '.tab-combat .weapon:not(.header) select' }),
		),
		[],
	);
	const cannon = await opened(gm, click(gm, skiff, '.tab-combat .weapon .name a|E2E Cannon'));
	e2e.expect(
		"#196 D13 a vehicle weapon's attack is rolled by its crew member, with no weapon group",
		{ actor: cannon.actor, skill: cannon.skill, groups: Object.keys(cannon.skills ?? {}) },
		{ actor: 'Ada', skill: 'Gunnery (Ag)', groups: ['', 'Unranked'] },
	);
	e2e.expect(
		"#49 D14 the vehicle's Skills tab by crew member shows the owned Ranged (light) at its rank",
		await gm.evaluate(() => window.dicePromptE2E.texts({ doc: { actor: 'Skiff' }, selector: '.tab-skills .member-skill' })),
		['Gunnery (Ag)0', 'Ranged (light) (Ag)2'],
	);
	const byMember = await opened(gm, click(gm, skiff, '.tab-skills .member-skill a.skill-name|Ranged'));
	await gm.evaluate(() =>
		window.dicePromptE2E.change({ doc: { actor: 'Skiff' }, path: '.tab-skills .grouping-mode select', value: 'skill' }),
	);
	const bySkillRows = await gm.evaluate(() =>
		window.dicePromptE2E.texts({ doc: { actor: 'Skiff' }, selector: '.tab-skills .skills-container section' }),
	);
	const bySkill = await opened(
		gm,
		click(
			gm,
			skiff,
			'.tab-skills .skills-container section|Ranged >> .skill-content-details >> a:not(.skill-content-details-charName)',
		),
	);
	e2e.expect(
		"#49 D15 the vehicle's Skills tab, in both groupings, rolls the owned Ranged (light) with its Pool Modification",
		{
			bySkill: bySkillRows,
			prompts: [byMember, bySkill].map((state) => ({
				actor: state.actor,
				skill: state.skill,
				pool: state.pool,
				rows: state.modifications.map(({ name }) => name),
			})),
		},
		{
			bySkill: ['GunneryCrew MemberRoleSkillE2E AdaGunner0', 'Ranged (Light)Crew MemberRoleSkillE2E AdaGunner2'],
			prompts: [
				{ actor: 'Ada', skill: 'Ranged (light) (Ag)', pool: 'PP|DD', rows: ['From Self: E2E Focus', 'From Self: E2E Sights'] },
				{ actor: 'Ada', skill: 'Ranged (light) (Ag)', pool: 'PP|DD', rows: ['From Self: E2E Focus', 'From Self: E2E Sights'] },
			],
		},
	);
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await e2e.step('D end');

	// E: healing and initiative with a skill the actor lacks (§#49), and the messages of checks (§#50, §#157).
	const heal = await opened(gm, click(gm, ada, '.tab-combat .injury .severity a'));
	e2e.expect(
		'#49 E1 a character without Resilience heals an injury with an Unranked Skill Check of Resilience',
		{ skill: heal.skill, pool: heal.pool, unranked: heal.skills?.Unranked?.includes('Resilience (Br)') },
		{ skill: 'Resilience (Br)', pool: 'AAA|DD', unranked: true },
	);
	await gm.evaluate(async () => {
		const hero = game.actors.getName('E2E Hero');
		await hero.update({ 'system.characteristics.willpower': 2 });
		await hero.deleteEmbeddedDocuments('Item', [hero.items.getName('Vigilance').id]);
	});
	const initiative = await opened(gm, () => gm.evaluate(() => void game.combat.rollSlotInitiative(window.e2e.slotId('Hero'))));
	const initiativeMessage = await roll();
	e2e.expect(
		'#49 E2 a character without Vigilance rolls initiative from the tracker as an Unranked Skill Check of Vigilance',
		{
			skill: initiative.skill,
			pool: initiative.pool,
			unranked: initiative.skills?.Unranked?.includes('Vigilance (Will)'),
			description: initiativeMessage.description,
			formula: initiativeMessage.formula,
			rolled: await gm.evaluate(() => game.combat.combatants.getName('Hero').initiative !== null),
		},
		{
			skill: 'Vigilance (Will)',
			pool: 'AA|',
			unranked: true,
			description: 'Rolling Initiative with <strong>Vigilance<i class="fas fa-star hide-it"></i></strong>...',
			formula: '0dp + 2da',
			rolled: true,
		},
	);
	// Ability faces: 4 is two Successes, 8 two Advantages.
	await gm.fixDice([
		{ face: 4, faces: 8 },
		{ face: 8, faces: 8 },
	]);
	await gm.evaluate(() => game.combat.rollInitiative([game.combat.combatants.getName('Hero').id]));
	await e2e.settle();
	const unprompted = await gm.evaluate(() => ({
		message: window.dicePromptE2E.lastMessage(),
		initiative: game.combat.combatants.getName('Hero').initiative,
	}));
	await gm.evaluate(() => window.e2e.reset());
	e2e.expect(
		"#49 E3 initiative rolled without the prompt rolls the missing Initiative Skill's characteristic, and reads its results",
		{
			message: {
				speaker: unprompted.message.speaker,
				description: unprompted.message.description,
				formula: unprompted.message.formula,
				results: unprompted.message.results,
				summaries: unprompted.message.summaries,
			},
			initiative: unprompted.initiative,
		},
		{
			message: {
				speaker: 'Hero',
				description: 'Rolling Initiative with <strong>Vigilance<i class="fas fa-star hide-it"></i></strong>...',
				formula: '0dp + 2da',
				results: 's s a a',
				summaries: ['s Successes 2 a Advantage 2'],
			},
			initiative: 2.02,
		},
	);
	const foeId = await gm.evaluate(async () => {
		const foe = game.combat.combatants.getName('Foe');
		await foe.update({ hidden: true });
		await game.combat.rollInitiative([foe.id]);
		return window.dicePromptE2E.lastMessage().id;
	});
	await e2e.settle();
	e2e.expect(
		"#50 E4 a hidden combatant's initiative is private",
		{
			gm: await gm.evaluate(
				(id) => ({ whispered: game.messages.get(id).whisper.length > 0, blind: game.messages.get(id).blind }),
				foeId,
			),
			player: await player.evaluate((id) => !!game.messages.get(id)?.isContentVisible, foeId),
		},
		{ gm: { whispered: true, blind: false }, player: false },
	);

	const description = (message: MessageSummary) => ({ description: message.description, formula: message.formula });
	await opened(gm, skillRoll('Cool'));
	const coolMessage = await roll();
	await opened(gm, characteristicRoll(5));
	const willpowerMessage = await roll();
	await opened(gm, click(gm, { actor: 'Grunts' }, '.adversary-items .skill > a|Melee'));
	const minionMessage = await roll();
	await setSetting('useSuperCharacteristics', true);
	await update(ada, { 'system.superCharacteristics': ['brawn'] });
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await opened(gm, skillRoll('Melee'));
	const superMessage = await roll();
	e2e.expect(
		'#50 E5 skill, characteristic, minion and super characteristic messages describe their check',
		{
			skill: description(coolMessage),
			characteristic: description(willpowerMessage),
			minion: description(minionMessage),
			super: description(superMessage),
		},
		{
			skill: { description: 'Rolling <strong>Cool (Pr<i class="fas fa-star hide-it"></i>)</strong>...', formula: '0dp + 1da + 2di' },
			characteristic: { description: 'Rolling <strong>Willpower</strong>...', formula: '0dp + 4da + 2di' },
			minion: {
				description: 'Rolling <strong>Melee (Br<i class="fas fa-star hide-it"></i>)</strong>...',
				formula: '0dp + 2da + 2di',
			},
			super: {
				description: 'Rolling <strong>Melee (Br<i class="fas fa-star super-char"></i>)</strong>...',
				formula: '3dpx + 0da + 2di',
			},
		},
	);
	await update(ada, { 'system.superCharacteristics': [] });
	await setSetting('useSuperCharacteristics', false);
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());

	await opened(gm, skillRoll('Melee'));
	await gm.evaluate(() => window.dicePromptE2E.promptAdd(['C+']));
	// Proficiency faces: 12 a Triumph, 4 two Successes, 6 an Advantage; Difficulty: 2 a Failure, 7 two Threats;
	// Challenge: 12 a Despair.
	await gm.fixDice([
		{ face: 12, faces: 12 },
		{ face: 4, faces: 12 },
		{ face: 6, faces: 12 },
		{ face: 2, faces: 8 },
		{ face: 7, faces: 8 },
		{ face: 12, faces: 12 },
	]);
	const skillResults = await roll();
	await opened(gm, attack('Pistol'));
	// Proficiency faces: 2 a Success, 10 two Advantages; Difficulty: 1 blank, 4 a Threat.
	await gm.fixDice([
		{ face: 2, faces: 12 },
		{ face: 10, faces: 12 },
		{ face: 1, faces: 8 },
		{ face: 4, faces: 8 },
	]);
	const attackResults = await roll();
	e2e.expect(
		'#157 E6 a skill roll and an attack read their net results, with Triumph and Despair apart',
		{
			skill: { formula: skillResults.formula, results: skillResults.results, summaries: skillResults.summaries },
			attack: { formula: attackResults.formula, results: attackResults.results, summaries: attackResults.summaries },
		},
		{
			skill: { formula: '3dp + 0da + 2di + 1dc', results: 'h t d', summaries: ['s Successes 1 h Threat 1 t Triumph 1 d Despair 1'] },
			attack: { formula: '2dp + 0da + 2di', results: 's a', summaries: ['Damage (3) 4 Critical 3', 's Successes 1 a Advantage 1'] },
		},
	);
	await e2e.step('E end');

	// F: effect sheets keep a Pool Modification for a skill outside the Skills Compendium (§#40).
	e2e.expect(
		'#40 F1 opening and saving an actor effect and an item effect keeps their custom skill',
		{
			actor: await gm.evaluate(() => window.dicePromptE2E.saveEffectSheet({ actor: 'Ada', effect: 'Knack' })),
			item: await gm.evaluate(() => window.dicePromptE2E.saveEffectSheet({ actor: 'Ada', item: 'Map', effect: 'Charm' })),
		},
		{
			actor: { selected: ['E2E Craft'], changes: ['genesys.pool.skill.self.E2E Craft=B'] },
			item: { selected: ['E2E Craft'], changes: ['genesys.pool.skill.self.E2E Craft=a'] },
		},
	);
	await e2e.step('F end');

	// G: `@check` links as the GM (§#51, §#95, §#157).
	const journal = { journal: 'Links' };
	e2e.expect(
		'#51 G1 a journal page renders its check links with their difficulty',
		await gm.evaluate((doc) => window.dicePromptE2E.links(doc), journal),
		[
			{ skill: 'Athletics', difficulty: 'DDD', text: 'Hard [DDD] Athletics check' },
			{ skill: 'Cool', difficulty: 'CD', text: 'Average [CD] Cool check' },
			{ skill: null, difficulty: null, text: 'Opposed Athletics versus Cool check' },
			{ skill: 'Athletics', difficulty: 'CC', text: 'Easy [CC] Athletics check' },
			{ skill: 'Athletics', difficulty: 'CCD', text: 'Average [CCD] Athletics check' },
			{ skill: 'Athletics', difficulty: 'D', text: 'Simple [D] Athletics check' },
			{ skill: 'Athletics', difficulty: 'CCCCCD', text: 'Impossible [CCCCCD] Athletics check' },
		],
	);
	const linkPrompt = async (client: Client, doc: Doc | { message: string }, skill: string, difficulty?: string) => {
		const state = await opened(client, () =>
			client.evaluate((args) => window.dicePromptE2E.clickLink(args), { doc, skill, difficulty }),
		);
		return { actor: state.actor, skill: state.skill, pool: state.pool };
	};
	await control(gm, ['Bo']);
	e2e.expect(
		"#51 G2 a journal entry's link opens the prompt for the controlled token's actor, with the link's difficulty",
		{
			hard: await linkPrompt(gm, journal, 'Athletics', 'DDD'),
			upgraded: await linkPrompt(gm, journal, 'Cool', 'CD'),
			upgradedPastDifficulty: await linkPrompt(gm, journal, 'Athletics', 'CC'),
		},
		{
			hard: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|DDD' },
			upgraded: { actor: 'Bo', skill: 'Cool (Pr)', pool: '|CD' },
			upgradedPastDifficulty: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|CC' },
		},
	);
	e2e.expect(
		'#51 G3 an opposed check link stays inert',
		await noPrompt(gm, () => gm.evaluate((doc) => window.dicePromptE2E.clickLink({ doc, skill: null }), journal)),
		{ prompts: 0, notifications: [] },
	);
	const gmMessage = await gm.evaluate(() => window.dicePromptE2E.chatMessage('<p>@check[Athletics,3]</p>'));
	e2e.expect(
		"#51 G4 a chat message's and an item sheet's links open the prompt for the controlled token's actor",
		{
			message: await linkPrompt(gm, { message: gmMessage }, 'Athletics'),
			item: await linkPrompt(gm, { item: 'Note' }, 'Athletics'),
			ownedItem: await linkPrompt(gm, { actor: 'Ada', item: 'Map' }, 'Cool'),
		},
		{
			message: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|DDD' },
			item: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|DDD' },
			ownedItem: { actor: 'Bo', skill: 'Cool (Pr)', pool: '|CD' },
		},
	);
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	e2e.expect(
		"#51 G5 an actor sheet's link rolls for that actor, with a token controlled, right after the sheet opens",
		{
			character: await linkPrompt(gm, ada, 'Athletics'),
			adversary: await linkPrompt(gm, { actor: 'Rival' }, 'Athletics'),
		},
		{
			character: { actor: 'Ada', skill: 'Athletics (Br)', pool: 'AAA|DDD' },
			adversary: { actor: 'Rival', skill: 'Athletics (Br)', pool: 'AA|DDD' },
		},
	);
	await control(gm, []);
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await e2e.step('G end');

	// H: `@check` links as a player (§#51).
	const warning = 'warning: Select a single token or assign yourself a character to roll this check.';
	const playerLink = (doc: Doc | { message: string }, skill: string, difficulty?: string) => linkPrompt(player, doc, skill, difficulty);
	const playerNoPrompt = (doc: Doc) =>
		noPrompt(player, () =>
			player.evaluate((doc) => window.dicePromptE2E.clickLink({ doc, skill: 'Athletics', difficulty: 'DDD' }), doc),
		);
	await control(player, []);
	const noToken = await playerNoPrompt(journal);
	await control(player, ['Bo']);
	const oneToken = { hard: await playerLink(journal, 'Athletics', 'DDD'), upgraded: await playerLink(journal, 'Cool', 'CD') };
	await control(player, ['Bo', 'Cy']);
	const twoTokens = await playerNoPrompt(journal);
	e2e.expect(
		'#51 H1 as a player without a character, a link rolls for the single controlled token, and asks for one otherwise',
		{ noToken, oneToken, twoTokens },
		{
			noToken: { prompts: 0, notifications: [warning] },
			oneToken: {
				hard: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|DDD' },
				upgraded: { actor: 'Bo', skill: 'Cool (Pr)', pool: '|CD' },
			},
			twoTokens: { prompts: 0, notifications: [warning] },
		},
	);
	await gm.evaluate((user) => game.users.getName(user).update({ character: game.actors.getName('E2E Cy').id }), e2e.playerUser);
	await e2e.settle();
	await control(player, ['Bo', 'Cy']);
	const characterTwoTokens = await playerLink(journal, 'Athletics', 'DDD');
	await control(player, []);
	const characterNoToken = await playerLink(journal, 'Athletics', 'DDD');
	await control(player, ['Bo']);
	const playerMessage = await gm.evaluate(() => window.dicePromptE2E.chatMessage('<p>@check[Athletics,3]</p>'));
	e2e.expect(
		'#51 H2 as a player with a character, a link rolls for the single controlled token, otherwise the character',
		{
			twoTokens: characterTwoTokens,
			noToken: characterNoToken,
			message: await playerLink({ message: playerMessage }, 'Athletics'),
			opposed: await noPrompt(player, () => player.evaluate((doc) => window.dicePromptE2E.clickLink({ doc, skill: null }), journal)),
		},
		{
			twoTokens: { actor: 'Cy', skill: 'Athletics (Br)', pool: '|DDD' },
			noToken: { actor: 'Cy', skill: 'Athletics (Br)', pool: '|DDD' },
			message: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|DDD' },
			opposed: { prompts: 0, notifications: [] },
		},
	);
	await control(player, ['Cy']);
	e2e.expect(
		"#51 H3 as a player, an actor sheet's link rolls for that actor",
		{ character: await playerLink({ actor: 'Bo' }, 'Athletics'), adversary: await playerLink({ actor: 'Rival' }, 'Athletics') },
		{
			character: { actor: 'Bo', skill: 'Athletics (Br)', pool: '|DDD' },
			adversary: { actor: 'Rival', skill: 'Athletics (Br)', pool: 'AA|DDD' },
		},
	);
	await control(player, []);
	await player.evaluate(() => window.dicePromptE2E.closePrompts());
	await player.evaluate(() => window.dicePromptE2E.closeSheets());
	await e2e.step('H end');

	// I: `@pool` links in a journal page (§#115).
	e2e.expect(
		'#115 I1 a pool link with a glyph in the wrong case stays as written, the others show their icons',
		await gm.evaluate((doc) => window.dicePromptE2E.pools(doc), journal),
		[
			{ text: 'P1 @pool[p]', icons: '' },
			{ text: 'P2 @pool[T]', icons: '' },
			{ text: 'P3 @pool[Pp]', icons: '' },
			{ text: 'P4 PAA', icons: 'P+ A+ A^' },
			{ text: 'P5 PAA', icons: 'P+ A+ A^' },
			{ text: 'P6 a', icons: 'a+' },
		],
	);
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());

	// J: the Default Difficulty and Skills Compendium settings (§#32, §#100).
	const defaultDifficulty = async (value: string) => {
		await setSetting('defaultDifficulty', value);
		const state = await opened(gm, () => gm.evaluate(() => ui.chat.processMessage('/gendr')));
		return { applied: await gm.evaluate(() => CONFIG.genesys.settings.defaultDifficulty), pool: state.pool };
	};
	e2e.expect(
		'#32 J1 the Default Difficulty setting rejects a value that is not glyphs',
		{ glyphs: await defaultDifficulty('DDD'), text: await defaultDifficulty('xyz') },
		{ glyphs: { applied: 'DDD', pool: '|DDD' }, text: { applied: 'DD', pool: '|DD' } },
	);
	await setSetting('defaultDifficulty', 'DD');
	const skillsCompendium = async (value: string) => {
		await gm.evaluate(() => window.dicePromptE2E.clearNotifications());
		await setSetting('skillsCompendium', value);
		await e2e.settle();
		return gm.evaluate(() => ({
			compendium: CONFIG.genesys.settings.skillsCompendium,
			skills: CONFIG.genesys.skills.length,
			notifications: window.dicePromptE2E.notifications(),
		}));
	};
	e2e.expect(
		'#100 J2 an empty Skills Compendium setting warns and loads the default one, a missing one is an error',
		{
			empty: await skillsCompendium(''),
			missing: await skillsCompendium('world.e2e-missing'),
			default: await skillsCompendium('genesys.crb-skills'),
		},
		{
			empty: {
				compendium: 'genesys.crb-skills',
				skills: 37,
				notifications: ['warning: Skills compendium setting is empty! Attempting to use default skills compendium.'],
			},
			missing: {
				compendium: 'world.e2e-missing',
				skills: 0,
				notifications: [
					"error: Unable to load Skills Compendium 'world.e2e-missing'. Reconfigure the skills compendium in Genesys Settings.",
				],
			},
			default: { compendium: 'genesys.crb-skills', skills: 37, notifications: [] },
		},
	);
	await gm.evaluate(() => window.dicePromptE2E.createSkillsPack());
	await setSetting('skillsCompendium', 'world.e2e-skills');
	await e2e.settle();
	await gm.evaluate(() => window.dicePromptE2E.renameSkill('E2E Lore Renamed'));
	const renamed = await opened(gm, skillRoll('Cool'));
	e2e.expect(
		'#100 J3 a skill renamed in a world Skills Compendium shows its new name in the prompt without a reload',
		{
			skills: await gm.evaluate(() => CONFIG.genesys.skills.map((skill: { name: string }) => skill.name)),
			unranked: renamed.skills?.Unranked,
		},
		{ skills: ['E2E Lore Renamed'], unranked: ['E2E Lore Renamed (Int)'] },
	);
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	await setSetting('skillsCompendium', 'genesys.crb-skills');
	await gm.evaluate(() => game.packs.get('world.e2e-skills')?.deleteCompendium());
	await e2e.step('J end');

	// K: the chance to succeed, as the player (§#90, §#157).
	await player.evaluate(() => game.settings.set('genesys', 'dicePoolChanceToSucceedByPermutation', true));
	await player.reload();
	await player.evaluate(installDicePromptHelpers);
	const playerGendr = () => opened(player, () => player.evaluate(() => ui.chat.processMessage('/gendr')));
	const chance = (expected: string) =>
		player.evaluate((expected) => window.dicePromptE2E.promptChance({ expected, timeout: 10_000 }), expected);
	const add = (keys: string[]) => player.evaluate((keys) => window.dicePromptE2E.promptAdd(keys), keys);
	await playerGendr();
	const chances: Record<string, string | null> = { DD: await chance('0.00%') };
	const steps: [string, string[], string][] = [
		['+A', ['A+'], '23.44%'],
		['+P', ['P+'], '50.20%'],
		['+B', ['B+'], '58.82%'],
		['upgrade A', ['A^'], '64.42%'],
		['+C', ['C+'], '45.09%'],
		['upgrade D', ['D^'], '38.79%'],
		['+S', ['S+'], '31.91%'],
		['+s', ['s+'], '54.64%'],
		['+f', ['f+'], '31.91%'],
	];
	for (const [name, keys, expected] of steps) {
		await add(keys);
		chances[name] = await chance(expected);
	}
	await player.evaluate(() => window.dicePromptE2E.promptRemove('C'));
	chances['-C'] = await chance('48.64%');
	e2e.expect(
		'#90 K1 the worker started after the setting is turned on gives the chance of each pool',
		chances,
		Object.fromEntries([['DD', '0.00%'], ...steps.map(([name, , expected]) => [name, expected]), ['-C', '48.64%']]),
	);
	await add(['P+', 'P+', 'A+', 'A+', 'A+', 'B+', 'D+', 'D+', 'C+', 'S+']);
	const large = await player.evaluate(async () => {
		const start = Date.now();
		let last = start;
		let longestPause = 0;
		const ticker = setInterval(() => {
			longestPause = Math.max(longestPause, Date.now() - last);
			last = Date.now();
		}, 20);
		const chance = await window.dicePromptE2E.promptChance({ expected: '74.52%', timeout: 30_000 });
		clearInterval(ticker);
		return { chance, answered: Date.now() - start < 30_000, frozen: longestPause > 1000 };
	});
	e2e.expect('#90 K2 a pool of 16 dice gets its chance without freezing the prompt', large, {
		chance: '74.52%',
		answered: true,
		frozen: false,
	});
	await playerGendr();
	await player.evaluate(() => window.dicePromptE2E.promptRemove('D'));
	await player.evaluate(() => window.dicePromptE2E.promptRemove('D'));
	const noDice = await chance('0.00%');
	await add(['s+']);
	e2e.expect(
		'#157 K3 a pool without dice has a chance of 0 %, then 100 % with a Success',
		{ noDice, success: await chance('100.00%') },
		{
			noDice: '0.00%',
			success: '100.00%',
		},
	);
	const errorsBefore = player.errors.length;
	const workerFailed = () => player.errors.slice(errorsBefore).some((error) => error.includes('Genesys | The chance worker failed.'));
	await player.evaluate(() => window.dicePromptE2E.breakChanceWorker(true));
	await playerGendr();
	// The worker's error is no activity of the page that settling sees: wait for it to be logged, or long enough to tell it
	// isn't.
	for (const start = Date.now(); !workerFailed() && Date.now() - start < 3000; ) await e2e.settle();
	e2e.expect(
		'#90 K4 a worker error is logged and the prompt keeps its spinner',
		{
			chance: (await player.evaluate(() => window.dicePromptE2E.promptChance({ expected: 'spinner', timeout: 0 }))) ?? null,
			logged: workerFailed(),
		},
		{ chance: 'spinner', logged: true },
	);
	await player.evaluate(() => window.dicePromptE2E.breakChanceWorker(false));
	await player.evaluate(() => window.dicePromptE2E.closePrompts());
	await player.evaluate(() => game.settings.set('genesys', 'dicePoolChanceToSucceedByPermutation', false));
	await e2e.step('K end');

	// L: the Story Point Tracker with a GM and a player (§#157).
	const storyPoints = async () => ({
		gm: await gm.evaluate(() => window.dicePromptE2E.storyPoints()),
		player: await player.evaluate(() => window.dicePromptE2E.storyPoints()),
	});
	const tracker = (gmPool: number, playerPool: number, spendable: { gm: boolean[]; player: boolean[] }) => ({
		gm: { setting: { gm: gmPool, player: playerPool }, shown: [`${gmPool}`, `${playerPool}`], spendable: spendable.gm },
		player: { setting: { gm: gmPool, player: playerPool }, shown: [`${gmPool}`, `${playerPool}`], spendable: spendable.player },
	});
	await gm.evaluate(() => window.dicePromptE2E.clickStoryPoints('reset'));
	const reset = await storyPoints();
	await gm.evaluate(() => window.dicePromptE2E.clickStoryPoints('gm'));
	const gmSpentGm = await storyPoints();
	await gm.evaluate(() => window.dicePromptE2E.clickStoryPoints('player'));
	const gmSpentPlayer = await storyPoints();
	await player.evaluate(() => window.dicePromptE2E.clickStoryPoints('player'));
	const playerSpentLast = await storyPoints();
	await player.evaluate(() => window.dicePromptE2E.clickStoryPoints('player'));
	e2e.expect(
		'#157 L1 the Story Point pools move between the GM and the players, from both clients',
		{ reset, gmSpentGm, gmSpentPlayer, playerSpentLast, playerSpentNone: await storyPoints() },
		{
			reset: tracker(1, 1, { gm: [true, true], player: [false, true] }),
			gmSpentGm: tracker(0, 2, { gm: [false, true], player: [false, true] }),
			gmSpentPlayer: tracker(1, 1, { gm: [true, true], player: [false, true] }),
			playerSpentLast: tracker(2, 0, { gm: [true, false], player: [false, false] }),
			playerSpentNone: tracker(2, 0, { gm: [true, false], player: [false, false] }),
		},
	);
	await e2e.step('L end');

	await gm.evaluate((settings) => window.dicePromptE2E.restore(settings), { user: e2e.playerUser, settings: saved });
}
