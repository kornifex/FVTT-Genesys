/** @file The character items of the test checklist: Advancement and the Experience Journal, Archetype, Career, the Talent Pyramid, talents, characteristics, super-characteristics, the Skills tab and Critical Injuries. */
import type { ScenarioContext } from '../scenario.ts';

type Characteristic = 'brawn' | 'agility' | 'intellect' | 'cunning' | 'willpower' | 'presence';

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
	 * Starting XP, the character's update coming last; or removes the character's from its menu, and waits until the
	 * Archetype item is deleted, which comes last. A removal can take longer than a step's wait on v13.
	 */
	applyArchetype(actor: string, archetype: string): Promise<void>;
	removeArchetype(actor: string): Promise<void>;
	/** The uuid of the world item `E2E <name>`. */
	worldItem(name: string): string;
	/** The uuid of a Skills Compendium skill. */
	compendiumSkill(name: string): string;
	/** Opens the context menu of a characteristic, skill, Archetype or Career, and clicks the entry of that label if given. */
	menu(actor: string, target: MenuTarget, label?: string): Promise<string[]>;
	raise(actor: string, characteristic: Characteristic): boolean;
	buySkill(actor: string, skill: string): boolean;
	upgradeTalent(actor: string, talent: string): boolean;
	/** Clicks the trash of the last Experience Journal entry whose summary starts so. */
	undo(actor: string, entry: string): void;
	award(actor: string, amount: number, reason: string): Promise<void>;
	/** Waits for the Career's Free Rank prompt to open. */
	careerPromptOpen(): Promise<void>;
	/**
	 * Waits for the Career's Free Rank prompt, picks those skills and confirms, or closes it, then waits until the
	 * character's skills are updated; the skills it offered.
	 */
	careerPrompt(actor: string, picks: string[] | null): Promise<string[]>;
	/** Clicks the severity of a Critical Injury or Hit. */
	clickSeverity(actor: string, name: string): void;
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
	abilityRows(actor: string, name: string): { handMade: boolean; canDelete: boolean }[];
	/**
	 * The Talents tab's lists of abilities and of talents, in order: a category header as `[Active]`, an activation detail
	 * header as `[[maneuver]]`, a row as its name.
	 */
	talentsTab(actor: string): { abilities: string[]; talents: string[] };
	/** Clicks the trash icon of a row of the Talents tab. */
	trashTalentRow(actor: string, name: string): void;
	superCharacteristics(actor: string): { stored: string[]; stars: string[] };
	adversarySkills(actor: string): string[];
	pyramid(actor: string): { summary: string[] | null; roundedTop: boolean };
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
	createPack(): Promise<string>;
	deletePack(): Promise<void>;
};

type MenuTarget = { characteristic: Characteristic } | { skill: string } | { meta: 'archetype' | 'career' } | { adversarySkill: string };

declare global {
	interface Window {
		characterE2E: CharacterHelpers;
	}
}

// The keys of the Alternate Rules, House Rules and other settings the scenario sets, and puts back as they were.
const SETTINGS = [
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
function installCharacterHelpers() {
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
			(row) => text(row.querySelector('.name span')).replace(/ \([^()]*\)$/, '') === skill,
		);
	const talentRow = (name: string, talent: string) =>
		[...sheet(name).querySelectorAll('.tab-talents .talent')].find(
			(row) => text(row.querySelector('.name a')).replace(/ \d+$/, '') === talent,
		);
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

		async removeArchetype(name) {
			await window.characterE2E.menu(name, { meta: 'archetype' }, 'Genesys.Labels.Delete');
			await waitFor(
				`no Archetype on E2E ${name}`,
				() => !actor(name).items.some((item: { type: string }) => item.type === 'archetype'),
				20_000,
			);
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
			else if ('skill' in target) container = skillRow(name, target.skill);
			else if ('meta' in target) container = sheet(name).querySelector(`.character-meta .${target.meta} .menu-container`);
			else
				container = [...sheet(name).querySelectorAll('.adversary-items .skill')].find(
					(skill) => text(skill.querySelector('a span')).replace(/ \d+$/, '') === target.adversarySkill,
				);
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
			const arrow = characteristicField(name, characteristic)?.querySelector('label a:has(.fa-arrow-circle-up)');
			(arrow as HTMLElement | null)?.click();
			return !!arrow;
		},

		buySkill(name, skill) {
			const arrow = skillRow(name, skill)?.querySelector('.rank-display a');
			(arrow as HTMLElement | null)?.click();
			return !!arrow;
		},

		upgradeTalent(name, talent) {
			const arrow = talentRow(name, talent)?.querySelector('.name a:has(.fa-arrow-circle-up)');
			(arrow as HTMLElement | null)?.click();
			return !!arrow;
		},

		undo(name, entry) {
			const entries = actor(name).system.experienceJournal.entries.map(entryText);
			const index = entries.findLastIndex((summary: string) => summary.startsWith(entry));
			if (index < 0) throw new Error(`No entry ${entry} in ${entries.join(', ')}`);
			click(sheet(name).querySelectorAll('.xp-journal .entries .entry')[index]?.querySelector('a'), `trash of ${entry}`);
		},

		async award(name, amount, reason) {
			click(sheet(name).querySelector('.xp-journal .entries-header a'), 'XP Award button');
			const app = await findApp('app-award-xp-prompt', '.award-xp-prompt > button');
			const fill = (selector: string, value: string) => {
				const field = app.element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
				if (!field) throw new Error(`No ${selector}`);
				field.value = value;
				field.dispatchEvent(new Event('input', { bubbles: true }));
			};
			fill('.award-xp-prompt .amount input', String(amount));
			fill('.award-xp-prompt .reason textarea', reason);
			await settle();
			click(app.element.querySelector('.award-xp-prompt > button'), 'Add button');
		},

		async careerPromptOpen() {
			await findApp('app-career-skill-prompt', '.career-skill-prompt .select-skill');
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

		clickSeverity(name, injury) {
			const row = [...sheet(name).querySelectorAll('.critical-injuries .injury, .critical-hits .critical-hit')].find(
				(candidate) => text(candidate.querySelector('.name')) === `E2E ${injury}`,
			);
			click(row?.querySelector('.severity a'), `severity of ${injury}`);
		},

		async crewPrompt(member) {
			const app = await findApp('app-select-crew-member-prompt', '.member-skill-option');
			const options = [...app.element.querySelectorAll('.member-skill-option')];
			const names = options.map((option) => text(option.querySelector('.member-name')));
			const option = options.find((candidate) => text(candidate.querySelector('.member-name')) === `E2E ${member}`);
			click(option, `crew member ${member}`);
			await waitFor(`crew member ${member} picked in the prompt`, () => option?.classList.contains('selected-option'));
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
				canRaise: !!field?.querySelector('label a:has(.fa-arrow-circle-up)'),
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
									star: !!row?.querySelector('.name .fa-star'),
									canBuy: !!row?.querySelector('.rank-display a'),
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
				row: text(row?.querySelector('.name a')),
				rowTier: text(row?.querySelector('.tier')).replace(/^.*?(\d+)$/, '$1'),
				description: text(row?.querySelector('.desc')),
				canUpgrade: !!row?.querySelector('.name a:has(.fa-arrow-circle-up)'),
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

		abilityRows(name, ability) {
			const abilities = sheet(name).querySelectorAll('.tab-talents .talents-container')[0];
			return [...(abilities?.querySelectorAll('.talent') ?? [])]
				.filter((row) => text(row.querySelector('.name a')) === ability)
				.map((row) => ({
					handMade: row.querySelector('img')?.getAttribute('src') === HAND_IMG,
					canDelete: !!row.querySelector('.fa-trash'),
				}))
				.sort((left, right) => Number(left.handMade) - Number(right.handMade));
		},

		talentsTab(name) {
			const [abilities, talents] = [...sheet(name).querySelectorAll('.tab-talents .talents-container')].map((container) =>
				[...container.children].map((child) => {
					if (child.matches('.category-header')) return `[${text(child)}]`;
					if (child.matches('.sub-category-header')) return `[[${text(child)}]]`;
					return unprefixed(text(child.querySelector('.name a')));
				}),
			);
			return { abilities: abilities ?? [], talents: talents ?? [] };
		},

		trashTalentRow(name, item) {
			const row = [...sheet(name).querySelectorAll('.tab-talents .talent')].find(
				(candidate) => unprefixed(text(candidate.querySelector('.name a'))) === item,
			);
			click(row?.querySelector('.fa-trash')?.closest('a'), `trash icon of ${item}`);
		},

		superCharacteristics(name) {
			const fields = [...sheet(name).querySelectorAll('.characteristic-field')];
			return {
				stored: [...actor(name).system.superCharacteristics].sort(),
				stars: fields.flatMap((field, index) => (field.querySelector('.super-star') ? [ORDER[index]] : [])),
			};
		},

		adversarySkills(name) {
			return [...sheet(name).querySelectorAll('.adversary-items .skill a span')].map(text);
		},

		pyramid(name) {
			const summary = sheet(name).querySelector('.tab-talents .pyramid');
			const block = sheet(name).querySelector('.tab-talents .block');
			return {
				summary: summary ? [...summary.children].map((line) => text(line).replace(/^.*:\s*/, '')) : null,
				roundedTop: !!block && getComputedStyle(block).borderTopLeftRadius !== '0px',
			};
		},

		appliedEffects(name) {
			const owner = actor(name);
			return { effects: owner.appliedEffects.map((effect: { name: string }) => effect.name), soak: owner.system.soak };
		},

		severities(name) {
			return Object.fromEntries(
				[...sheet(name).querySelectorAll('.critical-injuries .injury:not(.header), .critical-hits .critical-hit:not(.header)')].map(
					(row) => [unprefixed(text(row.querySelector('.name'))), text(row.querySelector('.severity'))],
				),
			);
		},

		socialSkills(name) {
			// CSS columns lay the categories out, so the document keeps them in list order.
			const categories = [...sheet(name).querySelectorAll('.tab-skills .skill-category')];
			const names = (category: Element) =>
				[...category.querySelectorAll('.skill.row .name span')].map((span) => text(span).replace(/ \([^()]*\)$/, ''));
			const social = categories.find(
				(category) => text(category.querySelector('.header label')) === game.i18n.localize('Genesys.Labels.SocialSkills'),
			);
			return {
				categories: categories.map((category) => text(category.querySelector('.header label'))),
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

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	// Runs a function in the GM's page with its argument, typed as the function takes it.
	const page = <A, R>(fn: (arg: A) => R | Promise<R>, arg: A) => (gm.evaluate as (fn: unknown, arg: unknown) => Promise<R>)(fn, arg);
	await gm.evaluate(installCharacterHelpers);
	const saved = await gm.evaluate((keys) => window.e2e.settings(keys), SETTINGS);
	const notified = (key: string, data?: Record<string, unknown>) =>
		page((args) => `info: ${window.characterE2E.format(args.key, args.data)}`, { key, data });
	const notifications = () => gm.evaluate(() => window.characterE2E.notifications());

	try {
		await e2e.step('setup', async () => {
			await gm.evaluate(() => window.characterE2E.setUp());
			await gm.evaluate(() =>
				window.e2e.setSettings({
					useSuperCharacteristics: false,
					ignoreTalentPyramid: false,
					talentTierVersions: false,
					careerSkillRanks: 4,
					skillForInjuries: 'Resilience',
					skillForRepairingVehicleHits: 'Mechanics',
				}),
			);
		});

		await archetypes(e2e, page);
		await advancement(e2e, page, notified, notifications);
		await careers(e2e, page);
		await careerSkillsOnCreation(e2e, page);
		await superCharacteristics(e2e, page, notifications);
		await skillsTab(e2e, page);
		await talentPyramidSummary(e2e, page);
		await talentRanks(e2e, page);
		await talentsTab(e2e, page);
		await injuries(e2e, page);
		await talentTiers(e2e, page, notified, notifications);
	} finally {
		// The page lost the helpers if a step stopped the scenario after a reload. A failure here is no expected one: it is
		// logged, so that the error which stopped the scenario stays the one reported.
		await gm.evaluate(installCharacterHelpers).catch((error) => e2e.log('cleanup: the helpers could not be installed', String(error)));
		await page((values) => window.e2e.setSettings(values), saved);
		await gm.evaluate(() => window.characterE2E.deletePack());
	}
}

type Evaluate = <A, R>(fn: (arg: A) => R | Promise<R>, arg: A) => Promise<R>;

/** §#36, §#49, §#137: an Archetype's drop and removal, and the items it granted. */
async function archetypes(e2e: ScenarioContext, page: Evaluate) {
	const granted = (name: string) =>
		page(
			(name) => ({
				characteristics: Object.fromEntries(
					(['brawn', 'agility', 'intellect', 'cunning', 'willpower', 'presence'] as const).map((c) => [
						c,
						window.characterE2E.characteristic(name, c).base,
					]),
				),
				thresholds: window.characterE2E.thresholds(name),
				journal: window.characterE2E.journal(name),
				items: window.characterE2E.grants(name),
				athletics: window.characterE2E.skills(name, ['Athletics']).Athletics?.rank,
			}),
			name,
		);
	const all = (value: number) => ({ brawn: value, agility: value, intellect: value, cunning: value, willpower: value, presence: value });
	const dropArchetype = (actor: string) => page((actor) => window.characterE2E.applyArchetype(actor, 'Archetype'), actor);
	const removeArchetype = (actor: string) => page((actor) => window.characterE2E.removeArchetype(actor), actor);
	const handMade = [
		{ name: 'E2E Tough', type: 'ability', img: 'icons/svg/mystery-man.svg', system: { activation: { type: 'passive', detail: '' } } },
		{ name: 'E2E Tough', type: 'gear' },
	];

	await e2e.step('#36 A1 an Archetype dropped on a new character', async () => {
		await page((name) => window.characterE2E.create(name), 'Granted');
		await page((name) => window.characterE2E.open(name), 'Granted');
		await dropArchetype('Granted');
	});
	e2e.expect(
		'#36 A1 the Archetype gives its characteristics, thresholds, Starting XP and flagged items, and a rank of a granted skill named in another case',
		await granted('Granted'),
		{
			characteristics: all(2),
			thresholds: { wounds: 12, strain: 12 },
			journal: ['Starting 100'],
			items: ['ability:E2E Tough:own', 'archetype:E2E Archetype:none', 'talent:E2E Gifted:own'],
			athletics: 1,
		},
	);

	await e2e.step('#36 A2 the Archetype removed from the sheet', () => removeArchetype('Granted'));
	e2e.expect('#36 A2 removing the Archetype takes back everything it gave', await granted('Granted'), {
		characteristics: all(0),
		thresholds: { wounds: 0, strain: 0 },
		journal: [],
		items: [],
		athletics: 0,
	});

	await e2e.step('#137 A3 the Archetype dropped again, then an ability and a gear named like its ability added by hand', async () => {
		await dropArchetype('Granted');
		await e2e.settle();
		await page((items) => window.characterE2E.createItems('Granted', items), handMade);
	});
	e2e.expect(
		'#137 A3 the Talents tab lets the hand-added ability be deleted, not the granted one',
		await page((name) => window.characterE2E.abilityRows(name, 'E2E Tough'), 'Granted'),
		[
			{ handMade: false, canDelete: false },
			{ handMade: true, canDelete: true },
		],
	);
	await e2e.step('#137 A4 the Archetype removed', () => removeArchetype('Granted'));
	e2e.expect(
		'#137 A4 removing the Archetype deletes only the items it granted',
		await page((name) => window.characterE2E.grants(name), 'Granted'),
		['ability:E2E Tough:none', 'gear:E2E Tough:none'],
	);

	// A character that got its Archetype before #137: its granted items hold no flag.
	await e2e.step('#137 A5 an Archetype applied before #137, with a hand-added copy of its ability and a gear of that name', async () => {
		await page((name) => window.characterE2E.create(name), 'Legacy');
		await page((name) => window.characterE2E.open(name), 'Legacy');
		await dropArchetype('Legacy');
		await e2e.settle();
		await page(async () => {
			const legacy = game.actors.getName('E2E Legacy');
			for (const item of legacy.items.filter((item: { flags: { genesys?: object } }) => item.flags.genesys)) {
				await item.unsetFlag('genesys', 'archetypeGrant');
			}
		}, undefined);
		await page((items) => window.characterE2E.createItems('Legacy', items), handMade);
	});
	e2e.expect(
		'#137 A5 without flags, the Talents tab still protects one copy of the granted ability',
		await page((name) => window.characterE2E.abilityRows(name, 'E2E Tough'), 'Legacy'),
		[
			{ handMade: false, canDelete: false },
			{ handMade: true, canDelete: true },
		],
	);
	await e2e.step('#137 A6 the Archetype applied before #137 removed', () => removeArchetype('Legacy'));
	e2e.expect(
		'#137 A6 without flags, removing the Archetype deletes one copy of each granted item',
		await page((name) => window.characterE2E.grants(name), 'Legacy'),
		['ability:E2E Tough:none', 'gear:E2E Tough:none'],
	);

	await e2e.step('#137 A7 a granted ability renamed on the character', async () => {
		await page((name) => window.characterE2E.create(name), 'Renamed');
		await page((name) => window.characterE2E.open(name), 'Renamed');
		await dropArchetype('Renamed');
		await e2e.settle();
		await page(() => game.actors.getName('E2E Renamed').items.getName('E2E Tough').update({ name: 'E2E Hardy' }), undefined);
	});
	e2e.expect(
		'#137 A7 the renamed ability keeps the flag holding the character id',
		await page((name) => window.characterE2E.grants(name), 'Renamed'),
		['ability:E2E Hardy:own', 'archetype:E2E Archetype:none', 'talent:E2E Gifted:own'],
	);
	await e2e.step('#137 A8 the Archetype of the renamed ability removed', () => removeArchetype('Renamed'));
	e2e.expect(
		'#137 A8 removing the Archetype deletes the renamed ability',
		await page((name) => window.characterE2E.grants(name), 'Renamed'),
		[],
	);

	await e2e.step('#254 A9 an Archetype dropped over another, counting the writes', async () => {
		await page((name) => window.characterE2E.create(name), 'Swapper');
		await page((name) => window.characterE2E.open(name), 'Swapper');
		await dropArchetype('Swapper');
		await e2e.settle();
		await page((name) => window.characterE2E.startCounting(name), 'Swapper');
		await page((name) => window.characterE2E.applyArchetype(name, 'Small Archetype'), 'Swapper');
		await e2e.settle();
	});
	const swapWrites = await page(() => window.characterE2E.stopCounting(), undefined);
	e2e.log('#254 A9 sheet renders while replacing an Archetype', swapWrites.renders);
	e2e.expect('#254 A9 the new Archetype takes back what the old one gave, and gives its own', await granted('Swapper'), {
		characteristics: all(2),
		thresholds: { wounds: 12, strain: 12 },
		journal: ['Starting 30'],
		items: ['archetype:E2E Small Archetype:none'],
		athletics: 0,
	});
	e2e.expect(
		'#254 A9 replacing an Archetype updates the character once',
		{
			updateActor: swapWrites.updateActor,
			createItem: swapWrites.createItem,
			updateItem: swapWrites.updateItem,
			deleteItem: swapWrites.deleteItem,
		},
		{ updateActor: 1, createItem: 1, updateItem: 1, deleteItem: 3 },
	);

	await page(async () => {
		for (const name of ['Granted', 'Legacy', 'Renamed', 'Swapper']) await window.characterE2E.close(name);
	}, undefined);
}

/** §#36, §#114, §#130, §#198: spending XP from the sheet, awarding it, and undoing each kind of entry. */
async function advancement(
	e2e: ScenarioContext,
	page: Evaluate,
	notified: (key: string, data?: Record<string, unknown>) => Promise<string>,
	notifications: () => Promise<string[]>,
) {
	const A = 'Advancer';
	const xp = () => page((name) => window.characterE2E.xp(name), A);
	const journalTail = async (count: number) => (await page((name) => window.characterE2E.journal(name), A)).slice(-count);
	const characteristic = (c: Characteristic) => page((args) => window.characterE2E.characteristic(args.actor, args.c), { actor: A, c });
	const skills = (names: string[]) => page((args) => window.characterE2E.skills(args.actor, args.names), { actor: A, names });
	const talent = (name: string) => page((args) => window.characterE2E.talent(args.actor, args.name), { actor: A, name });
	const drop = (item: string) =>
		page((args) => window.characterE2E.drop(args.actor, window.characterE2E.worldItem(args.item)), { actor: A, item });
	const undo = (entry: string) => page((args) => window.characterE2E.undo(args.actor, args.entry), { actor: A, entry });
	// Undoes an entry whose undo deletes an item, which asks first, and answers the dialog; the dialog read.
	const undoAndAnswer = (entry: string, answer: 'yes' | 'no') =>
		page(
			async (args) => {
				window.characterE2E.undo(args.actor, args.entry);
				return window.e2e.answerConfirm(args.answer);
			},
			{ actor: A, entry, answer },
		);
	const setHouseRules = (rules: Record<string, unknown>) => page((rules) => window.e2e.setSettings(rules), rules);
	const reopen = () => page((name) => window.characterE2E.reopen(name), A);

	await e2e.step('#36 B0 a character with an Archetype giving 1000 XP', async () => {
		await page((name) => window.characterE2E.create(name), A);
		await page((name) => window.characterE2E.open(name), A);
		await page((name) => window.characterE2E.applyArchetype(name, 'Plain Archetype'), A);
	});
	e2e.expect('#36 B0 the character starts with 1000 XP', await xp(), 1000);

	// Raising each characteristic from 2 to 3 costs 30 XP; Brawn raises the wound threshold, Willpower the strain one.
	const raised: [Characteristic, { wounds: number; strain: number }][] = [
		['brawn', { wounds: 13, strain: 12 }],
		['agility', { wounds: 13, strain: 12 }],
		['intellect', { wounds: 13, strain: 12 }],
		['cunning', { wounds: 13, strain: 12 }],
		['willpower', { wounds: 13, strain: 13 }],
		['presence', { wounds: 13, strain: 13 }],
	];
	let spent = 0;
	for (const [c, thresholds] of raised) {
		await e2e.step(`#36 B1 ${c} raised from the Skills tab`, () =>
			page((args) => window.characterE2E.raise(args.actor, args.c), { actor: A, c }),
		);
		spent += 30;
		e2e.expect(
			`#36 B1 raising ${c} from 2 costs 30 XP and shows 3${c === 'brawn' ? ', with the wound threshold' : c === 'willpower' ? ', with the strain threshold' : ''}`,
			{ ...(await characteristic(c)), xp: await xp(), thresholds: await page((name) => window.characterE2E.thresholds(name), A) },
			{ base: 3, shown: 3, sheet: '3', canRaise: true, xp: 1000 - spent, thresholds },
		);
	}
	await e2e.step('#36 B2 Brawn raised again', () => page((name) => window.characterE2E.raise(name, 'brawn'), A));
	spent += 40;
	e2e.expect(
		'#36 B2 raising Brawn from 3 costs 40 XP',
		{ ...(await characteristic('brawn')), xp: await xp() },
		{
			base: 4,
			shown: 4,
			sheet: '4',
			canRaise: true,
			xp: 1000 - spent,
		},
	);

	e2e.expect(
		'#36 B2 once XP is spent, the Archetype can no longer be removed',
		await page((name) => window.characterE2E.menu(name, { meta: 'archetype' }), A),
		[await page(() => game.i18n.localize('Genesys.Labels.Edit'), undefined)],
	);

	// Skills: career and non-career ranks, the rank 2 cap, Free Ranks and career marks.
	await e2e.step('#114 C1 Ranged marked as a career skill from its menu', () =>
		page((name) => window.characterE2E.menu(name, { skill: 'Ranged' }, 'Genesys.Labels.MarkCareerSkill'), A),
	);
	e2e.expect(
		'#114 C1 marking a career skill shows its star and spends no XP',
		{ ...(await skills(['Ranged'])), xp: await xp() },
		{
			Ranged: { rank: 0, career: true, star: true, canBuy: true },
			xp: 1000 - spent,
		},
	);
	await e2e.step('#36 C2 Ranged rank 1 bought', () => page((name) => window.characterE2E.buySkill(name, 'Ranged'), A));
	spent += 5;
	e2e.expect(
		'#36 C2 a career skill rank 1 costs 5 XP',
		{ ...(await skills(['Ranged'])), xp: await xp(), entry: await journalTail(1) },
		{
			Ranged: { rank: 1, career: true, star: true, canBuy: true },
			xp: 1000 - spent,
			entry: ['Skill -5 Ranged 1'],
		},
	);
	await e2e.step('#36 C3 Ranged rank 2 bought', () => page((name) => window.characterE2E.buySkill(name, 'Ranged'), A));
	spent += 10;
	e2e.expect(
		'#36 C3 a career skill rank 2 costs 10 XP, and no rank 3 can be bought during Character Creation',
		{ ...(await skills(['Ranged'])), xp: await xp() },
		{ Ranged: { rank: 2, career: true, star: true, canBuy: false }, xp: 1000 - spent },
	);
	await e2e.step('#36 C4 Cool rank 1 bought, counting the writes', async () => {
		await page((name) => window.characterE2E.startCounting(name), A);
		await page((name) => window.characterE2E.buySkill(name, 'Cool'), A);
	});
	spent += 10;
	const coolWrites = await page(() => window.characterE2E.stopCounting(), undefined);
	e2e.log('#36 C4 sheet renders while buying a skill rank', coolWrites.renders);
	e2e.expect(
		'#36 C4 a non-career skill rank 1 costs 10 XP',
		{ ...(await skills(['Cool'])), xp: await xp() },
		{
			Cool: { rank: 1, career: false, star: false, canBuy: true },
			xp: 1000 - spent,
		},
	);
	e2e.expect(
		'#36 C4 a bought skill rank is one item update and one actor update',
		{ updateItem: coolWrites.updateItem, updateActor: coolWrites.updateActor, createItem: coolWrites.createItem },
		{ updateItem: 1, updateActor: 1, createItem: 0 },
	);
	await e2e.step('#114 C5 Mechanics marked then unmarked as a career skill', async () => {
		await page((name) => window.characterE2E.menu(name, { skill: 'Mechanics' }, 'Genesys.Labels.MarkCareerSkill'), A);
		await e2e.settle();
		await page((name) => window.characterE2E.menu(name, { skill: 'Mechanics' }, 'Genesys.Labels.UnmarkCareerSkill'), A);
	});
	e2e.expect('#114 C5 unmarking a career skill takes its star away', (await skills(['Mechanics'])).Mechanics, {
		rank: 0,
		career: false,
		star: false,
		canBuy: true,
	});
	const journalBeforeFreeRanks = await page((name) => window.characterE2E.journal(name), A);
	await e2e.step('#114 C6 Free Rank up on Stealth', () =>
		page((name) => window.characterE2E.menu(name, { skill: 'Stealth' }, 'Genesys.Labels.FreeRankUp'), A),
	);
	e2e.expect(
		'#114 C6 a Free Rank up raises the rank without spending XP',
		{
			rank: (await skills(['Stealth'])).Stealth?.rank,
			xp: await xp(),
			journal: await page((name) => window.characterE2E.journal(name), A),
		},
		{ rank: 1, xp: 1000 - spent, journal: journalBeforeFreeRanks },
	);
	await e2e.step('#114 C7 Free Rank down on Stealth twice', async () => {
		await page((name) => window.characterE2E.menu(name, { skill: 'Stealth' }, 'Genesys.Labels.FreeRankDown'), A);
		await e2e.settle();
		await page((name) => window.characterE2E.menu(name, { skill: 'Stealth' }, 'Genesys.Labels.FreeRankDown'), A);
	});
	e2e.expect(
		'#114 C7 a Free Rank down stops at 0, with no journal entry',
		{
			rank: (await skills(['Stealth'])).Stealth?.rank,
			xp: await xp(),
			journal: await page((name) => window.characterE2E.journal(name), A),
		},
		{ rank: 0, xp: 1000 - spent, journal: journalBeforeFreeRanks },
	);

	// Talents: a new talent with an effect, undone; ranks from the tab and by drop; the House Rules.
	await e2e.step('#36 D1 a talent with an Active Effect dropped', () => drop('Steady'));
	spent += 5;
	const steady = await page(() => {
		const actor = game.actors.getName('E2E Advancer');
		const item = actor.items.getName('E2E Steady');
		return { idInJournal: actor.system.experienceJournal.entries.at(-1).data.id === item?.id };
	}, undefined);
	e2e.expect(
		"#36 D1 a dropped new talent costs 5 XP per tier, is created with its journal entry's id, and its effect applies",
		{ ...steady, ...(await page((name) => window.characterE2E.appliedEffects(name), A)), xp: await xp(), entry: await journalTail(1) },
		{ idInJournal: true, effects: ['E2E Steady'], soak: 1, xp: 1000 - spent, entry: ['NewTalent -5 E2E Steady tier 1 rank 1'] },
	);
	// §#252: an undo that deletes an item asks first.
	let asked: Awaited<ReturnType<typeof undoAndAnswer>> = null;
	await e2e.step("#252 C4 the new talent's entry undone from the Experience Journal, and No answered", async () => {
		asked = await undoAndAnswer('NewTalent -5 E2E Steady', 'no');
	});
	e2e.expect(
		'#252 C4 undoing a new talent asks in a dialog naming the talent, No by default, and No keeps the talent, its entry and its XP',
		{ asked, rank: (await talent('E2E Steady'))?.rank, xp: await xp(), entry: await journalTail(1) },
		{
			asked: {
				application: 'DialogV2',
				title: 'Undo Entry',
				content: 'Undoing this entry removes E2E Steady from the character. Do you want to proceed?',
				buttons: ['yes', 'no'],
				defaultButton: 'no',
			},
			rank: 1,
			xp: 1000 - spent,
			entry: ['NewTalent -5 E2E Steady tier 1 rank 1'],
		},
	);
	await e2e.step('#36 D2 the new talent undone from the Experience Journal, and Yes answered', async () => {
		asked = await undoAndAnswer('NewTalent -5 E2E Steady', 'yes');
	});
	spent -= 5;
	e2e.expect(
		'#36 D2 undoing a new talent deletes it, with its effect, and gives its XP back',
		{ talent: await talent('E2E Steady'), ...(await page((name) => window.characterE2E.appliedEffects(name), A)), xp: await xp() },
		{ talent: null, effects: [], soak: 0, xp: 1000 - spent },
	);
	await e2e.step('#36 D3 a ranked tier 1 talent dropped', () => drop('Grit'));
	spent += 5;
	e2e.expect('#36 D3 with no other tier 1 talent, the Talents tab offers no rank 2 at tier 2', await talent('E2E Grit'), {
		rank: 1,
		tier: 1,
		row: 'E2E Grit 1',
		rowTier: '1',
		description: 'Grit holds.',
		canUpgrade: false,
	});
	await e2e.step('#36 D4 another tier 1 talent dropped', () => drop('Quick'));
	spent += 5;
	await e2e.step('#36 D5 the ranked talent bought a rank from the Talents tab, counting the writes', async () => {
		await page((name) => window.characterE2E.startCounting(name), A);
		await page((name) => window.characterE2E.upgradeTalent(name, 'E2E Grit'), A);
	});
	spent += 10;
	const gritWrites = await page(() => window.characterE2E.stopCounting(), undefined);
	e2e.log('#36 D5 sheet renders while buying a talent rank', gritWrites.renders);
	e2e.expect(
		'#36 D5 a talent rank bought on the Talents tab costs 10 XP at tier 2, and its row shows the talent with its new rank and tier',
		{ ...(await talent('E2E Grit')), xp: await xp(), entry: await journalTail(1) },
		{
			rank: 2,
			tier: 2,
			row: 'E2E Grit 2',
			rowTier: '2',
			description: 'Grit holds.',
			canUpgrade: false,
			xp: 1000 - spent,
			entry: [`TalentRank -10 E2E Grit tier 2 rank 2`],
		},
	);
	e2e.expect(
		'#36 D5 a bought talent rank is one item update and one actor update',
		{ updateItem: gritWrites.updateItem, updateActor: gritWrites.updateActor, createItem: gritWrites.createItem },
		{ updateItem: 1, updateActor: 1, createItem: 0 },
	);
	await notifications();
	await e2e.step('#36 D6 the ranked talent dropped again, with no room at tier 3', () => drop('Grit'));
	e2e.expect(
		'#36 D6 a talent rank by drop is refused when the Talent Pyramid has no room, with a notification',
		{ rank: (await talent('E2E Grit'))?.rank, xp: await xp(), notifications: await notifications() },
		{
			rank: 2,
			xp: 1000 - spent,
			notifications: [await notified('Genesys.Notifications.CannotPurchaseTalentTier', { tier: 3, lowerTier: 2, minimum: 2 })],
		},
	);
	await e2e.step('#36 D7 the ranked talent dropped again under Ignore Talent Pyramid', async () => {
		await setHouseRules({ ignoreTalentPyramid: true });
		await drop('Grit');
	});
	spent += 15;
	e2e.expect(
		'#36 D7 under Ignore Talent Pyramid, a talent rank by drop is bought at its next tier',
		{ rank: (await talent('E2E Grit'))?.rank, xp: await xp(), entry: await journalTail(1) },
		{ rank: 3, xp: 1000 - spent, entry: ['TalentRank -15 E2E Grit tier 3 rank 3'] },
	);
	await e2e.step('#36 D8 Talent Tier Versions turned on and the sheet reopened', async () => {
		await setHouseRules({ ignoreTalentPyramid: false, talentTierVersions: true });
		await reopen();
	});
	e2e.expect('#36 D8 under Talent Tier Versions, the Talents tab offers no rank', (await talent('E2E Grit'))?.canUpgrade, false);
	await e2e.step('#36 D9 the tier 1 version of the ranked talent dropped under Talent Tier Versions', () => drop('Grit'));
	spent += 5;
	e2e.expect(
		"#36 D9 under Talent Tier Versions, a rank is bought at the dropped version's tier",
		{ rank: (await talent('E2E Grit'))?.rank, xp: await xp(), entry: await journalTail(1) },
		{ rank: 4, xp: 1000 - spent, entry: ['TalentRank -5 E2E Grit tier 1 rank 4'] },
	);
	await e2e.step('#36 D10 Talent Tier Versions turned off, and the unranked talent dropped again', async () => {
		await setHouseRules({ talentTierVersions: false });
		await reopen();
		await notifications();
		await drop('Quick');
	});
	e2e.expect(
		'#36 D10 an unranked talent the character holds is refused, with a notification',
		{ xp: await xp(), notifications: await notifications() },
		{ xp: 1000 - spent, notifications: [await notified('Genesys.Notifications.TalentNotRanked', { talentName: 'E2E Quick' })] },
	);

	// Undoing entries, and the refusals.
	const refusal = async (step: string, name: string, entry: string, key: string, data: Record<string, unknown>) => {
		const before = await page((name) => window.characterE2E.journal(name), A);
		await notifications();
		await e2e.step(`#36 ${step} undo ${entry}`, () => undo(entry));
		e2e.expect(
			`#36 ${step} ${name}`,
			{ journal: await page((name) => window.characterE2E.journal(name), A), notifications: await notifications() },
			{ journal: before, notifications: [await notified(key, data)] },
		);
	};
	const ids = await page(() => {
		const actor = game.actors.getName('E2E Advancer');
		return { grit: actor.items.getName('E2E Grit').id, ranged: actor.items.getName('Ranged').id };
	}, undefined);
	await refusal(
		'E1',
		'undoing a characteristic raise a later raise builds on is refused',
		'Characteristic -30 brawn 3',
		'Genesys.Notifications.CannotDeleteCharacteristic',
		{
			characteristic: 'brawn',
			rank: 3,
		},
	);
	await refusal(
		'E2',
		'undoing a skill rank a later rank builds on is refused',
		'Skill -5 Ranged 1',
		'Genesys.Notifications.CannotDeleteSkill',
		{
			name: 'Ranged',
			id: ids.ranged,
			rank: 1,
		},
	);
	await refusal(
		'E3',
		"undoing a talent entry that isn't its latest rank is refused",
		'NewTalent -5 E2E Grit',
		'Genesys.Notifications.CannotDeleteExistingTalent',
		{ name: 'E2E Grit', id: ids.grit, tier: 1, rank: 1 },
	);
	await refusal(
		'E4',
		'undoing a talent the Talent Pyramid rests on is refused',
		'NewTalent -5 E2E Quick',
		'Genesys.Notifications.CannotDeleteInvalidTalentPyramid',
		{ rank: 1 },
	);
	await e2e.step('#36 E5 undo the latest talent rank', () => undo('TalentRank -5 E2E Grit'));
	spent -= 5;
	e2e.expect(
		'#36 E5 undoing the latest talent rank lowers the rank and gives its XP back',
		{ rank: (await talent('E2E Grit'))?.rank, xp: await xp() },
		{
			rank: 3,
			xp: 1000 - spent,
		},
	);
	// An XP Award ends Character Creation; undoing the only one goes back to it.
	await e2e.step('#36 E6 an XP Award given from the Experience Journal', () =>
		page((name) => window.characterE2E.award(name, 50, 'E2E award'), A),
	);
	e2e.expect(
		'#36 E6 an XP Award adds its XP, ends Character Creation and lifts the skill rank cap to 5',
		{
			xp: await xp(),
			entry: await journalTail(1),
			canRaise: (await characteristic('agility')).canRaise,
			rangedCanBuy: (await skills(['Ranged'])).Ranged?.canBuy,
		},
		{ xp: 1050 - spent, entry: ['Award 50 E2E award'], canRaise: false, rangedCanBuy: true },
	);
	await e2e.step('#36 E7 undo the XP Award', () => undo('Award 50'));
	e2e.expect(
		'#36 E7 undoing the only XP Award goes back to Character Creation',
		{ xp: await xp(), canRaise: (await characteristic('agility')).canRaise, rangedCanBuy: (await skills(['Ranged'])).Ranged?.canBuy },
		{ xp: 1000 - spent, canRaise: true, rangedCanBuy: false },
	);
	await e2e.step('#36 E8 undo the latest skill rank', () => undo('Skill -10 Ranged 2'));
	spent -= 10;
	e2e.expect(
		'#36 E8 undoing the latest skill rank lowers the rank and gives its XP back',
		{ rank: (await skills(['Ranged'])).Ranged?.rank, xp: await xp() },
		{
			rank: 1,
			xp: 1000 - spent,
		},
	);
	await e2e.step('#36 E9 undo the latest Brawn raise', () => undo('Characteristic -40 brawn 4'));
	spent -= 40;
	e2e.expect(
		'#36 E9 undoing a characteristic raise lowers it with its threshold, and gives its XP back',
		{ ...(await characteristic('brawn')), xp: await xp(), thresholds: await page((name) => window.characterE2E.thresholds(name), A) },
		{ base: 3, shown: 3, sheet: '3', canRaise: true, xp: 1000 - spent, thresholds: { wounds: 13, strain: 13 } },
	);
	await page((name) => window.characterE2E.close(name), A);

	// §#198: a characteristic raised from its base rating, under an Active Effect.
	const E = 'Effect';
	const brawn = async () => ({
		...(await page((name) => window.characterE2E.characteristic(name, 'brawn'), E)),
		xp: await page((name) => window.characterE2E.xp(name), E),
		wounds: (await page((name) => window.characterE2E.thresholds(name), E)).wounds,
	});
	await e2e.step('#198 F0 a character with Brawn 2 and an Active Effect giving +1 Brawn', async () => {
		await page((name) => window.characterE2E.create(name), E);
		await page((name) => window.characterE2E.open(name), E);
		await page((name) => window.characterE2E.applyArchetype(name, 'Plain Archetype'), E);
		await e2e.settle();
		await page(
			() =>
				game.actors
					.getName('E2E Effect')
					.createEmbeddedDocuments('ActiveEffect', [
						{ name: 'E2E +1 Brawn', changes: [{ key: 'system.characteristics.brawn', mode: 2, value: '1' }] },
					]),
			undefined,
		);
	});
	e2e.expect('#198 F0 Brawn shows 3 over a base of 2', await brawn(), {
		base: 2,
		shown: 3,
		sheet: '3',
		canRaise: true,
		xp: 1000,
		wounds: 12,
	});
	const raises = [
		{ cost: 30, base: 3, shown: 4, xp: 970, wounds: 13 },
		{ cost: 40, base: 4, shown: 5, xp: 930, wounds: 14 },
		{ cost: 50, base: 5, shown: 6, xp: 880, wounds: 15 },
	];
	for (const [index, { cost, ...expected }] of raises.entries()) {
		await e2e.step(`#198 F${index + 1} Brawn raised under the effect`, () =>
			page((name) => window.characterE2E.raise(name, 'brawn'), E),
		);
		e2e.expect(
			`#198 F${index + 1} raising Brawn under +1 costs ${cost} XP from its base rating, which the effect still adds to${index === 2 ? ', and no further raise is offered' : ''}`,
			await brawn(),
			{ ...expected, sheet: String(expected.shown), canRaise: index < 2 },
		);
	}
	await e2e.step('#198 F4 undo the last Brawn raise under the effect', () =>
		page((name) => window.characterE2E.undo(name, 'Characteristic -50 brawn 5'), E),
	);
	e2e.expect('#198 F4 undoing the raise puts the base back, with the effect still on top', await brawn(), {
		base: 4,
		shown: 5,
		sheet: '5',
		canRaise: true,
		xp: 930,
		wounds: 14,
	});
	await page((name) => window.characterE2E.close(name), E);
}

/** §#39: a Career whose skills differ in case from the character's, removed, then replaced. */
async function careers(e2e: ScenarioContext, page: Evaluate) {
	const C = 'Careerist';
	const listed = ['Ranged', 'Cool', 'Stealth', 'Perception', 'Charm', 'Brawl', 'Melee', 'Athletics', 'Discipline'];
	const skills = async () => {
		const state = await page((args) => window.characterE2E.skills(args.actor, args.names), { actor: C, names: listed });
		return Object.fromEntries(
			Object.entries(state).map(([name, skill]) => [name, skill && `${skill.career ? 'career' : 'non-career'} ${skill.rank}`]),
		);
	};
	const careerItems = async () => (await page((name) => window.characterE2E.items(name), C)).filter((item) => item.startsWith('career:'));
	const untouched = Object.fromEntries(listed.map((name) => [name, 'non-career 0']));
	const dropCareer = (career: string) =>
		page((args) => window.characterE2E.drop(args.actor, window.characterE2E.worldItem(args.career)), { actor: C, career });
	const prompt = (picks: string[] | null) =>
		page((args) => window.characterE2E.careerPrompt(args.actor, args.picks), { actor: C, picks });

	let offered: string[] = [];
	await e2e.step('#39 G1 a Career naming its skills in another case dropped, and four Free Ranks picked', async () => {
		await page((name) => window.characterE2E.create(name), C);
		await page((name) => window.characterE2E.open(name), C);
		await dropCareer('Career');
		offered = await prompt(['Ranged', 'Cool', 'Stealth', 'Perception']);
	});
	e2e.expect('#39 G1 the Free Rank prompt offers the Career skills whatever their case', [...offered].sort(), [
		'Charm',
		'Cool',
		'Perception',
		'Ranged',
		'Stealth',
	]);
	e2e.expect(
		'#39 G1 the Career marks its skills whatever their case, and gives the picked ones a rank',
		{ skills: await skills(), careers: await careerItems() },
		{
			skills: { ...untouched, Ranged: 'career 1', Cool: 'career 1', Stealth: 'career 1', Perception: 'career 1', Charm: 'career 0' },
			careers: ['career:E2E Career'],
		},
	);
	await e2e.step('#39 G2 the Career deleted from the sheet', () =>
		page((name) => window.characterE2E.menu(name, { meta: 'career' }, 'Genesys.Labels.Delete'), C),
	);
	e2e.expect(
		'#39 G2 deleting the Career unmarks its skills whatever their case, and takes back their Free Ranks',
		{ skills: await skills(), careers: await careerItems() },
		{
			skills: untouched,
			careers: [],
		},
	);
	await e2e.step('#39 G3 the Career dropped again, then another Career dropped over it', async () => {
		await dropCareer('Career');
		await prompt(['Ranged', 'Cool', 'Stealth', 'Charm']);
		await e2e.settle();
		await dropCareer('Other Career');
		offered = await prompt(['Brawl', 'Melee', 'Athletics', 'Discipline']);
	});
	e2e.expect(
		'#39 G3 a Career dropped over another unmarks the first one skills and takes back their Free Ranks',
		{ skills: await skills(), careers: await careerItems() },
		{
			skills: { ...untouched, Brawl: 'career 1', Melee: 'career 1', Athletics: 'career 1', Discipline: 'career 1' },
			careers: ['career:E2E Other Career'],
		},
	);
	let whilePrompted: { skills: Record<string, string | null>; careers: string[] } | undefined;
	await e2e.step('#254 G4 the first Career dropped back over the other, counting the writes', async () => {
		await e2e.settle();
		await page((name) => window.characterE2E.startCounting(name), C);
		await dropCareer('Career');
		await page(() => window.characterE2E.careerPromptOpen(), undefined);
		whilePrompted = { skills: await skills(), careers: await careerItems() };
		await prompt(['Ranged', 'Cool', 'Stealth', 'Charm']);
		await e2e.settle();
	});
	const careerWrites = await page(() => window.characterE2E.stopCounting(), undefined);
	e2e.expect('#254 G4 nothing is written while the Free Rank prompt is open', whilePrompted, {
		skills: { ...untouched, Brawl: 'career 1', Melee: 'career 1', Athletics: 'career 1', Discipline: 'career 1' },
		careers: ['career:E2E Other Career'],
	});
	e2e.expect(
		'#254 G4 the Career is replaced with its Free Ranks, each skill updated once',
		{
			skills: await skills(),
			careers: await careerItems(),
			writes: {
				createItem: careerWrites.createItem,
				updateItem: careerWrites.updateItem,
				deleteItem: careerWrites.deleteItem,
				updateActor: careerWrites.updateActor,
			},
		},
		{
			skills: { ...untouched, Ranged: 'career 1', Cool: 'career 1', Stealth: 'career 1', Perception: 'career 0', Charm: 'career 1' },
			careers: ['career:E2E Career'],
			// The four skills the Other Career lists and the five the Career lists; the Career is created with its Free Ranks.
			writes: { createItem: 1, updateItem: 9, deleteItem: 1, updateActor: 0 },
		},
	);
	await page((name) => window.characterE2E.close(name), C);
}

/** §#199: a skill added to a character whose Career lists it is a career skill. */
async function careerSkillsOnCreation(e2e: ScenarioContext, page: Evaluate) {
	const H = 'Hunter';
	const skill = async (actor: string, name: string) =>
		(await page((args) => window.characterE2E.skills(args.actor, [args.name]), { actor, name }))[name];
	const career = (actor: string, name: string) =>
		page(
			(args) =>
				game.actors
					.getName(`E2E ${args.actor}`)
					.items.find((item: { type: string; name: string }) => item.type === 'skill' && item.name === args.name)?.system
					.career ?? null,
			{ actor, name },
		);
	const deleteSkill = (actor: string, name: string) =>
		page((args) => game.actors.getName(`E2E ${args.actor}`).items.getName(args.name).delete(), { actor, name });
	const dropSkill = (actor: string, name: string) =>
		page((args) => window.characterE2E.drop(args.actor, window.characterE2E.compendiumSkill(args.name)), { actor, name });
	const skillSource = (name: string) =>
		page((name) => {
			const { _id, ...source } = CONFIG.genesys.skills.find((skill: { name: string }) => skill.name === name).toObject();
			return source;
		}, name);
	const worldSource = (name: string) =>
		page((name) => {
			const { _id, ...source } = game.items.getName(`E2E ${name}`).toObject();
			return source;
		}, name);

	await e2e.step(
		'#199 H1 a character with a Career listing Ranged, which then drops Ranged again from the Skills Compendium',
		async () => {
			await page((name) => window.characterE2E.create(name), H);
			await page((name) => window.characterE2E.open(name), H);
			await page((name) => window.characterE2E.applyArchetype(name, 'Plain Archetype'), H);
			await e2e.settle();
			await page((name) => window.characterE2E.drop(name, window.characterE2E.worldItem('Ranger')), H);
			await page((name) => window.characterE2E.careerPrompt(name, null), H);
			await e2e.settle();
			await deleteSkill(H, 'Ranged');
			await e2e.settle();
			await dropSkill(H, 'Ranged');
		},
	);
	e2e.expect('#199 H1 a skill the Career lists, dropped from the Skills Compendium, is a career skill', await skill(H, 'Ranged'), {
		rank: 0,
		career: true,
		star: true,
		canBuy: true,
	});
	await e2e.step('#199 H2 Ranged rank 1 bought', () => page((name) => window.characterE2E.buySkill(name, 'Ranged'), H));
	e2e.expect('#199 H2 its rank 1 costs 5 XP', await page((name) => window.characterE2E.journal(name).slice(-1), H), [
		'Skill -5 Ranged 1',
	]);
	await e2e.step('#199 H3 Stealth, which the Career lists, created by a macro; Cool, which it does not, dropped', async () => {
		await deleteSkill(H, 'Stealth');
		await deleteSkill(H, 'Cool');
		await e2e.settle();
		await page((data) => window.characterE2E.createItems('Hunter', [data]), await skillSource('Stealth'));
		await dropSkill(H, 'Cool');
	});
	e2e.expect(
		'#199 H3 a skill created by a macro is a career skill when the Career lists it; one it does not list keeps its source value',
		{ stealth: await skill(H, 'Stealth'), cool: await skill(H, 'Cool') },
		{ stealth: { rank: 0, career: true, star: true, canBuy: true }, cool: { rank: 0, career: false, star: false, canBuy: true } },
	);
	await e2e.step('#199 H4 a skill the Career does not list, created as a career skill', () =>
		page(
			(items) => window.characterE2E.createItems('Hunter', items),
			[{ name: 'E2E Lore', type: 'skill', system: { category: 'knowledge', characteristic: 'intellect', career: true } }],
		),
	);
	e2e.expect('#199 H4 a skill created as a career skill stays one', await career(H, 'E2E Lore'), true);
	await e2e.step('#199 H5 the Career removed', () =>
		page((name) => window.characterE2E.menu(name, { meta: 'career' }, 'Genesys.Labels.Delete'), H),
	);
	e2e.expect('#199 H5 removing the Career unmarks the dropped skill', await career(H, 'Ranged'), false);
	await page((name) => window.characterE2E.close(name), H);

	await e2e.step('#199 H6 a character created with a Career and Ranged, and Ranged created with a Career on another', async () => {
		const ranger = await worldSource('Ranger');
		await page((items) => window.characterE2E.create('Imported', 'character', items), [ranger, await skillSource('Ranged')]);
		await page((name) => window.characterE2E.create(name), 'Batch');
		await deleteSkill('Batch', 'Ranged');
		await e2e.settle();
		await page((items) => window.characterE2E.createItems('Batch', items), [ranger, await skillSource('Ranged')]);
	});
	e2e.expect(
		'#199 H6 a skill created with its actor, or in the same batch as the Career, keeps its source value',
		{ imported: await career('Imported', 'Ranged'), batch: await career('Batch', 'Ranged') },
		{ imported: false, batch: false },
	);
	await e2e.step('#199 H7 Ranged dropped on a rival, and Survival created on a rival holding a Career', async () => {
		await page((name) => window.characterE2E.create(name, 'rival'), 'Rival');
		await page((name) => window.characterE2E.open(name), 'Rival');
		await dropSkill('Rival', 'Ranged');
		await page((items) => window.characterE2E.createItems('Rival', items), [await worldSource('Ranger')]);
		await e2e.settle();
		await page((items) => window.characterE2E.createItems('Rival', items), [await skillSource('Survival')]);
	});
	e2e.expect(
		"#199 H7 a rival's skills are no career skills",
		{ ranged: await career('Rival', 'Ranged'), survival: await career('Rival', 'Survival') },
		{ ranged: false, survival: false },
	);
	await e2e.step('#199 H8 Ranged dropped on a vehicle, and Survival created on a vehicle holding a Career', async () => {
		await page((name) => window.characterE2E.create(name, 'vehicle'), 'Hauler');
		await page((name) => window.characterE2E.open(name), 'Hauler');
		await dropSkill('Hauler', 'Ranged');
		await page((items) => window.characterE2E.createItems('Hauler', items), [await worldSource('Ranger')]);
		await e2e.settle();
		await page((items) => window.characterE2E.createItems('Hauler', items), [await skillSource('Survival')]);
	});
	// The vehicle sheet takes no skill by drop: a skill reaches a vehicle only through a macro.
	e2e.expect(
		"#199 H8 a vehicle's skills are no career skills",
		{ ranged: await career('Hauler', 'Ranged'), survival: await career('Hauler', 'Survival') },
		{ ranged: null, survival: false },
	);
	await page((name) => window.characterE2E.close(name), 'Hauler');
}

/** §#114, §#202: marking super-characteristics through the sheet. */
async function superCharacteristics(e2e: ScenarioContext, page: Evaluate, notifications: () => Promise<string[]>) {
	const S = 'Super';
	// Marks or unmarks a characteristic from its menu, then waits for the update.
	const flip = async (actor: string, c: Characteristic) => {
		const supers = await page((actor) => window.characterE2E.superCharacteristics(actor), actor);
		const key = supers.stored.includes(c) ? 'Genesys.Labels.UnmarkSuperCharacteristic' : 'Genesys.Labels.MarkSuperCharacteristic';
		await page((args) => window.characterE2E.menu(args.actor, { characteristic: args.c }, args.key), { actor, c, key });
		await e2e.settle();
	};
	const state = async (actor: string) => {
		const { stored, stars } = await page((actor) => window.characterE2E.superCharacteristics(actor), actor);
		return { stored, stars, notifications: await notifications() };
	};
	const warning = 'warning: Genesys.Notifications.TooManySuperCharacteristics';

	await e2e.step('#114 I1 Super-Characteristics on, a character in Character Creation with 30 XP marks then unmarks Brawn', async () => {
		await page((rules) => window.e2e.setSettings(rules), { useSuperCharacteristics: true });
		await page((name) => window.characterE2E.create(name), S);
		await page((name) => window.characterE2E.open(name), S);
		await page((name) => window.characterE2E.applyArchetype(name, 'Small Archetype'), S);
		await e2e.settle();
		await notifications();
		await flip(S, 'brawn');
		e2e.expect('#114 I1 with Starting XP left, marking Brawn is allowed', await state(S), {
			stored: ['brawn'],
			stars: ['brawn'],
			notifications: [],
		});
		await flip(S, 'brawn');
	});
	e2e.expect('#114 I1 with Starting XP left, unmarking Brawn is allowed', await state(S), { stored: [], stars: [], notifications: [] });
	await e2e.step('#202 I2 Brawn, Agility then Intellect marked', async () => {
		await flip(S, 'brawn');
		await flip(S, 'agility');
		await flip(S, 'intellect');
	});
	e2e.expect('#202 I2 a third super-characteristic is refused with a warning', await state(S), {
		stored: ['agility', 'brawn'],
		stars: ['brawn', 'agility'],
		notifications: [warning],
	});
	await e2e.step('#202 I3 Agility unmarked, Cunning marked', async () => {
		await flip(S, 'agility');
		await flip(S, 'cunning');
	});
	e2e.expect('#202 I3 unmarking one makes room for another', await state(S), {
		stored: ['brawn', 'cunning'],
		stars: ['brawn', 'cunning'],
		notifications: [],
	});
	await e2e.step('#114 I4 all Starting XP spent on Brawn, then Cunning unmarked and Agility marked', async () => {
		await page((name) => window.characterE2E.raise(name, 'brawn'), S);
		await e2e.settle();
		await flip(S, 'cunning');
		await flip(S, 'agility');
	});
	e2e.expect(
		'#114 I4 with no Starting XP left, during Character Creation, marking and unmarking is allowed',
		{
			xp: await page((name) => window.characterE2E.xp(name), S),
			...(await state(S)),
		},
		{ xp: 0, stored: ['agility', 'brawn'], stars: ['brawn', 'agility'], notifications: [] },
	);
	await e2e.step('#114 I5 an XP Award given', () => page((name) => window.characterE2E.award(name, 10, 'E2E award'), S));
	e2e.expect(
		'#114 I5 after an XP Award, the characteristics offer no super-characteristic menu',
		{
			menus: await page(async (name) => {
				const labels = [];
				for (const c of ['brawn', 'agility', 'intellect'] as const)
					labels.push(...(await window.characterE2E.menu(name, { characteristic: c })));
				return labels;
			}, S),
			...(await state(S)),
		},
		{ menus: [], stored: ['agility', 'brawn'], stars: ['brawn', 'agility'], notifications: [] },
	);
	await page((name) => window.characterE2E.close(name), S);

	await e2e.step('#202 I6 an actor given three super-characteristics by a macro marks Intellect, then unmarks Cunning', async () => {
		await page((name) => window.characterE2E.create(name), 'Super Three');
		await page(
			() => game.actors.getName('E2E Super Three').update({ 'system.superCharacteristics': ['brawn', 'agility', 'cunning'] }),
			undefined,
		);
		await page((name) => window.characterE2E.open(name), 'Super Three');
		await notifications();
		await flip('Super Three', 'intellect');
		e2e.expect('#202 I6 with three stored, marking a fourth is refused', await state('Super Three'), {
			stored: ['agility', 'brawn', 'cunning'],
			stars: ['brawn', 'agility', 'cunning'],
			notifications: [warning],
		});
		await flip('Super Three', 'cunning');
	});
	e2e.expect('#202 I6 with three stored, unmarking one leaves two', await state('Super Three'), {
		stored: ['agility', 'brawn'],
		stars: ['brawn', 'agility'],
		notifications: [],
	});
	await page((name) => window.characterE2E.close(name), 'Super Three');

	await e2e.step('#202 I7 a rival marks Brawn, Agility then Intellect', async () => {
		await page((name) => window.characterE2E.create(name, 'rival'), 'Super Rival');
		await page((name) => window.characterE2E.open(name), 'Super Rival');
		await notifications();
		await flip('Super Rival', 'brawn');
		await flip('Super Rival', 'agility');
		await flip('Super Rival', 'intellect');
	});
	e2e.expect('#202 I7 a rival is refused a third super-characteristic with a warning', await state('Super Rival'), {
		stored: ['agility', 'brawn'],
		stars: ['brawn', 'agility'],
		notifications: [warning],
	});
	await e2e.step('#202 I8 the rival unmarks Agility, marks Cunning', async () => {
		await flip('Super Rival', 'agility');
		await flip('Super Rival', 'cunning');
	});
	e2e.expect('#202 I8 a rival unmarking one can mark another', await state('Super Rival'), {
		stored: ['brawn', 'cunning'],
		stars: ['brawn', 'cunning'],
		notifications: [],
	});
	await page((name) => window.characterE2E.close(name), 'Super Rival');
	await page((rules) => window.e2e.setSettings(rules), { useSuperCharacteristics: false });
}

/** §#114: the Skills tab's order, and a rival's Free Ranks. */
async function skillsTab(e2e: ScenarioContext, page: Evaluate) {
	await e2e.step('#114 J1 a character with a skill whose name starts with an accent, and one in lower case', async () => {
		await page((name) => window.characterE2E.create(name), 'Sorted');
		await page(
			(items) => window.characterE2E.createItems('Sorted', items),
			[
				{ name: 'Éloquence', type: 'skill', system: { category: 'social', characteristic: 'presence' } },
				{ name: 'charm', type: 'skill', system: { category: 'social', characteristic: 'presence' } },
			],
		);
		await page((name) => window.characterE2E.open(name), 'Sorted');
	});
	e2e.expect(
		'#114 J1 each skill category sorts by name in the language, an accented letter with its plain one and cases together, the categories in their order',
		await page((name) => window.characterE2E.socialSkills(name), 'Sorted'),
		{
			categories: await page(
				() =>
					['GeneralSkills', 'MagicSkills', 'CombatSkills', 'SocialSkills', 'KnowledgeSkills'].map((key) =>
						game.i18n.localize(`Genesys.Labels.${key}`),
					),
				undefined,
			),
			social: ['charm', 'Charm', 'Coercion', 'Deception', 'Éloquence', 'Leadership', 'Negotiation'],
		},
	);
	await page((name) => window.characterE2E.close(name), 'Sorted');

	await e2e.step('#114 J2 Rank Up twice then Rank Down three times on a rival skill', async () => {
		await page((name) => window.characterE2E.open(name), 'Rival');
		for (const label of ['FreeRankUp', 'FreeRankUp', 'FreeRankDown', 'FreeRankDown', 'FreeRankDown']) {
			await page((label) => window.characterE2E.menu('Rival', { adversarySkill: 'Ranged' }, `Genesys.Labels.${label}`), label);
			await e2e.settle();
		}
	});
	e2e.expect(
		"#114 J2 a rival skill's Rank Down stops at 0",
		await page(() => game.actors.getName('E2E Rival').items.getName('Ranged').system.rank, undefined),
		0,
	);
	await page((name) => window.characterE2E.close(name), 'Rival');
}

/** §#110: the Talent Pyramid summary under Ignore Talent Pyramid. */
async function talentPyramidSummary(e2e: ScenarioContext, page: Evaluate) {
	const P = 'Pyramid';
	const pyramid = () => page((name) => window.characterE2E.pyramid(name), P);
	const counts = ['2/∞', '1/1', '0/0', '0/0', '0/0'];
	await e2e.step('#110 K1 a character with two tier 1 talents and one tier 2 talent, its sheet open', async () => {
		await page((name) => window.characterE2E.create(name), P);
		await page(
			(names) =>
				window.characterE2E.createItems(
					'Pyramid',
					names.map((name) => game.items.getName(`E2E ${name}`).toObject()),
				),
			['Quick', 'Swift', 'Bold'],
		);
		await page((name) => window.characterE2E.open(name), P);
	});
	e2e.expect('#110 K1 the Talents tab shows the tier counts and limits', await pyramid(), { summary: counts, roundedTop: false });
	// The open sheet keeps its summary until the reload Foundry asks for; the purchase checks read the new value at once.
	let reload = { reloadAsked: null as unknown, applied: false };
	await e2e.step('#110 K2 Ignore Talent Pyramid turned on in the game settings, with the sheet open', async () => {
		reload = await page(async (key) => {
			const app = game.settings.sheet;
			await window.e2e.render(app, () => app.form?.[key]);
			// Confirming the reload would reload every client and end the scenario: the step records the request instead.
			const settingsConfig = app.constructor;
			const reloadConfirm = settingsConfig.reloadConfirm;
			let asked: unknown = null;
			settingsConfig.reloadConfirm = async (options: unknown) => {
				asked = options;
			};
			// Only this setting is submitted: rewriting the others runs core onChanges, such as the performance mode's,
			// that need the canvas this scenario doesn't draw.
			for (const field of app.form.elements) field.disabled = field.name !== key;
			try {
				app.form[key].checked = true;
				await app.submit();
			} finally {
				settingsConfig.reloadConfirm = reloadConfirm;
			}
			await app.close();
			await window.e2e.settle();
			return { reloadAsked: asked, applied: CONFIG.genesys.settings.ignoreTalentPyramid as boolean };
		}, 'genesys.ignoreTalentPyramid');
	});
	e2e.expect('#110 K2 the game settings ask to reload every client', reload.reloadAsked, { world: true });
	e2e.expect('#110 K2 the purchase checks read the new value at once', reload.applied, true);
	await e2e.step('#110 K3 the sheet reopened', () => page((name) => window.characterE2E.reopen(name), P));
	e2e.expect(
		'#110 K3 under Ignore Talent Pyramid, the Talents tab shows no summary, and the block below takes its rounded top',
		await pyramid(),
		{
			summary: null,
			roundedTop: true,
		},
	);
	await e2e.step('#110 K4 Ignore Talent Pyramid turned off and the sheet reopened', async () => {
		await page((rules) => window.e2e.setSettings(rules), { ignoreTalentPyramid: false });
		await page((name) => window.characterE2E.reopen(name), P);
	});
	e2e.expect('#110 K4 the summary is back with its counts and limits', await pyramid(), { summary: counts, roundedTop: false });
	await page((name) => window.characterE2E.close(name), P);
}

/** §#242: a talent's numeric changes count once per rank, on every Foundry version. */
async function talentRanks(e2e: ScenarioContext, page: Evaluate) {
	const R = 'Ranked';
	const soak = async () => (await page((name) => window.characterE2E.appliedEffects(name), R)).soak;
	await e2e.step('#242 A0 a character without talents', () => page((name) => window.characterE2E.create(name), R));
	const before = await soak();
	await e2e.step('#242 A1 a rank 3 talent added, whose effect adds 1 and 2 to the soak', () =>
		page(
			(name) =>
				window.characterE2E.createItems(name, [
					{
						name: 'E2E Hardened',
						type: 'talent',
						system: { activation: { type: 'passive', detail: '' }, tier: 1, ranked: 'yes', rank: 3 },
						effects: [
							{
								name: 'E2E Hardened',
								transfer: true,
								// v14 keeps a number as a number, where v13 turns it into a string.
								changes: [
									{ key: 'system.soak', mode: 2, value: '1' },
									{ key: 'system.soak', mode: 2, value: 2 },
								],
							},
						],
					},
				]),
			R,
		),
	);
	e2e.expect('#242 A1 each numeric change of a rank 3 talent counts three times', { added: (await soak()) - before }, { added: 9 });
}

/** §#252: the Talents tab's groups, and their order. */
async function talentsTab(e2e: ScenarioContext, page: Evaluate) {
	const L = 'Lister';
	const entry = (name: string, type: 'talent' | 'ability', activation: string, detail = '', tier = 1) => ({
		name: `E2E ${name}`,
		type,
		system: { activation: { type: activation, detail }, ...(type === 'talent' ? { tier } : {}) },
	});
	await e2e.step(
		'#252 C1 a character with active and passive talents and abilities of several tiers and details, its sheet open',
		async () => {
			await page((name) => window.characterE2E.create(name), L);
			await page((args) => window.characterE2E.createItems(args.name, args.items), {
				name: L,
				items: [
					entry('Toughened', 'talent', 'passive', '', 2),
					entry('Quick Strike', 'talent', 'active', 'Maneuver', 2),
					entry('Parry', 'talent', 'active', 'Incidental, Out of Turn', 1),
					entry('Dodge', 'talent', 'active', '', 3),
					entry('Brace', 'talent', 'active', 'maneuver', 1),
					entry('Rapid Reaction', 'talent', 'active', '', 1),
					entry('Grit', 'talent', 'passive', '', 1),
					entry('Sturdy', 'ability', 'passive'),
					entry('Nimble', 'ability', 'active', 'Maneuver'),
					entry('Keen Eyes', 'ability', 'passive'),
					entry('Rally', 'ability', 'active'),
				],
			});
			await page((name) => window.characterE2E.open(name), L);
		},
	);
	e2e.expect(
		'#252 C1 the Talents tab lists active then passive ones, those with an activation detail under it whatever its case, each by tier then name',
		await page((name) => window.characterE2E.talentsTab(name), L),
		{
			abilities: ['[Active]', 'Rally', '[[maneuver]]', 'Nimble', '[Passive]', 'Keen Eyes', 'Sturdy'],
			talents: [
				'[Active]',
				'Rapid Reaction',
				'Dodge',
				'[[maneuver]]',
				'Brace',
				'Quick Strike',
				'[[incidental, out of turn]]',
				'Parry',
				'[Passive]',
				'Grit',
				'Toughened',
			],
		},
	);

	const trash = (answer: 'yes' | 'no') =>
		page(
			async (args) => {
				window.characterE2E.trashTalentRow(args.actor, 'Rally');
				return window.e2e.answerConfirm(args.answer);
			},
			{ actor: L, answer },
		);
	const rally = async () => (await page((name) => window.characterE2E.items(name), L)).filter((item) => item.endsWith(':E2E Rally'));
	let asked: Awaited<ReturnType<typeof trash>> = null;
	await e2e.step("#252 C2 the trash icon of Lister's ability Rally clicked, and No answered", async () => {
		asked = await trash('no');
	});
	e2e.expect(
		"#252 C2 the Talents tab's trash icon asks in Foundry's deletion dialog, which names the ability, No by default, and No keeps it",
		{ asked, rally: await rally() },
		{
			asked: {
				application: 'DialogV2',
				title: 'Delete Item: E2E Rally',
				content: 'Are You Sure? This Item will be permanently deleted and cannot be recovered.',
				buttons: ['yes', 'no'],
				defaultButton: 'no',
			},
			rally: ['ability:E2E Rally'],
		},
	);
	await e2e.step("#252 C3 the trash icon of Lister's ability Rally clicked, and Yes answered", async () => {
		asked = await trash('yes');
	});
	e2e.expect('#252 C3 Yes deletes the ability', await rally(), []);
	await page((name) => window.characterE2E.close(name), L);
}

/** §#126: the severity cells of Critical Injuries and Critical Hits, and the check they open. */
async function injuries(e2e: ScenarioContext, page: Evaluate) {
	const severities = ['-', 'easy', 'average', 'hard', 'daunting', 'formidable'];
	const injuries = severities.map((severity) => ({ name: `E2E ${severity}`, type: 'injury', system: { severity } }));
	const cells = { '-': '', easy: 'D', average: 'DD', hard: 'DDD', daunting: 'DDDD', formidable: 'DDDDD' };
	await e2e.step('#126 L1 a character and a vehicle with one Critical Injury or Hit of each severity', async () => {
		await page((name) => window.characterE2E.create(name), 'Wounded');
		await page((name) => window.characterE2E.create(name), 'Mechanic');
		await page((name) => window.characterE2E.create(name, 'vehicle'), 'Wreck');
		await page((items) => window.characterE2E.createItems('Wounded', items), injuries);
		await page((items) => window.characterE2E.createItems('Wreck', items), injuries);
		await page(
			() =>
				game.actors.getName('E2E Wreck').update({
					'system.roles': [
						{
							id: 'e2erepairs',
							name: 'Repairs',
							skills: ['Mechanics'],
							members: [game.actors.getName('E2E Wounded').uuid, game.actors.getName('E2E Mechanic').uuid],
						},
					],
				}),
			undefined,
		);
		await page((name) => window.characterE2E.open(name), 'Wounded');
		await page((name) => window.characterE2E.open(name), 'Wreck');
	});
	e2e.expect(
		'#126 L1 each Critical Injury shows a difficulty die per step of its severity',
		await page((name) => window.characterE2E.severities(name), 'Wounded'),
		cells,
	);
	e2e.expect(
		'#126 L1 each Critical Hit shows a difficulty die per step of its severity',
		await page((name) => window.characterE2E.severities(name), 'Wreck'),
		cells,
	);
	let prompt: unknown;
	await e2e.step('#126 L2 the Formidable Critical Injury clicked', async () => {
		await page(() => window.characterE2E.clickSeverity('Wounded', 'formidable'), undefined);
		prompt = await page(() => window.characterE2E.dicePrompt(), undefined);
	});
	e2e.expect('#126 L2 a Formidable Critical Injury opens the healing check with five difficulty dice', prompt, {
		actor: 'E2E Wounded',
		skill: 'Resilience',
		difficulty: 'DDDDD',
		difficultyDice: 5,
	});
	let members: string[] = [];
	await e2e.step('#126 L3 the Formidable Critical Hit clicked, and the repairer chosen', async () => {
		await page(() => window.characterE2E.clickSeverity('Wreck', 'formidable'), undefined);
		members = await page(() => window.characterE2E.crewPrompt('Mechanic'), undefined);
		prompt = await page(() => window.characterE2E.dicePrompt(), undefined);
	});
	e2e.expect('#126 L3 the repairer is chosen among the crew', members, ['E2E Wounded', 'E2E Mechanic']);
	e2e.expect('#126 L3 a Formidable Critical Hit opens the repair check with five difficulty dice', prompt, {
		actor: 'E2E Mechanic',
		skill: 'Mechanics',
		difficulty: 'DDDDD',
		difficultyDice: 5,
	});
	await page(async () => {
		await window.characterE2E.close('Wounded');
		await window.characterE2E.close('Wreck');
	}, undefined);
}

/** §#200: a talent's tier kept from 1 to 5, and one saved above 5 read as 5. */
async function talentTiers(
	e2e: ScenarioContext,
	page: Evaluate,
	notified: (key: string, data?: Record<string, unknown>) => Promise<string>,
	notifications: () => Promise<string[]>,
) {
	const { gm } = e2e;
	const stored = (uuid: string) => page((uuid) => fromUuidSync(uuid)._source.system.tier, uuid);
	let uuid = '';
	await e2e.step('#200 M1 a talent created at tier 8, then set to 3 and updated to 8', async () => {
		uuid = await page(async () => (await Item.create({ name: 'E2E Tier Eight', type: 'talent', system: { tier: 8 } })).uuid, undefined);
	});
	const created = await stored(uuid);
	await page((uuid) => fromUuidSync(uuid).update({ 'system.tier': 3 }), uuid);
	await page((uuid) => fromUuidSync(uuid).update({ 'system.tier': 8 }), uuid);
	e2e.expect(
		'#200 M1 a talent created or updated above tier 5 is stored at tier 5',
		{ created, updated: await stored(uuid) },
		{ created: 5, updated: 5 },
	);
	await page((uuid) => fromUuidSync(uuid).update({ 'system.tier': 3 }), uuid);
	let shown = '';
	await e2e.step("#200 M2 8 typed in the talent sheet's Tier", async () => {
		shown = await page((uuid) => window.characterE2E.typeTier(uuid, 8), uuid);
	});
	e2e.expect(
		"#200 M2 typing 8 in the talent sheet's Tier stores and shows 5",
		{ shown, stored: await stored(uuid) },
		{ shown: '5', stored: 5 },
	);

	// A world saved before #174: tier 6 written to the database, past the cleaning that now keeps it at 5.
	const targets: Record<string, string> = {};
	await e2e.step(
		'#200 M3 talents saved at tier 6 in the Items directory, on a character and in a compendium, then the world reloaded',
		async () => {
			targets.world = await page(() => window.characterE2E.worldItem('Old Talent'), undefined);
			await page((name) => window.characterE2E.create(name), 'Veteran');
			await page(
				(data) => window.characterE2E.createItems('Veteran', [data]),
				await page(() => game.items.getName('E2E Old Talent').toObject(), undefined),
			);
			targets.actor = await page(() => game.actors.getName('E2E Veteran').items.getName('E2E Old Talent').uuid, undefined);
			targets.pack = await page(() => window.characterE2E.createPack(), undefined);
			for (const target of Object.values(targets)) await page((uuid) => window.characterE2E.seedTier({ uuid }, 6), target);
			const errors = gm.errors.length;
			await gm.reload();
			await gm.evaluate(installCharacterHelpers);
			e2e.log('#200 M3 console errors while loading the world', gm.errors.slice(errors));
		},
	);
	const loaded: Record<string, unknown> = {};
	for (const [where, target] of Object.entries(targets)) {
		loaded[where] = {
			...(await page((uuid) => window.characterE2E.loadedTalent(uuid), target)),
			database: await page((uuid) => window.characterE2E.storedTier({ uuid }), target),
			sheet: await page((uuid) => window.characterE2E.talentSheetTier(uuid), target),
		};
	}
	const asFive = { tier: 5, source: 5, invalid: false, database: 6, sheet: '5' };
	e2e.expect(
		'#200 M3 a talent saved at tier 6 loads with no error and reads as tier 5, while the database keeps 6 until it is saved again',
		loaded,
		{ world: asFive, actor: asFive, pack: asFive },
	);
	e2e.expect(
		'#200 M3 a talent saved at tier 6 counts once at tier 5 in the Talent Pyramid',
		await page((name) => window.characterE2E.pyramidTotals(name), 'Veteran'),
		{
			1: 0,
			2: 0,
			3: 0,
			4: 0,
			5: 1,
		},
	);
	await e2e.step('#200 M4 the talent saved at tier 6 dropped on a character, with then without the Talent Pyramid', async () => {
		await page((name) => window.characterE2E.create(name), 'Buyer');
		await page((name) => window.characterE2E.open(name), 'Buyer');
		await page((name) => window.characterE2E.applyArchetype(name, 'Plain Archetype'), 'Buyer');
		await e2e.settle();
		await notifications();
		await page((name) => window.characterE2E.drop(name, window.characterE2E.worldItem('Old Talent')), 'Buyer');
		await e2e.settle();
		e2e.expect('#200 M4 the Talent Pyramid refuses a talent saved at tier 6 as a tier 5 one', await notifications(), [
			await notified('Genesys.Notifications.CannotPurchaseTalentTier', { tier: 5, lowerTier: 4, minimum: 2 }),
		]);
		await page((rules) => window.e2e.setSettings(rules), { ignoreTalentPyramid: true });
		await page((name) => window.characterE2E.drop(name, window.characterE2E.worldItem('Old Talent')), 'Buyer');
	});
	e2e.expect(
		'#200 M4 under Ignore Talent Pyramid, a talent saved at tier 6 costs 25 XP',
		await page((name) => window.characterE2E.journal(name).slice(-1), 'Buyer'),
		['NewTalent -25 E2E Old Talent tier 5 rank 1'],
	);
	await page((rules) => window.e2e.setSettings(rules), { ignoreTalentPyramid: false });
	await page((name) => window.characterE2E.close(name), 'Buyer');
}
