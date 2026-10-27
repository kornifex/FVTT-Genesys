/** @file The sheet and chat card items of the test checklist (#37), each step named after its section: `#95 A1 …` for §#95. */
import type { Client, ScenarioContext } from '../scenario.ts';

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

type SheetsHelpers = {
	/** Deletes what the previous run left, then creates the actors and the world items, one of each item type. */
	setUp(player: string): Promise<void>;
	closeAll(): Promise<void>;
	/** Renders the sheet of an actor, a world item, or an owned item (`Actor/Item`), and returns its window's state. */
	open(name: string): Promise<{ appV2: boolean; title: string; headerTitle: string }>;
	close(name: string): Promise<void>;
	/** The header buttons and controls menu entries of a sheet. */
	header(name: string): { buttons: string[]; controls: string[] };
	clickTab(name: string, tab: string): Promise<void>;
	activeTab(name: string): string | null;
	/** Marks a field of a sheet so that the scenario can type in it with Playwright. */
	markField(name: string, selector: string, mark: string): Promise<void>;
	changeField(name: string, selector: string, value: string): Promise<void>;
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
	/** Sets an input of an open prompt and fires its event. */
	setPromptInput(cssClass: string, selector: string, value: string, event: string): void;
	clickPrompt(cssClass: string, selector: string): Promise<void>;
	pickImage(name: string, path: string): Promise<{ pickerShown: boolean; img: string }>;
	/** Chat messages created since the last {@link readMessages}. */
	readMessages(): { speaker: string; rolls: number; content: string }[];
	storyPoints(): { gm: number; player: number };
	clickStoryPoints(selector: string): Promise<void>;
	setStoryPoints(points: { gm: number; player: number }): Promise<void>;
	journal(actor: string): { availableXP: number; entries: number };
	effectSheet: {
		create(): Promise<void>;
		open(owner: string): Promise<void>;
		state(owner: string): Promise<{
			template: string;
			charSelect: { options: string[]; values: string[]; selected: string };
			keyGroup: { label: string; options: string[]; values: string[] };
			keySelected: string;
			skillSelects: { index: number; selected: string; custom: boolean; changeCase: boolean; compendiumCase: boolean }[];
		}>;
		edit(owner: string): Promise<void>;
		submit(owner: string): Promise<void>;
		changes(owner: string): [string, number, string][];
	};
	setLanguage(lang: string): Promise<void>;
	effectRows(name: string): EffectRow[];
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
	welcomeLink(): string | null;
	cleanUp(): Promise<void>;
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
	const { sleep, waitFor, text, isSetUp, htmlOf, actor, apps, drop } = window.e2e;
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
	const find = (root: Element, selector: string, which: number | string = 1) => {
		const matches = [...root.querySelectorAll<HTMLElement>(selector)];
		// A role member's tile only shows its actor's name as a tooltip.
		const named = (match: HTMLElement, name: string) => text(match).includes(name) || !!match.querySelector(`[data-tooltip="${name}"]`);
		const found = typeof which === 'number' ? matches[which - 1] : matches.find((match) => named(match, which));
		if (!found) throw new Error(`No ${selector} ${which}`);
		return found;
	};
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
			const playerId = game.users.getName(player).id;
			const levels = CONST.DOCUMENT_OWNERSHIP_LEVELS;
			await Actor.createDocuments([
				{
					name: 'E2E Hero',
					type: 'character',
					// Artwork of its own, for the header's artwork entries.
					img: 'icons/svg/aura.svg',
					prototypeToken: { texture: { src: 'icons/svg/aura.svg' } },
					ownership: { default: 0, [playerId]: levels.OWNER },
				},
				{ name: 'E2E Observed', type: 'character', ownership: { default: 0, [playerId]: levels.OBSERVER } },
				{ name: 'E2E Limited', type: 'character', ownership: { default: 0, [playerId]: levels.LIMITED } },
				{ name: 'E2E Bearer', type: 'character' },
				{ name: 'E2E Minion', type: 'minion' },
				{ name: 'E2E Rival', type: 'rival' },
				{ name: 'E2E Nemesis', type: 'nemesis' },
				{ name: 'E2E Vehicle', type: 'vehicle' },
			]);
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
			await sleep(500);
		},

		async open(name) {
			const app = documentNamed(name).sheet;
			if (!app.rendered) {
				await app.render(true);
				await waitFor(`sheet of ${name}`, () => app.rendered && htmlOf(app));
				await sleep(300);
			}
			return {
				appV2: app instanceof ApplicationV2,
				title: app.title,
				headerTitle: text(htmlOf(app)!.querySelector('.window-header .window-title')),
			};
		},

		async close(name) {
			const app = documentNamed(name).sheet;
			if (app.rendered) await app.close();
			await sleep(300);
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
			await sleep(300);
		},

		activeTab(name) {
			return sheetElement(name).querySelector<HTMLElement>('.sheet-tabs .item.active')?.dataset.tab ?? null;
		},

		async markField(name, selector, mark) {
			find(sheetElement(name), selector).dataset.e2e = mark;
		},

		async changeField(name, selector, value) {
			setSelect(sheetElement(name), selector, value);
			await sleep(300);
		},

		isRendered(name) {
			return documentNamed(name).sheet.rendered;
		},

		async renderHooks(name) {
			const app = documentNamed(name).sheet;
			if (app.rendered) await app.close();
			await sleep(300);
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
			await app.render(true);
			await waitFor(`sheet of ${name}`, () => app.rendered);
			await sleep(500);
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
			await sleep(1000);
		},

		prompts(cssClass) {
			return promptsOf(cssClass).map((app: { title: string }) => ({ appV2: app instanceof ApplicationV2, title: app.title }));
		},

		async closePrompts(cssClass) {
			await Promise.all(promptsOf(cssClass).map((app: { close(): Promise<void> }) => app.close()));
			await sleep(300);
		},

		async promptResolution() {
			// The prompt's class, from a prompt the journal opened.
			const shown = await waitFor('award XP prompt', () => promptsOf('app-award-xp-prompt')[0]);
			const AwardXPPrompt = shown.constructor;
			await helpers.closePrompts('app-award-xp-prompt');
			await sleep(300);

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
			await sleep(500);
		},

		async drag(name, from, which, to) {
			const element = sheetElement(name);
			const dataTransfer = new DataTransfer();
			find(element, from, which).dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
			drop(find(element, to), dataTransfer);
			await sleep(1000);
		},

		async menu(name, container, which, icon) {
			const element = find(sheetElement(name), container, which);
			const menu = element.matches('.menu-container') ? element : element.querySelector<HTMLElement>('.menu-container')!;
			// A menu opens on a click or a right click, and the other closes it.
			menu.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
			await sleep(300);
			if (!menu.querySelector('.context-menu')) {
				menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			}
			const entry = await waitFor(`menu entry ${icon}`, () =>
				[...menu.querySelectorAll<HTMLElement>('.context-menu .menu-item')].find((item) => item.querySelector(`i.${icon}`)),
			);
			entry.click();
			await sleep(500);
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
			await sleep(500);
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
			await sleep(500);
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
			await sleep(1000);
		},

		async setStoryPoints(points) {
			await game.settings.set('genesys', 'storyPoints', points);
			foundry.applications.instances.get('story-point-tracker')?.render(true);
			await sleep(500);
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
				await sleep(300);
				await app.render(true);
				await waitFor(`effect sheet on ${owner}`, () => app.rendered && htmlOf(app)?.querySelector('[name="changes.0.key"]'));
				await sleep(300);
			},

			async state(owner) {
				const app = editedEffect(owner).sheet;
				const element = htmlOf(app)!;
				const select = (name: string) => element.querySelector<HTMLSelectElement>(`select[name="${name}"]`)!;
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
				setSelect(element(), 'select[name="changes.0.key"]', 'system.characteristics.presence');
				setSelect(element(), 'select[name="changes.0.mode"]', '5');
				setSelect(element(), 'select[name="changes.1.char"]', 'presence');
				setSelect(element(), 'input[name="changes.2.value"]', 'SS');
				setSelect(element(), 'select[name="changes.3.skill"]', 'Cool');
				await sleep(300);
				// Adding a change submits the others and renders the sheet again.
				find(element(), '[data-action="addChange"], [data-action="add"]').click();
				await waitFor('added change', () => element()?.querySelector('[name="changes.6.key"]'));
				await sleep(300);
				setSelect(element(), 'select[name="changes.6.key"]', 'genesys.pool.check.target');
				setSelect(element(), 'input[name="changes.6.value"]', 'B');
				await sleep(300);
			},

			async submit(owner) {
				const app = editedEffect(owner).sheet;
				await app.submit();
				await sleep(500);
			},

			changes(owner) {
				return editedEffect(owner)._source.changes.map((change: { key: string; mode: number; value: string }) => [
					change.key,
					change.mode,
					change.value,
				]);
			},
		},

		async setLanguage(lang) {
			await game.i18n.setLanguage(lang);
		},

		effectRows(name) {
			const view = sheetElement(name).querySelector('.effects-view')!;
			const rows: EffectRow[] = [];
			let section = '';
			for (const element of view.children) {
				if (element.matches('.effects-header')) section = text(element.querySelector('.name'));
				for (const row of element.matches('.effects-category') ? element.querySelectorAll<HTMLElement>('.effect') : []) {
					rows.push({
						section,
						name: text(row.querySelector('.name')),
						source: text(row.querySelector('.source')),
						tooltip: row.dataset.tooltip ?? null,
						buttons: [...row.querySelectorAll('.buttons i')].map((icon) => icon.classList[1]),
					});
				}
			}
			return rows;
		},

		effectsData(name) {
			return [...documentNamed(name).effects].map((effect: { name: string; disabled: boolean; duration: { rounds?: number } }) => ({
				name: effect.name,
				disabled: effect.disabled,
				rounds: effect.duration.rounds ?? null,
			}));
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
			await sleep(300);
			// The system enriches through the global TextEditor, on v13 as on v12.
			const editor = (globalThis as unknown as { TextEditor: { enrichHTML: (...args: unknown[]) => Promise<string> } }).TextEditor;
			const enrichHTML = editor.enrichHTML;
			editor.enrichHTML = async (...args: unknown[]) => {
				await sleep(1500);
				return enrichHTML.apply(editor, args);
			};
			try {
				await app.render(true);
				await waitFor(`source of ${name}`, () => app.rendered && htmlOf(app)?.querySelector('.source'));
				const before = htmlOf(app)!.querySelector('.source')!.innerHTML;
				await sleep(2500);
				return { before, afterLinks: htmlOf(app)!.querySelectorAll('.source a.content-link').length };
			} finally {
				editor.enrichHTML = enrichHTML;
			}
		},

		async update(name, data) {
			await documentNamed(name).update(data);
			await sleep(500);
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
				await sleep(500);
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
			await sleep(1000);
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
			await sleep(300);
		},

		qualityDescription(name) {
			return documentNamed(name)._source.system.qualities[0].description;
		},

		async settingsHintLink() {
			const sheet = game.settings.sheet;
			await sheet.render(true);
			await waitFor('settings', () => sheet.rendered && htmlOf(sheet));
			await sleep(500);
			const link = htmlOf(sheet)!.querySelector<HTMLAnchorElement>('a[href*="kornifex/FVTT-Genesys/wiki"]');
			const href = link?.href ?? null;
			await sheet.close();
			return href;
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

		async cleanUp() {
			await helpers.closeAll();
			await window.e2e.deleteSetUp('Actor', 'Item');
		},
	};

	window.sheetsE2E = helpers;
}

export async function run(e2e: ScenarioContext) {
	const { gm, version } = e2e;
	const page = () => gm.page;

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

	const player = await e2e.player();
	await player.evaluate(installSheetsHelpers);
	await e2e.step('setup', () => gm.evaluate((name) => window.sheetsE2E.setUp(name), e2e.playerUser));

	// §#95: the sheets and prompts are ApplicationV2 windows.
	const actorTypes = ['Hero', 'Minion', 'Rival', 'Nemesis', 'Vehicle'];
	const itemTypes = await gm.evaluate(() => Object.keys(CONFIG.Item.dataModels));
	const windows: Record<string, unknown> = {};
	let header: unknown;
	await e2e.step('#95 GM opens each actor and item sheet', async () => {
		for (const name of [...actorTypes, ...itemTypes]) {
			windows[name] = await gm.evaluate((name) => window.sheetsE2E.open(name), name);
			// v12: hiding the artwork entries of an actor without artwork hides them on every actor sheet until the next
			// reload (Foundry's ActorSheetV2 splices its default controls), so the header is read on the first one.
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

	e2e.expect(
		'#95 A3 the AppV2 header holds the controls menu, with the prototype token and artwork entries, and the copy-UUID and sheet-config buttons',
		header,
		// v13 moves the sheet-config button into the controls menu.
		version === 12
			? {
					buttons: ['close', 'configureSheet', 'copyUuid', 'toggleControls'],
					controls: ['configurePrototypeToken', 'showPortraitArtwork', 'showTokenArtwork'],
				}
			: {
					buttons: ['close', 'copyUuid', 'toggleControls'],
					controls: ['configurePrototypeToken', 'configureSheet', 'showPortraitArtwork', 'showTokenArtwork'],
				},
	);

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
	await e2e.step('#95 GM closes the sheet while the name field has the focus', () =>
		gm.evaluate(() => game.actors.getName('E2E Rival').sheet.close()),
	);
	// Escape can't close a sheet while one of its fields has the focus: Foundry's keybindings skip a focused field.
	e2e.expect(
		'#95 a field edited then closed without leaving it is saved',
		await gm.evaluate(() => !!game.actors.getName('E2E Rival Closed')),
		true,
	);
	await gm.evaluate(() => window.sheetsE2E.update('Rival Closed', { name: 'E2E Rival' }));

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
	await gm.evaluate((points) => window.sheetsE2E.setStoryPoints(points), storyPoints);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#32, §#40, §#49, §#85, §#140: the effect sheet.
	await e2e.step('effect sheet setup', () => gm.evaluate(() => window.sheetsE2E.effectSheet.create()));
	await e2e.step('#85 GM opens the effect sheet from the Effects tab of a character', () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.open('Hero');
			await sheets.clickTab('Hero', 'effects');
			const row = [...game.actors.getName('E2E Hero').sheet.element.querySelectorAll('.effects-view .effect')].find(
				(row: Element) => row.querySelector('.name')?.textContent?.trim() === 'E2E Edited',
			) as HTMLElement;
			row.querySelector<HTMLElement>('.fa-edit')!.parentElement!.click();
			await new Promise((resolve) => setTimeout(resolve, 1500));
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
	const keyGroup = (label: string, names: string[], vehicle: string[]) => ({
		label,
		options: [...names.map((name) => `🧑 ${name}`), ...vehicle.map((name) => `🚗 ${name}`)],
		values: keyValues,
	});
	const state = await gm.evaluate(() => window.sheetsE2E.effectSheet.state('Hero'));
	e2e.expect(
		'#85 A1 the effect sheet renders from its template',
		state.template,
		{
			12: 'systems/genesys/templates/sheets/effect-config.v12.hbs',
			13: 'systems/genesys/templates/sheets/effect-changes-tab.hbs',
		}[version],
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
			group: keyGroup(
				'Modify Characteristic',
				['Brawn', 'Agility', 'Intellect', 'Cunning', 'Willpower', 'Presence'],
				['Silhouette', 'Speed', 'Handling', 'Defense', 'Armor'],
			),
			selected: 'system.characteristics.cunning',
		},
	);
	const skillSelect = (index: number, selected: string) => ({ index, selected, custom: true, changeCase: true, compendiumCase: false });
	e2e.expect(
		"#40 A1 every skill select lists the skills the effect's changes apply to, a compendium skill once with the change's case",
		state.skillSelects,
		[skillSelect(0, state.skillSelects[0]?.selected ?? ''), skillSelect(3, 'E2E Custom Skill'), skillSelect(4, 'ranged (light)')],
	);

	const savedChanges: [string, number, string][] = [
		['system.characteristics.cunning', 2, '1'],
		['genesys.pool.char.self.willpower', 0, 'B'],
		['genesys.pool.check.self.', 0, 'S'],
		['genesys.pool.skill.self.E2E Custom Skill', 0, 'A'],
		['genesys.pool.skill.target.ranged (light)', 0, 'D'],
		['genesys.pool.check.target.', 0, ''],
	];
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
	await e2e.step('#85 GM edits the key, mode, characteristic, skill and value of changes, and adds one', () =>
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
		[
			['system.characteristics.presence', 5, '1'],
			['genesys.pool.char.self.presence', 0, 'B'],
			['genesys.pool.check.self.', 0, 'SS'],
			['genesys.pool.skill.self.Cool', 0, 'A'],
			['genesys.pool.skill.target.ranged (light)', 0, 'D'],
			['genesys.pool.check.target.', 0, ''],
			['genesys.pool.check.target.', 0, 'B'],
		],
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
				['Gabarit', 'Vitesse', 'Maniabilité', 'Défense', 'Armure'],
			),
			selected: 'system.characteristics.cunning',
		},
	);

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
				for (const section of [1, 2, 3]) await sheets.click(name, '.effects-view .effects-header .buttons a', section);
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
			await sheets.clickTab('Rival', 'effects');
			const row = () =>
				[...game.actors.getName('E2E Rival').sheet.element.querySelectorAll('.effects-view .effect')].find(
					(row: Element) => row.querySelector('.name')?.textContent?.trim() === 'E2E Kit effect',
				) as HTMLElement;
			row().querySelector<HTMLElement>('.fa-edit')!.parentElement!.click();
			await new Promise((resolve) => setTimeout(resolve, 1000));
			row().querySelector<HTMLElement>('.fa-power-off')!.parentElement!.click();
			await new Promise((resolve) => setTimeout(resolve, 1000));
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
			await new Promise((resolve) => setTimeout(resolve, 1000));
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

	// §#97: the Default Difficulty setting's hint.
	e2e.expect(
		"#97 A2 the Default Difficulty hint links to the fork's wiki page of the glyphs",
		await gm.evaluate(() => window.sheetsE2E.settingsHintLink()),
		'https://github.com/kornifex/FVTT-Genesys/wiki/Dice-Pool-Modification-Glyphs',
	);

	await e2e.step('cleanup', () => gm.evaluate(() => window.sheetsE2E.cleanUp()));
}
