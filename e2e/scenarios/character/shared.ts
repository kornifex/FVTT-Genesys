import type { Chevron, ConfirmDialog, DescriptionBox } from '../../page.ts';

export type Characteristic = 'brawn' | 'agility' | 'intellect' | 'cunning' | 'willpower' | 'presence';

/** A skill as the character's Skills tab shows it, or null when the character doesn't own it. */
type SkillState = { rank: number; career: boolean; star: boolean; canBuy: boolean } | null;

type CharacterHelpers = {
	/** Deletes what an earlier run left, and creates the world items the scenario drops. */
	setUp(): Promise<void>;
	/** Creates an actor named `E2E <name>`; a character gets every Skills Compendium skill. */
	create(name: string, type?: string, items?: object[]): Promise<void>;
	createItems(actor: string, items: object[]): Promise<void>;
	open(actor: string): Promise<void>;
	reopen(actor: string): Promise<void>;
	close(actor: string): Promise<void>;
	/** Drops an item on an actor's sheet, as Foundry's drag and drop does. */
	drop(actor: string, uuid: string): void;
	/**
	 * Drops the world Archetype `E2E <archetype>` on the character, and waits until the character holds it alone and its
	 * Starting XP, the character's update coming last; or removes the character's from its menu, answers the dialog
	 * confirming it, and on Yes waits until the Archetype item is deleted, which comes last. A removal can take longer than
	 * a step's wait on v13. The removal gives the dialog read.
	 */
	applyArchetype(actor: string, archetype: string): Promise<void>;
	removeArchetype(actor: string, answer?: 'yes' | 'no'): Promise<ConfirmDialog | null>;
	/** Deletes the character's Career from its menu, answers the dialog confirming it, and gives the dialog read. */
	removeCareer(actor: string, answer?: 'yes' | 'no'): Promise<ConfirmDialog | null>;
	/** The uuid of the world item `E2E <name>`. */
	worldItem(name: string): string;
	/** The uuid of a Skills Compendium skill. */
	compendiumSkill(name: string): string;
	/** Opens the context menu of a characteristic, skill, Archetype or Career, and clicks the entry of that label if given. */
	menu(actor: string, target: MenuTarget, label?: string): Promise<string[]>;
	raise(actor: string, characteristic: Characteristic): boolean;
	buySkill(actor: string, skill: string): boolean;
	upgradeTalent(actor: string, talent: string): boolean;
	/**
	 * Runs Undo the entry from the ⋮ menu of the last Experience Journal entry whose summary starts so, its trash before
	 * #577; false when the journal holds none, as when a build that doesn't ask has already undone it.
	 */
	undo(actor: string, entry: string): Promise<boolean>;
	award(actor: string, amount: number, reason: string): Promise<void>;
	/** Waits for the Career's Free Rank prompt to open. */
	careerPromptOpen(): Promise<void>;
	/**
	 * Waits for the Career's Free Rank prompt, picks those skills and confirms, or closes it, then waits until the
	 * character's skills are updated; the skills it offered.
	 */
	careerPrompt(actor: string, picks: string[] | null): Promise<string[]>;
	/**
	 * Waits for the Career's Free Rank prompt, picks those skills and confirms, without waiting for the character's
	 * update, which a refused Career never makes; the skills it offered.
	 */
	pickFreeRanks(picks: string[]): Promise<string[]>;
	/** Clicks the name of a Critical Injury or Hit, which heals or repairs it. */
	rollInjury(actor: string, name: string): void;
	/** Runs the Delete of a Critical Injury or Hit, from its ⋮ menu since #577, its trash icon before. */
	trashInjury(actor: string, name: string): Promise<void>;
	crewPrompt(member: string): Promise<string[]>;
	/** Reads the open Dice Prompt, then closes it. */
	dicePrompt(): Promise<{ actor: string | null; skill: string | null; difficulty: string; difficultyDice: number }>;
	/** The notifications since the last call. */
	notifications(): string[];
	format(key: string, data?: Record<string, unknown>): string;
	startCounting(actor: string): void;
	stopCounting(): Record<string, number>;

	journal(actor: string): string[];
	xp(actor: string): number;
	characteristic(actor: string, characteristic: Characteristic): { base: number; shown: number; sheet: string; canRaise: boolean };
	thresholds(actor: string): { wounds: number; strain: number };
	skills(actor: string, names: string[]): Record<string, SkillState>;
	talent(
		actor: string,
		name: string,
	): { rank: number; tier: number; row: string; rowTier: string; description: string; canUpgrade: boolean } | null;
	/** The actor's items but its skills, as `type:name`, sorted. */
	items(actor: string): string[];
	/** The actor's non-skill items, as `type:name:flag`, the flag being `own` when it holds the actor's id. */
	grants(actor: string): string[];
	/** The Talents tab's rows of the abilities of that name: whether each was added by hand, and can be deleted. */
	abilityRows(actor: string, name: string): Promise<{ handMade: boolean; canDelete: boolean }[]>;
	/**
	 * The Talents tab's lists of abilities and of talents, in order: a category header as `[Active]`, an activation detail
	 * header as `[[maneuver]]`, a row as its name.
	 */
	talentsTab(actor: string): { abilities: string[]; talents: string[] };
	/** Runs the Delete of a row of the Talents tab, from its ⋮ menu since #577, its trash icon before. */
	trashTalentRow(actor: string, name: string): Promise<void>;
	/**
	 * Clicks the chevron of a row of the Combat or Talents tab, which opens or closes its description; false when the row
	 * shows none.
	 */
	clickChevron(actor: string, row: DescriptionRow): boolean;
	/** The chevron of a row of the Combat or Talents tab, or null when the row shows none. */
	chevron(actor: string, row: DescriptionRow): Chevron | null;
	/** Puts the focus on the chevron of a row, as Tab would. */
	focusChevron(actor: string, row: DescriptionRow): void;
	/**
	 * Where the focus is, from a row's point of view: on its `chevron`, on a `link` of its fold, on another element of the
	 * `row`, or `elsewhere`.
	 */
	focusInRow(actor: string, row: DescriptionRow): 'chevron' | 'link' | 'row' | 'elsewhere';
	/**
	 * What the name of a Talents tab row shows, then the cell after it, in order: its name and rank as text, `chevron` for
	 * its chevron and `upgrade` for its rank upgrade arrow.
	 */
	talentNameParts(actor: string, talent: string): string[];
	/** Clicks the name of a row of the Combat or Talents tab. */
	clickName(actor: string, row: DescriptionRow): void;
	/**
	 * Closes the sheet of the actor's item `E2E <item>` and the Dice Prompts, and gives which were open: a Combat tab row's
	 * name opens one or the other.
	 */
	closeOpened(actor: string, item: string): Promise<{ sheet: boolean; dicePrompt: boolean }>;
	/**
	 * The description of a row, as laid out: its height is given as `>cap` past `cap` px. Null when the row has none, as
	 * a weapon's row before #393.
	 */
	descriptionBox(actor: string, row: DescriptionRow, cap: number): DescriptionBox | null;
	/**
	 * Opens or closes a row's description by its chevron, and reads its fold halfway
	 * through, its transitions paused at 100ms; then finishes them (#516).
	 */
	foldHalfway(actor: string, row: DescriptionRow): Promise<FoldHalfway>;
	superCharacteristics(actor: string): { stored: string[]; stars: string[] };
	adversarySkills(actor: string): string[];
	/** The icon of a skill of the Skills tab or of an adversary's skills, as the user sees it; null when it opens nothing. */
	skillIcon(actor: string, target: SkillTarget): { tooltip: string; cursor: string } | null;
	/**
	 * Clicks the icon or the name of a skill of the Skills tab or of an adversary's skills, waits for the page to settle,
	 * then closes the skill's sheet and the Dice Prompts and gives which were open. `clicked` is false when the skill shows
	 * no icon that opens something.
	 */
	clickSkill(
		actor: string,
		target: SkillTarget,
		part: 'icon' | 'name',
	): Promise<{ clicked: boolean; sheet: boolean; dicePrompt: boolean }>;
	pyramid(actor: string): { summary: string[] | null; roundedTop: boolean };
	/**
	 * The top of the shown Talents tab's first block: the space between it and the top of the tab's content, in px, and
	 * whether both its top corners are rounded.
	 */
	talentsTop(actor: string): { gapAbove: number; roundedCorners: boolean };
	/** The dim and bright light radii of the token on the scene `E2E <actor>`, as prepared. */
	tokenLight(actor: string): { dim: number; bright: number };
	appliedEffects(actor: string): { effects: string[]; soak: number };
	severities(actor: string): Record<string, string>;
	socialSkills(actor: string): { categories: string[]; social: string[] };
	talentSheetTier(uuid: string): Promise<string>;
	typeTier(uuid: string, tier: number): Promise<string>;
	/** Writes a talent's tier straight to the database, past the client's cleaning, as a world saved before #174 holds it. */
	seedTier(target: { uuid: string }, tier: number): Promise<void>;
	/** A talent's tier as the database holds it. */
	storedTier(target: { uuid: string }): Promise<number | undefined>;
	loadedTalent(uuid: string): Promise<{ tier: number; source: number; invalid: boolean }>;
	pyramidTotals(actor: string): Record<string, number>;
	/**
	 * A character's weapons: the names of their Inventory tab rows, its Encumbrance value, and the Combat tab's rows with
	 * the Attack Skill each shows, `[skill]` for a select; and the Attack Skill each profile stores, `main` first.
	 */
	weaponRows(actor: string): Promise<{
		inventory: string[];
		encumbrance: number;
		combat: { name: string; skill: string }[];
		stored: Record<string, string[]>;
	}>;
	/** Picks an Attack Skill in the select of the Combat tab's row of that name; false when the row has none. */
	chooseAttackSkill(args: { actor: string; row: string; skill: string }): Promise<boolean>;
	createPack(): Promise<string>;
	deletePack(): Promise<void>;
};

/**
 * A row with an expandable description, by its item's name without its `E2E ` prefix, or a weapon's Combat tab row by
 * the name it shows without its prefix, `Dagger (Thrown)`.
 */
export type DescriptionRow = { talent: string } | { armor: string } | { injury: string } | { weapon: string };

/**
 * A description halfway through its fold (#516): the properties whose transitions run on it and its content; how far it
 * is open, `none`, `partway` or `whole`; and its last element's visibility, which Tab follows.
 */
export type FoldHalfway = { transitions: string[]; height: 'none' | 'partway' | 'whole'; lastVisibility: string };

/** A skill of a character's Skills tab, or of an adversary's skills, by its name. */
export type SkillTarget = { skill: string } | { adversarySkill: string };

type MenuTarget =
	| { characteristic: Characteristic }
	| { meta: 'archetype' | 'career' }
	| SkillTarget
	/** A weapon of an adversary's sheet, by its name. */
	| { adversaryWeapon: string };

declare global {
	interface Window {
		characterE2E: CharacterHelpers;
	}
}

// The keys of the Alternate Rules, House Rules and other settings the scenario sets, and puts back as they were.
export const SETTINGS = [
	'useSuperCharacteristics',
	'ignoreTalentPyramid',
	'talentTierVersions',
	'careerSkillRanks',
	'skillForInjuries',
	'skillForRepairingVehicleHits',
];

/**
 * Installs `window.characterE2E`. Playwright sends this function's source to the page, so it uses nothing from this module.
 */
export function installCharacterHelpers() {
	if (window.characterE2E) return;
	const { settle, waitFor, text, unprefixed, htmlOf, render, actor, apps, drop } = window.e2e;
	const ORDER = ['brawn', 'agility', 'intellect', 'cunning', 'willpower', 'presence'];
	const HAND_IMG = 'icons/svg/mystery-man.svg';
	const PACK = 'e2e-talents';
	const sheet = (name: string) => {
		const app = actor(name).sheet;
		if (!app.rendered) throw new Error(`The sheet of E2E ${name} is closed`);
		return app.element as HTMLElement;
	};
	const click = (element: Element | null | undefined, what: string) => {
		if (!element) throw new Error(`No ${what}`);
		(element as HTMLElement).click();
	};
	type App = {
		rendered: boolean;
		element: HTMLElement;
		close(): Promise<void>;
		actor?: { name: string };
		skillName?: string;
		difficulty?: string;
	};
	// A prompt is ready once it shows the element the scenario reads or clicks first.
	const findApp = async (cls: string, ready: string): Promise<App> => {
		const app = await waitFor(`${cls} to open`, () => apps(cls).find((candidate: App) => candidate.rendered), 5000);
		await render(app, (root) => root.querySelector(ready));
		return app;
	};
	const characteristicField = (name: string, characteristic: string) =>
		[...sheet(name).querySelectorAll('.characteristic-field')][ORDER.indexOf(characteristic)];
	const skillRow = (name: string, skill: string) =>
		[...sheet(name).querySelectorAll('.tab-skills .skill.row')].find(
			(row) => text(row.querySelector('.skill-name span')).replace(/ \([^()]*\)$/, '') === skill,
		);
	// A skill's row of the Skills tab, or its entry among an adversary's skills.
	const skillContainer = (name: string, target: SkillTarget) =>
		'skill' in target
			? skillRow(name, target.skill)
			: [...sheet(name).querySelectorAll('.adversary-items .skill')].find(
					(skill) => text(skill.querySelector('.skill-name span')) === target.adversarySkill,
				);
	const injuryRow = (name: string, injury: string) =>
		[...sheet(name).querySelectorAll('.critical-injuries .injury, .critical-hits .critical-hit')].find(
			(candidate) => text(candidate.querySelector('.name')) === `E2E ${injury}`,
		);
	// The lists of the Talents tab, its abilities' then its talents': each under its heading, or none for an empty one.
	const talentsContainers = (name: string) =>
		[...sheet(name).querySelectorAll('.tab-talents .block > h3')].map((heading) => {
			const list = heading.nextElementSibling;
			return list?.matches('.talents-container') ? list : undefined;
		});
	const talentRow = (name: string, talent: string) =>
		[...sheet(name).querySelectorAll('.tab-talents .talent')].find(
			(row) => text(row.querySelector('.name button')).replace(/ \d+$/, '') === talent,
		);
	const armorRow = (name: string, armor: string) =>
		[...sheet(name).querySelectorAll('.tab-combat .armors .armor:not(.columns)')].find(
			(candidate) => text(candidate.querySelector('.name')) === `E2E ${armor}`,
		);
	const weaponRow = (name: string, row: string) =>
		[...sheet(name).querySelectorAll('.tab-combat .weapons .weapon:not(.columns)')].find(
			(candidate) => unprefixed(text(candidate.querySelector('.name'))) === row,
		);
	const rowOf = (name: string, row: DescriptionRow) => {
		let found: Element | undefined;
		if ('talent' in row) found = talentRow(name, `E2E ${row.talent}`);
		else if ('armor' in row) found = armorRow(name, row.armor);
		else if ('injury' in row) found = injuryRow(name, row.injury);
		else found = weaponRow(name, row.weapon);
		if (!found) throw new Error(`No row for ${JSON.stringify(row)}`);
		return found;
	};
	// The fold of a row, which its chevron opens; before #579, on the build a comparison runs, the element its `active`
	// class opened.
	const description = (name: string, row: DescriptionRow) =>
		rowOf(name, row).querySelector(':scope > :is(.description-fold, .description, .desc-container)');
	const entryText = (entry: { type: string; amount: number; data?: Record<string, string | number | undefined> }) => {
		const data = entry.data ?? {};
		switch (entry.type) {
			case 'Characteristic':
				return `Characteristic ${entry.amount} ${data.characteristic} ${data.rank}`;
			case 'Skill':
				return `Skill ${entry.amount} ${data.name} ${data.rank}`;
			case 'NewTalent':
			case 'TalentRank':
				return `${entry.type} ${entry.amount} ${data.name} tier ${data.tier} rank ${data.rank}`;
			case 'Award':
				return `Award ${entry.amount} ${data.reason ?? ''}`.trim();
			default:
				return `${entry.type} ${entry.amount}`;
		}
	};
	// The raw documents the server sends back, as far as the scenario reads them.
	type RawResponse = { result: { system: { tier: number }; items: { _id: string; system: { tier: number } }[] }[] };
	const raw = (request: object) =>
		new Promise<RawResponse>((resolve, reject) =>
			game.socket.emit('modifyDocument', request, (response: RawResponse & { error?: { message: string } }) =>
				response.error ? reject(new Error(response.error.message)) : resolve(response),
			),
		);
	// Where an item sits in the database, from its uuid: a compendium's, an actor's, or the Items directory's.
	const location = (uuid: string) => {
		const parts = uuid.split('.');
		const id = parts.at(-1) as string;
		if (parts[0] === 'Compendium') return { id, operation: { pack: `${parts[1]}.${parts[2]}` } as Record<string, string> };
		if (parts[0] === 'Actor') return { id, operation: { parentUuid: `Actor.${parts[1]}` } as Record<string, string> };
		return { id, operation: {} as Record<string, string> };
	};
	// A compendium's item is loaded from the server; the others are in the client's collections.
	const load = async (uuid: string) => {
		const { id, operation } = location(uuid);
		return operation.pack ? game.packs.get(operation.pack).getDocument(id) : fromUuidSync(uuid);
	};

	const takeNotifications = window.e2e.recordNotifications();
	let counting: { counts: Record<string, number>; stop(): void } | undefined;

	const passive = { activation: { type: 'passive', detail: '' } };
	const archetype = (name: string, startingXP: number, grantedItems: object[] = []) => ({
		name: `E2E ${name}`,
		type: 'archetype',
		system: {
			characteristics: { brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
			woundThreshold: 10,
			strainThreshold: 10,
			startingXP,
			grantedItems,
		},
	});
	const career = (name: string, skills: string[]) => ({
		name: `E2E ${name}`,
		type: 'career',
		system: { careerSkills: skills.map((skill) => ({ name: skill, type: 'skill' })) },
	});
	const talent = (name: string, system: object, extra: object = {}) => ({
		name: `E2E ${name}`,
		type: 'talent',
		system: { ...passive, ...system },
		...extra,
	});

	window.characterE2E = {
		async setUp() {
			for (const app of ['app-dice-prompt', 'app-career-skill-prompt', 'app-award-xp-prompt'].flatMap(apps)) await app.close();
			for (const doc of game.actors.filter(window.e2e.isSetUp)) await doc.sheet?.close();
			await window.e2e.deleteSetUp('Actor', 'Item');
			await window.characterE2E.deletePack();
			await Item.createDocuments([
				archetype('Archetype', 100, [
					{ name: 'E2E Tough', type: 'ability', system: passive },
					{ name: 'E2E Gifted', type: 'talent', system: { ...passive, tier: 1 } },
					{ name: 'athletics', type: 'skill', system: {} },
				]),
				archetype('Plain Archetype', 1000),
				archetype('Small Archetype', 30),
				career('Career', ['ranged', 'COOL', 'stealth', 'PERCEPTION', 'charm']),
				career('Other Career', ['brawl', 'MELEE', 'athletics', 'Discipline']),
				career('Ranger', ['Ranged', 'Stealth', 'Survival', 'Athletics']),
				talent('Grit', { tier: 1, ranked: 'yes', description: '<p>Grit holds.</p>' }),
				talent('Quick', { tier: 1 }),
				talent('Swift', { tier: 1 }),
				talent('Bold', { tier: 2 }),
				talent(
					'Steady',
					{ tier: 1 },
					{ effects: [{ name: 'E2E Steady', transfer: true, changes: [{ key: 'system.soak', mode: 2, value: '1' }] }] },
				),
				talent('Old Talent', { tier: 5 }),
			]);
		},

		async create(name, type = 'character', items) {
			await Actor.create({ name: `E2E ${name}`, type, ...(items ? { items } : {}) });
		},

		async createItems(name, items) {
			await actor(name).createEmbeddedDocuments('Item', items);
		},

		async open(name) {
			await render(actor(name).sheet);
		},

		async reopen(name) {
			const app = actor(name).sheet;
			await app.close();
			await waitFor(`the sheet of E2E ${name} to close`, () => !app.rendered && !htmlOf(app)?.isConnected);
			await window.characterE2E.open(name);
		},

		async close(name) {
			await actor(name).sheet.close();
		},

		drop(name, uuid) {
			drop(sheet(name), { type: 'Item', uuid });
		},

		async applyArchetype(name, archetype) {
			const startingXP = game.items.getName(`E2E ${archetype}`).system.startingXP;
			window.characterE2E.drop(name, window.characterE2E.worldItem(archetype));
			await waitFor(
				`the Archetype of E2E ${name}`,
				() => {
					const archetypes = actor(name).items.filter((item: { type: string }) => item.type === 'archetype');
					const [first] = actor(name).system.experienceJournal.entries;
					return (
						archetypes.length === 1 &&
						archetypes[0].name === `E2E ${archetype}` &&
						first?.type === 'Starting' &&
						first.amount === startingXP
					);
				},
				20_000,
			);
		},

		async removeArchetype(name, answer = 'yes') {
			await window.characterE2E.menu(name, { meta: 'archetype' }, 'Genesys.Labels.Delete');
			const asked = await window.e2e.answerConfirm(answer);
			if (answer === 'yes') {
				await waitFor(
					`no Archetype on E2E ${name}`,
					() => !actor(name).items.some((item: { type: string }) => item.type === 'archetype'),
					20_000,
				);
			}
			return asked;
		},

		async removeCareer(name, answer = 'yes') {
			await window.characterE2E.menu(name, { meta: 'career' }, 'Genesys.Labels.Delete');
			return window.e2e.answerConfirm(answer);
		},

		worldItem(name) {
			return game.items.getName(`E2E ${name}`).uuid;
		},

		compendiumSkill(name) {
			return CONFIG.genesys.skills.find((skill: { name: string }) => skill.name === name).uuid;
		},

		async menu(name, target, label) {
			let container: Element | undefined | null;
			if ('characteristic' in target) container = characteristicField(name, target.characteristic)?.querySelector('.menu-container');
			else if ('meta' in target) container = sheet(name).querySelector(`.character-meta .${target.meta} .menu-container`);
			else if ('adversaryWeapon' in target)
				container = [...sheet(name).querySelectorAll('.adversary-items .weapon.menu-container')].find(
					(weapon) => text(weapon.querySelector('.weapon-attack')) === `E2E ${target.adversaryWeapon}`,
				);
			else container = skillContainer(name, target);
			if (!container) throw new Error(`No menu for ${JSON.stringify(target)}`);
			container.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			// A const keeps the check above for the closure below.
			const menu = container;
			const menuItems = () => [...menu.querySelectorAll(':scope > .context-menu .menu-item')];
			// A menu may offer no entry at all: only the page settling tells it apart from one still opening.
			if (label) await waitFor(`the menu of ${JSON.stringify(target)}`, () => menuItems().length);
			else await settle();
			const entries = menuItems();
			const labels = entries.map((entry) => text(entry.querySelector('.menu-label')));
			if (label) {
				click(
					entries.find((entry) => text(entry.querySelector('.menu-label')) === game.i18n.localize(label)),
					`menu entry ${label} in ${labels.join(', ')}`,
				);
			} else if (entries.length) {
				document.body.click();
			}
			return labels;
		},

		raise(name, characteristic) {
			const arrow = characteristicField(name, characteristic)?.querySelector('.characteristic-label .raise');
			(arrow as HTMLElement | null)?.click();
			return !!arrow;
		},

		buySkill(name, skill) {
			const arrow = skillRow(name, skill)?.querySelector('.skill-rank button');
			(arrow as HTMLElement | null)?.click();
			return !!arrow;
		},

		upgradeTalent(name, talent) {
			// In its own cell after the name since #579, in the name before.
			const arrow = talentRow(name, talent)?.querySelector('button:has(.fa-arrow-circle-up)');
			(arrow as HTMLElement | null)?.click();
			return !!arrow;
		},

		async undo(name, entry) {
			const entries = actor(name).system.experienceJournal.entries.map(entryText);
			const index = entries.findLastIndex((summary: string) => summary.startsWith(entry));
			if (index < 0) return false;
			const row = sheet(name).querySelectorAll('.xp-journal .entries .entry')[index];
			if (!row) throw new Error(`No row of ${entry}`);
			// Its ⋮ menu's Undo the entry, which was a trash icon before #577.
			if (window.e2e.hasRowMenu(row)) await window.e2e.rowMenu(row, 'fa-trash');
			else click(row.querySelector('button'), `trash of ${entry}`);
			return true;
		},

		async award(name, amount, reason) {
			click(sheet(name).querySelector('.xp-journal .columns button'), 'XP Award button');
			// Its first button is the Add button, in the prompt's footer or, before #581, on its own.
			const app = await findApp('app-award-xp-prompt', '.award-xp-prompt button');
			const fill = (selector: string, value: string) => {
				const field = app.element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
				if (!field) throw new Error(`No ${selector}`);
				field.value = value;
				field.dispatchEvent(new Event('input', { bubbles: true }));
			};
			fill('.award-xp-prompt .amount input', String(amount));
			fill('.award-xp-prompt .reason textarea', reason);
			await settle();
			click(app.element.querySelector('.award-xp-prompt button'), 'Add button');
		},

		async careerPromptOpen() {
			await findApp('app-career-skill-prompt', '.career-skill-prompt .select-skill');
		},

		async pickFreeRanks(picks) {
			const app = await findApp('app-career-skill-prompt', '.career-skill-prompt .select-skill');
			const buttons = [...app.element.querySelectorAll('.career-skill-prompt .select-skill')] as HTMLElement[];
			const skillName = (button: Element) => text(button.querySelector('span')).replace(/ \([^()]*\)$/, '');
			for (const pick of picks) {
				const button = buttons.find((candidate) => skillName(candidate) === pick);
				click(button, `skill ${pick} in the prompt`);
				await waitFor(`skill ${pick} picked in the prompt`, () => button?.classList.contains('selected'));
			}
			click(app.element.querySelector('.career-skill-prompt footer button'), 'Confirm button');
			await waitFor('the Free Rank prompt to close', () => !app.rendered);
			return buttons.map(skillName);
		},

		async careerPrompt(name, picks) {
			const app = await findApp('app-career-skill-prompt', '.career-skill-prompt .select-skill');
			const buttons = [...app.element.querySelectorAll('.career-skill-prompt .select-skill')] as HTMLElement[];
			const skillName = (button: Element) => text(button.querySelector('span')).replace(/ \([^()]*\)$/, '');
			const offered = buttons.map(skillName);
			const skill = (skillName: string) =>
				actor(name).items.find((item: { type: string; name: string }) => item.type === 'skill' && item.name === skillName);
			const ranks = Object.fromEntries(offered.map((offer) => [offer, skill(offer).system.rank as number]));
			// The Career's writes come after the prompt.
			const updated = () =>
				offered.every(
					(offer) => skill(offer).system.career && skill(offer).system.rank === ranks[offer] + (picks?.includes(offer) ? 1 : 0),
				);
			if (!picks) {
				await app.close();
				await waitFor(`the Career skills of E2E ${name}`, updated, 20_000);
				return offered;
			}
			for (const pick of picks) {
				const button = buttons.find((candidate) => skillName(candidate) === pick);
				click(button, `skill ${pick} in the prompt`);
				await waitFor(`skill ${pick} picked in the prompt`, () => button?.classList.contains('selected'));
			}
			click(app.element.querySelector('.career-skill-prompt footer button'), 'Confirm button');
			await waitFor(`the Career skills of E2E ${name}`, updated, 20_000);
			return offered;
		},

		rollInjury(name, injury) {
			click(injuryRow(name, injury)?.querySelector('.name .roll-link'), `name of ${injury}`);
		},

		async trashInjury(name, injury) {
			const row = injuryRow(name, injury);
			if (!row) throw new Error(`No row of ${injury}`);
			// Its ⋮ menu's Delete, which was a trash icon before #577.
			if (window.e2e.hasRowMenu(row)) await window.e2e.rowMenu(row, 'fa-trash');
			else click(row.querySelector('.actions .fa-trash')?.closest('button'), `trash icon of ${injury}`);
		},

		async crewPrompt(member) {
			const app = await findApp('app-select-crew-member-prompt', '.member-skill-option');
			const options = [...app.element.querySelectorAll('.member-skill-option')];
			const names = options.map((option) => text(option.querySelector('.member-name')));
			const option = options.find((candidate) => text(candidate.querySelector('.member-name')) === `E2E ${member}`);
			click(option, `crew member ${member}`);
			// The choice reads in its checked radio and its check mark, not in the row's tint alone (#583).
			await waitFor(
				`crew member ${member} picked in the prompt`,
				() => option?.querySelector<HTMLInputElement>('input[type="radio"]')?.checked && option.querySelector('.fa-check-circle'),
			);
			click(app.element.querySelector('.submit-button'), 'Select button');
			return names;
		},

		async dicePrompt() {
			const app = await findApp('app-dice-prompt', '.preview');
			// The prompt builds its dice pool once mounted, in a later render.
			await settle();
			const read = {
				actor: app.actor?.name ?? null,
				skill: app.skillName ?? null,
				difficulty: app.difficulty ?? '',
				difficultyDice: app.element.querySelectorAll('.preview .negative .die-Difficulty').length,
			};
			await app.close();
			return read;
		},

		notifications() {
			return takeNotifications();
		},

		format(key, data) {
			return game.i18n.format(key, data);
		},

		startCounting(name) {
			const owner = actor(name);
			const counts: Record<string, number> = { updateActor: 0, updateItem: 0, createItem: 0, deleteItem: 0, renders: 0 };
			const hooks = ['updateActor', 'updateItem', 'createItem', 'deleteItem'].map((hook) => [
				hook,
				Hooks.on(hook, (doc: { id: string; parent?: { id: string } }) => {
					if ((hook === 'updateActor' ? doc.id : doc.parent?.id) === owner.id) counts[hook]++;
				}),
			]);
			const app = owner.sheet;
			const replaceHTML = app._replaceHTML;
			app._replaceHTML = function (this: unknown, ...args: unknown[]) {
				counts.renders++;
				return replaceHTML.apply(this, args);
			};
			counting = {
				counts,
				stop() {
					for (const [hook, id] of hooks) Hooks.off(hook, id);
					delete app._replaceHTML;
				},
			};
		},

		stopCounting() {
			if (!counting) throw new Error('Not counting');
			counting.stop();
			const { counts } = counting;
			counting = undefined;
			return counts;
		},

		journal(name) {
			return actor(name).system.experienceJournal.entries.map(entryText);
		},

		xp(name) {
			return actor(name).system.availableXP;
		},

		characteristic(name, characteristic) {
			const field = characteristicField(name, characteristic);
			return {
				base: actor(name).system._source.characteristics[characteristic],
				shown: actor(name).system.characteristics[characteristic],
				sheet: text(field?.querySelector('.value')),
				canRaise: !!field?.querySelector('.characteristic-label .raise'),
			};
		},

		thresholds(name) {
			const source = actor(name).system._source;
			return { wounds: source.wounds.max, strain: source.strain.max };
		},

		skills(name, names) {
			const skills = actor(name).items.filter((item: { type: string }) => item.type === 'skill');
			return Object.fromEntries(
				names.map((skillName) => {
					const skill = skills.find((item: { name: string }) => item.name === skillName);
					const row = skillRow(name, skillName);
					return [
						skillName,
						skill
							? {
									rank: skill.system.rank,
									career: skill.system.career,
									star: !!row?.querySelector('.skill-name .career-skill'),
									canBuy: !!row?.querySelector('.skill-rank button'),
								}
							: null,
					];
				}),
			);
		},

		talent(name, talentName) {
			const item = actor(name).items.find(
				(candidate: { type: string; name: string }) => candidate.type === 'talent' && candidate.name === talentName,
			);
			if (!item) return null;
			const row = talentRow(name, talentName);
			return {
				rank: item.system.rank,
				tier: item.system.effectiveTier,
				row: text(row?.querySelector('.name button')),
				rowTier: text(row?.querySelector('.tier')).replace(/^.*?(\d+)$/, '$1'),
				// `.desc` before #579, on the build a comparison runs.
				description: text(row?.querySelector('.description-fold .description, .desc')),
				canUpgrade: !!row?.querySelector('button:has(.fa-arrow-circle-up)'),
			};
		},

		items(name) {
			return actor(name)
				.items.filter((item: { type: string }) => item.type !== 'skill')
				.map((item: { type: string; name: string }) => `${item.type}:${item.name}`)
				.sort();
		},

		grants(name) {
			const owner = actor(name);
			return owner.items
				.filter((item: { type: string }) => item.type !== 'skill')
				.map((item: { type: string; name: string; flags: Record<string, Record<string, string | undefined> | undefined> }) => {
					const flag = item.flags.genesys?.archetypeGrant;
					return `${item.type}:${item.name}:${flag === owner.id ? 'own' : String(flag ?? 'none')}`;
				})
				.sort();
		},

		async abilityRows(name, ability) {
			const [abilities] = talentsContainers(name);
			const rows = [...(abilities?.querySelectorAll('.talent') ?? [])].filter(
				(row) => text(row.querySelector('.name button')) === ability,
			);
			const read = [];
			for (const row of rows) {
				// Its Delete is in its ⋮ menu since #577, a trash icon before.
				const canDelete = window.e2e.hasRowMenu(row)
					? (await window.e2e.rowMenu(row)).includes('Delete')
					: !!row.querySelector('.fa-trash');
				read.push({ handMade: row.querySelector('img')?.getAttribute('src') === HAND_IMG, canDelete });
			}
			return read.sort((left, right) => Number(left.handMade) - Number(right.handMade));
		},

		talentsTab(name) {
			const [abilities, talents] = talentsContainers(name).map((container) =>
				[...(container?.children ?? [])].map((child) => {
					if (child.matches('h4')) return `[${text(child)}]`;
					if (child.matches('h5')) return `[[${text(child)}]]`;
					return unprefixed(text(child.querySelector('.name button')));
				}),
			);
			return { abilities: abilities ?? [], talents: talents ?? [] };
		},

		async trashTalentRow(name, item) {
			const row = [...sheet(name).querySelectorAll('.tab-talents .talent')].find(
				(candidate) => unprefixed(text(candidate.querySelector('.name button'))) === item,
			);
			if (!row) throw new Error(`No row of ${item}`);
			// Its ⋮ menu's Delete, which was a trash icon before #577.
			if (window.e2e.hasRowMenu(row)) await window.e2e.rowMenu(row, 'fa-trash');
			else click(row.querySelector('.fa-trash')?.closest('button'), `trash icon of ${item}`);
		},

		clickChevron(name, row) {
			return window.e2e.clickChevron(rowOf(name, row));
		},

		chevron(name, row) {
			return window.e2e.chevron(rowOf(name, row));
		},

		focusChevron(name, row) {
			const toggle = rowOf(name, row).querySelector<HTMLElement>('.description-toggle');
			if (!toggle) throw new Error(`No chevron for ${JSON.stringify(row)}`);
			toggle.focus();
		},

		focusInRow(name, row) {
			const element = rowOf(name, row);
			const focused = document.activeElement;
			if (!focused || !element.contains(focused)) return 'elsewhere';
			if (focused.matches('.description-toggle')) return 'chevron';
			return focused.matches('.description-fold a') ? 'link' : 'row';
		},

		talentNameParts(name, talent) {
			const row = rowOf(name, { talent });
			// The upgrade arrow sits in its own cell, after the name and its fold, since #579.
			const after = [...(row.querySelector(':scope > .upgrade')?.children ?? [])];
			return [...(row.querySelector('.name')?.children ?? []), ...after].map((child) => {
				if (child.classList.contains('description-toggle')) return 'chevron';
				if (child.querySelector('.fa-arrow-circle-up')) return 'upgrade';
				return text(child);
			});
		},

		clickName(name, row) {
			click(rowOf(name, row).querySelector('.name button'), `name of ${JSON.stringify(row)}`);
		},

		async closeOpened(name, item) {
			const itemSheet = actor(name).items.getName(`E2E ${item}`).sheet;
			const prompts = apps('app-dice-prompt').filter((app: App) => app.rendered);
			const opened = { sheet: itemSheet.rendered, dicePrompt: prompts.length > 0 };
			if (itemSheet.rendered) await itemSheet.close();
			for (const prompt of prompts) await prompt.close();
			return opened;
		},

		descriptionBox(name, row, cap) {
			const element = description(name, row);
			return element && window.e2e.descriptionBox(element, cap);
		},

		async foldHalfway(name, row) {
			const element = description(name, row);
			const content = element?.firstElementChild;
			if (!element || !content) throw new Error(`No description for ${JSON.stringify(row)}`);
			// A transition starts from the style the element had before the click: a tab just shown has none computed yet,
			// as no frame has drawn it, so it is read now, as a user sees the tab before clicking in it.
			const before = getComputedStyle(element).gridTemplateRows;
			if (!before) throw new Error(`No style for ${JSON.stringify(row)}`);
			window.characterE2E.clickChevron(name, row);
			// Vue renders the row's new class before the next frame, which starts its transitions.
			await new Promise(requestAnimationFrame);
			const transitions = [element, content].flatMap((animated) => animated.getAnimations()) as CSSTransition[];
			for (const transition of transitions) {
				transition.pause();
				transition.currentTime = 100;
			}
			const height = element.getBoundingClientRect().height;
			const last = [...element.querySelectorAll('*')].at(-1);
			const read: FoldHalfway = {
				transitions: transitions.map((transition) => transition.transitionProperty).sort(),
				// A pixel of slack for the heights rounded apart.
				height: height <= 1 ? 'none' : Math.abs(height - content.scrollHeight) <= 1 ? 'whole' : 'partway',
				lastVisibility: last ? getComputedStyle(last).visibility : 'none',
			};
			for (const transition of transitions) transition.finish();
			return read;
		},

		superCharacteristics(name) {
			const fields = [...sheet(name).querySelectorAll('.characteristic-field')];
			return {
				stored: [...actor(name).system.superCharacteristics].sort(),
				stars: fields.flatMap((field, index) => (field.querySelector('.super-star') ? [ORDER[index]] : [])),
			};
		},

		adversarySkills(name) {
			// Each skill's name, then its rank where it has one of its own.
			return [...sheet(name).querySelectorAll('.adversary-items .skill')].map((skill) =>
				[text(skill.querySelector('.skill-name span')), text(skill.querySelector('.skill-rank'))].filter(Boolean).join(' '),
			);
		},

		skillIcon(name, target) {
			const icon = skillContainer(name, target)?.querySelector<HTMLElement>('.skill-icon');
			if (!icon) return null;
			// The icon's name, which its bare `data-tooltip` shows.
			return { tooltip: icon.getAttribute('aria-label') ?? '', cursor: getComputedStyle(icon).cursor };
		},

		async clickSkill(name, target, part) {
			const container = skillContainer(name, target);
			if (!container) throw new Error(`No skill ${JSON.stringify(target)} on the sheet of E2E ${name}`);
			const element = container.querySelector<HTMLElement>(part === 'icon' ? '.skill-icon' : '.skill-name');
			element?.click();
			await settle();
			const skill = 'skill' in target ? target.skill : target.adversarySkill;
			const itemSheet = actor(name).items.getName(skill).sheet;
			const prompts = apps('app-dice-prompt').filter((app: App) => app.rendered);
			const opened = { clicked: !!element, sheet: itemSheet.rendered, dicePrompt: prompts.length > 0 };
			if (itemSheet.rendered) await itemSheet.close();
			for (const prompt of prompts) await prompt.close();
			return opened;
		},

		pyramid(name) {
			const summary = sheet(name).querySelector('.tab-talents .pyramid');
			const block = sheet(name).querySelector('.tab-talents .block');
			return {
				summary: summary ? [...summary.children].map((line) => text(line).replace(/^.*:\s*/, '')) : null,
				roundedTop: !!block && getComputedStyle(block).borderTopLeftRadius !== '0px',
			};
		},

		talentsTop(name) {
			const tab = sheet(name).querySelector('.tab-talents');
			const block = tab?.querySelector(':scope > .block');
			if (!tab || !block) throw new Error(`No Talents tab on the sheet of E2E ${name}`);
			const box = tab.getBoundingClientRect();
			if (!box.height) throw new Error(`The Talents tab of E2E ${name} isn't shown`);
			const style = getComputedStyle(tab);
			const corners = getComputedStyle(block);
			return {
				gapAbove: Math.round(
					block.getBoundingClientRect().top - box.top - parseFloat(style.borderTopWidth) - parseFloat(style.paddingTop),
				),
				roundedCorners: corners.borderTopLeftRadius !== '0px' && corners.borderTopRightRadius !== '0px',
			};
		},

		tokenLight(name) {
			const [token] = game.scenes.getName(`E2E ${name}`)?.tokens ?? [];
			if (!token) throw new Error(`No token of E2E ${name}`);
			return { dim: token.light.dim, bright: token.light.bright };
		},

		appliedEffects(name) {
			const owner = actor(name);
			return { effects: owner.appliedEffects.map((effect: { name: string }) => effect.name), soak: owner.system.soak };
		},

		severities(name) {
			return Object.fromEntries(
				[
					...sheet(name).querySelectorAll('.critical-injuries .injury:not(.columns), .critical-hits .critical-hit:not(.columns)'),
				].map((row) => [unprefixed(text(row.querySelector('.name'))), text(row.querySelector('.severity'))]),
			);
		},

		socialSkills(name) {
			// CSS columns lay the categories out, so the document keeps them in list order.
			const categories = [...sheet(name).querySelectorAll('.tab-skills .skill-category')];
			const names = (category: Element) =>
				[...category.querySelectorAll('.skill.row .skill-name span')].map((span) => text(span).replace(/ \([^()]*\)$/, ''));
			const social = categories.find(
				(category) => text(category.querySelector('.columns h3')) === game.i18n.localize('Genesys.Labels.SocialSkills'),
			);
			return {
				categories: categories.map((category) => text(category.querySelector('.columns h3'))),
				social: social ? names(social) : [],
			};
		},

		async talentSheetTier(uuid) {
			const item = await load(uuid);
			await render(item.sheet, (root) => root.querySelector('.talent-tier'));
			const shown = text(item.sheet.element.querySelector('.talent-tier'));
			await item.sheet.close();
			return shown;
		},

		async typeTier(uuid, tier) {
			const item = await load(uuid);
			await render(item.sheet, (root) => root.querySelector('input[name="system.tier"]'));
			const input = item.sheet.element.querySelector('input[name="system.tier"]');
			input.value = String(tier);
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
			const shown = item.sheet.element.querySelector('input[name="system.tier"]').value;
			await item.sheet.close();
			return shown;
		},

		async seedTier({ uuid }, tier) {
			const { id, operation } = location(uuid);
			await raw({
				type: 'Item',
				action: 'update',
				operation: { ...operation, updates: [{ _id: id, system: { tier } }], diff: true, recursive: true },
			});
		},

		async storedTier({ uuid }) {
			const { id, operation } = location(uuid);
			if (operation.parentUuid) {
				const actorId = operation.parentUuid.split('.')[1];
				const response = await raw({ type: 'Actor', action: 'get', operation: { query: { _id: actorId } } });
				return response.result[0].items.find((item) => item._id === id)?.system.tier;
			}
			const response = await raw({ type: 'Item', action: 'get', operation: { ...operation, query: { _id: id } } });
			return response.result[0].system.tier;
		},

		async loadedTalent(uuid) {
			const item = await load(uuid);
			const collection = item.pack ? game.packs.get(item.pack) : item.parent?.items ?? game.items;
			return { tier: item.system.tier, source: item._source.system.tier, invalid: collection.invalidDocumentIds.size > 0 };
		},

		pyramidTotals(name) {
			return { ...actor(name).system.talentPyramidTotals };
		},

		async weaponRows(name) {
			const root = await render(actor(name).sheet, (element) => element.querySelector('.tab-combat .weapons'));
			const combatRows = () => [...root.querySelectorAll('.tab-combat .weapons .weapon:not(.columns)')];
			await waitFor(`the Combat tab's weapons of E2E ${name}`, () => combatRows().length);
			const weapons = actor(name).items.filter((item: { type: string }) => item.type === 'weapon');
			return {
				inventory: [...root.querySelectorAll('.inventory-item')]
					.filter((row) => row.querySelector('[data-item-type=weapon]'))
					.map((row) => unprefixed(text(row.querySelector('.name button')))),
				encumbrance: actor(name).system.currentEncumbrance.value,
				combat: combatRows().map((row) => {
					const select = row.querySelector<HTMLSelectElement>('select.attack-skill');
					return {
						name: unprefixed(text(row.querySelector('.name'))),
						skill: select ? `[${select.value}]` : text(row.querySelector('.skill')),
					};
				}),
				stored: Object.fromEntries(
					weapons.map((weapon: { name: string; system: { attackSkill: string; extraProfiles: { attackSkill: string }[] } }) => [
						unprefixed(weapon.name),
						[weapon.system.attackSkill, ...(weapon.system.extraProfiles ?? []).map((profile) => profile.attackSkill)],
					]),
				),
			};
		},

		async chooseAttackSkill({ actor: name, row, skill }) {
			const found = weaponRow(name, row);
			// A build without Weapon Profiles shows no row for an extra profile.
			const select = found?.querySelector<HTMLSelectElement>('select.attack-skill');
			if (!select) return false;
			select.value = skill;
			select.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
			return true;
		},

		async createPack() {
			const pack = await window.e2e.createCompendium({ label: 'E2E Talents', name: PACK, type: 'Item' });
			const [created] = await Item.createDocuments([game.items.getName('E2E Old Talent').toObject()], { pack: pack.collection });
			return created.uuid;
		},

		async deletePack() {
			await game.packs.get(`world.${PACK}`)?.deleteCompendium();
		},
	};
}

export type Evaluate = <A, R>(fn: (arg: A) => R | Promise<R>, arg: A) => Promise<R>;
