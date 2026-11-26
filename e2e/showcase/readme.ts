/**
 * @file Builds the demo world of `demoWorld.ts` and takes the README's screenshots into the folder `SHOWCASE_OUT` names
 * (#540). It runs through the harness like a scenario, `pnpm e2e e2e/showcase/readme.ts`, and lives outside
 * `e2e/scenarios/` so that `pnpm e2e:all` never runs it: it proves nothing, it only takes pictures.
 */
import fs from 'node:fs';
import path from 'node:path';

import type { ScenarioContext } from '../scenario.ts';
import { CHARACTER, MINION, type Purchase, RIVAL, VEHICLE, WORLD_ITEMS } from './demoWorld.ts';

// A world of its own: the demo documents never meet another scenario's.
export const isolated = true;

/** Where a window opens: clear of the scene controls on the left and of the Story Point tracker on the top right. */
type Position = { left: number; top: number; width?: number; height?: number | 'auto' };

/**
 * A sheet to show: an actor's or a world item's, by its name, on a tab when given, its content scrolled to the element
 * a selector finds when given.
 */
type Shown = { kind: 'actor' | 'item'; name: string; tab?: string; scrollTo?: string; position: Position };

type ShowcaseHelpers = {
	/** Uploads the portraits into the world's data, and gives the path of each by its file name. */
	upload(files: { name: string; type: string; base64: string }[]): Promise<Record<string, string>>;
	/** Sets the world to Realms of Terrinoth's skills and money, the default Style and the light interface. */
	configure(): Promise<void>;
	setStyle(style: 'genesys' | 'terrinoth'): Promise<void>;
	createWorldItems(items: typeof WORLD_ITEMS, portraits: Record<string, string>): Promise<void>;
	/**
	 * Creates the character and builds him on his sheet as a player would: drops the Archetype and the Career, picks
	 * their skills in the prompts, then makes each purchase and award. Gives the Experience Journal's entries.
	 */
	buildCharacter(character: typeof CHARACTER, portraits: Record<string, string>): Promise<string[]>;
	createAdversary(adversary: typeof MINION | typeof RIVAL, portraits: Record<string, string>): Promise<void>;
	createVehicle(vehicle: typeof VEHICLE, portraits: Record<string, string>): Promise<void>;
	/** Closes every other window, then shows a sheet on its tab, in front: gives its window's id. */
	show(shown: Shown): Promise<string>;
	/** Opens the Dice Prompt from a skill of a character's Skills tab, its sheet closed: gives the prompt's window id. */
	openDicePrompt(actor: string, skill: string, position: Position): Promise<string>;
	/** Clears the notifications and hides any tooltip, so that nothing covers the window. */
	clearOverlays(): Promise<void>;
};

declare global {
	interface Window {
		showcase: ShowcaseHelpers;
	}
}

export async function run(e2e: ScenarioContext) {
	const out = process.env.SHOWCASE_OUT;
	if (!out) throw new Error('Set SHOWCASE_OUT to the folder the screenshots go to.');
	fs.mkdirSync(out, { recursive: true });

	const { gm } = e2e;
	// Tall enough for the character's Skills tab, the longest, to show whole.
	await gm.page.setViewportSize({ width: 1600, height: 1400 });
	await gm.evaluate(installShowcaseHelpers);

	const portraitsDir = path.join(import.meta.dirname, 'portraits');
	const files = fs
		.readdirSync(portraitsDir)
		.filter((name) => name.endsWith('.jpg'))
		.map((name) => ({ name, type: 'image/jpeg', base64: fs.readFileSync(path.join(portraitsDir, name)).toString('base64') }));
	const portraits = await gm.evaluate((files) => window.showcase.upload(files), files);
	e2e.log('portraits', portraits);

	await e2e.step('world configured', () => gm.evaluate(() => window.showcase.configure()));
	e2e.log('interface theme', await gm.evaluate(() => document.body.className));
	await e2e.step('world items created', () =>
		gm.evaluate(({ items, portraits }) => window.showcase.createWorldItems(items, portraits), { items: WORLD_ITEMS, portraits }),
	);
	const journal = await gm.evaluate(({ character, portraits }) => window.showcase.buildCharacter(character, portraits), {
		character: CHARACTER,
		portraits,
	});
	e2e.log('Experience Journal', journal);
	for (const adversary of [MINION, RIVAL]) {
		await e2e.step(`${adversary.name} created`, () =>
			gm.evaluate(({ adversary, portraits }) => window.showcase.createAdversary(adversary, portraits), { adversary, portraits }),
		);
	}
	await e2e.step(`${VEHICLE.name} created`, () =>
		gm.evaluate(({ vehicle, portraits }) => window.showcase.createVehicle(vehicle, portraits), { vehicle: VEHICLE, portraits }),
	);

	const capture = async (file: string, id: string) => {
		// The pointer rests on the empty canvas, where it shows no tooltip.
		await gm.page.mouse.move(800, 700);
		await gm.evaluate(() => window.showcase.clearOverlays());
		await e2e.settle();
		await gm.page.locator(`[id="${id}"]`).screenshot({ path: path.join(out, file), animations: 'disabled' });
		e2e.log(`captured ${file}`, path.join(out, file));
	};
	const show = (shown: Shown) => gm.evaluate((shown) => window.showcase.show(shown), shown);
	const sheet = { left: 120, top: 20, height: 'auto' } as const;
	// Wide enough for the Knowledge skills' names to show whole.
	const characterSheet = { ...sheet, width: 860 };

	await capture('character.png', await show({ kind: 'actor', name: CHARACTER.name, tab: 'skills', position: characterSheet }));
	await capture('combat.png', await show({ kind: 'actor', name: CHARACTER.name, tab: 'combat', position: characterSheet }));
	await capture('talents.png', await show({ kind: 'actor', name: CHARACTER.name, tab: 'talents', position: characterSheet }));
	await capture(
		'journal.png',
		await show({ kind: 'actor', name: CHARACTER.name, tab: 'journal', scrollTo: '.xp-journal', position: characterSheet }),
	);
	await capture('minion.png', await show({ kind: 'actor', name: MINION.name, position: sheet }));
	await capture('rival.png', await show({ kind: 'actor', name: RIVAL.name, position: sheet }));
	await capture('archetype.png', await show({ kind: 'item', name: WORLD_ITEMS.archetype.name, position: sheet }));
	// The Details tab shows the vehicle's illustration, description and profile.
	await capture('vehicle.png', await show({ kind: 'actor', name: VEHICLE.name, tab: 'details', position: sheet }));
	await capture(
		'dice-prompt.png',
		await gm.evaluate(({ actor, position }) => window.showcase.openDicePrompt(actor, 'Melee (Light)', position), {
			actor: CHARACTER.name,
			position: { left: 120, top: 20 },
		}),
	);

	await gm.evaluate(() => window.showcase.setStyle('terrinoth'));
	await capture('character-terrinoth.png', await show({ kind: 'actor', name: CHARACTER.name, tab: 'skills', position: characterSheet }));
	await gm.evaluate(() => window.showcase.setStyle('genesys'));
}

/**
 * Installs `window.showcase`. Playwright sends this function's source to the page, so it uses nothing from this module.
 */
function installShowcaseHelpers() {
	if (window.showcase) return;
	const { settle, sleep, waitFor, text, htmlOf, render, apps, drop } = window.e2e;
	type App = { rendered: boolean; element?: unknown };

	const click = (element: Element | null | undefined, what: string) => {
		if (!element) throw new Error(`No ${what}`);
		(element as HTMLElement).click();
	};
	// The open windows but the Story Point tracker, which stays on the top right.
	const openWindows = () =>
		[...foundry.applications.instances.values()].filter(
			(app: { rendered: boolean; hasFrame?: boolean; id: string }) =>
				app.rendered && app.hasFrame && app.id !== 'story-point-tracker',
		);
	const closeWindows = async () => {
		for (const app of openWindows()) await app.close();
		await settle();
	};
	// A skill's name as a prompt or the Skills tab shows it, without the characteristic in parentheses after it.
	const skillName = (element: Element | null) => text(element).replace(/ \([^()]*\)$/, '');
	// Picks skills in the prompt an Archetype's non-career skills or a Career's Free Ranks open, and confirms.
	const pickSkills = async (names: string[]) => {
		const prompt = await waitFor('the skill prompt', () =>
			apps('app-career-skill-prompt').find(
				(app: App) => app.rendered && htmlOf(app)?.querySelector('.career-skill-prompt .select-skill'),
			),
		);
		const root = htmlOf(prompt)!;
		const buttons = [...root.querySelectorAll<HTMLElement>('.career-skill-prompt .select-skill')];
		for (const name of names) {
			const button = buttons.find((candidate) => skillName(candidate.querySelector('span')) === name);
			click(button, `skill ${name} in the prompt, which offers ${buttons.map((b) => skillName(b.querySelector('span'))).join(', ')}`);
			await waitFor(`${name} picked`, () => button?.classList.contains('selected'));
		}
		click(root.querySelector('.career-skill-prompt footer button'), 'Confirm button');
		await waitFor('the skill prompt to close', () => !prompt.rendered);
	};

	window.showcase = {
		async upload(files) {
			const FilePicker = foundry.applications.apps.FilePicker.implementation;
			const dir = 'showcase';
			try {
				await FilePicker.createDirectory('data', dir, {});
			} catch {
				// The folder is there already, from an earlier run on this world.
			}
			const paths: Record<string, string> = {};
			for (const { name, type, base64 } of files) {
				const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
				const response = await FilePicker.upload('data', dir, new File([bytes], name, { type }), {}, { notify: false });
				if (!response?.path) throw new Error(`The upload of ${name} failed: ${JSON.stringify(response)}`);
				paths[name] = response.path;
			}
			return paths;
		},

		async configure() {
			await game.settings.set('genesys', 'skillsCompendium', 'genesys.rot-skills');
			await waitFor('the Realms of Terrinoth skills', () =>
				CONFIG.genesys.skills.some((skill: { name: string }) => skill.name === 'Knowledge (Lore)'),
			);
			await game.settings.set('genesys', 'currency', 'Silver');
			await game.settings.set('genesys', 'style', 'genesys');
			// The Dice Prompt shows the chance to succeed, and Story Points to spend.
			await game.settings.set('genesys', 'dicePoolApproximation', 10000);
			await game.settings.set('genesys', 'storyPoints', { gm: 2, player: 3 });
			const uiConfig = game.settings.get('core', 'uiConfig');
			await game.settings.set('core', 'uiConfig', { ...uiConfig, colorScheme: { applications: 'light', interface: 'light' } });
			await settle();
		},

		async setStyle(style) {
			await game.settings.set('genesys', 'style', style);
			await settle();
		},

		async createWorldItems(items, portraits) {
			const { portrait, ...archetype } = items.archetype;
			await Item.createDocuments([
				{ ...archetype, img: portraits[portrait] },
				items.career,
				...items.talents.map((talent) => ({ ...talent, type: 'talent' })),
			]);
		},

		async buildCharacter(character, portraits) {
			const img = portraits[character.portrait];
			const actor = await Actor.create({ name: character.name, type: 'character', img, system: { illustration: img } });
			const app = actor.sheet;
			await render(app);
			const sheet = () => htmlOf(app)!;
			const entries = () =>
				actor.system.experienceJournal.entries as { type: string; amount: number; data?: Record<string, unknown> }[];
			const owns = (type: string) => actor.items.some((item: { type: string }) => item.type === type);
			const dropWorldItem = (name: string) => {
				const item = game.items.getName(name);
				if (!item) throw new Error(`No world item ${name}`);
				drop(sheet(), { type: 'Item', uuid: item.uuid });
			};
			const row = (selector: string, label: string, name: string) =>
				[...sheet().querySelectorAll(selector)].find((candidate) => skillName(candidate.querySelector(label)) === name);

			dropWorldItem(character.archetype);
			await pickSkills(character.nonCareerSkills);
			await waitFor('the Archetype', () => owns('archetype') && entries()[0]?.type === 'Starting', 20_000);
			await settle();
			dropWorldItem(character.career);
			await pickSkills(character.freeRanks);
			await waitFor('the Career', () => owns('career'), 20_000);
			await settle();

			const characteristics = ['brawn', 'agility', 'intellect', 'cunning', 'willpower', 'presence'];
			const award = async (amount: number, reason: string) => {
				click(sheet().querySelector('.xp-journal .columns button'), 'XP Award button');
				const prompt = await waitFor('the award XP prompt', () =>
					apps('app-award-xp-prompt').find(
						(candidate: App) => candidate.rendered && htmlOf(candidate)?.querySelector('.award-xp-prompt button'),
					),
				);
				const root = htmlOf(prompt)!;
				const fill = (selector: string, value: string) => {
					const field = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
					if (!field) throw new Error(`No ${selector} in the award XP prompt`);
					field.value = value;
					field.dispatchEvent(new Event('input', { bubbles: true }));
				};
				fill('.award-xp-prompt .amount input', String(amount));
				fill('.award-xp-prompt .reason textarea', reason);
				await settle();
				// Its first button adds the award.
				click(root.querySelector('.award-xp-prompt button'), 'Add button');
			};
			const purchase = async (bought: Purchase) => {
				if ('raise' in bought) {
					const field = sheet().querySelectorAll('.characteristic-field')[characteristics.indexOf(bought.raise)];
					click(field?.querySelector('.characteristic-label .raise'), `raise arrow of ${bought.raise}`);
				} else if ('skill' in bought) {
					click(
						row('.tab-skills .skill.row', '.skill-name span', bought.skill)?.querySelector('.skill-rank button'),
						`rank of ${bought.skill}`,
					);
				} else if ('talent' in bought) {
					dropWorldItem(bought.talent);
				} else if ('upgrade' in bought) {
					const talent = [...sheet().querySelectorAll('.tab-talents .talent')].find(
						(candidate) => text(candidate.querySelector('.name button')).replace(/ \d+$/, '') === bought.upgrade,
					);
					click(talent?.querySelector('button:has(.fa-arrow-circle-up)'), `upgrade arrow of ${bought.upgrade}`);
				} else {
					await award(bought.award, bought.reason);
				}
			};
			for (const bought of character.purchases) {
				const count = entries().length;
				await purchase(bought);
				await waitFor(`the journal entry of ${JSON.stringify(bought)}`, () => entries().length === count + 1, 20_000);
				await settle();
			}

			// One at a time, so that the sheet lists them in this order.
			for (const item of character.equipment) await actor.createEmbeddedDocuments('Item', [item]);
			await actor.update({ system: character.system });
			await settle();
			return entries().map((entry) => `${entry.type} ${entry.amount} ${Object.values(entry.data ?? {}).join(' ')}`.trim());
		},

		async createAdversary(adversary, portraits) {
			const skills = adversary.skills.map(({ name, rank }) => {
				const skill = CONFIG.genesys.skills.find((candidate: { name: string }) => candidate.name === name);
				if (!skill) throw new Error(`No skill ${name} in the Skills Compendium`);
				const data = skill.toObject();
				if (rank !== undefined) data.system.rank = rank;
				return data;
			});
			await Actor.create({
				name: adversary.name,
				type: adversary.type,
				img: portraits[adversary.portrait],
				system: adversary.system,
				items: [...skills, ...adversary.items],
			});
			await settle();
		},

		async createVehicle(vehicle, portraits) {
			const img = portraits[vehicle.portrait];
			const uuidOf = (name: string) => {
				const actor = game.actors.getName(name);
				if (!actor) throw new Error(`No actor ${name} for the Crew of ${vehicle.name}`);
				return actor.uuid;
			};
			const roles = vehicle.roles.map((role) => ({ ...role, id: foundry.utils.randomID(), members: role.members.map(uuidOf) }));
			await Actor.create({
				name: vehicle.name,
				type: 'vehicle',
				img,
				system: { ...vehicle.system, illustration: img, roles },
				items: vehicle.items,
			});
			await settle();
		},

		async show({ kind, name, tab, scrollTo, position }) {
			await closeWindows();
			const document = kind === 'actor' ? game.actors.getName(name) : game.items.getName(name);
			if (!document) throw new Error(`No ${kind} ${name}`);
			const app = document.sheet;
			const root = await render(app);
			if (tab) {
				click(root.querySelector(`.sheet-tabs [data-tab="${tab}"]`), `tab ${tab} of ${name}`);
				await waitFor(`tab ${tab} of ${name}`, () => root.querySelector(`.sheet-tabs [data-tab="${tab}"].active`));
			}
			app.setPosition(position);
			app.bringToFront();
			await settle();
			if (scrollTo) {
				const target = root.querySelector(scrollTo);
				if (!target) throw new Error(`No ${scrollTo} on the sheet of ${name}`);
				target.scrollIntoView({ block: 'end' });
				// What scrolls inside the target shows from its top: the Experience Journal's list, laid out in reverse with its
				// latest entry first, starts scrolled to its end, the top of which is a negative scroll.
				for (const inner of target.querySelectorAll('*')) inner.scrollTop = -inner.scrollHeight;
				await settle();
			}
			return root.id;
		},

		async openDicePrompt(name, skill, position) {
			await closeWindows();
			const actor = game.actors.getName(name);
			const root = await render(actor.sheet);
			const skillRow = [...root.querySelectorAll('.tab-skills .skill.row')].find(
				(candidate) => skillName(candidate.querySelector('.skill-name span')) === skill,
			);
			click(skillRow?.querySelector('.skill-name'), `name of ${skill}`);
			const prompt = await waitFor('the Dice Prompt', () =>
				apps('app-dice-prompt').find((app: App) => app.rendered && htmlOf(app)?.querySelector('.preview')),
			);
			await actor.sheet.close();
			prompt.setPosition(position);
			await settle();
			// The chance to succeed comes from simulated rolls, after the prompt renders.
			await sleep(1500);
			return htmlOf(prompt)!.id;
		},

		async clearOverlays() {
			ui.notifications.clear();
			game.tooltip.deactivate();
			await settle();
		},
	};
}
