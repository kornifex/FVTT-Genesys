import type { FoldToggle } from '../../page.ts';
import type { Client, ScenarioContext } from '../../scenario.ts';

/**
 * A document whose sheet holds what a step clicks or reads, named without its `E2E ` prefix: an actor, an item it
 * owns, a world item or a journal entry.
 */
export type Doc = { actor: string; item?: string } | { item: string } | { journal: string };

/**
 * The Dice Prompt as the user sees it.
 */
export type PromptState = {
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
export type MessageSummary = {
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
export type CardSummary = Pick<MessageSummary, 'results' | 'summaries'> & {
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
	/**
	 * Each effect: its label, the difficulty it adds, its checkbox, and why it is closed; an effect that can be added more
	 * than once has its count instead, the highest it may reach, and whether its + shows (§#761).
	 */
	effects: (
		| { name: string; adds: string; checked: boolean; disabled: boolean; why: string }
		| { name: string; adds: string; count: number; max: number; canIncrease: boolean; why: string }
	)[];
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

export type PromptDifficulty = {
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
export type PoolModificationsBox = {
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
	/**
	 * How the dice of the Pool Modification icons look, by the row they sit in: a Story Point spend, or a manual change
	 * (the Pool Modifications' rows). The glyph with its operator, its font and colour, and its operator's size.
	 */
	promptModificationLooks(): { row: 'spend' | 'manual'; modification: string; font: string; color: string; arrow: string }[];
	/** The Additional Effects of a spell's prompt, its difficulty's label and its pool. */
	promptSpellEffects(): PromptSpellEffects;
	/** Clicks an Additional Effect's checkbox, by its label. */
	promptCheckEffect(name: string): Promise<PromptSpellEffects>;
	/** Clicks the + or the − of the count of an Additional Effect that can be added more than once, by its name. */
	promptStepEffect(args: { name: string; direction: 1 | -1 }): Promise<PromptSpellEffects>;
	/**
	 * Clicks the prompt's roll button, then waits for the check's message, which comes after those of the spends: the
	 * check's message, null when none was posted, the Story Point messages posted, and the prompts left open.
	 */
	promptRollSpending(): Promise<{ rolled: MessageSummary | null; storyPointMessages: number; prompts: number }>;
	lastMessage(): MessageSummary;
	/** The last message's speaker, without its `E2E ` prefix, and its text, for a message that shows no roll. */
	lastMessageText(): { speaker: string | null; text: string };
	lastCard(): CardSummary;
	/** The values of the last card's summary tables that span more than one line, once rendered in a column so wide. */
	lastCardBrokenValues(width: number): Promise<string[]>;
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
	/**
	 * Renders a message's card again in the chat log and shows it, then gives whether it shows the Apply button of a check
	 * that heals, and the text it shows once the healing was applied, null when it doesn't (§#723).
	 */
	recoveryCard(id: string): Promise<{ button: boolean; applied: string | null }>;
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
export function installDicePromptHelpers() {
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

		promptModificationLooks() {
			const root = htmlOf(thePrompt())!;
			const rows = { spend: '.story-point-spend', manual: '.pool-modifications-manual' } as const;
			return Object.entries(rows).flatMap(([row, selector]) =>
				[...root.querySelectorAll<HTMLElement>(`${selector} .pool-modification`)].map((icon) => {
					const { fontFamily, color, webkitTextStroke } = getComputedStyle(icon);
					const arrow = getComputedStyle(icon.querySelector('i')!);
					return {
						row: row as keyof typeof rows,
						modification: poolModification(icon),
						font: fontFamily,
						color: `${color}, outline ${webkitTextStroke}`,
						// Its size as a share of the glyph's, which the two rows don't set to the same size.
						arrow: `${Math.round((parseFloat(arrow.fontSize) / parseFloat(getComputedStyle(icon).fontSize)) * 100) / 100} of the glyph, ${arrow.color}`,
					};
				}),
			);
		},

		promptSpellEffects() {
			const root = htmlOf(thePrompt())!;
			return {
				effects: [...root.querySelectorAll('.spell-effect')].map((row) => {
					const adds = text(row.querySelector('.glyph'));
					const why = text(row.querySelector('.why'));
					const counter = row.querySelector('.effect-count');
					if (counter) {
						const value = counter.querySelector('.value')!;
						return {
							name: text(row.querySelector('.name')),
							adds,
							count: Number(value.getAttribute('aria-valuenow')),
							max: Number(value.getAttribute('aria-valuemax')),
							canIncrease: counter.querySelector('.increase') !== null,
							why,
						};
					}
					const input = row.querySelector('input')!;
					return { name: text(row.querySelector('label')), adds, checked: input.checked, disabled: input.disabled, why };
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

		async promptStepEffect({ name, direction }) {
			const row = [...htmlOf(thePrompt())!.querySelectorAll('.spell-effect')].find(
				(candidate) => text(candidate.querySelector('.name')) === name,
			);
			if (!row) throw new Error(`No Additional Effect ${name} with a count`);
			const step = row.querySelector<HTMLElement>(`.effect-count .${direction === 1 ? 'increase' : 'decrease'}`);
			if (!step) throw new Error(`The count of ${name} can't go ${direction === 1 ? 'up' : 'down'}`);
			step.click();
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

		async recoveryCard(id) {
			await ui.chat.updateMessage(game.messages.get(id));
			await settle();
			const state = await window.dicePromptE2E.showMessage(id);
			const card = document.querySelector('[data-e2e="glyph-message"]')!;
			const applied = card.querySelector('.recovery-applied');
			const result = { button: !!card.querySelector('button.apply-recovery'), applied: applied && text(applied) };
			window.dicePromptE2E.restoreSidebar(state);
			return result;
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

		async lastCardBrokenValues(width) {
			// A rendering of its own, since the sidebar's may sit on another tab, where nothing is laid out.
			const column = document.createElement('ol');
			column.style.cssText = `position: fixed; top: 0; left: 0; width: ${width}px;`;
			column.append(await game.messages.contents.at(-1).renderHTML());
			document.body.append(column);
			try {
				const lineCount = (value: Element) => {
					const range = document.createRange();
					range.selectNodeContents(value);
					return new Set([...range.getClientRects()].map(({ top }) => Math.round(top))).size;
				};
				return [...column.querySelectorAll('.summary-table .count')].filter((value) => lineCount(value) > 1).map(text);
			} finally {
				column.remove();
			}
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

export const unranked = (except: string[]) =>
	COMPENDIUM_SKILLS.filter(([name]) => !except.includes(name))
		.map(([name, abbreviation]) => `${name} (${abbreviation})`)
		.sort((left, right) => left.localeCompare(right, 'en'));

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
export function installCriticalInjuryHelpers() {
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

/**
 * The wounds of the scene's Rival, as the GM reads them. Its token is unlinked: its wounds live on the token's own
 * actor, not on the world's.
 */
export function rivalWounds(gm: Client) {
	return gm.evaluate(() => {
		const token = canvas.scene.tokens.find((candidate: { name: string }) => candidate.name === 'E2E Rival');
		return (token.actor.system as { wounds: { value: number } }).wounds.value;
	});
}

/** Set the wounds of the scene's Rival, out of 12, on its token's own actor. */
export async function setRivalWounds(gm: Client, value: number) {
	await gm.evaluate(async (wounds) => {
		const token = canvas.scene.tokens.find((candidate: { name: string }) => candidate.name === 'E2E Rival');
		await token.actor.update({ 'system.wounds': { value: wounds, max: 12 } });
	}, value);
}

/** What the parts of the scenario share: its clients and the helpers `run` builds on them. */
export type DicePromptContext = {
	e2e: ScenarioContext;
	gm: Client;
	player: Client;
	setUp: () => Promise<void>;
	opened: (client: Client, action: () => Promise<unknown>) => Promise<PromptState>;
	noPrompt: (client: Client, action: () => Promise<unknown>) => Promise<{ prompts: number; notifications: string[] }>;
	click: (client: Client, doc: Doc, path: string) => () => Promise<void>;
	select: (name: 'characteristic' | 'skill', option: string) => Promise<PromptState>;
	toggle: (name: string) => Promise<PromptState>;
	roll: () => Promise<MessageSummary>;
	setSetting: (key: string, value: unknown) => Promise<void>;
	update: (doc: Doc, data: object) => Promise<void>;
	target: (name: string | null) => Promise<void>;
	control: (client: Client, names: string[]) => Promise<void>;
	recoveryButton: (client: Client, id: string, click?: boolean) => Promise<boolean>;
	recoveryCard: (client: Client, id: string) => Promise<{ button: boolean; applied: string | null }>;
	health: (name: string) => Promise<{ wounds: number; strain: number | null }>;
	ada: { actor: string };
	skillRoll: (skill: string) => () => Promise<void>;
	characteristicRoll: (index: number, doc?: Doc) => () => Promise<void>;
	attack: (weapon: string) => () => Promise<void>;
	rows: (state: PromptState) => PromptState['modifications'];
	named: (state: PromptState, prefix: string) => PromptState['modifications'];
	journal: { journal: string };
	skiff: { actor: string };
	combatWeapons: (actor: string) => Promise<{ name: string; link: boolean; skill: string; choices: string[] | null }[]>;
	linkPrompt: (
		client: Client,
		doc: Doc | { message: string },
		skill: string,
		difficulty?: string,
	) => Promise<{ actor: string | null; skill: string | null; pool: string }>;
	seekerCheck: (client: Client) => Promise<PromptState>;
};
