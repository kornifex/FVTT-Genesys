/** @file #211: the Dice Prompt and checks: the pool a check rolls, its Pool Modifications, its links, its chance to succeed and its messages. */
import type { GlyphName } from '../accessibility.ts';
import { FOLD_TRANSITION } from '../descriptions.ts';
import type { FoldToggle } from '../page.ts';
import type { Client, ScenarioContext } from '../scenario.ts';
import { dagger } from '../weaponProfiles.ts';

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

/**
 * The card of a roll's chat message, every part of it, as the user reads it.
 */
type CardSummary = Pick<MessageSummary, 'results' | 'summaries'> & {
	/** The labels of the card's parts, in order. */
	labels: string[];
	/** Each quality of an attack, with its tooltip. */
	qualities: { text: string; tooltip: string | null }[];
	/** Each Additional Effect a spell is cast with, its qualities after its name; left out of a card without any. */
	spellEffects?: string[];
	/** The dice row: each die's letter and face, then the extra symbols. */
	dice: string;
};

/**
 * The Additional Effects of a spell's Dice Prompt (§#705), as the caster reads them.
 */
type PromptSpellEffects = {
	/** Each effect: its label, the difficulty it adds, its checkbox, and why it is closed. */
	effects: { name: string; adds: string; checked: boolean; disabled: boolean; why: string }[];
	/** The Difficulty row's label: `Difficulty: Hard`. */
	difficulty: string;
	pool: string;
};

type CheckLink = { skill: string | null; difficulty: string | null; text: string };

/**
 * A glyph set in a line of text, as drawn: how far the centre of its ink sits above the middle of the text's capitals,
 * in px and in em of its font size; then the same against the middle of the text's x-height, in px.
 */
type InlineGlyph = { px: number; em: number; fontSize: number; aboveXHeight: number };

/**
 * The Pool Modifications' title and rows as laid out (§#513), in px from the table's left edge, a tenth of a px apart.
 */
type PoolModificationsLayout = {
	/** The title's text. */
	titleText: number;
	/** The caret's box, and its vertical axis. */
	caret: { left: number; right: number; axis: number };
	rows: {
		/**
		 * How far below the middle of the label's capitals the middle of the first modification's glyph sits, by the ink
		 * the fonts draw rather than by their boxes; null without a modification.
		 */
		ink: number | null;
		/** The row's height, its borders included. */
		height: number;
		/** The label's left edge. */
		label: number;
		/** Where each line of the label's text starts, from the label's left edge. */
		lineStarts: number[];
		/** How far below the middle of the label's first line the checkbox's middle sits; null in a row without one. */
		checkbox: number | null;
		/** How far below the middle of the label's first line the first modification's middle sits; null without one. */
		modification: number | null;
		/** The `top` offsets of the modifications, other than `auto` and `0px`. */
		offsets: string[];
	}[];
};

/**
 * The prompt's Difficulty and manual changes, as the user sees them.
 */
/**
 * The Story Point spends of the Dice Prompt (§#671), as the roller reads them.
 */
type PromptSpends = {
	/** Each spend offered: its name, its label with its pool, its checkbox, and why it is closed or what it costs. */
	spends: { spend: string; label: string; checked: boolean; disabled: boolean; why: string }[];
	/** The Difficulty row's label: `Difficulty: Impossible`. */
	difficulty: string;
	pool: string;
	canRoll: boolean;
};

type PromptDifficulty = {
	/** The labels of the Pool Modifications' rows other than the effects'. */
	rows: string[];
	/** The Difficulty row's label, which names the level: `Difficulty: Hard`. */
	label: string;
	/** The Difficulty row's five dice, a lit one by its glyph and an unlit one as `·`: `CDD··`. */
	dice: string;
	/** The manual changes, as Pool Modifications. */
	manualChanges: string;
	hint: string;
};

/**
 * The link a Pool Modification row makes of the name of what it comes from (§#495), as the user sees it.
 */
type SourceLink = {
	/** The link's text: the effect, and its item when they are named apart. */
	text: string;
	tooltip: string | null;
	/** The classes of the icon that follows the name. */
	icon: string | null;
	cursor: string;
};

/**
 * The prompt's Pool Modifications as laid out: their expander, which folds them, and the container of their rows.
 */
type PoolModificationsBox = {
	unfolded: boolean;
	/** The expander's transition, as `<property> <duration> <easing>`. */
	transition: string;
	/** The expander's height: `whole` when it shows its container whole, else in px. */
	height: number | 'whole';
	/** The container's visibility, which Tab follows. */
	visibility: string;
	/** Whether the rows show a Pool Modification. */
	modifications: boolean;
};

type DicePromptHelpers = {
	settings(user: string): Settings;
	restore(args: { user: string; settings: Settings }): Promise<void>;
	setUp(user: string): Promise<void>;
	setSetting(args: { key: string; value: unknown }): Promise<void>;
	update(args: { doc: Doc; data: object }): Promise<void>;
	/** The Defense of a vehicle's sheet, rendered unless it is: the total it shows, and the vehicle's own in its field. */
	vehicleDefense(vehicle: string): Promise<{ total: string; vehicle: string }>;
	/** Clicks the Pilot Role checkbox of a vehicle's Role on its sheet, then gives whether the Role is the Pilot Role. */
	clickPilotRole(args: { vehicle: string; role: string }): Promise<boolean>;
	/** Turns an effect of an actor's item off or on. */
	setItemEffectDisabled(args: { actor: string; item: string; effect: string; disabled: boolean }): Promise<void>;
	/** The open Dice Prompts. */
	openPrompts(): number;
	waitForPrompt(): Promise<PromptState>;
	closePrompts(): Promise<void>;
	/** Picks an option of the prompt's select: a characteristic by value, a skill by the start of its text. */
	promptSelect(args: { name: 'characteristic' | 'skill'; option: string }): Promise<PromptState>;
	promptToggle(name: string): Promise<PromptState>;
	/** The Pool Modification rows' labels, each with the link to what it comes from, or null when it has none. */
	promptSourceLinks(): { name: string; link: SourceLink | null }[];
	/**
	 * Clicks the link of the Pool Modification row whose label holds a name, then gives the document whose sheet it opened,
	 * how many Dice Prompts are still open, and whether the row's checkbox is ticked. Null when the row has no link, as before
	 * #495.
	 */
	openPromptSource(name: string): Promise<{ opened: { type: string; name: string }; prompts: number; enabled: boolean } | null>;
	poolModificationsBox(): PoolModificationsBox;
	/** The Pool Modifications' title, which folds and unfolds them, as read (#579). */
	poolModificationsToggle(): FoldToggle;
	/** Clicks the Pool Modifications' title, which folds or unfolds them, and waits for their transitions to end. */
	togglePoolModifications(): Promise<PoolModificationsBox>;
	/** Clicks the dice box's buttons, named by glyph and operator: `A+` adds an Ability die, `A^` upgrades one. */
	promptAdd(keys: string[]): Promise<PromptState>;
	/** Removes a die or symbol of the pool preview, as a click on it does. */
	promptRemove(glyph: string): Promise<PromptState>;
	promptDifficulty(): PromptDifficulty;
	/** The labels of every Pool Modifications' row, in the order the prompt shows them. */
	promptRows(): string[];
	/** The reminders of the roller's Token States the prompt shows, in its order (#682). */
	promptReminders(): string[];
	/** Clicks the Difficulty row's dice, numbered from 1, in this order. */
	setPromptDifficulty(dice: number[]): Promise<{ pool: string; difficulty: PromptDifficulty }>;
	/** Clicks the manual change at an index, which removes it. */
	removePromptManualChange(index: number): Promise<{ pool: string; difficulty: PromptDifficulty }>;
	/** Waits until the prompt shows this chance to succeed, then returns the chance it shows. */
	promptChance(args: { expected: string; timeout: number }): Promise<string | null>;
	promptRoll(): Promise<MessageSummary>;
	/** Clicks the prompt's roll button, and gives whether a message was posted, for a roll that may be refused. */
	promptRollTried(): Promise<{ posted: boolean }>;
	/** The prompt's Story Point spends, its difficulty's label, its pool, and whether its roll button is enabled. */
	promptSpends(): PromptSpends;
	/** Clicks a Story Point spend's checkbox, by the spend's name. */
	promptSpend(spend: string): Promise<PromptSpends>;
	/** The Additional Effects of a spell's prompt, its difficulty's label and its pool. */
	promptSpellEffects(): PromptSpellEffects;
	/** Clicks an Additional Effect's checkbox, by its label. */
	promptCheckEffect(name: string): Promise<PromptSpellEffects>;
	/**
	 * Clicks the prompt's roll button, then waits for the check's message, which comes after those of the spends: the
	 * check's message, null when none was posted, the Story Point messages posted, and the prompts left open.
	 */
	promptRollSpending(): Promise<{ rolled: MessageSummary | null; storyPointMessages: number; prompts: number }>;
	lastMessage(): MessageSummary;
	/** The last message's speaker, without its `E2E ` prefix, and its text, for a message that shows no roll. */
	lastMessageText(): { speaker: string | null; text: string };
	lastCard(): CardSummary;
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
	/**
	 * Rolls 6d6 to the chat, then reads whether the Genesys Symbols font draws a core die's result in the roll's tooltip,
	 * and the Genesys dice of a document's `@dice`, `@check` and `@pool` links.
	 */
	glyphFonts(doc: Doc): Promise<Record<'coreDie' | 'diceLink' | 'checkLink' | 'poolLink', boolean>>;
	/** The glyphs a document's enrichers set in its lines of text, each with how far it sits from the text around it. */
	inlineGlyphs(doc: Doc): Promise<Record<string, InlineGlyph>>;
	control(names: string[]): void;
	/** Collapses the sidebar, expands it on the chat tab, then collapses it again, and reads the Dice Roller's buttons each time. */
	diceRollerButtons(): Promise<Record<string, { count: number; place: string | null; label: string | null }>>;
	clickDiceRoller(): void;
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
	/** The language the page shows, and the name and hint of a setting in the game settings window, which it closes after. */
	settingText(key: string): Promise<{ language: string; name: string; hint: string }>;
	/** The Pool Modifications' title and rows as laid out (§#513). */
	poolModificationsLayout(): PoolModificationsLayout;
	/** Rolls a formula of Genesys dice to the chat, its dice tooltip expanded, and returns the message's id. */
	rollToChat(formula: string): Promise<string>;
	/**
	 * Shows a message in the chat log, the sidebar expanded on its chat tab, marked `data-e2e="glyph-message"` for a
	 * Node-side selector; returns the sidebar's state before, for {@link restoreSidebar}.
	 */
	showMessage(id: string): Promise<SidebarState>;
	restoreSidebar(state: SidebarState): void;
	/**
	 * Waits for the patient prompt, and gives the patients it offers, without their `E2E ` prefix, leaving out the world's
	 * other actors; then picks the one given and selects it, or closes the prompt.
	 */
	patientPrompt(pick: string | null): Promise<string[]>;
	/**
	 * Shows a message in the chat log, then gives whether its card shows the Apply button of a check that heals, and
	 * clicks it when asked, waiting for the patient's update.
	 */
	recoveryButton(args: { id: string; click: boolean }): Promise<boolean>;
	/** An actor's wounds and strain, `null` for strain when they suffer none. */
	health(name: string): { wounds: number; strain: number | null };
};

/** Whether the sidebar is expanded, and its active tab. */
type SidebarState = { expanded: boolean; tab: string };

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
				name: text(row.querySelector('.effect-name')),
				enabled: row.querySelector('input')!.checked,
				mods: [...row.querySelectorAll(':scope > div > .pool-modification')].map((mod) => poolModification(mod)).join(' '),
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
	const SETTINGS = [
		'uncoupleSkills',
		'useSuperCharacteristics',
		'defaultDifficulty',
		'skillsCompendium',
		'showDamageOnFailure',
		'dicePoolCollapseModificationsDetails',
	];
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

			const { OBSERVER } = CONST.DOCUMENT_OWNERSHIP_LEVELS;
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
				{ name: 'E2E Bo', type: 'character', system: { notes: '<p>@check[Athletics,3]</p>' } },
				{ name: 'E2E Cy', type: 'character' },
				// Effects named alike, as the sheets name a new effect after its item: on one item, and on two copies of an item
				// (§#445). Characteristics of 1, so a characteristic check rolls one Ability die.
				...[
					{ name: 'Ring Bearer', items: [['^', '*']] },
					{ name: 'Twin Rings', items: [['^'], ['^']] },
					{ name: 'Uneven Rings', items: [['^'], ['^^']] },
				].map(({ name, items }) => ({
					name: `E2E ${name}`,
					type: 'character',
					system: { characteristics: characteristics([1, 1, 1, 1, 1, 1]) },
					items: [
						skill('Cool', 'presence', 0),
						...items.map((values) => ({
							name: 'E2E Ring',
							type: 'gear',
							system: { state: 'carried' },
							effects: values.map((value) => effect('Ring', 'check.self.', value)),
						})),
					],
				})),
				// An effect that upgrades the difficulty twice, as Adversary 2 does (§#450). Characteristics of 2, so a
				// characteristic check rolls two Ability dice.
				{
					name: 'E2E Shadowed',
					type: 'character',
					system: { characteristics: characteristics([2, 2, 2, 2, 2, 2]) },
					items: [
						{
							name: 'E2E Shroud',
							type: 'gear',
							system: { state: 'carried' },
							effects: [effect('Shroud', 'check.self.', '**')],
						},
					],
				},
				// What a Pool Modification comes from, which the prompt opens (§#495): a talent whose effect has another
				// name, a piece of equipment whose effect has its name, an effect of the actor itself, and a target the
				// player may not see, whose talent's effect has another name.
				{
					name: 'E2E Seeker',
					type: 'character',
					system: { characteristics: characteristics([1, 1, 1, 1, 1, 1]) },
					items: [
						skill('Cool', 'presence', 0),
						{ name: 'E2E Quick Draw', type: 'talent', effects: [effect('Fate', 'check.self.', 'B')] },
						{ name: 'E2E Lens', type: 'gear', system: { state: 'carried' }, effects: [effect('Lens', 'check.self.', 'a')] },
					],
					effects: [effect('Grit', 'check.self.', 'S')],
				},
				{
					name: 'E2E Veiled',
					type: 'rival',
					items: [{ name: 'E2E Shade', type: 'talent', effects: [effect('Haze', 'check.target.', 'S')] }],
				},
				// A talent the system matches by its effect, not its name, that raises a vehicle's defense as Defensive Driving
				// does (§#482).
				{
					name: 'E2E Driver',
					type: 'character',
					items: [
						{
							name: 'E2E Steady Hands',
							type: 'talent',
							system: { activation: { type: 'passive', detail: '' }, tier: 1, ranked: 'yes', rank: 2 },
							effects: [
								{
									name: 'E2E Steady Hands',
									transfer: true,
									changes: [{ key: 'system.pilotedVehicleDefense', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: '1' }],
								},
							],
						},
					],
				},
				{ name: 'E2E Rig', type: 'vehicle', system: { defense: 1 } },
			]);
			await actor('Rig').update({
				'system.roles': [{ id: 'helm', name: 'Helm', skills: [], members: [actor('Driver').uuid], pilot: false }],
			});
			await window.e2e.setOwnership(actor('Rival'), 'default', 'OBSERVER');
			for (const name of ['Bo', 'Cy', 'Seeker']) await window.e2e.setOwnership(actor(name), user, 'OWNER');
			const targets = ['Rival', 'Mark', 'Wagon', 'Bo', 'Cy', 'Veiled', 'Rig'];
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
			const links = [
				'Athletics,3',
				'Cool,2^1',
				'Athletics|Cool',
				'Athletics,1^3',
				'Athletics,2^3',
				'Athletics,0^1',
				'Athletics,7^6',
				'Athletics,3^1',
			];
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
								'<p class="e2e-inline">Hit @dice[AD] Hard, then @sym[sa] Exit</p>',
								// §#582: the links' glyphs in words; the digits of a `@sym` stand for no die or symbol.
								'<p class="e2e-glyphs">@dice[PPB] @sym[ss1] @sym[23] @pool[A-s^]</p>',
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

		async vehicleDefense(vehicle) {
			const root = await render(actor(vehicle).sheet, (root) => root.querySelector('input[name="system.defense"]'));
			const stat = root.querySelector('input[name="system.defense"]')!.closest('.combat-stat')!;
			return {
				total: text(stat.querySelector('div.value')),
				vehicle: stat.querySelector<HTMLInputElement>('input[name="system.defense"]')!.value,
			};
		},

		async clickPilotRole({ vehicle, role }) {
			const sheet = actor(vehicle).sheet;
			const root = await render(sheet, (root) => root.querySelector('.role-section'));
			const section = [...root.querySelectorAll('.role-section')].find(
				(candidate) => candidate.querySelector<HTMLInputElement>('.role-name input')?.value === role,
			);
			if (!section) throw new Error(`No Role ${role} on ${vehicle}`);
			section.querySelector<HTMLInputElement>('.role-pilot input')!.click();
			await settle();
			return (actor(vehicle).system as { roles: { name: string; pilot: boolean }[] }).roles.find(({ name }) => name === role)!.pilot;
		},

		async setItemEffectDisabled({ actor: name, item, effect, disabled }) {
			await actor(name).items.getName(`E2E ${item}`).effects.getName(`E2E ${effect}`).update({ disabled });
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
				text(candidate.querySelector('.effect-name')).includes(name),
			);
			if (!row) throw new Error(`No Pool Modification ${name}`);
			row.querySelector('input')!.click();
			await settle();
			return promptState();
		},

		promptSourceLinks() {
			return [...htmlOf(thePrompt())!.querySelectorAll('.pool-modifications-effects')].map((row) => {
				const link = row.querySelector<HTMLElement>('.effect-name button');
				return {
					name: text(row.querySelector('.effect-name')),
					link: link && {
						text: text(link),
						tooltip: link.dataset.tooltip ?? null,
						icon: link.querySelector('i')?.className ?? null,
						cursor: getComputedStyle(link).cursor,
					},
				};
			});
		},

		async openPromptSource(name) {
			const row = [...htmlOf(thePrompt())!.querySelectorAll('.pool-modifications-effects')].find((candidate) =>
				text(candidate.querySelector('.effect-name')).includes(name),
			);
			const link = row?.querySelector<HTMLElement>('.effect-name button');
			if (!row) throw new Error(`No Pool Modification ${name}`);
			if (!link) return null;
			type Sheet = { id: string; rendered: boolean; document?: { documentName: string; name: string } };
			const sheets = () => [...foundry.applications.instances.values()] as Sheet[];
			const before = new Set(
				sheets()
					.filter((app) => app.rendered)
					.map((app) => app.id),
			);
			link.click();
			const opened = await waitFor(`the sheet ${name} opens`, () =>
				sheets().find((app) => app.rendered && app.document && !before.has(app.id)),
			);
			await settle();
			return {
				opened: { type: opened.document!.documentName, name: unprefixed(opened.document!.name) },
				prompts: apps('app-dice-prompt').length,
				enabled: row.querySelector('input')!.checked,
			};
		},

		poolModificationsBox() {
			const root = htmlOf(thePrompt())!;
			// A `DescriptionFold` since #579; before, on the build a comparison runs, an expander of their own.
			const expander = root.querySelector(':scope .dice-prompt > :is(.description-fold, .pool-modifications-expander)')!;
			const container = root.querySelector('.pool-modifications-container')!;
			// The expander's only child, which it folds: the container, or since #579 the fold's content around it.
			const content = expander.firstElementChild!;
			const style = getComputedStyle(expander);
			const height = expander.getBoundingClientRect().height;
			// Shown whole, the content stands at its full height in the expander, and cuts none of its rows; a pixel of
			// slack for the heights rounded apart.
			const whole =
				Math.abs(height - content.getBoundingClientRect().height) <= 1 && content.scrollHeight - content.clientHeight <= 1;
			return {
				unfolded: root.querySelector('.pool-modifications-title')!.getAttribute('aria-expanded') === 'true',
				transition: `${style.transitionProperty} ${style.transitionDuration} ${style.transitionTimingFunction}`,
				height: height > 0 && whole ? 'whole' : Math.round(height),
				visibility: getComputedStyle(container).visibility,
				modifications: !!container.querySelector('[data-pool-entity]'),
			};
		},

		poolModificationsToggle() {
			return window.e2e.foldToggle(htmlOf(thePrompt())!.querySelector('.pool-modifications-title')!);
		},

		async togglePoolModifications() {
			const before = window.dicePromptE2E.poolModificationsBox().unfolded;
			htmlOf(thePrompt())!.querySelector<HTMLElement>('.pool-modifications-title')!.click();
			await waitFor(
				'the Pool Modifications to fold or unfold',
				() => window.dicePromptE2E.poolModificationsBox().unfolded !== before,
			);
			// The page settles once their transitions have ended.
			await settle();
			return window.dicePromptE2E.poolModificationsBox();
		},

		async promptAdd(keys) {
			const root = htmlOf(thePrompt())!;
			const buttons = [...root.querySelectorAll('.dice-box button')];
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

		promptRows() {
			return [...htmlOf(thePrompt())!.querySelectorAll('.pool-modifications-container > div > span')].map((label) => text(label));
		},

		promptReminders() {
			return [...htmlOf(thePrompt())!.querySelectorAll('.state-reminders li')].map((reminder) => text(reminder));
		},

		promptDifficulty() {
			const root = htmlOf(thePrompt())!;
			const row = root.querySelector('.pool-modifications-difficulty')!;
			const mods = (row: Element | null) =>
				[...(row?.querySelectorAll(':scope > div > button') ?? [])].map((mod) => poolModification(mod)).join(' ');
			return {
				rows: [...root.querySelectorAll('.pool-modifications-container > div:not(.pool-modifications-effects) > span')].map(
					(label) => text(label),
				),
				label: text(row.querySelector(':scope > span')),
				dice: [...row.querySelectorAll('button.difficulty-die')]
					.map((die) => (die.classList.contains('difficulty-die-Off') ? '·' : text(die)))
					.join(''),
				manualChanges: mods(root.querySelector('.pool-modifications-manual')),
				hint: text(root.querySelector('header .hint')),
			};
		},

		async setPromptDifficulty(dice) {
			const root = htmlOf(thePrompt())!;
			for (const die of dice) {
				root.querySelector<HTMLButtonElement>(`.pool-modifications-difficulty button[name=difficulty-${die}]`)!.click();
				await settle();
			}
			return { pool: poolPreview(root), difficulty: window.dicePromptE2E.promptDifficulty() };
		},

		async removePromptManualChange(index) {
			const root = htmlOf(thePrompt())!;
			root.querySelectorAll<HTMLElement>('.pool-modifications-manual > div > button')[index].click();
			await settle();
			return { pool: poolPreview(root), difficulty: window.dicePromptE2E.promptDifficulty() };
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

		async promptRollTried() {
			const last = game.messages.contents.at(-1)?.id;
			htmlOf(thePrompt())!.querySelector<HTMLElement>('.roll-button')!.click();
			await settle();
			return { posted: game.messages.contents.at(-1)?.id !== last };
		},

		promptSpends() {
			const root = htmlOf(thePrompt())!;
			return {
				spends: [...root.querySelectorAll('.story-point-spend')].map((row) => {
					const input = row.querySelector('input')!;
					return {
						spend: input.name.replace(/^spend-/, ''),
						label: text(row.querySelector('label')),
						checked: input.checked,
						disabled: input.disabled,
						why: text(row.querySelector('.why')),
					};
				}),
				difficulty: text(root.querySelector('.pool-modifications-difficulty > span')),
				pool: poolPreview(root),
				canRoll: !root.querySelector<HTMLButtonElement>('.roll-button')!.disabled,
			};
		},

		async promptSpend(spend) {
			htmlOf(thePrompt())!.querySelector<HTMLInputElement>(`.story-point-spend input[name=spend-${spend}]`)!.click();
			await settle();
			return window.dicePromptE2E.promptSpends();
		},

		promptSpellEffects() {
			const root = htmlOf(thePrompt())!;
			return {
				effects: [...root.querySelectorAll('.spell-effect')].map((row) => {
					const input = row.querySelector('input')!;
					return {
						name: text(row.querySelector('label')),
						adds: text(row.querySelector('.glyph')),
						checked: input.checked,
						disabled: input.disabled,
						why: text(row.querySelector('.why')),
					};
				}),
				difficulty: text(root.querySelector('.pool-modifications-difficulty > span')),
				pool: poolPreview(root),
			};
		},

		async promptCheckEffect(name) {
			const row = [...htmlOf(thePrompt())!.querySelectorAll('.spell-effect')].find(
				(candidate) => text(candidate.querySelector('label')) === name,
			);
			if (!row) throw new Error(`No Additional Effect ${name}`);
			row.querySelector('input')!.click();
			await settle();
			return window.dicePromptE2E.promptSpellEffects();
		},

		async promptRollSpending() {
			const before = new Set(game.messages.contents.map((message: { id: string }) => message.id));
			const posted = () => game.messages.contents.filter((message: { id: string }) => !before.has(message.id));
			htmlOf(thePrompt())!.querySelector<HTMLElement>('.roll-button')!.click();
			// A player's spend reaches the GM's client, which writes it and posts its messages, before the check rolls: wait
			// for the check's message, or long enough to tell none comes.
			const start = Date.now();
			while (!posted().some((message: { rolls: unknown[] }) => message.rolls.length > 0) && Date.now() - start < 5000)
				await sleep(100);
			await settle();
			const rolled = posted().find((message: { rolls: unknown[] }) => message.rolls.length > 0);
			return {
				rolled: rolled ? messageSummary(rolled) : null,
				storyPointMessages: posted().filter((message: { content: string }) => message.content.includes('story-point')).length,
				prompts: window.dicePromptE2E.openPrompts(),
			};
		},

		lastMessage: () => messageSummary(game.messages.contents.at(-1)),

		lastMessageText() {
			const message = game.messages.contents.at(-1);
			const content = document.createElement('div');
			content.innerHTML = message.content;
			return { speaker: messageSummary(message).speaker, text: text(content) };
		},

		async rollToChat(formula) {
			const message = await (await new foundry.dice.Roll(formula).evaluate()).toMessage();
			await settle();
			return message.id;
		},

		async showMessage(id) {
			const state = { expanded: ui.sidebar.expanded, tab: ui.sidebar.tabGroups.primary };
			// v13: the sidebar is collapsed in the headless window, and a collapsed chat log shows no message.
			ui.sidebar.expand();
			ui.sidebar.changeTab('chat', 'primary');
			const message = await waitFor('the message in the chat log', () =>
				[...document.querySelectorAll<HTMLElement>(`[data-message-id="${id}"]`)].find(
					(element) => !element.closest('#chat-notifications') && element.getBoundingClientRect().width > 0,
				),
			);
			for (const marked of document.querySelectorAll<HTMLElement>('[data-e2e="glyph-message"]')) delete marked.dataset.e2e;
			message.dataset.e2e = 'glyph-message';
			// A roll's dice show in its tooltip, which a click expands.
			message.querySelector('[data-action="expandRoll"]')?.classList.add('expanded');
			message.scrollIntoView({ block: 'center' });
			await settle();
			return state;
		},

		restoreSidebar({ expanded, tab }) {
			ui.sidebar.changeTab(tab, 'primary');
			if (expanded) ui.sidebar.expand();
			else ui.sidebar.collapse();
		},

		async patientPrompt(pick) {
			const app = await waitFor('the patient prompt', () => {
				const [open] = apps('app-select-patient-prompt');
				return open && htmlOf(open)?.querySelector('.patient-option') ? open : undefined;
			});
			const root = htmlOf(app)!;
			const options = [...root.querySelectorAll('.patient-option')];
			const nameOf = (option: Element) => text(option.querySelector('.patient-name'));
			const names = options.map(nameOf).filter((name) => isSetUp({ name }));
			if (pick === null) {
				await app.close();
			} else {
				const option = options.find((candidate) => nameOf(candidate) === `E2E ${pick}`);
				if (!option) throw new Error(`No patient ${pick} in ${JSON.stringify(names)}`);
				option.querySelector<HTMLInputElement>('input[type="radio"]')!.click();
				await waitFor(`${pick} picked`, () => option.querySelector('.fa-check-circle'));
				root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
			}
			await waitFor('the patient prompt to close', () => !apps('app-select-patient-prompt').length);
			return names.map(unprefixed);
		},

		async recoveryButton({ id, click }) {
			const state = await window.dicePromptE2E.showMessage(id);
			const button = document.querySelector<HTMLButtonElement>('[data-e2e="glyph-message"] button.apply-recovery');
			if (button && click) {
				button.click();
				await settle();
			}
			window.dicePromptE2E.restoreSidebar(state);
			return !!button;
		},

		health(name) {
			const { wounds, strain } = actor(name).system as { wounds: { value: number }; strain?: { value: number } };
			return { wounds: wounds.value, strain: strain?.value ?? null };
		},

		lastCard() {
			const message = game.messages.contents.at(-1);
			const { results, summaries } = messageSummary(message);
			const content = document.createElement('div');
			content.innerHTML = message.content;
			return {
				labels: [...content.querySelectorAll('label')].map(text),
				results,
				summaries,
				qualities: [...content.querySelectorAll('.quality')].map((quality) => ({
					text: text(quality),
					tooltip: quality.getAttribute('data-tooltip'),
				})),
				...(content.querySelector('.spell-effect') && {
					spellEffects: [...content.querySelectorAll('.spell-effect')].map(text),
				}),
				dice: text(content.querySelector('.dice')),
			};
		},

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
			await find({ actor: name }, '.tab-combat .weapons .weapon:not(.columns)');
			const root = await sheet({ actor: name });
			return [...root.querySelectorAll('.tab-combat .weapons .weapon:not(.columns)')].map((row) => {
				const select = row.querySelector<HTMLSelectElement>('select.attack-skill');
				return {
					name: text(row.querySelector('.name')),
					link: !!row.querySelector('.name .roll-link'),
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
					// The attack button and the details after it, the Attack Skill's select among them.
					text: withSelect(row),
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
					name: text(row.querySelector('.name button')),
					attack: !!row.querySelector('.name .roll-link'),
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

		async glyphFonts(doc) {
			const message = await (await new foundry.dice.Roll('6d6').evaluate()).toMessage();
			const coreDie = await waitFor('the d6 results of the roll', () =>
				document.querySelector(`[data-message-id="${message.id}"] .dice-tooltip li.roll.d6`),
			);
			const root = await sheet(doc);
			const glyph = (selector: string) => waitFor(selector, () => root.querySelector(selector));
			const drawsGenesys = (element: Element) => getComputedStyle(element).fontFamily.startsWith('"Genesys Symbols"');
			return {
				coreDie: drawsGenesys(coreDie),
				diceLink: drawsGenesys(await glyph('p.e2e-inline .font-genesys-symbols > .die')),
				checkLink: drawsGenesys(await glyph('a[data-skill-check] .die')),
				poolLink: drawsGenesys(await glyph('.pool-modifications > .die')),
			};
		},

		async inlineGlyphs(doc) {
			const root = await sheet(doc);
			const glyphs = {
				'@dice A': await waitFor('a @dice die', () => root.querySelector<HTMLElement>('p.e2e-inline .font-genesys-symbols > .die')),
				'@sym sa': await waitFor('a @sym symbol', () =>
					root.querySelector<HTMLElement>('p.e2e-inline .font-genesys-symbols.nolig'),
				),
				'@check D': await waitFor('a @check die', () => root.querySelector<HTMLElement>('a[data-skill-check] .die')),
				'@pool P': await waitFor('a @pool die', () => root.querySelector<HTMLElement>('.pool-modifications > .die')),
			};
			await document.fonts.ready;
			const context = document.createElement('canvas').getContext('2d')!;
			// The ink of a text in an element's font, above and below the baseline, each glyph alone: the symbols show no ligature.
			const ink = (element: Element, characters: string) => {
				const style = getComputedStyle(element);
				context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
				const metrics = [...characters].map((character) => context.measureText(character));
				return {
					ascent: Math.max(...metrics.map((metric) => metric.actualBoundingBoxAscent)),
					descent: Math.max(...metrics.map((metric) => metric.actualBoundingBoxDescent)),
				};
			};
			// An empty inline block sits on the baseline of its line, which its bottom edge gives.
			const baseline = (parent: Element, before: Node | null) => {
				const probe = document.createElement('span');
				probe.style.cssText = 'display: inline-block; width: 0; height: 0;';
				parent.insertBefore(probe, before);
				const { bottom } = probe.getBoundingClientRect();
				probe.remove();
				return bottom;
			};
			const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;
			return Object.fromEntries(
				Object.entries(glyphs).map(([name, glyph]) => {
					// The text around the glyph: the line that holds its enricher's container.
					const container = glyph.closest('.font-genesys-symbols') ?? glyph;
					const line = container.parentElement!;
					const lift = baseline(line, container) - baseline(glyph, null);
					const glyphInk = ink(glyph, glyph.textContent ?? '');
					const centre = lift + (glyphInk.ascent - glyphInk.descent) / 2;
					const fontSize = parseFloat(getComputedStyle(glyph).fontSize);
					const px = centre - ink(line, 'H').ascent / 2;
					return [
						name,
						{
							px: round(px, 1),
							em: round(px / fontSize, 2),
							fontSize,
							aboveXHeight: round(centre - ink(line, 'x').ascent / 2, 1),
						},
					];
				}),
			);
		},

		control(names) {
			canvas.tokens.releaseAll();
			for (const name of names) token(name).control({ releaseOthers: false });
		},

		async diceRollerButtons() {
			const read = () => {
				const buttons = [...document.querySelectorAll('#chat-controls > .dice-roller')];
				const [button] = buttons;
				const modes = button?.parentElement?.querySelector('.split-button')?.getBoundingClientRect();
				const box = button?.getBoundingClientRect();
				// Where the button sits: in the chat form or by the notifications, and beside or under the message modes.
				const parent = button?.closest('#chat-notifications') ? 'notifications' : button?.closest('.chat-form') ? 'chat' : null;
				const side = !box || !modes ? null : box.top >= modes.bottom ? 'under' : box.left >= modes.right ? 'beside' : 'over';
				return { count: buttons.length, place: parent && `${parent}, ${side}`, label: button?.getAttribute('aria-label') ?? null };
			};
			ui.sidebar.collapse();
			await settle();
			const collapsed = read();
			ui.sidebar.changeTab('chat', 'primary');
			ui.sidebar.expand();
			await settle();
			const expanded = read();
			ui.sidebar.collapse();
			await settle();
			return { collapsed, expanded, collapsedAgain: read() };
		},

		clickDiceRoller() {
			const button = document.querySelector<HTMLElement>('#chat-controls > .dice-roller');
			if (!button) throw new Error('No Dice Roller button');
			button.click();
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
			const trackers = [...document.querySelectorAll('#story-point-tracker .pool')];
			return {
				setting: game.settings.get('genesys', 'storyPoints'),
				shown: trackers.map((tracker) => window.e2e.text(tracker.querySelector('.points'))),
				// A pool's count is a button where the user may spend one of its points (§#619).
				spendable: trackers.map((tracker) => !!tracker.querySelector('button.points')),
			};
		},

		async clickStoryPoints(which) {
			const trackers = [...document.querySelectorAll('#story-point-tracker .pool')];
			const pool = which === 'reset' ? undefined : trackers[which === 'gm' ? 0 : 1];
			// The pool's count, a button where the user may spend from it, else its text, where a click spends nothing.
			const target = pool ? pool.querySelector('.points') : trackers[0].querySelector('header button');
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

		async settingText(key) {
			const app = game.settings.sheet;
			const root = await render(app, (root) => root.querySelector(`[name="${key}"]`));
			const group = root.querySelector(`[name="${key}"]`)!.closest('.form-group');
			const shown = {
				language: game.i18n.lang as string,
				name: text(group?.querySelector('label')),
				hint: text(group?.querySelector('.hint')),
			};
			await app.close();
			return shown;
		},

		poolModificationsLayout() {
			const root = htmlOf(thePrompt())!;
			const container = root.querySelector('.pool-modifications-container')!;
			const edge = container.getBoundingClientRect().left;
			const px = (value: number) => Math.round(value * 10) / 10;
			const middle = (box: { top: number; bottom: number }) => (box.top + box.bottom) / 2;
			// The lines of a label's text, by the boxes of its text nodes: the link and the icon in a line don't share its top.
			const lines = (label: Element) => {
				const byTop = new Map<number, { left: number; top: number; bottom: number }>();
				const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
				for (let node = walker.nextNode(); node; node = walker.nextNode()) {
					const range = document.createRange();
					range.selectNodeContents(node);
					for (const { left, top, bottom } of range.getClientRects()) {
						const line = byTop.get(Math.round(top));
						byTop.set(Math.round(top), { left: Math.min(left, line?.left ?? left), top, bottom });
					}
				}
				return [...byTop.values()].sort((a, b) => a.top - b.top);
			};
			// The middle of the ink a text node's font draws for a sample, from the node's line box: a glyph of the Genesys
			// Symbols font sits higher in its box than a letter of the label does in its own.
			const canvas = document.createElement('canvas').getContext('2d')!;
			const inkMiddle = (node: Node | null | undefined, sample?: string) => {
				const element = node?.parentElement;
				if (!node || !element) return null;
				const box = document.createRange();
				box.selectNodeContents(node);
				const rect = box.getClientRects()[0];
				if (!rect) return null;
				const { fontStyle, fontWeight, fontSize, fontFamily } = getComputedStyle(element);
				canvas.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
				const metrics = canvas.measureText(sample ?? node.textContent!);
				const baseline = rect.top + metrics.fontBoundingBoxAscent;
				return baseline - (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
			};
			const firstText = (element: Element | undefined) => {
				const walker =
					element &&
					document.createTreeWalker(element, NodeFilter.SHOW_TEXT, (node) =>
						node.textContent!.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
					);
				return walker?.nextNode();
			};
			const title = root.querySelector('.pool-modifications-title')!;
			const caret = title.querySelector('i')!.getBoundingClientRect();
			return {
				titleText: px(title.querySelector('span')!.getBoundingClientRect().left - edge),
				caret: { left: px(caret.left - edge), right: px(caret.right - edge), axis: px((caret.left + caret.right) / 2 - edge) },
				rows: [...container.querySelectorAll(':scope > div')].map((row) => {
					const label = row.querySelector(':scope > span')!;
					const left = label.getBoundingClientRect().left;
					const textLines = lines(label);
					const below = (element: Element | null) =>
						element && textLines[0] ? px(middle(element.getBoundingClientRect()) - middle(textLines[0])) : null;
					const modifications = [...row.querySelectorAll(':scope > div > *')];
					// The middle of the label's capitals, which a die's glyph centres on.
					const capitals = inkMiddle(firstText(label), 'H');
					const glyph = inkMiddle(firstText(modifications[0]));
					return {
						ink: capitals !== null && glyph !== null ? px(glyph - capitals) : null,
						height: px(row.getBoundingClientRect().height),
						label: px(left - edge),
						lineStarts: textLines.map((line) => px(line.left - left)),
						checkbox: below(row.querySelector('input')),
						modification: below(modifications[0] ?? null),
						offsets: modifications
							.map((element) => getComputedStyle(element).top)
							.filter((top) => !['auto', '0px'].includes(top)),
					};
				}),
			};
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

/**
 * The Roll a Critical Injury dialog as the user reads it (§#685).
 */
type CriticalPromptState = {
	/** The lines of its header: whom it rolls for, the attack, the table. */
	header: string[];
	/** The triggers spent, and how many the attack offers; null without an attack. */
	spent: { value: string; max: string } | null;
	/** Each line of the modifier, as `<label>: <value>`. */
	lines: string[];
	/** The formula it rolls. */
	formula: string;
};

/**
 * A Critical Injury roll's message as the user reads it: the item names its results link to.
 */
type CriticalMessage = {
	speaker: string | null;
	flavor: string;
	formula: string | null;
	total: number | null;
	results: string[];
	links: string[];
};

/**
 * The helpers of the `criticalInjuries` part (§#685), installed in the page as `window.criticalInjuryE2E`.
 */
type CriticalInjuryHelpers = {
	/**
	 * Creates the Critical Injury items `E2E Nick`, `E2E Scar` and `E2E Maim`, the table `E2E Crits` drawing them on
	 * 1–50, 51–100 and 101–200, which the players aren't given, and makes it the world's Critical Injury table; returns the
	 * table set before.
	 */
	setUp(): Promise<string>;
	/** Deletes the table, and sets back the table set before. */
	tearDown(previous: string): Promise<void>;
	/** The attack card's Critical Injury triggers line, and whether it shows the button that rolls one. */
	attackCard(): { triggers: string | null; button: boolean };
	/** Clicks the last message's Roll a Critical Injury button, in the chat log, and waits for the dialog. */
	openFromCard(): Promise<CriticalPromptState>;
	/** Clicks the Roll a Critical Injury button of an actor's sheet, and waits for the dialog. */
	openFromSheet(actor: string): Promise<CriticalPromptState>;
	/** Types a value in one of the dialog's fields, named `spent` or `line-<kind>`, as the user does. */
	type(args: { name: string; value: string }): Promise<CriticalPromptState>;
	/** Clicks the dialog's Roll button, and waits for the roll's message. */
	roll(): Promise<CriticalMessage>;
	/** How many Roll a Critical Injury dialogs are open. */
	openPrompts(): number;
	closePrompts(): Promise<void>;
};

declare global {
	interface Window {
		criticalInjuryE2E: CriticalInjuryHelpers;
	}
}

/**
 * Installs `window.criticalInjuryE2E`. Playwright sends this function's source to the page, so it uses nothing from this
 * module.
 */
function installCriticalInjuryHelpers() {
	const { settle, waitFor, apps, htmlOf, text, render, actor } = window.e2e;
	const thePrompt = () => {
		const open = apps('app-critical-injury-prompt');
		if (open.length !== 1) throw new Error(`${open.length} Critical Injury dialogs are open`);
		return htmlOf(open[0])!;
	};
	const promptState = (): CriticalPromptState => {
		const root = thePrompt();
		const spent = root.querySelector<HTMLInputElement>('input[name=spent]');
		return {
			header: [...root.querySelectorAll('header > div')].map(text),
			spent: spent && { value: spent.value, max: spent.max },
			lines: [...root.querySelectorAll('.line')].map(
				(line) => `${text(line.querySelector('label'))}: ${line.querySelector<HTMLInputElement>('input')!.value}`,
			),
			formula: text(root.querySelector('.formula output')),
		};
	};
	const waitForPrompt = async () => {
		await waitFor(
			'the Critical Injury dialog',
			() => apps('app-critical-injury-prompt').length === 1 && thePrompt().querySelector('.line'),
		);
		await settle();
		return promptState();
	};

	window.criticalInjuryE2E = {
		async setUp() {
			for (const table of game.tables.filter((table: { name: string }) => table.name.startsWith('E2E '))) await table.delete();
			const items = await Item.createDocuments(
				['Nick', 'Scar', 'Maim'].map((name) => ({ name: `E2E ${name}`, type: 'injury', system: { severity: 'easy' } })),
			);
			// By name: v14 may return the created documents in another order than the one asked for.
			const ranges: Record<string, [number, number]> = {
				'E2E Nick': [1, 50],
				'E2E Scar': [51, 100],
				'E2E Maim': [101, 200],
			};
			const table = await CONFIG.RollTable.documentClass.create({
				name: 'E2E Crits',
				formula: '1d100',
				replacement: true,
				displayRoll: true,
				results: items.map((item: { uuid: string; name: string }) => ({
					type: 'document',
					documentUuid: item.uuid,
					name: item.name,
					range: ranges[item.name],
					weight: 1,
				})),
			});
			const previous = game.settings.get('genesys', 'criticalInjuryTable');
			await game.settings.set('genesys', 'criticalInjuryTable', table.uuid);
			await settle();
			return previous;
		},

		async tearDown(previous) {
			await window.criticalInjuryE2E.closePrompts();
			await game.settings.set('genesys', 'criticalInjuryTable', previous);
			for (const table of game.tables.filter((table: { name: string }) => table.name.startsWith('E2E '))) await table.delete();
			await settle();
		},

		attackCard() {
			const content = document.createElement('div');
			content.innerHTML = game.messages.contents.at(-1).content;
			const row = [...content.querySelectorAll('.summary-table .label')].find((label) => text(label) === 'Critical Injury Triggers');
			return {
				triggers: row ? `${text(row)} ${text(row.nextElementSibling)}` : null,
				button: !!content.querySelector('button.roll-critical-injury'),
			};
		},

		async openFromCard() {
			const { id } = game.messages.contents.at(-1);
			const state = await window.dicePromptE2E.showMessage(id);
			const button = await waitFor('the card button', () =>
				[...document.querySelectorAll<HTMLElement>(`[data-message-id="${id}"] button.roll-critical-injury`)].find(
					(element) => !element.closest('#chat-notifications'),
				),
			);
			button.click();
			const prompt = await waitForPrompt();
			window.dicePromptE2E.restoreSidebar(state);
			return prompt;
		},

		async openFromSheet(name) {
			const doc = actor(name);
			const root = await render(doc.sheet);
			const button = await waitFor('the sheet button', () => root.querySelector<HTMLElement>('button.roll-critical-injury'));
			button.click();
			return waitForPrompt();
		},

		async type({ name, value }) {
			const input = thePrompt().querySelector<HTMLInputElement>(`input[name="${name}"]`);
			if (!input) throw new Error(`No field ${name}`);
			input.value = value;
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
			return promptState();
		},

		async roll() {
			const last = game.messages.contents.at(-1)?.id;
			thePrompt().querySelector<HTMLElement>('.prompt-submit')!.click();
			await waitFor('the Critical Injury message', () => game.messages.contents.at(-1)?.id !== last);
			await settle();
			const message = game.messages.contents.at(-1);
			const content = document.createElement('div');
			content.innerHTML = message.content;
			const speaker = message.speaker?.actor ? game.actors.get(message.speaker.actor)?.name : undefined;
			return {
				speaker: speaker ?? null,
				flavor: message.flavor,
				formula: message.rolls[0]?.formula ?? null,
				total: message.rolls[0]?.total ?? null,
				results: [...content.querySelectorAll('.table-results li')].map(text),
				links: [...content.querySelectorAll<HTMLElement>('.table-results a.content-link')].map(
					(link) => fromUuidSync(link.dataset.uuid ?? '')?.name ?? `broken ${link.dataset.uuid}`,
				),
			};
		},

		openPrompts: () => apps('app-critical-injury-prompt').length,

		async closePrompts() {
			for (const app of apps('app-critical-injury-prompt')) await app.close();
			await settle();
		},
	};
}

// The scenario controls and targets tokens on the canvas.
export const needsCanvas = true;

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	const player = await e2e.player();
	// §#414: the compatibility warnings Foundry logs through `console.warn` as the page reaches the roll modes v14
	// deprecated, read from the console from before the GM reloads.
	const rollModeWarnings: string[] = [];
	for (const client of [gm, player]) {
		client.page.on('console', (message) => {
			const text = message.text();
			if (message.type() === 'warning' && /Deprecated since Version/.test(text) && /roll ?mode/i.test(text)) {
				rollModeWarnings.push(`${client.user}: ${text.split('\n')[0]}`);
			}
		});
	}
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
	const settings = {
		uncoupleSkills: false,
		useSuperCharacteristics: false,
		defaultDifficulty: 'DD',
		skillsCompendium: 'genesys.crb-skills',
		showDamageOnFailure: false,
		dicePoolCollapseModificationsDetails: false,
	};
	const setUp = async () => {
		await gm.evaluate(
			(settings) => Promise.all(Object.entries(settings).map(([key, value]) => window.dicePromptE2E.setSetting({ key, value }))),
			settings,
		);
		try {
			await gm.evaluate((user) => window.dicePromptE2E.setUp(user), e2e.playerUser);
		} catch (error) {
			e2e.log('set up errors', gm.errors);
			throw error;
		}
	};
	await setUp();
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
	// The Apply button of a check that heals, as a client sees it, and an actor's wounds and strain (§#686, §#687).
	const recoveryButton = (client: Client, id: string, click = false) =>
		client.evaluate((args) => window.dicePromptE2E.recoveryButton(args), { id, click });
	const health = (name: string) => gm.evaluate((name) => window.dicePromptE2E.health(name), name);
	const ada = { actor: 'Ada' };
	const skillRoll = (skill: string) => click(gm, ada, `.tab-skills .skill button.skill-name|${skill} (`);
	const characteristicRoll = (index: number, doc: Doc = ada) =>
		click(gm, doc, `.tab-skills .characteristics-row .characteristic-field:nth-child(${index}) .characteristic-label button`);
	const attack = (weapon: string) => click(gm, ada, `.tab-combat .weapon .name button|E2E ${weapon}`);
	const rows = (state: PromptState) => state.modifications;
	const named = (state: PromptState, prefix: string) => state.modifications.filter(({ name }) => name.startsWith(prefix));
	const journal = { journal: 'Links' };
	const skiff = { actor: 'Skiff' };
	const combatWeapons = (actor: string) => gm.evaluate((actor) => window.dicePromptE2E.combatWeapons(actor), actor);
	const linkPrompt = async (client: Client, doc: Doc | { message: string }, skill: string, difficulty?: string) => {
		const state = await opened(client, () =>
			client.evaluate((args) => window.dicePromptE2E.clickLink(args), { doc, skill, difficulty }),
		);
		return { actor: state.actor, skill: state.skill, pool: state.pool };
	};
	const seekerCheck = (client: Client) =>
		opened(
			client,
			click(
				client,
				{ actor: 'Seeker' },
				'.tab-skills .characteristics-row .characteristic-field:nth-child(3) .characteristic-label button',
			),
		);

	// Each part starts from the setup, whatever the parts before it changed, so that it runs the same alone as after them:
	// no target, no token controlled, no window open, the settings and documents of the setup.
	let partRan = false;
	const part = (name: string, fn: () => Promise<void>) =>
		e2e.part(name, async () => {
			if (partRan) {
				await target(null);
				for (const client of [gm, player]) {
					await control(client, []);
					await client.evaluate(async () => {
						await window.dicePromptE2E.closePrompts();
						await window.dicePromptE2E.closeSheets();
					});
				}
				await setUp();
			}
			partRan = true;
			await fn();
		});

	// A: the skills the prompt offers (§#49, §#100). B: the characteristic menu (§#184, §#204, §#50), from A's prompt.
	await part('skillsAndCharacteristics', async () => {
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
	});

	// C: Pool Modifications of the actor and of the target (§#32, §#40, §#49, §#201).
	await part('targetModifications', async () => {
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
		e2e.expect(
			'#201 C6 a check made while a vehicle is targeted lists its target Pool Modifications',
			named(coolAtWagon, 'From Target'),
			[{ name: 'From Target: E2E Smoke', enabled: false, mods: 'S+' }],
		);

		// The Pilot's Defensive Driving raises the defense of the vehicle they pilot (§#482): the Driver, first member of the
		// Rig's Helm, holds 2 ranks of a talent adding 1 Piloted Vehicle Defense.
		await target('Rig');
		const rigDefense = () => gm.evaluate(() => window.dicePromptE2E.vehicleDefense('Rig'));
		const rigAttacks = async () => ({
			defense: await rigDefense(),
			Spear: await defenseRows('Spear'),
			Pistol: await defenseRows('Pistol'),
		});
		e2e.expect('#482 A0 a vehicle whose Roles hold no Pilot Role counts its own defense alone', await rigAttacks(), {
			defense: { total: '1', vehicle: '1' },
			Spear: vehicleRow('Melee', 1),
			Pistol: vehicleRow('Ranged', 1),
		});
		e2e.expect(
			'#482 A1 the Helm marked as the Pilot Role on the sheet',
			await gm.evaluate(() => window.dicePromptE2E.clickPilotRole({ vehicle: 'Rig', role: 'Helm' })),
			true,
		);
		e2e.expect(
			"#482 A2 the Pilot's 2 ranks of Piloted Vehicle Defense raise the vehicle's defense on its sheet and against an attack",
			await rigAttacks(),
			{ defense: { total: '3', vehicle: '1' }, Spear: vehicleRow('Melee', 3), Pistol: vehicleRow('Ranged', 3) },
		);
		await e2e.step("#482 A3 the Pilot's talent effect turned off", () =>
			gm.evaluate(() =>
				window.dicePromptE2E.setItemEffectDisabled({
					actor: 'Driver',
					item: 'Steady Hands',
					effect: 'Steady Hands',
					disabled: true,
				}),
			),
		);
		e2e.expect("#482 A3 the vehicle's open sheet follows its Pilot's effects", await rigDefense(), { total: '1', vehicle: '1' });
		await e2e.step("#482 A4 the Pilot's talent effect turned on again", () =>
			gm.evaluate(() =>
				window.dicePromptE2E.setItemEffectDisabled({
					actor: 'Driver',
					item: 'Steady Hands',
					effect: 'Steady Hands',
					disabled: false,
				}),
			),
		);
		e2e.expect("#482 A4 the vehicle's open sheet shows its Pilot's bonus again", await rigDefense(), { total: '3', vehicle: '1' });
		await update({ actor: 'Rig' }, { 'system.defense': 3 });
		e2e.expect("#482 A5 the vehicle's defense raised by its Pilot counts up to 4 (CRB p. 223)", await rigAttacks(), {
			defense: { total: '4', vehicle: '3' },
			Spear: vehicleRow('Melee', 4),
			Pistol: vehicleRow('Ranged', 4),
		});
		await target(null);
		await e2e.step('C end');
	});

	// D: Attack Skills (§#49, §#196).
	await part('attackSkills', async () => {
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
			// §#641: a weapon attacks from the Combat tab alone.
			"#49 D2 the Inventory tab shows each weapon's Attack Skill, and offers no attack",
			await inventoryWeapons(),
			[
				{ name: 'E2E Spear', attack: false, skill: 'Melee' },
				{ name: 'E2E Pistol', attack: false, skill: 'Ranged (light)' },
				{ name: 'E2E Stick', attack: false, skill: '-' },
				{ name: 'E2E Blaster', attack: false, skill: 'Piloting (Space)' },
				{ name: 'E2E Club', attack: false, skill: 'Melee' },
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
				{ text: 'E2E Knife ([Melee]Damage 3Critical 3Range Engaged)', choices: ['Melee', 'Ranged'] },
				{ text: 'E2E Twig (No skillDamage 3Critical 3Range Engaged)', choices: null },
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
		const knife = await opened(gm, click(gm, { actor: 'Rival' }, '.adversary-items .weapon|E2E Knife >> .weapon-attack'));
		e2e.expect(
			"#196 D10 the rival's knife attacks with the chosen Ranged",
			{ stored: await attackSkill({ actor: 'Rival', item: 'Knife' }), actor: knife.actor, skill: knife.skill },
			{ stored: 'Ranged', actor: 'Rival', skill: 'Ranged (Ag)' },
		);
		// §#578: its name opens its sheet instead, which closes again.
		e2e.expect(
			"#49 D11 a rival's weapon without skill doesn't roll, and its menu has no check",
			{
				click: await noPrompt(gm, click(gm, { actor: 'Rival' }, '.adversary-items .weapon|E2E Twig >> .weapon-name')),
				sheet: await gm.evaluate(async () => {
					const sheet = window.e2e.actor('Rival').items.getName('E2E Twig').sheet;
					const opened = sheet.rendered;
					if (opened) await sheet.close();
					return opened;
				}),
				twig: await gm.evaluate(() =>
					window.dicePromptE2E.menu({ doc: { actor: 'Rival' }, path: '.adversary-items .weapon|E2E Twig' }),
				),
				knife: await gm.evaluate(() =>
					window.dicePromptE2E.menu({ doc: { actor: 'Rival' }, path: '.adversary-items .weapon|E2E Knife' }),
				),
			},
			{
				click: { prompts: 0, notifications: [] },
				sheet: true,
				// The knife's name attacks, so its menu has no check either since #638.
				twig: ['Send to chat', 'Edit', 'Delete'],
				knife: ['Send to chat', 'Edit', 'Delete'],
			},
		);

		// A vehicle's weapons and skills.
		e2e.expect(
			"#196 D12 a vehicle weapon's Combat tab row has no Attack Skill select",
			await gm.evaluate(() =>
				window.dicePromptE2E.texts({ doc: { actor: 'Skiff' }, selector: '.tab-combat .weapon:not(.columns) select' }),
			),
			[],
		);
		const cannon = await opened(gm, click(gm, skiff, '.tab-combat .weapon .name button|E2E Cannon'));
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
		const byMember = await opened(gm, click(gm, skiff, '.tab-skills .member-skill button.skill-name|Ranged'));
		await gm.evaluate(() =>
			window.dicePromptE2E.change({ doc: { actor: 'Skiff' }, path: '.tab-skills .grouping-mode select', value: 'skill' }),
		);
		const bySkillRows = await gm.evaluate(() =>
			window.dicePromptE2E.texts({ doc: { actor: 'Skiff' }, selector: '.tab-skills .skills-container section' }),
		);
		const bySkill = await opened(
			gm,
			click(gm, skiff, '.tab-skills .skills-container section|Ranged >> .skill-content-details >> .skill-name'),
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
	});

	// M: the silhouette difference between the attacker and the target (§#380). Every character and Adversary is at 1,
	// every vehicle at 0, unless set here.
	await part('silhouettes', async () => {
		const silhouetteRows = (state: PromptState) => state.modifications.filter(({ name }) => name.includes('Silhouette'));
		const setSilhouette = (actor: string, silhouette: number) => update({ actor }, { 'system.silhouette': silhouette });
		const rivalKnife = click(gm, { actor: 'Rival' }, '.adversary-items .weapon|E2E Knife >> .weapon-attack');
		// The rival's knife attacks with Ranged, which §#196 chooses in its own part, so that M2 rolls the rival's Agility.
		await update({ actor: 'Rival', item: 'Knife' }, { 'system.attackSkill': 'Ranged' });
		await setSilhouette('Rival', 3);
		await target('Rival');
		const atLarger = await opened(gm, attack('Pistol'));
		const largerOn = await toggle('Silhouette');
		const largerOff = await toggle('Silhouette');
		e2e.expect(
			'#380 M1 a silhouette 1 character attacking a silhouette 3 rival lists a target Pool Modification removing one Difficulty die, after the defense, which toggles',
			{
				rows: rows(atLarger),
				pool: atLarger.pool,
				on: { pool: largerOn.pool, rows: silhouetteRows(largerOn) },
				off: { pool: largerOff.pool, rows: silhouetteRows(largerOff) },
			},
			{
				rows: [
					{ name: 'From Self: E2E Focus', enabled: false, mods: 'a+' },
					{ name: 'From Self: E2E Sights', enabled: false, mods: 'B+' },
					{ name: 'From Target: E2E Hex', enabled: false, mods: 'S+' },
					{ name: 'From Target: Ranged Defense', enabled: false, mods: 'S+ S+' },
					{ name: 'From Target: Silhouette (3 vs 1)', enabled: false, mods: 'D-' },
				],
				pool: 'PP|DD',
				on: { pool: 'PP|D', rows: [{ name: 'From Target: Silhouette (3 vs 1)', enabled: true, mods: 'D-' }] },
				off: { pool: 'PP|DD', rows: [{ name: 'From Target: Silhouette (3 vs 1)', enabled: false, mods: 'D-' }] },
			},
		);

		await target('Mark');
		const atSmaller = await opened(gm, rivalKnife);
		const smallerOn = await toggle('Silhouette');
		e2e.expect(
			'#380 M2 a silhouette 3 rival attacking a silhouette 1 character lists a target Pool Modification adding one Difficulty die',
			{ actor: atSmaller.actor, rows: silhouetteRows(atSmaller), pool: atSmaller.pool, on: smallerOn.pool },
			{
				actor: 'Rival',
				rows: [{ name: 'From Target: Silhouette (1 vs 3)', enabled: false, mods: 'D+' }],
				pool: 'AAA|DD',
				on: 'AAA|DDD',
			},
		);

		await target('Rival');
		const unchanged: Record<string, unknown> = {};
		for (const silhouette of [2, 1]) {
			await setSilhouette('Rival', silhouette);
			unchanged[`rival at ${silhouette}`] = silhouetteRows(await opened(gm, attack('Pistol')));
		}
		await setSilhouette('Rival', 3);
		unchanged['skill check'] = silhouetteRows(await opened(gm, skillRoll('Cool')));
		unchanged['Dice Roller'] = rows(await opened(gm, () => gm.evaluate(() => ui.chat.processMessage('/gendr'))));
		await target(null);
		unchanged.untargeted = silhouetteRows(await opened(gm, attack('Pistol')));
		e2e.expect(
			"#380 M3 a silhouette difference of 1 or 0, a check that isn't an attack, the bare Dice Roller and an untargeted attack change nothing",
			unchanged,
			{ 'rival at 2': [], 'rival at 1': [], 'skill check': [], 'Dice Roller': [], untargeted: [] },
		);

		// §#390: a vehicle keeps the silhouette 0 its data starts at until someone edits it, and a character is at 1.
		await target('Wagon');
		e2e.expect(
			'#380 M7 a silhouette 1 character attacking a vehicle whose silhouette nobody edited, at 0, gets no silhouette modification',
			{
				wagon: await gm.evaluate(() => {
					const wagon = window.e2e.actor('Wagon');
					return { silhouette: wagon.system.silhouette, stored: wagon._source.system.silhouette };
				}),
				rows: silhouetteRows(await opened(gm, attack('Pistol'))),
			},
			{ wagon: { silhouette: 0, stored: 0 }, rows: [] },
		);

		await setSilhouette('Wagon', 3);
		e2e.expect(
			'#380 M4 a silhouette 1 character attacking a silhouette 3 vehicle lists one Difficulty die removed',
			silhouetteRows(await opened(gm, attack('Pistol'))),
			[{ name: 'From Target: Silhouette (3 vs 1)', enabled: false, mods: 'D-' }],
		);

		await setSilhouette('Skiff', 3);
		await target('Mark');
		const cannonAtMark = await opened(gm, click(gm, skiff, '.tab-combat .weapon .name button|E2E Cannon'));
		const cannonOn = await toggle('Silhouette');
		e2e.expect(
			"#380 M5 a silhouette 1 crew member firing a silhouette 3 vehicle's weapon at a silhouette 1 character adds one Difficulty die, from the vehicle's silhouette",
			{
				actor: cannonAtMark.actor,
				rows: silhouetteRows(cannonAtMark),
				pool: cannonAtMark.pool,
				on: cannonOn.pool,
				ownWeapon: silhouetteRows(await opened(gm, attack('Pistol'))),
			},
			{
				actor: 'Ada',
				rows: [{ name: 'From Target: Silhouette (1 vs 3)', enabled: false, mods: 'D+' }],
				pool: 'AA|DD',
				on: 'AA|DDD',
				ownWeapon: [],
			},
		);

		await gm.evaluate(() =>
			game.actors
				.getName('E2E Mark')
				.createEmbeddedDocuments('ActiveEffect', [
					{ name: 'E2E Giant', changes: [{ key: 'system.silhouette', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: '2' }] },
				]),
		);
		const markSilhouette = () =>
			gm.evaluate(() => {
				const mark = game.actors.getName('E2E Mark');
				return { silhouette: mark.system.silhouette, stored: mark._source.system.silhouette };
			});
		e2e.expect(
			"#380 M6 an Active Effect adding 2 to a character's silhouette makes it 3 for the rule: a silhouette 1 attacker loses one Difficulty die",
			{ mark: await markSilhouette(), rows: silhouetteRows(await opened(gm, attack('Pistol'))) },
			{
				mark: { silhouette: 3, stored: 1 },
				rows: [{ name: 'From Target: Silhouette (3 vs 1)', enabled: false, mods: 'D-' }],
			},
		);

		await gm.evaluate(async () => {
			const mark = game.actors.getName('E2E Mark');
			await mark.deleteEmbeddedDocuments('ActiveEffect', [mark.effects.getName('E2E Giant').id]);
		});
		await setSilhouette('Rival', 1);
		await setSilhouette('Wagon', 0);
		await setSilhouette('Skiff', 0);
		await target(null);
		await gm.evaluate(() => window.dicePromptE2E.closeSheets());
		await e2e.step('silhouette end');
	});

	// E: healing and initiative with a skill the actor lacks (§#49), and the messages of checks (§#50, §#157).
	await part('checkMessages', async () => {
		const heal = await opened(gm, click(gm, ada, '.tab-combat .injury .name .roll-link'));
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

		// §#414: a check's message and an initiative's take the mode the GM picks in the chat.
		// v13: the chat's mode is the roll mode (`blindroll`); v14 replaced it with the message mode (`blind`).
		const chatModeKey = await gm.evaluate(() => (game.release.generation < 14 ? 'rollMode' : 'messageMode'));
		const chatModeBefore = await gm.evaluate((key) => game.settings.get('core', key), chatModeKey);
		const setChatMode = (value: unknown) =>
			gm.evaluate(({ key, value }) => game.settings.set('core', key, value), { key: chatModeKey, value });
		const visibility = ({ whisper, blind }: MessageSummary) => ({ whisper, blind });
		const rolledInChatMode = async (mode: string) => {
			await setChatMode(chatModeKey === 'rollMode' ? `${mode}roll` : mode);
			await opened(gm, skillRoll('Cool'));
			const check = visibility(await roll());
			// The Hero rolls the initiative they hold, so that the turns stay as they were.
			await gm.fixDice([
				{ face: 4, faces: 8 },
				{ face: 8, faces: 8 },
			]);
			await gm.evaluate(() => game.combat.rollInitiative([game.combat.combatants.getName('Hero').id]));
			await e2e.settle();
			return { check, initiative: visibility(await gm.evaluate(() => window.dicePromptE2E.lastMessage())) };
		};
		const gmCount = await gm.evaluate(() => game.users.filter((user: { isGM: boolean }) => user.isGM).length);
		e2e.expect(
			"#414 A1 a check and an initiative rolled with the chat in blind mode, then in self mode, are whispered as the chat's mode says",
			{ blind: await rolledInChatMode('blind'), self: await rolledInChatMode('self') },
			{
				blind: { check: { whisper: gmCount, blind: true }, initiative: { whisper: gmCount, blind: true } },
				self: { check: { whisper: 1, blind: false }, initiative: { whisper: 1, blind: false } },
			},
		);
		await setChatMode(chatModeBefore);

		const description = (message: MessageSummary) => ({ description: message.description, formula: message.formula });
		await opened(gm, skillRoll('Cool'));
		const coolMessage = await roll();
		await opened(gm, characteristicRoll(5));
		const willpowerMessage = await roll();
		await opened(gm, click(gm, { actor: 'Grunts' }, '.adversary-items .skill > .skill-name|Melee'));
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
				skill: {
					description: 'Rolling <strong>Cool (Pr<i class="fas fa-star hide-it"></i>)</strong>...',
					formula: '0dp + 1da + 2di',
				},
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
		const succeededAttackCard = await gm.evaluate(() => window.dicePromptE2E.lastCard());
		e2e.expect(
			'#157 E6 a skill roll and an attack read their net results, with Triumph and Despair apart',
			{
				skill: { formula: skillResults.formula, results: skillResults.results, summaries: skillResults.summaries },
				attack: { formula: attackResults.formula, results: attackResults.results, summaries: attackResults.summaries },
			},
			{
				skill: {
					formula: '3dp + 0da + 2di + 1dc',
					results: 'h t d',
					summaries: ['s Successes 1 h Threat 1 t Triumph 1 d Despair 1'],
				},
				attack: {
					formula: '2dp + 0da + 2di',
					results: 's a',
					summaries: ['Damage (3) 4 Critical 3', 's Successes 1 a Advantage 1'],
				},
			},
		);
		await opened(gm, skillRoll('Melee'));
		// Proficiency faces: 2 a Success, 1 blank, 6 an Advantage; Difficulty: 3 two Failures, 8 a Failure and a Threat.
		await gm.fixDice([
			{ face: 2, faces: 12 },
			{ face: 1, faces: 12 },
			{ face: 6, faces: 12 },
			{ face: 3, faces: 8 },
			{ face: 8, faces: 8 },
		]);
		await roll();
		const failedSkillCard = await gm.evaluate(() => window.dicePromptE2E.lastCard());
		await update(
			{ actor: 'Ada', item: 'Pistol' },
			{
				'system.qualities': [
					{ name: 'Accurate', description: '<p>Aims true.</p>', isRated: true, rating: 1 },
					{ name: 'Pierce', description: '', isRated: false, rating: 2 },
				],
			},
		);
		await opened(gm, attack('Pistol'));
		// Proficiency faces: 1 blank, 10 two Advantages; Difficulty: 2 a Failure, 4 a Threat.
		await gm.fixDice([
			{ face: 1, faces: 12 },
			{ face: 10, faces: 12 },
			{ face: 2, faces: 8 },
			{ face: 4, faces: 8 },
		]);
		await roll();
		const failedAttackCard = await gm.evaluate(() => window.dicePromptE2E.lastCard());
		await update({ actor: 'Ada', item: 'Pistol' }, { 'system.qualities': [] });
		e2e.expect(
			'the cards of a succeeded attack, a failed skill roll and a failed attack with qualities show each of their parts',
			{ succeededAttack: succeededAttackCard, failedSkill: failedSkillCard, failedAttack: failedAttackCard },
			{
				succeededAttack: {
					labels: ['Roll Results', 'Attack Results', 'Summary', 'Dice'],
					results: 's a',
					summaries: ['Damage (3) 4 Critical 3', 's Successes 1 a Advantage 1'],
					qualities: [],
					dice: 'P s P aa D D h',
				},
				failedSkill: {
					labels: ['Roll Results', 'Summary', 'Dice'],
					results: 'f f',
					summaries: ['f Failures 2'],
					qualities: [],
					dice: 'P s P P a D ff D fh',
				},
				// The damage and critical are hidden on a failure, the world setting being off. The qualities still show, as on
				// origin/main, though the setting's hint names them among what it hides.
				failedAttack: {
					labels: ['Roll Results', 'Summary', 'Attack Qualities', 'Dice'],
					results: 'f a',
					summaries: ['f Failures 1 a Advantage 1'],
					qualities: [
						{ text: 'Accurate 1', tooltip: '<p>Aims true.</p>' },
						{ text: 'Pierce', tooltip: 'Genesys.Tooltips.NoDescription' },
					],
					dice: 'P P aa D f D h',
				},
			},
		);
		await e2e.step('E end');
	});

	// F: effect sheets keep a Pool Modification for a skill outside the Skills Compendium (§#40).
	await part('customSkillEffects', async () => {
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
	});

	// G: `@check` links as the GM (§#51, §#95, §#157).
	await part('gmCheckLinks', async () => {
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
				{ skill: 'Athletics', difficulty: 'CDD', text: 'Hard [CDD] Athletics check' },
			],
		);
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
	});

	// H: `@check` links as a player (§#51).
	await part('playerCheckLinks', async () => {
		const warning = 'warning: Select a single token or assign yourself a character to roll this check.';
		const playerLink = (doc: Doc | { message: string }, skill: string, difficulty?: string) =>
			linkPrompt(player, doc, skill, difficulty);
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
				opposed: await noPrompt(player, () =>
					player.evaluate((doc) => window.dicePromptE2E.clickLink({ doc, skill: null }), journal),
				),
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
	});

	// I: `@pool` links in a journal page (§#115).
	await part('poolLinks', async () => {
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
	});

	// J: the Default Difficulty and Skills Compendium settings (§#32, §#100).
	await part('settings', async () => {
		const defaultDifficulty = async (value: string) => {
			// A refused value rejects the setting's write, which is what the step reads.
			const refused = await setSetting('defaultDifficulty', value).then(
				() => false,
				() => true,
			);
			const state = await opened(gm, () => gm.evaluate(() => ui.chat.processMessage('/gendr')));
			return { refused, applied: await gm.evaluate(() => CONFIG.genesys.settings.defaultDifficulty), pool: state.pool };
		};
		// §#415: a value that is not glyphs is refused, rather than stored and read as the default.
		e2e.expect(
			'#32 J1 #415 the Default Difficulty setting refuses a value that is not glyphs, and keeps the one it held',
			{ glyphs: await defaultDifficulty('DDD'), text: await defaultDifficulty('xyz') },
			{ glyphs: { refused: false, applied: 'DDD', pool: '|DDD' }, text: { refused: true, applied: 'DDD', pool: '|DDD' } },
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
	});

	// K: the chance to succeed, as the player (§#90, §#157).
	await part('chanceToSucceed', async () => {
		// The player's character is Cy, so that the reloaded player controls only Cy's token: with no character, Foundry 13
		// controls every token the player owns, and the Dice Roller refuses to open for several.
		await gm.evaluate((user) => game.users.getName(user).update({ character: game.actors.getName('E2E Cy').id }), e2e.playerUser);
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
	});

	// L: the Story Point Tracker with a GM and a player (§#157).
	await part('storyPointTracker', async () => {
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
	});

	// N: an attack from the row of a weapon's extra Weapon Profile rolls that profile (§#366).
	await part('weaponProfiles', async () => {
		await e2e.step('#366 GM gives Ada a dagger with a Thrown profile, and targets the rival', async () => {
			await gm.evaluate(
				(item) => game.actors.getName('E2E Ada').createEmbeddedDocuments('Item', [item]),
				dagger({ main: ['Melee'], thrown: ['Ranged'] }),
			);
			await update({ actor: 'Rival' }, { 'system.defense': { melee: 1, ranged: 2 } });
			await target('Rival');
		});
		type ProfileAttack = {
			prompt: { skill: string | null; pool: string; defense: PromptState['modifications'] };
			card: { description: string | null; summaries: string[]; qualities: CardSummary['qualities'] };
		};
		// Attacks from a Combat tab row, then rolls the dice fixed: the prompt it opened and the card it posted.
		const attackFromRow = async (row: string, dice: { face: number; faces: number }[]): Promise<ProfileAttack> => {
			const state = await opened(gm, attack(row));
			await gm.fixDice(dice);
			const rolled = await roll();
			const { summaries, qualities } = await gm.evaluate(() => window.dicePromptE2E.lastCard());
			return {
				prompt: {
					skill: state.skill,
					pool: state.pool,
					defense: named(state, 'From Target').filter(({ name }) => name.endsWith('Defense')),
				},
				card: { description: rolled.description, summaries, qualities },
			};
		};
		let thrownAttack: ProfileAttack | null = null;
		await e2e.step('#366 N1 GM attacks from the Dagger (Thrown) row, and rolls three Successes', async () => {
			// A build without Weapon Profiles shows no Thrown row: its attack is left out, so that the scenario goes on.
			if ((await combatWeapons('Ada')).some(({ name }) => name === 'E2E Dagger (Thrown)')) {
				// Ability faces: 4 two Successes, 2 a Success; Difficulty: 1 blank.
				thrownAttack = await attackFromRow('Dagger (Thrown)', [
					{ face: 4, faces: 8 },
					{ face: 2, faces: 8 },
					{ face: 1, faces: 8 },
					{ face: 1, faces: 8 },
				]);
			}
		});
		e2e.expect(
			"#366 N1 an attack from the Dagger (Thrown) row rolls the profile's skill against the target's ranged defense, and its card names the profile, with its damage, Critical rating and qualities",
			thrownAttack,
			{
				prompt: {
					skill: 'Ranged (Ag)',
					pool: 'AA|DD',
					defense: [{ name: 'From Target: Ranged Defense', enabled: false, mods: 'S+ S+' }],
				},
				card: {
					description:
						'Attacking with <strong>E2E Dagger (Thrown)</strong> using <strong>Ranged (Ag<i class="fas fa-star hide-it"></i>)</strong>!',
					summaries: ['Damage (Br + 2) 8 Critical 4', 's Successes 3'],
					qualities: [
						{ text: 'Accurate 1', tooltip: '<p>Aims true.</p>' },
						{ text: 'Limited Ammo 1', tooltip: 'Genesys.Tooltips.NoDescription' },
					],
				},
			},
		);
		let mainAttack: ProfileAttack | null = null;
		await e2e.step('#366 N2 GM attacks from the Dagger row, and rolls a Success', async () => {
			// Proficiency faces: 2 a Success, 1 blank; Difficulty: 1 blank.
			mainAttack = await attackFromRow('Dagger', [
				{ face: 2, faces: 12 },
				{ face: 1, faces: 12 },
				{ face: 1, faces: 12 },
				{ face: 1, faces: 8 },
				{ face: 1, faces: 8 },
			]);
		});
		e2e.expect(
			"#366 N2 an attack from the Dagger row rolls the main profile against the target's melee defense, with the weapon's own damage, Critical rating and qualities",
			mainAttack,
			{
				prompt: {
					skill: 'Melee (Br)',
					pool: 'PPP|DD',
					defense: [{ name: 'From Target: Melee Defense', enabled: false, mods: 'S+' }],
				},
				card: {
					description:
						'Attacking with <strong>E2E Dagger</strong> using <strong>Melee (Br<i class="fas fa-star hide-it"></i>)</strong>!',
					summaries: ['Damage (Br + 1) 5 Critical 3', 's Successes 1'],
					qualities: [],
				},
			},
		);
		await target(null);
		await gm.evaluate(() => game.actors.getName('E2E Ada').items.getName('E2E Dagger').delete());
		await gm.evaluate(() => window.dicePromptE2E.closeSheets());
		await e2e.step('N end');
	});

	// #367: the chat's dice button and `/gendr` open the Dice Roller, for the single controlled token's actor.
	await part('diceRoller', async () => {
		e2e.expect(
			'#367 A1 the chat controls hold one dice button, under the message modes by the notifications while the sidebar is collapsed, and beside them in the chat form once expanded',
			await gm.evaluate(() => window.dicePromptE2E.diceRollerButtons()),
			{
				collapsed: { count: 1, place: 'notifications, under', label: 'Roll dice' },
				expanded: { count: 1, place: 'chat, beside', label: 'Roll dice' },
				collapsedAgain: { count: 1, place: 'notifications, under', label: 'Roll dice' },
			},
		);
		const diceRollerOpens = {
			button: () => gm.evaluate(() => window.dicePromptE2E.clickDiceRoller()),
			gendr: () => gm.evaluate(() => ui.chat.processMessage('/gendr')),
		};
		const diceRoller: Record<string, Record<string, unknown>> = {};
		for (const [from, open] of Object.entries(diceRollerOpens)) {
			const prompt = async () => {
				const { actor, skill, pool } = await opened(gm, open);
				return { actor, skill, pool };
			};
			await control(gm, []);
			const none = await prompt();
			await control(gm, ['Bo']);
			const one = await prompt();
			await control(gm, ['Bo', 'Cy']);
			const several = await noPrompt(gm, open);
			await control(gm, ['Wagon']);
			const vehicle = await noPrompt(gm, open);
			diceRoller[from] = { none, one, several, vehicle };
		}
		await control(gm, []);
		await gm.evaluate(() => window.dicePromptE2E.closePrompts());
		const diceRollerCases = {
			none: { actor: null, skill: null, pool: '|DD' },
			one: { actor: 'Bo', skill: '—', pool: '|DD' },
			several: { prompts: 0, notifications: ['error: You need to select no tokens, or a single token, to perform this action.'] },
			vehicle: { prompts: 0, notifications: ['error: The selected token is of an invalid type to perform this action.'] },
		};
		e2e.expect(
			"#367 A2 the dice button and /gendr open a bare pool without a controlled token, the pool of a single controlled token's actor, and refuse several tokens or a vehicle",
			diceRoller,
			{ button: diceRollerCases, gendr: diceRollerCases },
		);
	});

	// §#396: the Pool Modifications fold and unfold through the expandable mixin, in the 0.2s ease-out of every fold since
	// #516 (1s before), and their folded container is hidden from Tab. §#579: their title is a `DescriptionFold`'s chevron.
	await part('modificationFolds', async () => {
		await setSetting('dicePoolCollapseModificationsDetails', true);
		// The Difficulty, DD, shows its dice among the Pool Modifications.
		await opened(gm, skillRoll('Cool'));
		let unfolded: PoolModificationsBox | null = null;
		await e2e.step('#396 A1 GM unfolds the Pool Modifications of a Cool check', async () => {
			unfolded = await gm.evaluate(() => window.dicePromptE2E.togglePoolModifications());
		});
		e2e.expect("#396 A1 the unfolded Pool Modifications show their container whole, after the fold's transition", unfolded, {
			unfolded: true,
			transition: FOLD_TRANSITION,
			height: 'whole',
			visibility: 'visible',
			modifications: true,
		});
		const toggle = () => gm.evaluate(() => window.dicePromptE2E.poolModificationsToggle());
		e2e.expect(
			"#579 E1 the unfolded Pool Modifications' title tells it is expanded, points at their fold, and shows a chevron pointing down",
			await toggle(),
			{ text: 'Pool Modifications', expanded: true, icon: 'fa-chevron-down', controlsFold: true },
		);
		let refolded: PoolModificationsBox | null = null;
		await e2e.step('#396 A2 GM folds the Pool Modifications', async () => {
			refolded = await gm.evaluate(() => window.dicePromptE2E.togglePoolModifications());
		});
		// Folded, the expander keeps the 1px of its container's dotted top border, as on main before the mixin.
		e2e.expect(
			"#396 A2 the folded Pool Modifications keep only their top border and hide their container from Tab, after the fold's transition",
			refolded,
			{
				unfolded: false,
				transition: FOLD_TRANSITION,
				height: 1,
				visibility: 'hidden',
				modifications: true,
			},
		);
		e2e.expect(
			"#579 E2 the folded Pool Modifications' title tells it is collapsed, and shows a chevron pointing right",
			await toggle(),
			{ text: 'Pool Modifications', expanded: false, icon: 'fa-chevron-right', controlsFold: true },
		);
		await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	});

	// O: Pool Modifications of effects named alike are turned on one at a time (§#445).
	await part('sameNameEffects', async () => {
		const poolAndRows = (state: PromptState) => ({ pool: state.pool, rows: rows(state) });
		// The pool and the rows of an Intellect check, once the first Ring is turned on.
		const ringsCheck = async (name: string) => {
			await opened(gm, characteristicRoll(3, { actor: name }));
			return poolAndRows(await toggle('E2E Ring'));
		};
		const ring = (enabled: boolean, mods: string) => ({ name: 'From Self: E2E Ring', enabled, mods });
		e2e.expect(
			'#445 O1 one item with two effects named alike: turning on the first applies its upgrade only',
			await ringsCheck('Ring Bearer'),
			{
				pool: 'P|DD',
				rows: [ring(true, 'A^'), ring(false, 'D^')],
			},
		);
		e2e.expect('#445 O2 two copies of an item: turning on the first applies its upgrade only', await ringsCheck('Twin Rings'), {
			pool: 'P|DD',
			rows: [ring(true, 'A^'), ring(false, 'A^')],
		});
		e2e.expect(
			'#445 O3 two copies of an item upgrading once and twice: turning on the first applies its upgrade only',
			await ringsCheck('Uneven Rings'),
			{ pool: 'P|DD', rows: [ring(true, 'A^'), ring(false, 'A^ A^')] },
		);
		const brawnCheck = await select('characteristic', 'brawn');
		e2e.expect('#445 O4 switching the characteristic keeps each of them in its own state', poolAndRows(brawnCheck), {
			pool: 'P|DD',
			rows: [ring(true, 'A^'), ring(false, 'A^ A^')],
		});
		await gm.evaluate(() => window.dicePromptE2E.closePrompts());
		await gm.evaluate(() => window.dicePromptE2E.closeSheets());
		await e2e.step('O end');
	});

	// P: the roller sets the Difficulty, before any Pool Modification; a die removed by hand still comes after them
	// (§#450).
	await part('difficulty', async () => {
		await setSetting('defaultDifficulty', 'DDD');
		const difficultyState = () => gm.evaluate(() => window.dicePromptE2E.promptDifficulty());
		const setDifficulty = (dice: number[]) => gm.evaluate((dice) => window.dicePromptE2E.setPromptDifficulty(dice), dice);
		const shadowedCheck = () => opened(gm, characteristicRoll(1, { actor: 'Shadowed' }));
		const difficultyOf = (level: string, dice: string, manualChanges = '') => ({ label: `Difficulty: ${level}`, dice, manualChanges });
		const shown = ({ label, dice, manualChanges }: PromptDifficulty) => ({ label, dice, manualChanges });
		const opening = await shadowedCheck();
		const openingDifficulty = await difficultyState();
		e2e.expect(
			"#469 P1 the prompt opens with the Default Difficulty's dice lit among five, the level named in the row's label, without an Upgrades row",
			{ pool: opening.pool, rows: openingDifficulty.rows, hint: openingDifficulty.hint, difficulty: shown(openingDifficulty) },
			{
				pool: 'AA|DDD',
				rows: ['Difficulty: Hard', 'Manual Changes'],
				hint: 'Use the dice box on the right to add, upgrade and downgrade. Click a die in the pool to remove one of its kind, after every other change.',
				difficulty: difficultyOf('Hard', 'DDD··'),
			},
		);
		e2e.expect(
			"#496 P9 the Manual Changes row comes after the effects' rows, empty, the Difficulty row first",
			await gm.evaluate(() => window.dicePromptE2E.promptRows()),
			['Difficulty: Hard', 'From Self: E2E Shroud', 'Manual Changes'],
		);
		const easy = await setDifficulty([1]);
		const easyUpgraded = await toggle('E2E Shroud');
		e2e.expect(
			'#450 P2 an Easy check whose difficulty an effect upgrades twice rolls a Challenge die and a Difficulty die',
			{ easy: easy.pool, upgraded: easyUpgraded.pool, difficulty: shown(await difficultyState()) },
			{ easy: 'AA|D', upgraded: 'AA|CD', difficulty: difficultyOf('Easy', 'D····') },
		);
		await shadowedCheck();
		await gm.evaluate(() => window.dicePromptE2E.promptRemove('D'));
		const removed = await gm.evaluate(() => window.dicePromptE2E.promptRemove('D'));
		const removedUpgraded = await toggle('E2E Shroud');
		e2e.expect(
			'#450 P3 two Difficulty dice removed by hand from a Hard check come after the upgrades, as the CRB orders (p. 21)',
			{ removed: removed.pool, upgraded: removedUpgraded.pool, difficulty: shown(await difficultyState()) },
			{ removed: 'AA|D', upgraded: 'AA|CC', difficulty: difficultyOf('Hard', 'DDD··', 'D- D-') },
		);
		await shadowedCheck();
		const clicks = {
			formidable: await setDifficulty([5]),
			average: await setDifficulty([2]),
			lowered: await setDifficulty([2]),
			simple: await setDifficulty([1]),
			daunting: await setDifficulty([4]),
		};
		e2e.expect(
			'#469 P4 a click on a die lights it and those before it, a click on the highest lit die lowers the level by one, down to Simple',
			Object.fromEntries(
				Object.entries(clicks).map(([name, { pool, difficulty }]) => [name, { pool, difficulty: shown(difficulty) }]),
			),
			{
				formidable: { pool: 'AA|DDDDD', difficulty: difficultyOf('Formidable', 'DDDDD') },
				average: { pool: 'AA|DD', difficulty: difficultyOf('Average', 'DD···') },
				lowered: { pool: 'AA|D', difficulty: difficultyOf('Easy', 'D····') },
				simple: { pool: 'AA|', difficulty: difficultyOf('Simple', '·····') },
				daunting: { pool: 'AA|DDDD', difficulty: difficultyOf('Daunting', 'DDDD·') },
			},
		);
		await shadowedCheck();
		await setDifficulty([1]);
		await toggle('E2E Shroud');
		const rolled = await roll();
		e2e.expect('#450 P5 the check rolls the pool of the Difficulty set', rolled.formula, '0dp + 2da + 1di + 1dc');
		await setSetting('defaultDifficulty', 'DDB');
		const withBoost = await shadowedCheck();
		const withBoostDifficulty = shown(await difficultyState());
		const boostRemoved = await gm.evaluate(() => window.dicePromptE2E.removePromptManualChange(0));
		e2e.expect(
			'#450 P6 a Default Difficulty holding a Boost die opens with its Difficulty dice as the level and the Boost die as a manual change',
			{
				pool: withBoost.pool,
				difficulty: withBoostDifficulty,
				removed: { pool: boostRemoved.pool, difficulty: shown(boostRemoved.difficulty) },
			},
			{
				pool: 'AAB|DD',
				difficulty: difficultyOf('Average', 'DD···', 'B+'),
				removed: { pool: 'AA|DD', difficulty: difficultyOf('Average', 'DD···') },
			},
		);
		await setSetting('defaultDifficulty', 'DDD');
		await opened(gm, click(gm, ada, '.tab-combat .injury .name .roll-link'));
		const injury = shown(await difficultyState());
		await control(gm, ['Bo']);
		await linkPrompt(gm, journal, 'Athletics', 'CDD');
		const upgradedLink = shown(await difficultyState());
		const upgradedLinkClicks = { easy: await setDifficulty([1]), daunting: await setDifficulty([4]) };
		const impossible = await linkPrompt(gm, journal, 'Athletics', 'CCCCCD');
		const impossibleDifficulty = shown(await difficultyState());
		await control(gm, []);
		e2e.expect(
			"#450 P7 an injury's and a check link's difficulty set the level and the upgrades, a difficulty above Formidable is an Impossible one, of a Formidable one's dice (§#671)",
			{ injury, upgradedLink, impossible: { pool: impossible.pool, difficulty: impossibleDifficulty } },
			{
				injury: difficultyOf('Average', 'DD···'),
				upgradedLink: difficultyOf('Hard', 'CDD··'),
				impossible: { pool: '|CCCCC', difficulty: difficultyOf('Impossible', 'CCCCC') },
			},
		);
		e2e.expect(
			"#469 P8 a check link's upgrade stays a Challenge die, first among the five, as a click changes the level",
			Object.fromEntries(
				Object.entries(upgradedLinkClicks).map(([name, { pool, difficulty }]) => [name, { pool, difficulty: shown(difficulty) }]),
			),
			{
				easy: { pool: '|C', difficulty: difficultyOf('Easy', 'C····') },
				daunting: { pool: '|CDDD', difficulty: difficultyOf('Daunting', 'CDDD·') },
			},
		);
		await setSetting('defaultDifficulty', 'DD');
		await gm.evaluate(() => window.dicePromptE2E.closePrompts());
		await gm.evaluate(() => window.dicePromptE2E.closeSheets());
		await e2e.step('P end');
	});

	// Q: the hint of the Show Attack Damage On Failure setting in the game settings window, in each language of the system
	// (§#434). The language is a client setting the page reads as it loads: the GM's client reloads in French and Spanish,
	// then in English again.
	await part('damageHint', async () => {
		const settingText = () => gm.evaluate(() => window.dicePromptE2E.settingText('genesys.showDamageOnFailure'));
		const showIn = async (language: string) => {
			await gm.evaluate((language) => game.settings.set('core', 'language', language), language);
			await gm.reload();
			await gm.evaluate(installDicePromptHelpers);
		};
		const settingTexts: Record<string, unknown> = { en: await settingText() };
		try {
			for (const language of ['fr', 'es']) {
				await showIn(language);
				settingTexts[language] = await settingText();
			}
		} finally {
			await showIn('en');
		}
		e2e.expect(
			'#434 Q1 the hint of Show Attack Damage On Failure names the damage and the Critical, and says the qualities always show, in en, fr and es',
			settingTexts,
			{
				en: {
					language: 'en',
					name: 'Show Attack Damage On Failure',
					hint: 'Whether to show Damage and Critical on attack roll chat cards even when the roll was a failure. Qualities always show, since some trigger on a failure.',
				},
				fr: {
					language: 'fr',
					name: "Montrer les dommages de l'attaque en cas d'échec",
					hint: "Afficher ou non les dégâts et le critique sur les cartes de discussion des jets d'attaque, même en cas d'échec. Les attributs s'affichent toujours, car certains se déclenchent sur un échec.",
				},
				es: {
					language: 'es',
					name: 'Muestra el daño del ataque cuando falle',
					hint: 'Mostrar o no el daño y el crítico en las tarjetas de chat de las tiradas de ataque, incluso cuando la tirada haya sido un fracaso. Las cualidades se muestran siempre, ya que algunas se activan con un fracaso.',
				},
			},
		);
		await e2e.step('Q end');
	});

	// R: the glyphs of the Genesys dice (§#488). Foundry gives the class `die` to a core die's result in a roll's tooltip
	// too, which keeps its own font; the glyphs the enrichers set in a line of text sit in it.
	await part('diceGlyphs', async () => {
		let fonts: Record<string, boolean> = {};
		await e2e.step('#488 A1 GM rolls 6d6 to the chat and opens a journal page with @dice, @check and @pool links', async () => {
			fonts = await gm.evaluate((doc) => window.dicePromptE2E.glyphFonts(doc), journal);
		});
		e2e.expect("#488 A1 a core d6's result keeps Foundry's font, the Genesys dice of the links draw in Genesys Symbols", fonts, {
			coreDie: false,
			diceLink: true,
			checkLink: true,
			poolLink: true,
		});
		const inline = await gm.evaluate((doc) => window.dicePromptE2E.inlineGlyphs(doc), journal);
		e2e.log("#488 C1 each glyph's centre above the middle of the text's capitals", inline);
		e2e.expect(
			"#488 C1 the glyphs of the @dice, @sym, @check and @pool links are centred on the text's capitals (±1px)",
			Object.fromEntries(Object.entries(inline).map(([name, { px }]) => [name, Math.abs(px) <= 1])),
			{ '@dice A': true, '@sym sa': true, '@check D': true, '@pool P': true },
		);
		await gm.evaluate(() => window.dicePromptE2E.closeSheets());
		await e2e.step('R end');
	});

	// S: a Pool Modification's row opens the item its effect comes from, or the effect, for a user who may see it (§#495).
	// The Seeker's Intellect check, with the Veiled targeted.
	await part('modificationLinks', async () => {
		const sourceLinks = (client: Client) => client.evaluate(() => window.dicePromptE2E.promptSourceLinks());
		const sourceLink = (text: string, opens: string, type: 'item' | 'effect') => ({
			text,
			tooltip: `Open E2E ${opens}`,
			icon: type === 'item' ? 'fa-solid fa-suitcase' : 'fa-solid fa-person-rays',
			cursor: 'pointer',
		});
		const seekerRows = (shade: ReturnType<typeof sourceLink> | null) => [
			{ name: 'From Self: E2E Grit', link: sourceLink('E2E Grit', 'Grit', 'effect') },
			{ name: 'From Self: E2E Fate (E2E Quick Draw)', link: sourceLink('E2E Fate (E2E Quick Draw)', 'Quick Draw', 'item') },
			{ name: 'From Self: E2E Lens', link: sourceLink('E2E Lens', 'Lens', 'item') },
			{ name: 'From Target: E2E Haze (E2E Shade)', link: shade },
		];
		await player.evaluate((name) => window.e2e.target(name), 'Veiled');
		await seekerCheck(player);
		e2e.expect(
			"#495 S1 as a player, the rows link the actor's talent, equipment and effect, name the talent after its effect, and leave the target's talent unlinked",
			await sourceLinks(player),
			seekerRows(null),
		);
		await player.evaluate(() => window.dicePromptE2E.closePrompts());
		await player.evaluate(() => window.e2e.target(null));
		await target('Veiled');
		await seekerCheck(gm);
		e2e.expect(
			"#495 S2 as the GM, the target's talent is linked too",
			await sourceLinks(gm),
			seekerRows(sourceLink('E2E Haze (E2E Shade)', 'Shade', 'item')),
		);
		const openedSources: Record<string, unknown> = {};
		for (const name of ['E2E Fate', 'E2E Grit', 'E2E Haze']) {
			openedSources[name] = await gm.evaluate((name) => window.dicePromptE2E.openPromptSource(name), name);
			await gm.evaluate(() => window.e2e.closeSetUp());
		}
		const openedSource = (type: string, name: string) => ({ opened: { type, name }, prompts: 1, enabled: false });
		e2e.expect(
			"#495 S3 a click on a link opens the talent's sheet, the effect's sheet or the target's talent's sheet, and leaves the prompt open and the row off",
			openedSources,
			{
				'E2E Fate': openedSource('Item', 'Quick Draw'),
				'E2E Grit': openedSource('ActiveEffect', 'Grit'),
				'E2E Haze': openedSource('Item', 'Shade'),
			},
		);
		await target('Rival');
		await update({ actor: 'Rival' }, { 'system.defense': { melee: 1, ranged: 1 } });
		await opened(gm, attack('Pistol'));
		e2e.expect(
			"#495 S4 the target's defense has no link, even for the GM",
			(await sourceLinks(gm)).filter(({ name }) => name.endsWith('Defense')),
			[{ name: 'From Target: Ranged Defense', link: null }],
		);
		await target(null);
		await gm.evaluate(() => window.dicePromptE2E.closePrompts());
		await gm.evaluate(() => window.dicePromptE2E.closeSheets());
		await player.evaluate(() => window.dicePromptE2E.closeSheets());
		await e2e.step('S end');
	});

	// T: the Pool Modifications' columns (§#513). The Seeker's Intellect check, its talent's effect named long enough to
	// wrap, with manual changes.
	await part('modificationColumns', async () => {
		await gm.evaluate(() =>
			window.e2e
				.actor('Seeker')
				.items.getName('E2E Quick Draw')
				.effects.contents[0].update({ name: 'E2E Fate, a Pool Modification Named Long Enough to Wrap' }),
		);
		await seekerCheck(gm);
		await gm.evaluate(() => window.dicePromptE2E.promptAdd(['A+', 'S+']));
		if (!(await gm.evaluate(() => window.dicePromptE2E.poolModificationsBox())).unfolded) {
			await gm.evaluate(() => window.dicePromptE2E.togglePoolModifications());
		}
		const layout = () => gm.evaluate(() => window.dicePromptE2E.poolModificationsLayout());
		const unfoldedLayout = await layout();
		await gm.evaluate(() => window.dicePromptE2E.togglePoolModifications());
		const foldedLayout = await layout();
		await gm.evaluate(() => window.dicePromptE2E.togglePoolModifications());
		e2e.log('#513 the Pool Modifications as laid out, unfolded then folded', { unfolded: unfoldedLayout, folded: foldedLayout });
		// A tenth of a px apart, as the layout rounds them, or half a px for a box centred on another.
		const near = (a: number, b: number, slack = 0.1) => Math.abs(a - b) <= slack;
		const { titleText, caret, rows: layoutRows } = unfoldedLayout;
		e2e.expect(
			"#513 A1 the title's text starts on the table's left edge, the caret alone in the margin before it",
			{ textOnEdge: near(titleText, 0), caretInMargin: caret.right <= titleText },
			{ textOnEdge: true, caretInMargin: true },
		);
		e2e.expect(
			"#513 A2 folding the section moves neither the caret's axis nor the title's text",
			{ axis: near(foldedLayout.caret.axis, caret.axis), text: near(foldedLayout.titleText, titleText) },
			{ axis: true, text: true },
		);
		e2e.expect(
			"#513 A3 every row's label starts on one edge, after the checkboxes' column, and a wrapped label goes on under its own text",
			{
				edges: new Set(layoutRows.map(({ label }) => label)).size,
				afterCheckboxes: layoutRows.every(({ label }) => label > 0),
				wrapped: layoutRows.filter(({ lineStarts }) => lineStarts.length > 1).length,
				underItsText: layoutRows.every(({ lineStarts }) => lineStarts.every((start) => near(start, 0))),
			},
			{ edges: 1, afterCheckboxes: true, wrapped: 1, underItsText: true },
		);
		e2e.expect(
			"#513 A4 the checkboxes and the modifications sit on their label's first line, with no top offset",
			{
				checkboxes: layoutRows.every(({ checkbox }) => checkbox === null || near(checkbox, 0, 0.5)),
				// By the ink their fonts draw, within a px, not by their boxes: Genesys Symbols draws a glyph high in its box (§#535).
				modifications: layoutRows.every(({ ink }) => ink === null || near(ink, 0, 1)),
				offsets: layoutRows.flatMap(({ offsets }) => offsets),
			},
			{ checkboxes: true, modifications: true, offsets: [] },
		);
		// §#535: the Difficulty row, first, against the one-line rows of the effects, between it and Manual Changes.
		const [difficultyRow, ...otherRows] = layoutRows;
		const oneLineEffects = otherRows.slice(0, -1).filter(({ lineStarts }) => lineStarts.length === 1);
		e2e.expect(
			"#535 A1 the Difficulty dice are centred on their label's capitals, and the Difficulty row is as tall as a one-line effect's",
			{
				centred: difficultyRow.ink !== null && near(difficultyRow.ink, 0, 1),
				effects: oneLineEffects.length > 0,
				asTall: oneLineEffects.every(({ height }) => near(height, difficultyRow.height)),
			},
			{ centred: true, effects: true, asTall: true },
		);
		await gm.evaluate(() => window.dicePromptE2E.closePrompts());
		await e2e.step('T end');
	});

	// §#582: the dice and symbols read in words, as an image's or a button's name to a screen reader and as its tooltip:
	// the Dice Prompt's pool and Pool Modifications, a check's chat card, a die's result in a roll's tooltip, and the links
	// of a journal. Each element reads as its glyphs' text and its name, null when it is neither.
	await part('glyphLabels', async () => {
		const read = (names: GlyphName[]) => names.map(({ text, name }) => [text, name]);
		const tooltipsRead = (names: GlyphName[]) => names.every(({ name, tooltip }) => tooltip === name);

		// Ada's Cool check, A|DD, with a Proficiency die and a Success added by hand.
		await opened(gm, skillRoll('Cool'));
		await gm.evaluate(() => window.dicePromptE2E.promptAdd(['P+', 's+']));
		const pool = await gm.glyphNames('.app-dice-prompt .preview .positive > *, .app-dice-prompt .preview .negative > *');
		e2e.expect(
			"#582 A1 the Dice Prompt's pool names each die's and symbol's button by its removal in words, in its tooltip too",
			[read(pool), tooltipsRead(pool)],
			[
				[
					['P', 'Remove 1 Proficiency die'],
					['A', 'Remove 1 Ability die'],
					['s', 'Remove 1 Success'],
					['D', 'Remove 1 Difficulty die'],
					['D', 'Remove 1 Difficulty die'],
				],
				true,
			],
		);
		const diceBox = await gm.glyphNames('.app-dice-prompt .dice-box button');
		const manualChanges = await gm.glyphNames('.app-dice-prompt .pool-modifications-manual button');
		// The glyphs inside a named button give no words of their own, whose tooltip would cover the button's.
		const wordedGlyphs = await gm.evaluate(
			() =>
				document.querySelectorAll(
					['.preview', '.dice-box', '.pool-modifications-manual']
						.map((area) => `.app-dice-prompt ${area} button :is([role], [aria-label], [data-tooltip])`)
						.join(', '),
				).length,
		);
		e2e.expect(
			"#582 A2 the Dice Prompt's dice box names each button by its Pool Modification as an operation, and a manual change's by its cancellation, in their tooltips too",
			{
				diceBox: read(diceBox),
				manualChanges: read(manualChanges),
				tooltips: tooltipsRead([...diceBox, ...manualChanges]),
				wordedGlyphs,
			},
			{
				diceBox: [
					['A', 'Add 1 Ability die'],
					['P', 'Add 1 Proficiency die'],
					['B', 'Add 1 Boost die'],
					['A', 'Upgrade 1 Ability die'],
					['P', 'Downgrade 1 Proficiency die'],
					['D', 'Add 1 Difficulty die'],
					['C', 'Add 1 Challenge die'],
					['S', 'Add 1 Setback die'],
					['D', 'Upgrade 1 Difficulty die'],
					['C', 'Downgrade 1 Challenge die'],
					['a', 'Add 1 Advantage'],
					['s', 'Add 1 Success'],
					['t', 'Add 1 Triumph'],
					['h', 'Add 1 Threat'],
					['f', 'Add 1 Failure'],
					['d', 'Add 1 Despair'],
				],
				manualChanges: [
					['P', 'Cancel: Add 1 Proficiency die'],
					['s', 'Cancel: Add 1 Success'],
				],
				tooltips: true,
				wordedGlyphs: 0,
			},
		);

		// 1dp+1da+2di and a Success: the Proficiency die lands on a Triumph, the Ability die on a blank face, the Difficulty
		// dice on a Failure and a Threat, then a Threat.
		await gm.fixDice([
			{ face: 12, faces: 12 },
			{ face: 1, faces: 8 },
			{ face: 8, faces: 8 },
			{ face: 4, faces: 8 },
		]);
		const { id } = await roll();
		const sidebar = await gm.evaluate((id) => window.dicePromptE2E.showMessage(id), id);
		const card = (selector: string) => gm.glyphNames(`[data-e2e="glyph-message"] ${selector}`);
		const results = await card('.net-results');
		const dice = await card('.dice > *');
		const summary = await card('.summary-table .symbol');
		e2e.expect(
			"#582 A3 a check's chat card reads its results, each die's result and its extra symbols in words, in their tooltips too, and leaves the summary's symbols to the label beside them",
			{ results: read(results), dice: read(dice), summary: read(summary), tooltips: tooltipsRead([...results, ...dice]) },
			{
				results: [['h h t', '2 Threat, 1 Triumph']],
				dice: [
					['P t', 'Proficiency Die: 1 Triumph'],
					['A', 'Ability Die: Blank face'],
					['D fh', 'Difficulty Die: 1 Failure, 1 Threat'],
					['D h', 'Difficulty Die: 1 Threat'],
					['s', '1 Success'],
				],
				summary: [
					['s', null],
					['h', null],
					['t', null],
				],
				tooltips: true,
			},
		);

		// A roll of Genesys dice sent from the chat: a Triumph, then a blank face.
		await gm.fixDice([
			{ face: 12, faces: 12 },
			{ face: 1, faces: 6 },
		]);
		const rolled = await gm.evaluate(() => window.dicePromptE2E.rollToChat('1dp+1ds'));
		await gm.evaluate((id) => window.dicePromptE2E.showMessage(id), rolled);
		const faces = await gm.glyphNames('[data-e2e="glyph-message"] .dice-tooltip li.roll > *');
		e2e.expect(
			"#582 A4 a roll's tooltip reads the face of each Genesys die in words, in its tooltip too",
			[read(faces), tooltipsRead(faces)],
			[
				[
					['t', '1 Triumph'],
					['', 'Blank face'],
				],
				true,
			],
		);
		await gm.evaluate((state) => window.dicePromptE2E.restoreSidebar(state), sidebar);

		// Ada's sheet, open from the check, holds a check link in its notes, on a tab it doesn't show.
		await gm.evaluate(() => window.dicePromptE2E.closeSheets());
		await gm.evaluate((doc) => window.dicePromptE2E.pools(doc), journal);
		// The journal's first check link, `@check[Athletics,3]`: chat messages of other parts hold check links too.
		await gm.evaluate(() => {
			const link = window.e2e.htmlOf(game.journal.getName('E2E Links').sheet)!.querySelector('a[data-skill-check] > span')!;
			(link as HTMLElement).dataset.e2e = 'glyph-check';
		});
		const links = await gm.glyphNames('[data-e2e="glyph-check"], p.e2e-glyphs .font-genesys-symbols');
		e2e.expect(
			'#582 A5 the @dice, @sym, @check and @pool links read in words, in their tooltips too, the digits of a @sym left out',
			[read(links), tooltipsRead(links)],
			[
				[
					['DDD', '3 Difficulty dice'],
					['PPB', '2 Proficiency dice, 1 Boost die'],
					['ss1', '2 Successes'],
					['23', null],
					['AsA', 'Add 1 Ability die, Remove 1 Success, Upgrade 1 Ability die'],
				],
				true,
			],
		);
		await gm.evaluate(() => window.dicePromptE2E.closeSheets());
		await e2e.step('U end');
	});

	// V: the checks a character's encumbrance and a weapon's damage hinder (§#668). Ada's Brawn of 3 gives her a threshold of
	// 8; an anvil puts her 2 over it.
	await part('encumbranceAndItemDamage', async () => {
		const hindrances = (state: PromptState) => state.modifications.filter(({ name }) => /Encumbrance|Damage/.test(name));
		const setDamage = (doc: Doc, damage: string) => update(doc, { 'system.damage': damage });
		const pistol = { actor: 'Ada', item: 'Pistol' };
		const cannon = { actor: 'Skiff', item: 'Cannon' };
		const fireCannon = click(gm, skiff, '.tab-combat .weapon .name button|E2E Cannon');
		const encumbrance = await gm.evaluate(async () => {
			const ada = game.actors.getName('E2E Ada');
			const { value, threshold } = ada.system.currentEncumbrance;
			await ada.createEmbeddedDocuments('Item', [
				{ name: 'E2E Anvil', type: 'gear', system: { encumbrance: threshold - value + 2 } },
			]);
			return ada.system.currentEncumbrance;
		});

		await opened(gm, characteristicRoll(1));
		const athletics = await select('skill', 'Athletics (Br)');
		const athleticsOn = await toggle('Encumbrance');
		const athleticsOff = await toggle('Encumbrance');
		e2e.expect(
			"#668 V1 an encumbered character's Athletics check lists one Setback per point over the threshold, which toggles; an Intellect check none (CRB p. 85)",
			{
				encumbrance,
				rows: hindrances(athletics),
				on: athleticsOn.pool,
				off: athleticsOff.pool,
				intellect: hindrances(await opened(gm, characteristicRoll(3))),
			},
			{
				encumbrance: { value: 10, threshold: 8 },
				rows: [{ name: 'From Self: Encumbrance (10 vs 8)', enabled: false, mods: 'S+ S+' }],
				on: 'AAA|DDSS',
				off: 'AAA|DD',
				intellect: [],
			},
		);

		await setDamage(pistol, 'moderate');
		await setDamage(cannon, 'minor');
		const pistolAttack = await opened(gm, attack('Pistol'));
		const pistolOn = await toggle('Moderate Damage');
		const cannonAttack = await opened(gm, fireCannon);
		e2e.expect(
			"#668 V2 an attack with a weapon at moderate damage lists one more Difficulty die, a vehicle weapon's minor damage a Setback, after the encumbrance (CRB p. 89)",
			{
				pistol: { rows: hindrances(pistolAttack), on: pistolOn.pool },
				cannon: { actor: cannonAttack.actor, rows: hindrances(cannonAttack) },
			},
			{
				pistol: {
					rows: [
						{ name: 'From Self: Encumbrance (10 vs 8)', enabled: false, mods: 'S+ S+' },
						{ name: 'From Self: E2E Pistol (Moderate Damage)', enabled: false, mods: 'D+' },
					],
					on: 'PP|DDD',
				},
				cannon: {
					actor: 'Ada',
					rows: [
						{ name: 'From Self: Encumbrance (10 vs 8)', enabled: false, mods: 'S+ S+' },
						{ name: 'From Self: E2E Cannon (Minor Damage)', enabled: false, mods: 'S+' },
					],
				},
			},
		);

		await setDamage(pistol, 'major');
		await setDamage(cannon, 'major');
		const refused = { pistol: await noPrompt(gm, attack('Pistol')), cannon: await noPrompt(gm, fireCannon) };
		// The weapon takes major damage while its prompt is open: the roll is refused.
		await setDamage(pistol, 'undamaged');
		await opened(gm, attack('Pistol'));
		await setDamage(pistol, 'major');
		await gm.evaluate(() => window.dicePromptE2E.clearNotifications());
		const rolled = await gm.evaluate(() => window.dicePromptE2E.promptRollTried());
		const whileOpen = { ...rolled, notifications: await gm.evaluate(() => window.dicePromptE2E.notifications()) };
		e2e.expect(
			"#668 V3 a weapon at major damage can't attack, from the Combat tab, a vehicle's sheet or a prompt opened before the damage (CRB p. 89)",
			{ refused, whileOpen },
			{
				refused: {
					pistol: { prompts: 0, notifications: ["warning: E2E Pistol can't attack: it has Major Damage."] },
					cannon: { prompts: 0, notifications: ["warning: E2E Cannon can't attack: it has Major Damage."] },
				},
				whileOpen: { posted: false, notifications: ["warning: E2E Pistol can't attack: it has Major Damage."] },
			},
		);
		await e2e.step('V end');
	});

	// W: the difficulty the prompt opens at: its caller's, else the Skills Compendium skill's, else the world's (§#669). The
	// system's compendium sets the melee skills to Average (CRB p. 102); the world's Default Difficulty is set to Easy.
	await part('skillDifficulty', async () => {
		await setSetting('defaultDifficulty', 'D');
		// Ada's own copy of Melee holds a difficulty of its own, which the prompt ignores.
		await gm.evaluate(() => game.actors.getName('E2E Ada').items.getName('Melee').update({ 'system.difficulty': 'DDDD' }));
		const compendium = await gm.evaluate(() =>
			Object.fromEntries(
				CONFIG.genesys.skills
					.filter((skill: { name: string }) => ['Brawl', 'Melee', 'Cool'].includes(skill.name))
					.map((skill: { name: string; system: { difficulty: string } }) => [skill.name, skill.system.difficulty]),
			),
		);
		const spear = await opened(gm, attack('Spear'));
		const cool = await opened(gm, skillRoll('Cool'));
		const coolToMelee = await select('skill', 'Melee (Br)');
		await control(gm, ['Bo']);
		const message = await gm.evaluate(() => window.dicePromptE2E.chatMessage('<p>@check[Melee,3]</p>'));
		const link = await linkPrompt(gm, { message }, 'Melee');
		await control(gm, []);
		e2e.expect(
			"#669 W1 a melee attack opens at its compendium skill's Average, a skill without one at the world's Easy, a check link at its own difficulty; picking another skill keeps it",
			{
				compendium,
				spear: { skill: spear.skill, pool: spear.pool },
				cool: cool.pool,
				coolToMelee: coolToMelee.pool,
				link: link.pool,
			},
			{
				compendium: { Brawl: 'DD', Cool: '', Melee: 'DD' },
				spear: { skill: 'Melee (Br)', pool: 'PPP|DD' },
				cool: 'A|D',
				coolToMelee: 'PPP|D',
				link: '|DDD',
			},
		);
		await e2e.step('W end');
	});

	// X: Story Points spent from the Dice Prompt, by a player through the GM's client, and by the GM (§#671).
	await part('storyPointSpends', async () => {
		const found = await gm.evaluate(() => game.settings.get('genesys', 'storyPoints'));
		const setPools = (pools: { player: number; gm: number }) =>
			gm.evaluate((pools) => game.settings.set('genesys', 'storyPoints', pools), pools);
		const pools = () => gm.evaluate(() => game.settings.get('genesys', 'storyPoints'));
		const spends = (client: Client) => client.evaluate(() => window.dicePromptE2E.promptSpends());
		const spend = (client: Client, name: string) => client.evaluate((name) => window.dicePromptE2E.promptSpend(name), name);
		const rollSpending = (client: Client) => client.evaluate(() => window.dicePromptE2E.promptRollSpending());
		const option = (spend: string, label: string, state: { checked?: boolean; disabled?: boolean; why?: string } = {}) => ({
			spend,
			label,
			checked: state.checked ?? false,
			disabled: state.disabled ?? false,
			why: state.why ?? '',
		});
		const UPGRADE = 'Spend a point to upgrade the ability';
		const EMPTY = 'The pool has no point left to spend.';
		await update({ actor: 'Bo' }, { 'system.characteristics.brawn': 2 });
		const message = await gm.evaluate(() => window.dicePromptE2E.chatMessage('<p>@check[Athletics,2]</p><p>@check[Athletics,6]</p>'));
		await control(player, ['Bo']);
		await setPools({ player: 1, gm: 0 });

		await linkPrompt(player, { message }, 'Athletics', 'DD');
		const offered = await spends(player);
		const ticked = await spend(player, 'upgradeAbility');
		const rolled = await rollSpending(player);
		e2e.expect(
			"#671 X1 a player's check with the Story Point option on rolls one more Proficiency die, and moves a point to the GM pool",
			{ offered, ticked, rolled: { formula: rolled.rolled?.formula, ...rolled, rolled: undefined }, pools: await pools() },
			{
				offered: {
					spends: [option('upgradeAbility', `${UPGRADE} (Players)`)],
					difficulty: 'Difficulty: Average',
					pool: 'AA|DD',
					canRoll: true,
				},
				ticked: {
					spends: [option('upgradeAbility', `${UPGRADE} (Players)`, { checked: true })],
					difficulty: 'Difficulty: Average',
					pool: 'PA|DD',
					canRoll: true,
				},
				rolled: { formula: '1dp + 1da + 2di', storyPointMessages: 1, prompts: 0, rolled: undefined },
				pools: { player: 0, gm: 1 },
			},
		);

		const emptyPlayer = await linkPrompt(player, { message }, 'Athletics', 'DD').then(() => spends(player));
		await player.evaluate(() => window.dicePromptE2E.closePrompts());
		await control(gm, ['Bo']);
		const gmOffered = await linkPrompt(gm, { message }, 'Athletics', 'DD').then(() => spends(gm));
		e2e.expect(
			"#671 X2 a player's option is closed while the player pool is empty; a GM spends from the GM pool, and a player's point on the difficulty",
			{ emptyPlayer: emptyPlayer.spends, gmOffered: gmOffered.spends },
			{
				emptyPlayer: [option('upgradeAbility', `${UPGRADE} (Players)`, { disabled: true, why: EMPTY })],
				gmOffered: [
					option('upgradeAbility', `${UPGRADE} (GM)`),
					option('upgradeDifficulty', "Spend a player's point to upgrade the difficulty (Players)", {
						disabled: true,
						why: EMPTY,
					}),
				],
			},
		);

		await setPools({ player: 1, gm: 1 });
		await e2e.settle();
		await spend(gm, 'upgradeAbility');
		const gmTicked = await spend(gm, 'upgradeDifficulty');
		const gmRolled = await rollSpending(gm);
		await control(gm, []);
		e2e.expect(
			"#671 X3 a GM's point upgrades the ability and a player's the difficulty, each going to the other pool",
			{ pool: gmTicked.pool, storyPointMessages: gmRolled.storyPointMessages, prompts: gmRolled.prompts, pools: await pools() },
			{ pool: 'PA|CD', storyPointMessages: 2, prompts: 0, pools: { player: 1, gm: 1 } },
		);

		await setPools({ player: 1, gm: 0 });
		await linkPrompt(player, { message }, 'Athletics', 'DDDDD');
		const impossible = await spends(player);
		const refused = await rollSpending(player);
		const paid = await spend(player, 'impossible');
		const impossibleRolled = await rollSpending(player);
		e2e.expect(
			"#671 X4 an Impossible task can't be rolled until the roller spends its point, which leaves none for the upgrade",
			{
				impossible,
				refused: { rolled: refused.rolled, prompts: refused.prompts },
				paid,
				rolled: { formula: impossibleRolled.rolled?.formula, prompts: impossibleRolled.prompts },
				pools: await pools(),
			},
			{
				impossible: {
					spends: [
						option('impossible', 'Spend a point to attempt the Impossible task (Players)', {
							why: "An Impossible task can't be rolled without it.",
						}),
						option('upgradeAbility', `${UPGRADE} (Players)`),
					],
					difficulty: 'Difficulty: Impossible',
					pool: 'AA|DDDDD',
					canRoll: false,
				},
				refused: { rolled: null, prompts: 1 },
				paid: {
					spends: [
						option('impossible', 'Spend a point to attempt the Impossible task (Players)', {
							checked: true,
							why: "An Impossible task can't be rolled without it.",
						}),
						option('upgradeAbility', `${UPGRADE} (Players)`, { disabled: true, why: EMPTY }),
					],
					difficulty: 'Difficulty: Impossible',
					pool: 'AA|DDDDD',
					canRoll: true,
				},
				rolled: { formula: '0dp + 2da + 5di', prompts: 0 },
				pools: { player: 0, gm: 1 },
			},
		);
		await control(player, []);
		await setPools(found);
		await e2e.step('X end');
	});

	// C: Critical Injuries rolled on the world's table (§#685), from an attack's card and from the sheets.
	await part('criticalInjuries', async () => {
		for (const client of [gm, player]) await client.evaluate(installCriticalInjuryHelpers);
		const previous = await gm.evaluate(() => window.criticalInjuryE2E.setUp());
		const fromSheet = (client: Client, actor: string) =>
			client.evaluate((actor) => window.criticalInjuryE2E.openFromSheet(actor), actor);
		const type = (client: Client, name: string, value: string) =>
			client.evaluate((args) => window.criticalInjuryE2E.type(args), { name, value });
		const rollCritical = async (client: Client, d100: number) => {
			await client.fixDice([{ face: d100, faces: 100 }]);
			return client.evaluate(() => window.criticalInjuryE2E.roll());
		};
		// A talent of rank 2 whose effect changes Critical Injury rolls, scaled by its rank or not. Mode 0 is Foundry's custom
		// mode, which v14 reads as the custom type.
		const talent = (name: string, key: string, value: string, scalesWithRank: 'yes' | 'no') => ({
			name: `E2E ${name}`,
			type: 'talent',
			system: { ranked: 'yes', rank: 2, scalesWithRank },
			effects: [{ name: `E2E ${name}`, changes: [{ key, value, mode: 0 }] }],
		});
		// The attacker's talent adds 10 per rank to the injuries it inflicts; the target already has an injury, and a talent
		// that takes 10 off those it suffers, whatever its rank.
		await gm.evaluate(
			async ({ inflicted, suffered }) => {
				await window.e2e.actor('Ada').createEmbeddedDocuments('Item', [inflicted]);
				await window.e2e
					.actor('Rival')
					.createEmbeddedDocuments('Item', [suffered, { name: 'E2E Wound', type: 'injury', system: { severity: 'easy' } }]);
				await window.e2e.settle();
			},
			{
				inflicted: talent('Lethal', 'genesys.critical.inflicted', '10', 'yes'),
				suffered: talent('Durable', 'genesys.critical.suffered', '-10', 'no'),
			},
		);
		await update(
			{ actor: 'Ada', item: 'Pistol' },
			{ 'system.critical': 1, 'system.qualities': [{ name: 'Vicious', description: '', isRated: true, rating: 2 }] },
		);
		await target('Rival');

		await opened(gm, attack('Pistol'));
		// Proficiency faces: 12 is a Triumph, 10 two Advantages; Difficulty face 1 is blank.
		await gm.fixDice([
			{ face: 12, faces: 12 },
			{ face: 10, faces: 12 },
			{ face: 1, faces: 8 },
			{ face: 1, faces: 8 },
		]);
		const attackMessage = await roll();
		const card = await gm.evaluate(() => window.criticalInjuryE2E.attackCard());
		e2e.expect(
			'#685 C1 an attack whose Advantage reaches its Critical rating twice, with a Triumph, triggers three Critical Injuries, which its card offers to roll',
			{ results: attackMessage.results, card },
			{ results: 'a a t', card: { triggers: 'Critical Injury Triggers 3', button: true } },
		);

		const fromCard = await gm.evaluate(() => window.criticalInjuryE2E.openFromCard());
		e2e.expect(
			"#685 C2 the card's dialog rolls for the target: one trigger spent, the weapon's Vicious, the attacker's talent by rank, the target's injury and talent",
			fromCard,
			{
				header: ['Critical Injury for E2E Rival', 'Attack: E2E Pistol', 'Table: E2E Crits'],
				spent: { value: '1', max: '3' },
				lines: [
					'Extra triggers (+10 each past the first): 0',
					'Vicious 2: 20',
					'E2E Lethal (attacker): 20',
					'Critical Injuries already suffered (1): 10',
					'E2E Durable: -10',
					'Free modifier: 0',
				],
				formula: '1d100 + 40',
			},
		);
		const spentAll = await type(gm, 'spent', '3');
		const attackRolled = await rollCritical(gm, 25);
		e2e.expect(
			'#685 C3 spending every trigger adds 10 for each past the first, and the roll draws from the table, its message linking the item',
			{ spent: { lines: spentAll.lines[0], formula: spentAll.formula }, rolled: attackRolled },
			{
				spent: { lines: 'Extra triggers (+10 each past the first): 20', formula: '1d100 + 60' },
				rolled: {
					speaker: 'E2E Ada',
					flavor: 'Critical Injury: E2E Rival',
					formula: '1d100 + 60',
					total: 85,
					results: ['E2E Scar'],
					links: ['E2E Scar'],
				},
			},
		);

		await target(null);
		const fromAda = await fromSheet(gm, 'Ada');
		const adaRolled = await rollCritical(gm, 25);
		e2e.expect(
			"#685 C4 a character's sheet rolls without an attack, with the character's injury: the same d100 draws a lower result",
			{ dialog: fromAda, rolled: adaRolled },
			{
				dialog: {
					header: ['Critical Injury for E2E Ada', 'Table: E2E Crits'],
					spent: null,
					lines: ['Critical Injuries already suffered (1): 10', 'Free modifier: 0'],
					formula: '1d100 + 10',
				},
				rolled: {
					speaker: 'E2E Ada',
					flavor: 'Critical Injury: E2E Ada',
					formula: '1d100 + 10',
					total: 35,
					results: ['E2E Nick'],
					links: ['E2E Nick'],
				},
			},
		);

		await fromSheet(gm, 'Ada');
		await type(gm, 'line-injuries', '0');
		const edited = await type(gm, 'line-free', '80');
		const editedRolled = await rollCritical(gm, 25);
		e2e.expect(
			'#685 C5 every line stays editable: an injury left out and a free modifier move the result',
			{ lines: edited.lines, formula: edited.formula, total: editedRolled.total, results: editedRolled.results },
			{
				lines: ['Critical Injuries already suffered (1): 0', 'Free modifier: 80'],
				formula: '1d100 + 80',
				total: 105,
				results: ['E2E Maim'],
			},
		);

		const fromRival = await fromSheet(gm, 'Rival');
		await gm.evaluate(() => window.criticalInjuryE2E.closePrompts());
		e2e.expect("#685 C6 an adversary's sheet rolls with its injuries and its own talent", fromRival, {
			header: ['Critical Injury for E2E Rival', 'Table: E2E Crits'],
			spent: null,
			lines: ['Critical Injuries already suffered (1): 10', 'E2E Durable: -10', 'Free modifier: 0'],
			formula: '1d100',
		});

		const fromBo = await fromSheet(player, 'Bo');
		const boRolled = await rollCritical(player, 60);
		e2e.expect(
			"#685 C7 a player rolls from their character's sheet, on a table the GM hasn't shared with them",
			{ formula: fromBo.formula, rolled: boRolled },
			{
				formula: '1d100',
				rolled: {
					speaker: 'E2E Bo',
					flavor: 'Critical Injury: E2E Bo',
					formula: '1d100',
					total: 60,
					results: ['E2E Scar'],
					links: ['E2E Scar'],
				},
			},
		);

		await gm.evaluate((previous) => window.criticalInjuryE2E.tearDown(previous), previous);
		await e2e.step('Critical Injuries end');
	});

	// S: the Token States of the roller in the Dice Prompt (§#682, CRB p. 114). Their menu and rounds sit in `combat.ts`,
	// part `tokenStates`.
	await part('tokenStateDice', async () => {
		const STATES = ['immobilized', 'disoriented', 'staggered'];
		const setStates = (active: boolean) =>
			gm.evaluate(
				async (args) => {
					const ada = game.actors.getName('E2E Ada');
					for (const id of args.states) await ada.toggleStatusEffect(id, { active: args.active, rounds: 1 });
				},
				{ states: STATES, active },
			);
		const stateRows = (state: PromptState) => state.modifications.filter(({ name }) => /Immobilized|Disoriented|Staggered/.test(name));
		const reminders = () => gm.evaluate(() => window.dicePromptE2E.promptReminders());

		await setStates(true);
		const cool = await opened(gm, skillRoll('Cool'));
		const shown = await reminders();
		const turnedOn = await toggle('Disoriented');
		const brawn = await opened(gm, characteristicRoll(1));
		e2e.expect(
			"#682 S1 a Disoriented character's checks list its Setback, which the roller turns on like any effect; Immobilized and Staggered show as reminders",
			{ rows: stateRows(cool), reminders: shown, on: turnedOn.pool, brawn: stateRows(brawn) },
			{
				rows: [{ name: 'From Self: Disoriented', enabled: false, mods: 'S+' }],
				reminders: ["Immobilized: can't perform maneuvers.", "Staggered: can't perform actions."],
				on: 'A|DDS',
				brawn: [{ name: 'From Self: Disoriented', enabled: false, mods: 'S+' }],
			},
		);

		await setStates(false);
		const cleared = await opened(gm, skillRoll('Cool'));
		e2e.expect(
			'#682 S2 once the states are removed, the check lists no Setback and shows no reminder',
			{ rows: stateRows(cleared), reminders: await reminders() },
			{ rows: [], reminders: [] },
		);
		await e2e.step('token states end');
	});

	// M: the maneuvers of the Combat tab, Aim and Guarded Stance, and the In Cover and Prone states, in the attacks (§#683,
	// CRB p. 98–100, 108).
	await part('combatManeuvers', async () => {
		const maneuver = (name: string) => click(gm, ada, `.tab-combat .maneuvers button|${name}`);
		const maneuverRows = (state: PromptState) => state.modifications.filter(({ name }) => /Aim|Guarded Stance/.test(name));
		const targetRows = (state: PromptState) => named(state, 'From Target');
		// Ada's effects that hold a status, with their rounds left when they lapse, and her total defense.
		const adaState = () =>
			gm.evaluate(() => {
				const ada = game.actors.getName('E2E Ada');
				return {
					effects: ada.effects.contents
						.filter((effect: { statuses: Set<string> }) => effect.statuses.size > 0)
						.map((effect: { name: string; statuses: Set<string>; lapsingRounds?: number }) => ({
							name: effect.name,
							statuses: [...effect.statuses],
							rounds: effect.lapsingRounds ?? null,
						})),
					defense: ada.system.totalDefense,
				};
			});
		const setMarkState = (id: string, active: boolean) =>
			gm.evaluate((args) => window.e2e.token('Mark').actor.toggleStatusEffect(args.id, { active: args.active }), { id, active });

		// An attack without a target, before any state, as a reference.
		const before = await opened(gm, attack('Pistol'));
		const beforeRoll = await roll();

		// The status menu of a character's and of a vehicle's token.
		const menu = await gm.evaluate(async () => {
			const read = async (name: string) => {
				const token = window.e2e.token(name);
				token.control({ releaseOthers: true });
				await canvas.hud.token.bind(token);
				const icons = [...canvas.hud.token.element.querySelectorAll('.effect-control')] as HTMLElement[];
				const shown = icons
					.filter((icon) => ['cover', 'prone'].includes(icon.dataset.statusId ?? ''))
					.map((icon) => ({ id: icon.dataset.statusId, title: icon.dataset.tooltipText, img: icon.getAttribute('src') }));
				await canvas.hud.token.close();
				token.release();
				return shown.sort((left, right) => String(left.id).localeCompare(String(right.id)));
			};
			return { Mark: await read('Mark'), Wagon: await read('Wagon') };
		});
		e2e.expect("#683 M0 a character's status menu offers In Cover and a single Prone, the system's; a vehicle's offers neither", menu, {
			Mark: [
				{ id: 'cover', title: 'In Cover', img: 'icons/svg/barrel.svg' },
				{ id: 'prone', title: 'Prone', img: 'icons/svg/falling.svg' },
			],
			Wagon: [],
		});

		// Aim, then attacks.
		await e2e.step("#683 M1 GM clicks Aim on Ada's Combat tab", maneuver('Aim'));
		const cool = await opened(gm, skillRoll('Cool'));
		const aimed = await opened(gm, attack('Spear'));
		const boosted = await toggle('Aim');
		const aimedRoll = await roll();
		const usedUp = await adaState();
		const next = await opened(gm, attack('Spear'));
		e2e.expect(
			'#683 M1 after Aim, the next melee attack lists its Boost and rolls it; the attack uses it up, and the one after lists none',
			{
				cool: maneuverRows(cool),
				aimed: maneuverRows(aimed),
				pool: boosted.pool,
				formula: aimedRoll.formula,
				effects: usedUp.effects,
				next: maneuverRows(next),
			},
			{
				cool: [],
				aimed: [{ name: 'From Self: Aim', enabled: false, mods: 'B+' }],
				pool: 'PPPB|DD',
				formula: '3dp + 0da + 2di + 1db',
				effects: [],
				next: [],
			},
		);

		await e2e.step('#683 M2 GM clicks Aim three times', async () => {
			for (let time = 0; time < 3; time++) await maneuver('Aim')();
		});
		const twice = await opened(gm, attack('Pistol'));
		e2e.expect(
			'#683 M2 two Aim maneuvers in a row give two Boosts to the next ranged attack, a third none more, on one effect',
			{ rows: maneuverRows(twice), effects: (await adaState()).effects },
			{
				rows: [{ name: 'From Self: Aim', enabled: false, mods: 'B+ B+' }],
				effects: [{ name: 'Aim', statuses: ['aim'], rounds: null }],
			},
		);

		// Guarded Stance.
		await e2e.step("#683 M3 GM clicks Guarded Stance on Ada's Combat tab, twice", async () => {
			await maneuver('Guarded Stance')();
			await maneuver('Guarded Stance')();
		});
		const guarded = await opened(gm, attack('Spear'));
		const guardedCool = await opened(gm, skillRoll('Cool'));
		e2e.expect(
			"#683 M3 Guarded Stance lasts 1 round, brings a Setback to Ada's attacks but not to her other checks, and raises her melee defense",
			{ rows: maneuverRows(guarded), cool: maneuverRows(guardedCool), state: await adaState() },
			{
				rows: [
					{ name: 'From Self: Aim', enabled: false, mods: 'B+ B+' },
					{ name: 'From Self: Guarded Stance', enabled: false, mods: 'S+' },
				],
				cool: [],
				state: {
					effects: [
						{ name: 'Aim', statuses: ['aim'], rounds: null },
						{ name: 'Guarded Stance', statuses: ['guardedStance'], rounds: 1 },
					],
					defense: { melee: 1, ranged: 0 },
				},
			},
		);

		// Prone and In Cover on the target.
		await target('Mark');
		await e2e.step("#683 M4 GM puts Prone on Mark's token, and targets it", () => setMarkState('prone', true));
		const proneRanged = await opened(gm, attack('Pistol'));
		const proneMelee = await opened(gm, attack('Spear'));
		e2e.expect(
			'#683 M4 an attack against a prone target lists a Setback at range and a Boost in melee',
			{ ranged: targetRows(proneRanged), melee: targetRows(proneMelee) },
			{
				ranged: [{ name: 'From Target: Prone', enabled: false, mods: 'S+' }],
				melee: [{ name: 'From Target: Prone', enabled: false, mods: 'B+' }],
			},
		);

		await e2e.step("#683 M5 GM takes Prone off Mark's token and puts In Cover on it", async () => {
			await setMarkState('prone', false);
			await setMarkState('cover', true);
		});
		const coverRanged = await opened(gm, attack('Pistol'));
		const coverMelee = await opened(gm, attack('Spear'));
		e2e.expect(
			'#683 M5 an attack against a target in cover lists its ranged defense 1 at range, nothing in melee',
			{ ranged: targetRows(coverRanged), melee: targetRows(coverMelee) },
			{ ranged: [{ name: 'From Target: Ranged Defense', enabled: false, mods: 'S+' }], melee: [] },
		);

		// Without a target, the attacker adds cover's and prone's dice by hand.
		await e2e.step('#683 M6 GM puts Prone back on Mark, removes Aim and Guarded Stance from Ada, and targets nobody', async () => {
			await setMarkState('prone', true);
			await target(null);
			await gm.evaluate(async () => {
				const ada = game.actors.getName('E2E Ada');
				const ids = ada.effects.contents
					.filter((effect: { statuses: Set<string> }) => effect.statuses.size > 0)
					.map((effect: { id: string }) => effect.id);
				await ada.deleteEmbeddedDocuments('ActiveEffect', ids);
			});
		});
		const untargeted = await opened(gm, attack('Pistol'));
		const untargetedRoll = await roll();
		e2e.expect(
			'#683 M6 an attack without a target lists and rolls the same as before any maneuver or state',
			{ rows: untargeted.modifications, pool: untargeted.pool, formula: untargetedRoll.formula },
			{ rows: before.modifications, pool: before.pool, formula: beforeRoll.formula },
		);

		// A player who observes Ada attacks after her Aim: the Acting GM uses it up.
		await e2e.step("#683 M7 GM gives the player Ada's sheet as an observer, and clicks Aim", async () => {
			await gm.evaluate((user) => window.e2e.setOwnership(window.e2e.actor('Ada'), user, 'OBSERVER'), e2e.playerUser);
			await maneuver('Aim')();
		});
		const observed = await opened(player, click(player, ada, '.tab-combat .weapon .name button|E2E Spear'));
		const observerButtons = await player.evaluate(() =>
			window.dicePromptE2E.texts({ doc: { actor: 'Ada' }, selector: '.tab-combat .maneuvers button' }),
		);
		await e2e.step('#683 M7 the player rolls the attack', () => player.evaluate(() => window.dicePromptE2E.promptRoll()));
		e2e.expect(
			"#683 M7 an observer's attack lists Ada's Aim and uses it up through the GM; the observer's sheet offers no maneuver",
			{ rows: maneuverRows(observed), buttons: observerButtons, effects: (await adaState()).effects },
			{ rows: [{ name: 'From Self: Aim', enabled: false, mods: 'B+' }], buttons: [], effects: [] },
		);

		// Prone on the attacker: a Setback on their own melee attacks only (§#696, CRB p. 108).
		const setAdaProne = (active: boolean) =>
			gm.evaluate((active) => game.actors.getName('E2E Ada').toggleStatusEffect('prone', { active }), active);
		await e2e.step('#696 M8 GM puts Prone on Ada', () => setAdaProne(true));
		const ownProneRows = (state: PromptState) => named(state, 'From Self: Prone');
		const proneSpear = await opened(gm, attack('Spear'));
		const pronePistol = await opened(gm, attack('Pistol'));
		const proneMeleeCheck = await opened(gm, skillRoll('Melee'));
		const proneCool = await opened(gm, skillRoll('Cool'));
		e2e.expect(
			"#696 M8 a prone character's melee attack lists a Setback from Prone; their ranged attack and their checks that aren't attacks don't",
			{
				spear: ownProneRows(proneSpear),
				pistol: ownProneRows(pronePistol),
				melee: ownProneRows(proneMeleeCheck),
				cool: ownProneRows(proneCool),
			},
			{ spear: [{ name: 'From Self: Prone', enabled: false, mods: 'S+' }], pistol: [], melee: [], cool: [] },
		);
		await e2e.step('#696 M8 GM takes Prone off Ada', () => setAdaProne(false));
		await e2e.step('combat maneuvers end');
	});

	// H: the Heal action beside Medicine, a Medicine check for a patient at the difficulty of their state of health, whose
	// card heals them by its results, for the GM and the patient's owners (§#686, CRB p. 116).
	await part('medicineHeal', async () => {
		const cy = { actor: 'Cy' };
		const heal = (client: Client) => click(client, cy, '.tab-skills .skill .heal');
		const patientPrompt = (client: Client, pick: string | null) =>
			client.evaluate((pick) => window.dicePromptE2E.patientPrompt(pick), pick);
		// Cy, the player's, rolls two Ability dice for Medicine. Bo, the player's, has suffered more than half his wound
		// threshold; Mark, the GM's, more than his wound threshold; Cy, none.
		await update(cy, { system: { characteristics: { intellect: 2 }, wounds: { value: 0, max: 10 } } });
		await update({ actor: 'Bo' }, { system: { wounds: { value: 8, max: 12 }, strain: { value: 3, max: 10 } } });
		await update({ actor: 'Mark' }, { system: { wounds: { value: 13, max: 12 }, strain: { value: 0, max: 10 } } });
		await player.evaluate(() => window.e2e.target(null));

		let patients: string[] = [];
		const other = await opened(player, async () => {
			await heal(player)();
			patients = await patientPrompt(player, 'Bo');
		});
		e2e.expect(
			"#686 H1 with no target, Heal offers the scene's and the players' characters; healing Bo, past half his wound threshold, opens Medicine at Average",
			{ patients, actor: other.actor, skill: other.skill, pool: other.pool },
			// Hero and Mark have a token on the scene; Bo, Cy and Seeker are the player's.
			{ patients: ['Bo', 'Cy', 'Hero', 'Mark', 'Seeker'], actor: 'Cy', skill: 'Medicine (Int)', pool: 'AA|DD' },
		);

		// Ability dice on two Successes, then a Success and an Advantage; Difficulty dice on blank faces.
		await player.fixDice([
			{ face: 4, faces: 8 },
			{ face: 7, faces: 8 },
			{ face: 1, faces: 8 },
			{ face: 1, faces: 8 },
		]);
		const rolled = await player.evaluate(() => window.dicePromptE2E.promptRoll());
		const { labels } = await player.evaluate(() => window.dicePromptE2E.lastCard());
		const shown = { gm: await recoveryButton(gm, rolled.id), player: await recoveryButton(player, rolled.id) };
		e2e.expect(
			"#686 H2 Bo's card shows a wound healed per Success and a strain per Advantage, and Apply to the GM and Bo's owner",
			{ results: rolled.results, labels, summaries: rolled.summaries, shown },
			{
				results: 's s s a',
				labels: ['Roll Results', 'Summary', 'Heals E2E Bo', 'Dice'],
				summaries: ['s Successes 3 a Advantage 1', 'Wounds 3 Strain 1'],
				shown: { gm: true, player: true },
			},
		);
		await e2e.step("#686 H3 Bo's owner applies the card", () => recoveryButton(player, rolled.id, true));
		e2e.expect("#686 H3 Apply lowers Bo's wounds and strain by the result", await health('Bo'), { wounds: 5, strain: 2 });

		const self = await opened(player, async () => {
			await heal(player)();
			await patientPrompt(player, 'Cy');
		});
		e2e.expect('#686 H4 Cy healing themselves, at no wound, opens Medicine at Easy and two more', self.pool, 'AA|DDD');

		await target('Mark');
		const targeted = await opened(gm, heal(gm));
		const patientPrompts = await gm.evaluate(() => window.e2e.apps('app-select-patient-prompt').length);
		// Ability dice on two Successes each; Difficulty dice on blank faces.
		await gm.fixDice([
			{ face: 4, faces: 8 },
			{ face: 4, faces: 8 },
			{ face: 1, faces: 8 },
			{ face: 1, faces: 8 },
			{ face: 1, faces: 8 },
		]);
		const marked = await roll();
		const markShown = { gm: await recoveryButton(gm, marked.id), player: await recoveryButton(player, marked.id) };
		await recoveryButton(gm, marked.id, true);
		await target(null);
		e2e.expect(
			"#686 H5 healing the GM's target Mark, past his wound threshold, asks for no patient and opens at Hard; Apply shows to the GM alone, and heals Mark",
			{ patientPrompts, pool: targeted.pool, shown: markShown, health: await health('Mark') },
			{ patientPrompts: 0, pool: 'AA|DDD', shown: { gm: true, player: false }, health: { wounds: 9, strain: 0 } },
		);
		await e2e.step('medicineHeal end');
	});

	// R: the End of encounter and Night's rest actions beside a character's strain and wounds: a Simple Discipline or Cool
	// check whose card recovers a strain per Success, and a night's rest that recovers all strain and heals a wound
	// (§#687, CRB pp. 116–117).
	await part('recovery', async () => {
		const cy = { actor: 'Cy' };
		// Cy, the player's, rolls Cool on three Ability dice, Discipline on two.
		await update(cy, {
			system: { characteristics: { willpower: 2, presence: 3 }, wounds: { value: 4, max: 10 }, strain: { value: 5, max: 10 } },
		});

		const encounter = await opened(player, click(player, cy, '.recovery-actions .end-of-encounter'));
		const difficulty = await player.evaluate(() => window.dicePromptE2E.promptDifficulty().label);
		const discipline = await player.evaluate((args) => window.dicePromptE2E.promptSelect(args), {
			name: 'skill' as const,
			option: 'Discipline',
		});
		e2e.expect(
			'#687 R1 End of encounter opens a Simple check on the better of Discipline and Cool, and the player can pick the other',
			{ actor: encounter.actor, skill: encounter.skill, pool: encounter.pool, difficulty, other: discipline.pool },
			{ actor: 'Cy', skill: 'Cool (Pr)', pool: 'AAA|', difficulty: 'Difficulty: Simple', other: 'AA|' },
		);

		// Discipline's Ability dice on two Successes, then a Success and an Advantage.
		await player.fixDice([
			{ face: 4, faces: 8 },
			{ face: 7, faces: 8 },
		]);
		const rolled = await player.evaluate(() => window.dicePromptE2E.promptRoll());
		const { labels } = await player.evaluate(() => window.dicePromptE2E.lastCard());
		const shown = await recoveryButton(player, rolled.id, true);
		e2e.expect(
			"#687 R2 the card recovers a strain per Success, and no wound; Apply lowers Cy's strain by them",
			{ results: rolled.results, labels, summaries: rolled.summaries, shown, health: await health('Cy') },
			{
				results: 's s s a',
				labels: ['Roll Results', 'Summary', 'E2E Cy recovers', 'Dice'],
				summaries: ['s Successes 3 a Advantage 1', 'Strain 3'],
				shown: true,
				health: { wounds: 4, strain: 2 },
			},
		);

		await e2e.step("#687 R3 Cy's owner rests for the night", click(player, cy, '.recovery-actions .nights-rest'));
		await e2e.settle();
		e2e.expect(
			"#687 R3 Night's rest empties the strain and heals one wound, and the chat says so",
			{ health: await health('Cy'), message: await gm.evaluate(() => window.dicePromptE2E.lastMessageText()) },
			{
				health: { wounds: 3, strain: 0 },
				message: { speaker: 'Cy', text: 'Rests for the night. Strain recovered: 2. Wounds healed: 1.' },
			},
		);
		await e2e.step('recovery end');
	});

	// Q: the qualities of weapons, whose Active Effects their rank scales, on the weapon's attacks only, while it is
	// equipped (§#694, CRB pp. 86–89).
	await part('qualityEffects', async () => {
		// The world's qualities, each with one effect: Accurate as one Boost on combat checks, Defensive as melee defense 1.
		await gm.evaluate(async () => {
			const { ADD, CUSTOM } = CONST.ACTIVE_EFFECT_MODES;
			const quality = (name: string, change: { key: string; value: string; mode: number }) => ({
				name: `E2E ${name}`,
				type: 'quality',
				system: { isRated: true },
				effects: [{ name: `E2E ${name}`, changes: [change] }],
			});
			await Item.createDocuments([
				quality('Accurate', { key: 'genesys.pool.combat.self.', value: 'B', mode: CUSTOM }),
				quality('Defensive', { key: 'system.defense.melee', value: '1', mode: ADD }),
			]);
			await game.actors.getName('E2E Ada').createEmbeddedDocuments('Item', [
				{ name: 'E2E Sword', type: 'weapon', system: { skills: ['Melee'], range: 'engaged', state: 'equipped', baseDamage: 5 } },
				{ name: 'E2E Shield', type: 'weapon', system: { skills: ['Melee'], range: 'engaged', state: 'carried', baseDamage: 2 } },
			]);
		});
		// Drops a world quality on the sheet of one of Ada's weapons.
		const dropQuality = (quality: string, weapon: string) => () =>
			gm.evaluate(
				async (args) => {
					const item = game.actors.getName('E2E Ada').items.getName(`E2E ${args.weapon}`);
					const root = await window.e2e.render(item.sheet, (root) => root.querySelector('.window-content'));
					window.e2e.drop(root.querySelector('.window-content')!, {
						type: 'Item',
						uuid: game.items.getName(`E2E ${args.quality}`).uuid,
					});
					await window.e2e.settle();
				},
				{ quality, weapon },
			);
		// A weapon of Ada's: its qualities, and its effects, each with whether it is tagged with one of its qualities.
		const weaponState = (weapon: string) =>
			gm.evaluate((weapon) => {
				const item = game.actors.getName('E2E Ada').items.getName(`E2E ${weapon}`);
				const ids = item.system.qualities.map((quality: { id: string }) => quality.id);
				return {
					qualities: item.system.qualities.map(
						(quality: { name: string; rating: number; activation: string; advantageCost: number }) =>
							`${quality.name} ${quality.rating} (${quality.activation}, ${quality.advantageCost})`,
					),
					effects: item.effects.map((effect: { name: string; flags: { genesys?: { quality?: string } } }) => ({
						name: effect.name,
						tagged: ids.includes(effect.flags.genesys?.quality),
					})),
				};
			}, weapon);
		const accurateRows = (state: PromptState) => state.modifications.filter(({ name }) => name.includes('Accurate'));
		const meleeDefense = () => gm.evaluate(() => game.actors.getName('E2E Ada').system.totalDefense.melee);

		await e2e.step("#694 Q1 GM drops Accurate twice on Ada's Sword", async () => {
			await dropQuality('Accurate', 'Sword')();
			await dropQuality('Accurate', 'Sword')();
		});
		const sword = await opened(gm, attack('Sword'));
		const pistol = await opened(gm, attack('Pistol'));
		e2e.expect(
			"#694 Q1 Accurate 2, its one Boost written in the quality, lists two Boosts on the Sword's attacks and none on the Pistol's",
			{ weapon: await weaponState('Sword'), sword: accurateRows(sword), pistol: accurateRows(pistol) },
			{
				weapon: { qualities: ['E2E Accurate 2 (passive, 2)'], effects: [{ name: 'E2E Accurate', tagged: true }] },
				sword: [{ name: 'From Self: E2E Accurate (E2E Sword)', enabled: false, mods: 'B+ B+' }],
				pistol: [],
			},
		);

		await e2e.step("#694 Q2 GM drops Defensive on Ada's carried Shield", dropQuality('Defensive', 'Shield'));
		const carried = await meleeDefense();
		await update({ actor: 'Ada', item: 'Shield' }, { 'system.state': 'equipped' });
		e2e.expect(
			'#694 Q2 a shield with Defensive 1 raises the melee defense while equipped, not while carried',
			{ carried, equipped: await meleeDefense() },
			{ carried: 0, equipped: 1 },
		);

		await e2e.step("#694 Q3 GM opens Defensive on the Shield's sheet, makes it active, and adds an effect to it", () =>
			gm.evaluate(async () => {
				const { render, settle, waitFor } = window.e2e;
				const shield = game.actors.getName('E2E Ada').items.getName('E2E Shield');
				const root = await render(shield.sheet, (root) => root.querySelector('.profile-qualities .data-rated'));
				const row = root.querySelector('.profile-qualities .quality')!;
				[...row.querySelectorAll<HTMLElement>('.data-rated button')].at(-1)!.click();
				const select = await waitFor('the details of Defensive', () => row.querySelector<HTMLSelectElement>('.details select'));
				select.value = 'active';
				select.dispatchEvent(new Event('change', { bubbles: true }));
				await settle();
				const add = await waitFor('the Add an Effect button', () =>
					root.querySelector<HTMLElement>('.profile-qualities .quality .details .add-effect'),
				);
				add.click();
				await settle();
			}),
		);
		const details = await gm.evaluate(() => {
			const root = window.e2e.htmlOf(game.actors.getName('E2E Ada').items.getName('E2E Shield').sheet)!;
			return {
				expanded: root.querySelector('.profile-qualities .data-rated button[aria-expanded]')?.getAttribute('aria-expanded'),
				cost: root.querySelector<HTMLInputElement>('.profile-qualities .details input[type="number"]')?.value ?? null,
			};
		});
		e2e.expect(
			"#694 Q3 Defensive opens in full on the Shield's sheet, shows its Advantage cost once active, and holds a new effect named after it",
			{ details, shield: await weaponState('Shield'), defense: await meleeDefense() },
			{
				details: { expanded: 'true', cost: '2' },
				shield: {
					qualities: ['E2E Defensive 1 (active, 2)'],
					effects: [
						{ name: 'E2E Defensive', tagged: true },
						{ name: 'E2E Defensive', tagged: true },
					],
				},
				defense: 1,
			},
		);

		// The new effect brings a Difficulty die to the Shield's attacks, as Auto-fire would; auto-apply turns the others on.
		await gm.evaluate(async () => {
			const shield = game.actors.getName('E2E Ada').items.getName('E2E Shield');
			const added = shield.effects.contents.at(-1);
			// v13: an effect keeps its changes in `changes`, with a numeric mode; v14 in `system.changes`, with a type.
			const key = 'genesys.pool.combat.self.';
			await added.update(
				game.release.generation === 13
					? { changes: [{ key, value: 'D', mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM }] }
					: { 'system.changes': [{ key, value: 'D', type: 'custom' }] },
			);
		});
		await setSetting('dicePoolAutoApplyModifications', true);
		const activeRows = (state: PromptState) => state.modifications.filter(({ name }) => /Accurate|Defensive/.test(name));
		const shieldAttack = await opened(gm, attack('Shield'));
		const swordAttack = await opened(gm, attack('Sword'));
		await setSetting('dicePoolAutoApplyModifications', false);
		e2e.expect(
			"#694 Q4 with auto-apply on, an active quality's Pool Modification starts off, a passive one's on",
			{ shield: activeRows(shieldAttack), sword: activeRows(swordAttack) },
			{
				shield: [{ name: 'From Self: E2E Defensive (E2E Shield)', enabled: false, mods: 'D+' }],
				sword: [{ name: 'From Self: E2E Accurate (E2E Sword)', enabled: true, mods: 'B+ B+' }],
			},
		);

		await e2e.step("#694 Q5 GM removes Accurate from Ada's Sword", () =>
			update({ actor: 'Ada', item: 'Sword' }, { 'system.qualities': [] }),
		);
		e2e.expect(
			"#694 Q5 removing a quality removes its effects, and its Boosts from the weapon's attacks",
			{ weapon: await weaponState('Sword'), sword: accurateRows(await opened(gm, attack('Sword'))) },
			{ weapon: { qualities: [], effects: [] }, sword: [] },
		);

		await e2e.step("#694 Q6 GM gives Ada's Shield a second profile and drops Defensive on it too", async () => {
			await update({ actor: 'Ada', item: 'Shield' }, { 'system.extraProfiles': [{ name: 'E2E Bash' }] });
			await gm.evaluate(async () => {
				const item = game.actors.getName('E2E Ada').items.getName('E2E Shield');
				const block = '[data-weapon-profile="1"]';
				const root = await window.e2e.render(item.sheet, (root) => root.querySelector(block));
				window.e2e.drop(root.querySelector(block)!, { type: 'Item', uuid: game.items.getName('E2E Defensive').uuid });
				await window.e2e.settle();
			});
		});
		const bash = await gm.evaluate(() =>
			game.actors
				.getName('E2E Ada')
				.items.getName('E2E Shield')
				.system.extraProfiles[0].qualities.map((quality: { name: string; rating: number }) => `${quality.name} ${quality.rating}`),
		);
		e2e.expect(
			'#694 Q6 Defensive 1 on both profiles of the Shield counts once: the melee defense stays 1',
			{ bash, defense: await meleeDefense() },
			{ bash: ['E2E Defensive 1'], defense: 1 },
		);
		await e2e.step('quality effects end');
	});

	await part('attachments', async () => {
		// The world's attachments: a scope adding 1 damage, with a modification option adding a Boost to the weapon's attacks,
		// off until installed; plating adding 1 soak, which takes 2 Hard Points.
		await gm.evaluate(async () => {
			const { ADD, CUSTOM } = CONST.ACTIVE_EFFECT_MODES;
			await Item.createDocuments([
				{
					name: 'E2E Scope',
					type: 'attachment',
					system: { hardPointsRequired: 1 },
					effects: [
						{ name: 'E2E Scope', changes: [{ key: 'genesys.item.baseDamage', value: '1', mode: ADD }] },
						{
							name: 'E2E Scope Boost',
							disabled: true,
							changes: [{ key: 'genesys.pool.combat.self.', value: 'B', mode: CUSTOM }],
						},
					],
				},
				{
					name: 'E2E Plating',
					type: 'attachment',
					system: { hardPointsRequired: 2 },
					effects: [{ name: 'E2E Plating', changes: [{ key: 'genesys.item.soak', value: '1', mode: ADD }] }],
				},
			]);
			await game.actors.getName('E2E Ada').createEmbeddedDocuments('Item', [
				{
					name: 'E2E Rifle',
					type: 'weapon',
					system: {
						skills: ['Melee'],
						range: 'engaged',
						state: 'equipped',
						baseDamage: 5,
						critical: 3,
						encumbrance: 2,
						extraProfiles: [{ name: 'E2E Butt', baseDamage: 2, critical: 4 }],
					},
				},
				{ name: 'E2E Coat', type: 'armor', system: { state: 'equipped', soak: 1, encumbrance: 1 } },
			]);
		});
		// Drops a world attachment on the sheet of one of Ada's items.
		const dropAttachment = (attachment: string, target: string) => () =>
			gm.evaluate(
				async (args) => {
					const owned = game.actors.getName('E2E Ada').items.getName(`E2E ${args.target}`);
					const root = await window.e2e.render(owned.sheet, (root) => root.querySelector('.window-content'));
					window.e2e.drop(root.querySelector('.window-content')!, {
						type: 'Item',
						uuid: game.items.getName(`E2E ${args.attachment}`).uuid,
					});
					await window.e2e.settle();
				},
				{ attachment, target },
			);
		// The Rifle: its attachments, its effects with whether each is tagged with one of them and disabled, its damage and
		// Critical rating on each profile as prepared and as stored, and what its sheet shows of them.
		const rifleState = () =>
			gm.evaluate(() => {
				const rifle = game.actors.getName('E2E Ada').items.getName('E2E Rifle');
				const ids = rifle.system.attachments.map((attachment: { id: string }) => attachment.id);
				const root = window.e2e.htmlOf(rifle.sheet);
				return {
					attachments: rifle.system.attachments.map(
						(attachment: { name: string; hardPointsRequired: number }) => `${attachment.name} ${attachment.hardPointsRequired}`,
					),
					// By name: v13 doesn't keep the effects in the order they were created.
					effects: rifle.effects
						.map((effect: { name: string; disabled: boolean; flags: { genesys?: { attachment?: string } } }) => ({
							name: effect.name,
							tagged: ids.includes(effect.flags.genesys?.attachment),
							disabled: effect.disabled,
						}))
						.sort((left: { name: string }, right: { name: string }) => left.name.localeCompare(right.name, 'en')),
					prepared: [rifle.system, ...rifle.system.extraProfiles].map(
						(profile: { baseDamage: number; critical: number }) => `${profile.baseDamage}/${profile.critical}`,
					),
					stored: [rifle._source.system, ...rifle._source.system.extraProfiles].map(
						(profile: { baseDamage: number; critical: number }) => `${profile.baseDamage}/${profile.critical}`,
					),
					sheet: root
						? {
								damage: root.querySelector<HTMLInputElement>('input[name="system.baseDamage"]')?.value ?? null,
								effective: [...root.querySelectorAll('.effective-stats')].map((stats) => stats.textContent?.trim()),
							}
						: null,
				};
			});
		const scopeRows = (state: PromptState) => state.modifications.filter(({ name }) => name.includes('Scope'));

		await e2e.step("#702 A1 GM drops the Scope on Ada's Rifle", dropAttachment('Scope', 'Rifle'));
		e2e.expect(
			"#702 A1 the Scope's effects become the Rifle's: 1 damage on every profile, the stored damage and the sheet's field unchanged, and its modification off",
			await rifleState(),
			{
				attachments: ['E2E Scope 1'],
				effects: [
					{ name: 'E2E Scope', tagged: true, disabled: false },
					{ name: 'E2E Scope Boost', tagged: true, disabled: true },
				],
				prepared: ['6/3', '3/4'],
				stored: ['5/3', '2/4'],
				sheet: { damage: '5', effective: ['Damage 6', 'Damage 3'] },
			},
		);

		await e2e.step("#702 A2 GM types a price on the Rifle's sheet and renames its second profile", () =>
			gm.evaluate(async () => {
				const { render, settle } = window.e2e;
				const rifle = game.actors.getName('E2E Ada').items.getName('E2E Rifle');
				const root = await render(rifle.sheet, (root) => root.querySelector('input[name="system.price"]'));
				const price = root.querySelector<HTMLInputElement>('input[name="system.price"]')!;
				price.value = '300';
				price.dispatchEvent(new Event('change', { bubbles: true }));
				await settle();
				const name = root.querySelector<HTMLInputElement>('[data-weapon-profile="1"] .profile-name')!;
				name.value = 'E2E Stock';
				name.dispatchEvent(new Event('change', { bubbles: true }));
				await settle();
			}),
		);
		e2e.expect("#702 A2 editing the Rifle's sheet stores none of the damage its attachment adds", (await rifleState()).stored, [
			'5/3',
			'2/4',
		]);

		const before = scopeRows(await opened(gm, attack('Rifle')));
		await e2e.step("#702 A3 GM installs the Scope's modification, enabling its effect on the Rifle", () =>
			gm.evaluate(() =>
				game.actors.getName('E2E Ada').items.getName('E2E Rifle').effects.getName('E2E Scope Boost').update({ disabled: false }),
			),
		);
		e2e.expect(
			"#702 A3 the installed modification adds its Boost to the Rifle's attacks, and none to the Pistol's",
			{ before, rifle: scopeRows(await opened(gm, attack('Rifle'))), pistol: scopeRows(await opened(gm, attack('Pistol'))) },
			{ before: [], rifle: [{ name: 'From Self: E2E Scope Boost (E2E Rifle)', enabled: false, mods: 'B+' }], pistol: [] },
		);

		const soak = () => gm.evaluate(() => game.actors.getName('E2E Ada').system.totalSoak);
		const unplated = await soak();
		await e2e.step(
			"#702 A4 GM drops the Plating, which takes 2 Hard Points, on Ada's Coat, which has 1",
			dropAttachment('Plating', 'Coat'),
		);
		const warning = await gm.evaluate(
			() =>
				window.e2e
					.htmlOf(game.actors.getName('E2E Ada').items.getName('E2E Coat').sheet)
					?.querySelector('.over-hard-points')
					?.textContent?.trim() ?? null,
		);
		e2e.expect(
			"#702 A4 the Plating adds 1 to the Coat's soak, and so to Ada's, and the Coat's sheet warns that its attachments take more Hard Points than it has",
			{ added: (await soak()) - unplated, warning },
			{ added: 1, warning: '2 Hard Points taken, out of 1!' },
		);

		await e2e.step("#702 A5 GM removes the Scope from Ada's Rifle", () =>
			update({ actor: 'Ada', item: 'Rifle' }, { 'system.attachments': [] }),
		);
		const removed = await rifleState();
		e2e.expect(
			"#702 A5 removing an attachment removes its effects: the Rifle's damage and attacks are as before",
			{ effects: removed.effects, prepared: removed.prepared, rifle: scopeRows(await opened(gm, attack('Rifle'))) },
			{ effects: [], prepared: ['5/3', '2/4'], rifle: [] },
		);
		await e2e.step('attachments end');
	});

	// S: casting a spell from the Magic tab, with its magic skill, at its difficulty raised by the Additional Effects
	// checked in the Dice Prompt, never beyond Formidable, and the 2 strain it costs (§#705, CRB pp. 210–217).
	await part('spellCasting', async () => {
		await gm.evaluate(async () => {
			const effect = (id: string, name: string, difficulty: number, startsChecked: boolean) => ({
				id,
				name,
				difficulty,
				startsChecked,
				qualities: [],
				critical: null,
				doublesDamageCharacteristic: false,
			});
			// Curse, at Average, with Enervate (+1, checked by default), Additional Target (+2) and Range (+1) (CRB p. 217).
			const curse = {
				name: 'E2E Curse',
				type: 'spell',
				system: {
					action: 'curse',
					difficulty: 2,
					skills: ['Arcana', 'Divine'],
					additionalEffects: [
						effect('enervate', 'Enervate', 1, true),
						effect('target', 'Additional Target', 2, false),
						effect('range', 'Range', 1, false),
					],
				},
			};
			const arcana = (rank: number) => ({ name: 'Arcana', type: 'skill', system: { characteristic: 'intellect', rank } });
			await Actor.createDocuments([
				{
					name: 'E2E Mage',
					type: 'character',
					system: { characteristics: { intellect: 3 }, strain: { value: 9, max: 10 } },
					items: [arcana(2), curse],
				},
				{ name: 'E2E Novice', type: 'character', items: [arcana(0), curse] },
			]);
		});
		const cast = (actor: string) => click(gm, { actor }, '.tab-magic .spell .name button|E2E Curse');
		const effects = () => gm.evaluate(() => window.dicePromptE2E.promptSpellEffects());
		const check = (name: string) => gm.evaluate((name) => window.dicePromptE2E.promptCheckEffect(name), name);

		const opening = await opened(gm, cast('Mage'));
		e2e.expect(
			"#705 S1 the Mage's Curse opens the Dice Prompt on Arcana, at Hard: Average and Enervate, checked by default",
			{ skill: opening.skill, spellSkills: opening.skills?.['Spell Skills'], ...(await effects()) },
			{
				skill: 'Arcana (Int)',
				spellSkills: ['Arcana (Int)', 'Divine (Will)'],
				effects: [
					{ name: 'Enervate', adds: '+D', checked: true, disabled: false, why: '' },
					{ name: 'Additional Target', adds: '+DD', checked: false, disabled: false, why: '' },
					{ name: 'Range', adds: '+D', checked: false, disabled: false, why: '' },
				],
				difficulty: 'Difficulty: Hard',
				pool: 'PPA|DDD',
			},
		);

		const formidable = await check('Additional Target');
		e2e.expect(
			"#705 S2 checking Additional Target takes the Curse to Formidable, and Range, which would take it beyond, can't be checked",
			{ difficulty: formidable.difficulty, range: formidable.effects[2] },
			{
				difficulty: 'Difficulty: Formidable',
				range: { name: 'Range', adds: '+D', checked: false, disabled: true, why: 'Would take the difficulty beyond Formidable.' },
			},
		);

		const rolled = await roll();
		const card = await gm.evaluate(() => window.dicePromptE2E.lastCard());
		e2e.expect(
			'#705 S3 the card names the Curse and its checked effects, and the Mage suffers 2 strain, past their threshold',
			{
				description: rolled.description,
				labels: card.labels,
				effects: card.spellEffects,
				strain: card.summaries.at(-1),
				health: await health('Mage'),
				incapacitated: await gm.evaluate(() => game.actors.getName('E2E Mage').statuses.has('incapacitated')),
			},
			{
				description: 'Casting <strong>E2E Curse</strong> using <strong>Arcana (Int<i class="fas fa-star hide-it"></i>)</strong>!',
				labels: ['Roll Results', 'Summary', 'Additional Effects', 'Dice'],
				effects: ['Enervate', 'Additional Target'],
				strain: 'Strain suffered by the caster 2',
				health: { wounds: 0, strain: 11 },
				incapacitated: true,
			},
		);

		e2e.expect(
			"#705 S4 the Novice, without a rank in the Curse's skills, is refused, and told why",
			await noPrompt(gm, cast('Novice')),
			{ prompts: 0, notifications: ['warning: E2E Curse needs a rank in one of its skills to be cast: Arcana, Divine.'] },
		);
		await opened(gm, cast('Mage'));
		await gm.evaluate(() => window.dicePromptE2E.setPromptDifficulty([5]));
		const raised = (await effects()).difficulty;
		const checkedAtFormidable = (await check('Additional Target')).difficulty;
		const uncheckedAtFormidable = (await check('Additional Target')).difficulty;
		await gm.evaluate(() => window.dicePromptE2E.closePrompts());
		e2e.expect(
			'#728 S5 a Curse raised by hand to Formidable stays Formidable when Additional Target is checked, then unchecked',
			{ raised, checkedAtFormidable, uncheckedAtFormidable },
			{
				raised: 'Difficulty: Formidable',
				checkedAtFormidable: 'Difficulty: Formidable',
				uncheckedAtFormidable: 'Difficulty: Formidable',
			},
		);
		await e2e.step('spellCasting end');
	});

	// MA: a magic attack, an attack spell whose card shows its damage, its effects' qualities and the Critical Injury it
	// inflicts on a Triumph only, as it has no Critical rating (§#706, CRB p. 215).
	await part('magicAttack', async () => {
		await gm.evaluate(installCriticalInjuryHelpers);
		await gm.evaluate(async () => {
			const skill = (name: string, rank: number) => ({ name, type: 'skill', system: { characteristic: 'intellect', rank } });
			// Fireball, an Easy attack, with Fire (+1, checked by default), whose Burn counts the caster's ranks in Knowledge
			// (CRB p. 215).
			const fire = {
				id: 'fire',
				name: 'Fire',
				difficulty: 1,
				startsChecked: true,
				qualities: [
					{
						name: 'Burn',
						description: '',
						activation: 'passive',
						advantageCost: 0,
						ratingSource: 'skillRanks',
						rating: 1,
						ratingSkill: 'Knowledge',
					},
				],
				critical: null,
				doublesDamageCharacteristic: false,
			};
			await Actor.createDocuments([
				{
					name: 'E2E Mage',
					type: 'character',
					system: { characteristics: { intellect: 3 } },
					items: [
						skill('Arcana', 2),
						skill('Knowledge', 2),
						{
							name: 'E2E Fireball',
							type: 'spell',
							system: { action: 'attack', difficulty: 1, isAttack: true, skills: ['Arcana'], additionalEffects: [fire] },
						},
					],
				},
			]);
		});
		const cast = click(gm, { actor: 'Mage' }, '.tab-magic .spell .name button|E2E Fireball');
		const card = async () => {
			const { labels, summaries, qualities, spellEffects } = await gm.evaluate(() => window.dicePromptE2E.lastCard());
			const critical = await gm.evaluate(() => window.criticalInjuryE2E.attackCard());
			return { labels, summaries, qualities: qualities.map(({ text }) => text), spellEffects, critical };
		};

		const opening = await opened(gm, cast);
		e2e.expect('#706 MA1 the Fireball opens Arcana at Average: Easy and Fire, checked by default', opening.pool, 'PPA|DD');

		// Proficiency on two Successes, then an Advantage; Ability on a Success and an Advantage; Difficulty on blank faces.
		await gm.fixDice([
			{ face: 4, faces: 12 },
			{ face: 6, faces: 12 },
			{ face: 7, faces: 8 },
			{ face: 1, faces: 8 },
			{ face: 1, faces: 8 },
		]);
		const hit = await roll();
		e2e.expect(
			"#706 MA2 the card shows the damage as Intellect 3 plus the Successes, Burn rated by the Mage's 2 ranks in Knowledge, and no Critical Injury for Advantage",
			{ description: hit.description, ...(await card()) },
			{
				description:
					'Casting <strong>E2E Fireball</strong> using <strong>Arcana (Int<i class="fas fa-star hide-it"></i>)</strong>!',
				labels: ['Roll Results', 'Attack Results', 'Summary', 'Attack Qualities', 'Additional Effects', 'Dice'],
				summaries: ['Damage (Int + 0) 6 Critical 0', 's Successes 3 a Advantage 2', 'Strain suffered by the caster 2'],
				qualities: ['Burn 2'],
				spellEffects: ['Fire'],
				critical: { triggers: null, button: false },
			},
		);

		await opened(gm, cast);
		// Proficiency on a Triumph, then an Advantage; Ability on a Success and an Advantage; Difficulty on blank faces.
		await gm.fixDice([
			{ face: 12, faces: 12 },
			{ face: 6, faces: 12 },
			{ face: 7, faces: 8 },
			{ face: 1, faces: 8 },
			{ face: 1, faces: 8 },
		]);
		await roll();
		e2e.expect('#706 MA3 a Triumph offers the Critical Injury roll', (await card()).critical, {
			triggers: 'Critical Injury Triggers 1',
			button: true,
		});
		await e2e.step('magicAttack end');
	});

	// HS: a Heal spell, cast in place of a Medicine check on a patient picked as Medicine's is, at the spell's difficulty,
	// whose card heals the patient by its results (§#707, CRB p. 217).
	await part('healSpell', async () => {
		await gm.evaluate(async () => {
			await Actor.createDocuments([
				{
					name: 'E2E Priest',
					type: 'character',
					system: { characteristics: { willpower: 2 } },
					items: [
						{ name: 'Divine', type: 'skill', system: { characteristic: 'willpower', rank: 1 } },
						{ name: 'E2E Heal', type: 'spell', system: { action: 'heal', difficulty: 1, skills: ['Divine', 'Primal'] } },
					],
				},
			]);
		});
		const cast = click(gm, { actor: 'Priest' }, '.tab-magic .spell .name button|E2E Heal');
		const patientPrompt = (pick: string | null) => gm.evaluate((pick) => window.dicePromptE2E.patientPrompt(pick), pick);
		// Mark, with a token, has suffered more than his wound threshold, where Medicine would open at Hard; Bo more than
		// half of it, where Medicine would open at Average.
		await update({ actor: 'Mark' }, { system: { wounds: { value: 13, max: 12 }, strain: { value: 4, max: 10 } } });
		await update({ actor: 'Bo' }, { system: { wounds: { value: 8, max: 12 }, strain: { value: 0, max: 10 } } });

		await target('Mark');
		const targeted = await opened(gm, cast);
		const patientPrompts = await gm.evaluate(() => window.e2e.apps('app-select-patient-prompt').length);
		e2e.expect(
			"#707 HS1 the Priest's Heal on their target Mark asks for no patient and opens Divine at Easy, whatever Mark's wounds",
			{ patientPrompts, skill: targeted.skill, pool: targeted.pool },
			{ patientPrompts: 0, skill: 'Divine (Will)', pool: 'PA|D' },
		);

		// Proficiency on two Successes, Ability on a Success and an Advantage; Difficulty on a blank face.
		await gm.fixDice([
			{ face: 4, faces: 12 },
			{ face: 7, faces: 8 },
			{ face: 1, faces: 8 },
		]);
		const rolled = await roll();
		const card = await gm.evaluate(() => window.dicePromptE2E.lastCard());
		await recoveryButton(gm, rolled.id, true);
		await target(null);
		e2e.expect(
			'#707 HS2 the card heals Mark a wound per Success and a strain per Advantage, and Apply heals him',
			{ results: rolled.results, labels: card.labels, summaries: card.summaries, health: await health('Mark') },
			{
				results: 's s s a',
				labels: ['Roll Results', 'Summary', 'Heals E2E Mark', 'Dice'],
				summaries: ['s Successes 3 a Advantage 1', 'Strain suffered by the caster 2', 'Wounds 3 Strain 1'],
				health: { wounds: 10, strain: 3 },
			},
		);

		let patients: string[] = [];
		const picked = await opened(gm, async () => {
			await cast();
			patients = await patientPrompt('Bo');
		});
		e2e.expect(
			'#707 HS3 without a target, the Priest picks Bo among the patients Medicine offers, and Heal opens at Easy',
			{ patients, pool: picked.pool },
			{ patients: ['Bo', 'Cy', 'Hero', 'Mark', 'Priest', 'Seeker'], pool: 'PA|D' },
		);

		e2e.expect(
			'#707 HS4 cancelling the pick opens no Dice Prompt',
			await noPrompt(gm, async () => {
				await cast();
				await patientPrompt(null);
			}),
			{ prompts: 0, notifications: [] },
		);
		await e2e.step('healSpell end');
	});

	e2e.expect('#414 A2 no compatibility warning about the roll modes v14 deprecated is logged', rollModeWarnings, []);
	await gm.evaluate((settings) => window.dicePromptE2E.restore(settings), { user: e2e.playerUser, settings: saved });
}
