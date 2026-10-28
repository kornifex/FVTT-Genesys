/** @file #215: adversary drops and talent ranks, the adversary's defense cap, and token bar changes within the rules' bounds. */
import type { ScenarioContext } from '../scenario.ts';

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

type MenuTarget = { actor: string; kind: 'skill' | 'talent'; name: string };

type AdversariesHelpers = {
	setUp(): Promise<void>;
	cleanUp(): Promise<void>;
	items(actor: string): string[];
	/** Drops a world item on an actor's sheet, as from the sidebar. */
	drop(args: { actor: string; item: string }): Promise<Observed>;
	/** The labels of the context menu of an adversary's skill or talent. */
	menu(target: MenuTarget): Promise<string[]>;
	clickMenu(args: MenuTarget & { label: string }): Promise<Observed>;
	/** Clicks a skill of an adversary's sheet and reads the Dice Prompt it opens. */
	rollSkill(args: { actor: string; skill: string }): Promise<PromptState>;
	/** Targets an actor's token, clicks a weapon of the attacker's sheet and reads the Dice Prompt it opens. */
	attack(args: { actor: string; weapon: string; target: string }): Promise<PromptState>;
	/** The values of the inputs of an actor's sheet, by name. */
	sheetInputs(args: { actor: string; names: string[] }): Promise<Record<string, string>>;
	/** Types a value in a number field of an actor's sheet, then returns the value stored. */
	typeInSheet(args: { actor: string; name: string; value: string; path: string }): Promise<unknown>;
	update(args: { actor: string; data: object }): Promise<void>;
	/** Types a change in a bar of the Token HUD of an actor's token, then returns the value stored. */
	hud(args: { actor: string; bar: 'bar1' | 'bar2'; input: string; path: string }): Promise<unknown>;
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

		async clickMenu({ label, ...target }) {
			const item = (await openMenu(target)).find((element) => text(element.querySelector('.menu-label')) === label);
			if (!item) throw new Error(`No menu item ${label} for ${JSON.stringify(target)}`);
			return observe(target.actor, () => item.click());
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
	const clickMenu = (actor: string, kind: 'skill' | 'talent', name: string, label: string) =>
		gm.evaluate((args) => window.adversariesE2E.clickMenu(args), { actor, kind, name, label });
	const update = (actor: string, data: object) => gm.evaluate((args) => window.adversariesE2E.update(args), { actor, data });
	const byAdversary = async <T>(names: Adversary[], action: (name: Adversary) => Promise<T>) => {
		const results: Partial<Record<Adversary, T>> = {};
		for (const name of names) results[name] = await action(name);
		return results;
	};

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
			last = await clickMenu(name, 'talent', 'Toughened', 'Rank Down');
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

	await gm.evaluate(() => window.adversariesE2E.cleanUp());
}
