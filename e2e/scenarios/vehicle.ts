/** @file #214: a vehicle's Crew and its Roles, its Skills tab, the crew members who roll its checks, and deleting vehicles with their crew. */
import { CLOSED_DESCRIPTION, closedDescription, HIDE_CHEVRON, LONG_DESCRIPTION, SHOW_CHEVRON, shownDescription } from '../descriptions.ts';
import type { Chevron, DescriptionBox } from '../page.ts';
import type { Client, ScenarioContext } from '../scenario.ts';

/**
 * An actor the scenario creates, named `E2E <name>`.
 */
type ActorSpec = {
	name: string;
	type: 'character' | 'minion' | 'rival' | 'nemesis' | 'vehicle';
	/** Whether an adversary's tokens are linked to it; characters always are. */
	linked?: boolean;
	/** A user who owns the actor, besides the GM. */
	owner?: string;
	/** The folder holding the actor, named `E2E <folder>`. */
	folder?: string;
	system?: object;
	/** Embedded items, named as given. */
	items?: { name: string; type: string; system?: object }[];
	/** A vehicle's Roles, their members named without their `E2E ` prefix. */
	roles?: { name: string; skills: string[]; members: string[] }[];
	/** A vehicle's passengers, named without their `E2E ` prefix. */
	passengers?: string[];
};

type Crew = { passengers: string[]; roles: { name: string; skills: string[]; members: string[] }[] };

/**
 * A vehicle's Skills tab as the user sees it: the members' rows grouped by member, or the skills' grouped by skill. A
 * skill reads `<name> <rank> <dice>`, its dice `P` per Proficiency and `A` per Ability die of its rank preview.
 */
type SkillsTab =
	| { mode: 'member'; members: { name: string; role: string; skills: string[] }[] }
	| { mode: 'skill'; header: string[]; skills: { name: string; members: string[] }[] };

/**
 * The prompts open in the page: the Dice Prompts, the crew member prompts and the clone prompts.
 */
type Prompts = {
	dice: { actor: string | null; skill: string | null; rollType: string; difficulty: string; pool: string }[];
	crew: { title: string; rows: string[] }[];
	clone: string[];
};

type VehicleHelpers = {
	setUp(): Promise<void>;
	createActors(specs: ActorSpec[]): Promise<void>;
	crew(vehicle: string): Crew;
	/** Drags the tile of a Crew member of a vehicle, as the sheet does, and drops it on a target of a vehicle's Crew tab. */
	drag(from: { vehicle: string; tile: Target }, to: { vehicle: string; target: Target }): Promise<void>;
	/** Drags as {@link drag} does, while the source vehicle refuses every update, then lets it update again. */
	dragRefusedBySource(from: { vehicle: string; tile: Target }, to: { vehicle: string; target: Target }): Promise<void>;
	/** Drops a world document from the sidebar on a target of an actor's sheet. */
	dropFromSidebar(document: { type: 'Actor' | 'Item'; name: string }, to: { actor: string; target: Target }): Promise<void>;
	/** Drops plain text on a target of a vehicle's Crew tab, as a selection dragged from a web page carries. */
	dropText(text: string, to: { actor: string; target: Target }): Promise<void>;
	/**
	 * Drops an actor from the sidebar on a vehicle's Role as the sheet shows it while the vehicle's data has no Role any
	 * more, as when another user deleted it and the sheet hasn't rendered it yet, then gives the data its Roles back.
	 */
	dropOnStaleRole(args: { name: string; vehicle: string; role: number }): Promise<{ roleShown: boolean; roles: number }>;
	click(args: { actor: string; target: Target }): Promise<void>;
	/** Opens the context menu of an element of an actor's sheet and clicks its entry showing that icon. */
	menu(args: { actor: string; target: Target; icon: string }): Promise<void>;
	rename(vehicle: string, role: number, name: string): Promise<void>;
	setRoleSkills(args: { vehicle: string; role: number; skills: string[] }): Promise<void>;
	/** The vehicles updated with a change to their Crew since the last call. */
	takeCrewUpdates(): string[];
	skillsTab(vehicle: string): Promise<SkillsTab>;
	groupBy(args: { vehicle: string; mode: 'member' | 'skill' }): Promise<void>;
	prompts(): Prompts;
	closePrompts(): Promise<void>;
	/** Picks the clone in the open clone prompt, names it `E2E <name>` and submits it. */
	submitClone(name: string): Promise<void>;
	/** Whether the actor's tokens are linked to it, and whether it is an independent minion. */
	linkedAndIndependent(name: string): { actorLink: boolean; independentMinion: boolean };
	selectCrewMember(name: string): Promise<void>;
	/** The notifications since the last call. */
	notifications(): string[];
	actorsNamed(prefix: string): string[];
	updateItem(args: { actor: string; item: string; data: object }): Promise<void>;
	createItem(args: { actor: string; item: { name: string; type: string; system?: object } }): Promise<void>;
	deleteItem(args: { actor: string; item: string }): Promise<void>;
	deleteFolder(name: string): Promise<void>;
	deleteActors(names: string[]): Promise<void>;
	/** Puts unlinked tokens of a vehicle on a new scene `E2E <scene>`, from left to right, each with its own passengers. */
	placeTokens(args: { scene: string; vehicle: string; passengers: string[][] }): Promise<void>;
	/** The passengers of the vehicle tokens of a scene, from left to right. */
	tokenPassengers(scene: string): string[][];
	deleteScene(name: string): Promise<void>;
	/** Deletes the n-th token of a scene from the left, from 1. */
	deleteToken(args: { scene: string; n: number }): Promise<void>;
	/** Clicks the chevron of a Combat tab row, which opens or closes its description; false when the row shows none. */
	clickChevron(args: { actor: string; row: Target }): Promise<boolean>;
	/** The chevron of a Combat tab row, or null when the row shows none. */
	chevron(args: { actor: string; row: Target }): Promise<Chevron | null>;
	/**
	 * The description of a Combat tab row, as laid out: its height is given as `>cap` past `cap` px. Null when the row has
	 * none, as a vehicle weapon's row before #393.
	 */
	descriptionBox(args: { actor: string; row: Target; cap: number }): Promise<DescriptionBox | null>;
};

declare global {
	interface Window {
		vehicleE2E: VehicleHelpers;
	}
}

/**
 * An element of an actor's sheet, found step by step: each step is a selector within the previous element, followed by
 * `|n` for its n-th match (from 1), `|=name` for the match whose `.name` or `.member-name` shows `E2E <name>`, or `|~text` for the match
 * whose text starts with that text.
 */
type Target = string[];

const passengerSlot = (n: number): Target => [`.tab-crew .passengers > .sortTarget|${n}`];
const passengerTile = (name: string): Target => [`.tab-crew .passengers .actor-tile-mini|=${name}`];
const role = (n: number): Target => [`.tab-crew .roles .role-section|${n}`];
const roleMember = (role: number, n: number): Target => [`.tab-crew .roles .role-section|${role}`, `.role-member|${n}`];
const roleMemberTile = (role: number, n: number): Target => [...roleMember(role, n), ':scope > div|1'];

/**
 * Installs `window.vehicleE2E`. Playwright sends this function's source to the page, so it uses nothing from this module.
 */
function installVehicleHelpers() {
	const { settle, waitFor, text, unprefixed, htmlOf, render, actor, apps, dragStart, drop, poolPreview } = window.e2e;
	const nameOf = (uuid: string) => unprefixed(fromUuidSync(uuid)?.name ?? uuid);
	const sheet = (name: string) => render(actor(name).sheet);
	const find = (root: Element, target: string[]) =>
		target.reduce((parent, step) => {
			const [selector, pick] = step.split('|');
			const matches = [...parent.querySelectorAll(selector)];
			const element = pick.startsWith('=')
				? matches.find((match) => text(match.querySelector('.name, .member-name')) === `E2E ${pick.slice(1)}`)
				: pick.startsWith('~')
					? matches.find((match) => text(match).startsWith(pick.slice(1)))
					: matches[Number(pick) - 1];
			if (!element) {
				throw new Error(`No ${target.join(' ')}`);
			}
			return element;
		}, root);
	const sidebarData = (document: { type: 'Actor' | 'Item'; name: string }) => {
		const collection = document.type === 'Actor' ? game.actors : game.items;
		return { type: document.type, uuid: collection.getName(`E2E ${document.name}`).uuid };
	};
	// The dice of a rank preview, as the vehicle's Skills tab and the crew member prompt show them.
	const ranks = (element: Element | null) =>
		element
			? 'P'.repeat(element.querySelectorAll('.rank.proficiency').length) +
				'A'.repeat(element.querySelectorAll('.rank.ability').length)
			: '';
	type SceneToken = {
		x: number;
		actor: { system: { passengers: { list: { uuid: string; sort: number }[] } }; update(data: object): Promise<unknown> };
		delete(): Promise<unknown>;
	};
	const tokensOf = (scene: string): SceneToken[] =>
		[...game.scenes.getName(`E2E ${scene}`).tokens].sort((left: SceneToken, right: SceneToken) => left.x - right.x);

	const takeNotifications = window.e2e.recordNotifications();
	const crewUpdates: string[] = [];
	Hooks.on('updateActor', (updated: { name: string }, change: { system?: { passengers?: unknown; roles?: unknown } }) => {
		if (change.system?.passengers || change.system?.roles) crewUpdates.push(unprefixed(updated.name));
	});

	const helpers: VehicleHelpers = {
		async setUp() {
			await window.e2e.deleteSetUp('Actor', 'Item', 'Folder', 'Scene');
			await Actor.createDocuments([
				...['A', 'B', 'C', 'D', 'P'].map((name) => ({ name: `E2E ${name}`, type: 'character' })),
				{ name: 'E2E V1', type: 'vehicle' },
				{ name: 'E2E V2', type: 'vehicle' },
			]);
			await Item.createDocuments([
				{ name: 'E2E Piloting', type: 'skill' },
				{ name: 'E2E piloting', type: 'skill' },
				{ name: 'E2E Astrogation', type: 'skill', system: { characteristic: 'intellect' } },
			]);
		},

		async createActors(specs) {
			for (const folder of new Set(specs.flatMap((spec) => (spec.folder ? [spec.folder] : [])))) {
				await CONFIG.Folder.documentClass.create({ name: `E2E ${folder}`, type: 'Actor' });
			}
			const uuidOf = (name: string) => actor(name).uuid;
			// Crew members are created first, so that a vehicle's Crew can name them.
			const ordered = [...specs.filter((spec) => spec.type !== 'vehicle'), ...specs.filter((spec) => spec.type === 'vehicle')];
			for (const spec of ordered) {
				const created = await Actor.create({
					name: `E2E ${spec.name}`,
					type: spec.type,
					folder: spec.folder ? game.folders.getName(`E2E ${spec.folder}`).id : null,
					prototypeToken: { actorLink: spec.linked ?? false },
					items: spec.items ?? [],
					system: {
						...spec.system,
						...(spec.roles && {
							roles: spec.roles.map((role) => ({
								id: foundry.utils.randomID(),
								name: role.name,
								skills: role.skills,
								members: role.members.map(uuidOf),
							})),
						}),
						...(spec.passengers && {
							passengers: {
								list: spec.passengers.map((name, index) => ({ uuid: uuidOf(name), sort: (index + 1) * 100000 })),
							},
						}),
					},
				});
				if (spec.owner) await window.e2e.setOwnership(created, spec.owner, 'OWNER');
			}
		},

		crew(vehicle) {
			const system = actor(vehicle).system;
			return {
				passengers: [...system.passengers.list]
					.sort((left: { sort: number }, right: { sort: number }) => left.sort - right.sort)
					.map((passenger: { uuid: string }) => nameOf(passenger.uuid)),
				roles: system.roles.map((role: { name: string; skills: string[]; members: string[] }) => ({
					name: role.name,
					skills: [...role.skills],
					members: role.members.map(nameOf),
				})),
			};
		},

		async drag(from, to) {
			const dataTransfer = dragStart(find(await sheet(from.vehicle), from.tile));
			drop(find(await sheet(to.vehicle), to.target), dataTransfer);
		},

		async dragRefusedBySource(from, to) {
			const hook = Hooks.on('preUpdateActor', (updated: { name: string }) =>
				updated.name === `E2E ${from.vehicle}` ? false : undefined,
			);
			try {
				await helpers.drag(from, to);
				// The source vehicle refuses every update until the drop's work is over.
				await settle();
			} finally {
				Hooks.off('preUpdateActor', hook);
			}
		},

		async dropFromSidebar(document, to) {
			drop(find(await sheet(to.actor), to.target), sidebarData(document));
		},

		async dropText(dropped, to) {
			const dataTransfer = new DataTransfer();
			dataTransfer.setData('text/plain', dropped);
			drop(find(await sheet(to.actor), to.target), dataTransfer);
			// A drop refused changes nothing to wait for.
			await settle();
		},

		async dropOnStaleRole({ name, vehicle, role }) {
			const target = find(await sheet(vehicle), [`.tab-crew .roles .role-section|${role}`]);
			const vehicleActor = actor(vehicle);
			const roles = foundry.utils.deepClone(vehicleActor._source.system.roles);
			vehicleActor.updateSource({ 'system.roles': [] });
			try {
				// What the drop meets: the Role on the sheet, and none in the vehicle's data.
				const met = { roleShown: target.isConnected, roles: vehicleActor.system.roles.length };
				drop(target, sidebarData({ type: 'Actor', name }));
				await settle();
				return met;
			} finally {
				vehicleActor.updateSource({ 'system.roles': roles });
			}
		},

		async click({ actor, target }) {
			(find(await sheet(actor), target) as HTMLElement).click();
		},

		async menu({ actor, target, icon }) {
			const element = find(await sheet(actor), target);
			element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			const item = await waitFor(`the menu entry ${icon}`, () =>
				[...element.querySelectorAll<HTMLElement>('.context-menu .menu-item')].find((entry) => entry.querySelector(`.${icon}`)),
			);
			item.click();
		},

		async rename(vehicle, role, name) {
			const input = find(await sheet(vehicle), [`.tab-crew .roles .role-section|${role}`, '.role-name input|1']) as HTMLInputElement;
			input.value = name;
			input.dispatchEvent(new Event('change', { bubbles: true }));
		},

		async setRoleSkills({ vehicle, role, skills }) {
			const vehicleActor = actor(vehicle);
			const roles = foundry.utils.deepClone(vehicleActor._source.system.roles);
			roles[role - 1].skills = skills;
			await vehicleActor.update({ 'system.roles': roles });
		},

		takeCrewUpdates() {
			return crewUpdates.splice(0);
		},

		async skillsTab(vehicle) {
			const root = await sheet(vehicle);
			const membersContainer = root.querySelector('.tab-skills .members-container');
			if (membersContainer) {
				return {
					mode: 'member',
					members: [...membersContainer.querySelectorAll(':scope > section')].map((section) => ({
						name: unprefixed(text(section.querySelector('.member-name'))),
						role: text(section.querySelector('.member-roles')),
						skills: [...section.querySelectorAll('.member-skill')].map(
							(row) =>
								`${text(row.querySelector('.skill-name'))} ${text(row.querySelector('.skill-rank'))} ${ranks(row.querySelector('.skill-ranks'))}`,
						),
					})),
				};
			}
			const skillsContainer = root.querySelector('.tab-skills .skills-container')!;
			return {
				mode: 'skill',
				header: [...skillsContainer.querySelectorAll('.skill-content-header > div')].map(text).slice(0, 3),
				skills: [...skillsContainer.querySelectorAll(':scope > section')].map((section) => ({
					name: text(section.querySelector('.skill-details-name')),
					members: [...section.querySelectorAll('.skill-content-details')].map(
						(row) =>
							`${unprefixed(text(row.querySelector('.skill-content-details-charName')))} ${text(row.querySelector(':scope > div'))} ${text(row.querySelector('.skill-content-details-skillRank'))} ${ranks(row.querySelector('.skill-ranks'))}`,
					),
				})),
			};
		},

		async groupBy({ vehicle, mode }) {
			const select = (await sheet(vehicle)).querySelector<HTMLSelectElement>('.tab-skills .grouping-mode select')!;
			select.value = mode;
			select.dispatchEvent(new Event('change', { bubbles: true }));
			await waitFor(`the Skills tab of ${vehicle} grouped by ${mode}`, () =>
				htmlOf(actor(vehicle).sheet)?.querySelector(`.tab-skills .${mode === 'member' ? 'members' : 'skills'}-container`),
			);
		},

		prompts() {
			return {
				dice: apps('app-dice-prompt').map(
					(app: {
						element?: unknown;
						actor?: { name: string };
						skillName?: string;
						roll: { type: string };
						difficulty: string;
					}) => {
						const root = htmlOf(app);
						return {
							actor: app.actor ? unprefixed(app.actor.name) : null,
							skill: app.skillName ?? null,
							rollType: app.roll.type,
							difficulty: app.difficulty,
							pool: root ? poolPreview(root) : '|',
						};
					},
				),
				crew: apps('app-select-crew-member-prompt').map((app: { element?: unknown; title: string }) => ({
					title: app.title,
					rows: [...(htmlOf(app)?.querySelectorAll('.member-skill-option') ?? [])].map(
						(row) =>
							`${unprefixed(text(row.querySelector('.member-name')))} ${text(row.querySelector('.skill-name'))} ${text(row.querySelector('.skill-rank'))} ${ranks(row.querySelector('.skill-ranks'))}`,
					),
				})),
				clone: apps('app-clone-actor-prompt').map((app: { targetActor: { name: string } }) => unprefixed(app.targetActor.name)),
			};
		},

		async closePrompts() {
			const prompts = ['app-dice-prompt', 'app-select-crew-member-prompt', 'app-clone-actor-prompt'].flatMap(apps);
			await Promise.all(prompts.map((app: { close(): Promise<void> }) => app.close()));
			await waitFor('the prompts to close', () =>
				prompts.every((app: { id: string }) => !foundry.applications.instances.has(app.id)),
			);
		},

		async submitClone(name) {
			const app = await waitFor('the clone prompt', () => apps('app-clone-actor-prompt')[0]);
			const root = await waitFor('its choices', () => htmlOf(app)?.querySelector('#clone-actor-prompt-method-clone') && htmlOf(app));
			const method = root.querySelector<HTMLInputElement>('#clone-actor-prompt-method-clone')!;
			method.checked = true;
			method.dispatchEvent(new Event('change', { bubbles: true }));
			const input = root.querySelector<HTMLInputElement>('.clone-name input')!;
			input.value = `E2E ${name}`;
			input.dispatchEvent(new Event('input', { bubbles: true }));
			root.querySelector<HTMLButtonElement>('.submit-button')!.click();
			await waitFor('the clone prompt to close', () => !foundry.applications.instances.has(app.id));
			await settle();
		},

		linkedAndIndependent(name) {
			const clone = actor(name);
			return { actorLink: clone.prototypeToken.actorLink, independentMinion: clone.getFlag('genesys', 'independentMinion') ?? false };
		},

		async selectCrewMember(name) {
			const app = await waitFor('the crew member prompt', () => apps('app-select-crew-member-prompt')[0]);
			const root = await waitFor('its rows', () => htmlOf(app)?.querySelector('.member-skill-option') && htmlOf(app));
			const row = [...root.querySelectorAll<HTMLElement>('.member-skill-option')].find(
				(option) => text(option.querySelector('.member-name')) === `E2E ${name}`,
			);
			if (!row) throw new Error(`No crew member E2E ${name} in the prompt`);
			row.click();
			await waitFor(`crew member ${name} picked in the prompt`, () => row.classList.contains('selected-option'));
			root.querySelector<HTMLButtonElement>('.submit-button')!.click();
			// The prompt's closing transition can outlast a step's wait on a busy machine.
			await waitFor('the crew member prompt to close', () => !foundry.applications.instances.has(app.id));
		},

		notifications: takeNotifications,

		actorsNamed: (prefix) =>
			game.actors
				.filter((doc: { name: string }) => doc.name.startsWith(`E2E ${prefix}`))
				.map((doc: { name: string }) => unprefixed(doc.name)),

		async updateItem({ actor: name, item, data }) {
			await actor(name).items.getName(item).update(data);
		},

		async createItem({ actor: name, item }) {
			await actor(name).createEmbeddedDocuments('Item', [item]);
		},

		async deleteItem({ actor: name, item }) {
			await actor(name).items.getName(item).delete();
		},

		async deleteFolder(name) {
			await game.folders.getName(`E2E ${name}`).delete({ deleteSubfolders: true, deleteContents: true });
		},

		async deleteActors(names) {
			await Actor.deleteDocuments(names.map((name) => actor(name).id));
		},

		async placeTokens({ scene: name, vehicle, passengers }) {
			const scene = await Scene.create({ name: `E2E ${name}`, width: 1000, height: 1000 });
			await scene.createEmbeddedDocuments(
				'Token',
				passengers.map((_, index) => ({
					name: `E2E ${vehicle}`,
					actorId: actor(vehicle).id,
					actorLink: false,
					x: (index + 1) * 100,
					y: 100,
				})),
			);
			// Tokens are paired with their passengers by position, whatever order Foundry returns the created tokens in.
			for (const [index, token] of tokensOf(name).entries()) {
				await token.actor.update({
					'system.passengers.list': passengers[index].map((passenger, rank) => ({
						uuid: actor(passenger).uuid,
						sort: (rank + 1) * 100000,
					})),
				});
			}
		},

		tokenPassengers(scene) {
			return tokensOf(scene).map((token) =>
				[...token.actor.system.passengers.list]
					.sort((left: { sort: number }, right: { sort: number }) => left.sort - right.sort)
					.map((passenger: { uuid: string }) => nameOf(passenger.uuid)),
			);
		},

		async deleteScene(name) {
			await game.scenes.getName(`E2E ${name}`).delete();
		},

		async deleteToken({ scene, n }) {
			await tokensOf(scene)[n - 1].delete();
		},

		async clickChevron({ actor: name, row }) {
			return window.e2e.clickChevron(find(await sheet(name), row));
		},

		async chevron({ actor: name, row }) {
			return window.e2e.chevron(find(await sheet(name), row));
		},

		async descriptionBox({ actor: name, row, cap }) {
			const description = find(await sheet(name), row).querySelector(':scope > .description');
			return description && window.e2e.descriptionBox(description, cap);
		},
	};
	window.vehicleE2E = helpers;
}

/**
 * Calls a helper of `window.vehicleE2E` in a client's page.
 */
const helpersOf =
	(client: Client) =>
	<M extends keyof VehicleHelpers>(method: M, ...args: Parameters<VehicleHelpers[M]>) =>
		client.evaluate(({ method, args }) => (window.vehicleE2E[method] as (...args: unknown[]) => unknown)(...args), {
			method,
			args,
		}) as Promise<Awaited<ReturnType<VehicleHelpers[M]>>>;

const expectedRole = (name: string, { skills = [], members = [] }: { skills?: string[]; members?: string[] } = {}) => ({
	name,
	skills,
	members,
});

const noPrompts: Prompts = { dice: [], crew: [], clone: [] };
// The values of the system's RollType.
const SKILL_ROLL = 'skill';
const ATTACK_ROLL = 'attack';

const characteristics = (values: Partial<Record<string, number>> = {}) => ({
	characteristics: { brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2, ...values },
});
const skill = (name: string, characteristic: string, rank: number) => ({ name, type: 'skill', system: { characteristic, rank } });

// Foundry v13 throws in no-canvas mode when a token is deleted (CanvasDocument#_onDelete reads its layer's clipboard).
export const needsCanvas = true;

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	await gm.evaluate(installVehicleHelpers);
	const vehicleE2E = helpersOf(gm);
	await vehicleE2E('setUp');

	await crewDrops(e2e);
	await deletingCrew(e2e);
	await deletingCrewOfGoneTokens(e2e);
	await skillsTabFollowsCrew(e2e);
	await crewRolls(e2e);
	await vehicleE2E('closePrompts');
	await expandedDescriptions(e2e);
	await combatRowDescriptions(e2e);
}

/**
 * §#325: an expanded description of the Combat tab shows its whole text, past the height that once cut it, and a closed
 * one takes no height.
 */
async function expandedDescriptions(e2e: ScenarioContext) {
	const vehicleE2E = helpersOf(e2e.gm);
	const row: Target = ['.tab-combat .critical-hits .critical-hit|=Hull Fire'];

	await e2e.step('#325 D1 the description of a Critical Hit taller than 200px opened in the Combat tab, by its chevron', async () => {
		await vehicleE2E('createActors', [
			{
				name: 'Barge',
				type: 'vehicle',
				items: [{ name: 'E2E Hull Fire', type: 'injury', system: { severity: 'easy', description: LONG_DESCRIPTION } }],
			},
		]);
		await e2e.gm.evaluate(() => window.e2e.showTab('Barge', 'combat'));
		await vehicleE2E('clickChevron', { actor: 'Barge', row });
	});
	e2e.expect(
		"#325 D1 the Critical Hit's description shows its last line, at its full height past 200px",
		await vehicleE2E('descriptionBox', { actor: 'Barge', row, cap: 200 }),
		shownDescription(200),
	);
	await e2e.step('#325 D2 the description of the Critical Hit closed', () => vehicleE2E('clickChevron', { actor: 'Barge', row }));
	e2e.expect(
		"#325 D2 the Critical Hit's closed description takes no height, and animates its rows",
		await closedDescription((cap) => vehicleE2E('descriptionBox', { actor: 'Barge', row, cap })),
		CLOSED_DESCRIPTION,
	);
}

/**
 * §#393: the chevron after the name of a vehicle weapon's Combat tab row opens and closes its description; a row without
 * a description shows none, and the name still rolls the attack.
 */
async function combatRowDescriptions(e2e: ScenarioContext) {
	const vehicleE2E = helpersOf(e2e.gm);
	const harpoon: Target = ['.tab-combat .weapons .weapon|=Harpoon'];
	const box = (cap: number) => vehicleE2E('descriptionBox', { actor: 'Lugger', row: harpoon, cap });
	const closed = () => closedDescription(box);
	const chevron = (row: Target) => vehicleE2E('chevron', { actor: 'Lugger', row });

	await e2e.step(
		'#393 C1 a vehicle given a described vehicle weapon, a vehicle weapon without a description and a gunner, its Combat tab shown',
		async () => {
			await vehicleE2E('createActors', [
				{ name: 'Deckhand', type: 'character', items: [skill('Gunnery', 'agility', 1)] },
				{
					name: 'Lugger',
					type: 'vehicle',
					items: [
						{
							name: 'E2E Harpoon',
							type: 'vehicleWeapon',
							system: { skills: ['Gunnery'], state: 'equipped', description: LONG_DESCRIPTION },
						},
						{ name: 'E2E Swivel Gun', type: 'vehicleWeapon', system: { skills: ['Gunnery'], state: 'equipped' } },
					],
					roles: [{ name: 'Gunner', skills: ['Gunnery'], members: ['Deckhand'] }],
				},
			]);
			await e2e.gm.evaluate(() => window.e2e.showTab('Lugger', 'combat'));
		},
	);
	e2e.expect(
		"#393 C1 a vehicle weapon's row shows a chevron after its name, pointing right, to show the description, which starts closed",
		{ chevron: await chevron(harpoon), box: await closed() },
		{ chevron: SHOW_CHEVRON, box: CLOSED_DESCRIPTION },
	);
	e2e.expect(
		"#393 C1 a vehicle weapon's row without a description shows no chevron",
		await chevron(['.tab-combat .weapons .weapon|=Swivel Gun']),
		null,
	);

	await e2e.step('#393 C2 the chevron of the vehicle weapon clicked', () =>
		vehicleE2E('clickChevron', { actor: 'Lugger', row: harpoon }),
	);
	e2e.expect(
		"#393 C2 the vehicle weapon's description shows its last line, at its full height past 200px, its chevron pointing down to hide it, and no prompt opens",
		{ box: await box(200), chevron: await chevron(harpoon), prompts: await vehicleE2E('prompts') },
		{ box: shownDescription(200), chevron: HIDE_CHEVRON, prompts: noPrompts },
	);

	await e2e.step('#393 C3 the chevron of the vehicle weapon clicked again', () =>
		vehicleE2E('clickChevron', { actor: 'Lugger', row: harpoon }),
	);
	e2e.expect(
		"#393 C3 the vehicle weapon's description closes, its chevron pointing right again",
		{ box: await closed(), chevron: await chevron(harpoon) },
		{ box: CLOSED_DESCRIPTION, chevron: SHOW_CHEVRON },
	);

	await e2e.step('#393 C4 the name of the vehicle weapon clicked', () =>
		vehicleE2E('click', { actor: 'Lugger', target: [...harpoon, '.name a|1'] }),
	);
	const { dice } = await vehicleE2E('prompts');
	e2e.expect(
		"#393 C4 the vehicle weapon's name rolls its attack, and leaves its description closed",
		{ dice: dice.map(({ actor, skill, rollType }) => ({ actor, skill, rollType })), box: await closed() },
		{ dice: [{ actor: 'Deckhand', skill: 'Gunnery', rollType: ATTACK_ROLL }], box: CLOSED_DESCRIPTION },
	);
	await vehicleE2E('closePrompts');
}

/**
 * §#109: actors dropped on a vehicle's Crew land where they are dropped, Roles take names and skills, and actors move
 * between vehicles.
 */
async function crewDrops(e2e: ScenarioContext) {
	const { gm } = e2e;
	const vehicleE2E = helpersOf(gm);
	// Every step asserts the Crew of the vehicles it names: a drop can wrongly change the vehicle it came from.
	const step = async (name: string, action: () => Promise<unknown>, expected: Partial<Record<'V1' | 'V2' | 'V3', Crew>>) => {
		await e2e.step(name, action);
		const vehicles = expected.V3 ? (['V3'] as const) : (['V1', 'V2'] as const);
		for (const vehicle of vehicles) {
			e2e.expect(`${name} ${vehicle}`, await vehicleE2E('crew', vehicle), expected[vehicle] ?? { passengers: [], roles: [] });
		}
	};
	const fromSidebar =
		(name: string, target: Target, vehicle = 'V1') =>
		() =>
			vehicleE2E('dropFromSidebar', { type: 'Actor', name }, { actor: vehicle, target });
	const skillFromSidebar =
		(name: string, target: Target, vehicle = 'V1') =>
		() =>
			vehicleE2E('dropFromSidebar', { type: 'Item', name }, { actor: vehicle, target });
	const drag = (from: { vehicle: string; tile: Target }, to: { vehicle: string; target: Target }) => () => vehicleE2E('drag', from, to);

	// Joining: on the sheet anywhere, then on the passengers' slots.
	await step('#109 A1 A dropped from the sidebar on the sheet', fromSidebar('A', ['.tab-crew .section-header|1']), {
		V1: { passengers: ['A'], roles: [] },
	});
	await step('#109 A2 B dropped from the sidebar after A', fromSidebar('B', passengerSlot(2)), {
		V1: { passengers: ['A', 'B'], roles: [] },
	});
	await step('#109 A3 C dropped from the sidebar first', fromSidebar('C', passengerSlot(1)), {
		V1: { passengers: ['C', 'A', 'B'], roles: [] },
	});
	await step('#109 A4 A dropped again from the sidebar is refused', fromSidebar('A', passengerSlot(1)), {
		V1: { passengers: ['C', 'A', 'B'], roles: [] },
	});

	// Reordering the passengers, from C, A, B.
	await step(
		'#109 B1 B dragged after C',
		drag({ vehicle: 'V1', tile: passengerTile('B') }, { vehicle: 'V1', target: passengerSlot(2) }),
		{ V1: { passengers: ['C', 'B', 'A'], roles: [] } },
	);
	await step(
		'#109 B2 C dragged after A',
		drag({ vehicle: 'V1', tile: passengerTile('C') }, { vehicle: 'V1', target: passengerSlot(4) }),
		{ V1: { passengers: ['B', 'A', 'C'], roles: [] } },
	);
	await step('#109 B3 A dragged first', drag({ vehicle: 'V1', tile: passengerTile('A') }, { vehicle: 'V1', target: passengerSlot(1) }), {
		V1: { passengers: ['A', 'B', 'C'], roles: [] },
	});
	await step(
		'#109 B4 B dragged after itself',
		drag({ vehicle: 'V1', tile: passengerTile('B') }, { vehicle: 'V1', target: passengerSlot(3) }),
		{ V1: { passengers: ['A', 'B', 'C'], roles: [] } },
	);

	// Roles.
	const addRole = (vehicle: string) => vehicleE2E('click', { actor: vehicle, target: ['.tab-crew .section-header|1', 'a|1'] });
	await step(
		'#109 C1 two Roles added',
		async () => {
			await addRole('V1');
			await e2e.settle();
			await addRole('V1');
		},
		{ V1: { passengers: ['A', 'B', 'C'], roles: [expectedRole(''), expectedRole('')] } },
	);
	await step(
		'#109 C2 Roles renamed',
		async () => {
			await vehicleE2E('rename', 'V1', 1, 'Pilot');
			await e2e.settle();
			await vehicleE2E('rename', 'V1', 2, 'Gunner');
		},
		{ V1: { passengers: ['A', 'B', 'C'], roles: [expectedRole('Pilot'), expectedRole('Gunner')] } },
	);
	await step(
		'#109 C3 skill dropped on Pilot, then the same skill in lower case',
		async () => {
			await skillFromSidebar('Piloting', role(1))();
			await e2e.settle();
			await skillFromSidebar('piloting', role(1))();
		},
		{ V1: { passengers: ['A', 'B', 'C'], roles: [expectedRole('Pilot', { skills: ['E2E Piloting'] }), expectedRole('Gunner')] } },
	);
	await step('#109 C4 A dragged to Pilot', drag({ vehicle: 'V1', tile: passengerTile('A') }, { vehicle: 'V1', target: role(1) }), {
		V1: {
			passengers: ['B', 'C'],
			roles: [expectedRole('Pilot', { skills: ['E2E Piloting'], members: ['A'] }), expectedRole('Gunner')],
		},
	});
	await step('#109 C5 P dropped from the sidebar on Pilot', fromSidebar('P', role(1)), {
		V1: {
			passengers: ['B', 'C'],
			roles: [expectedRole('Pilot', { skills: ['E2E Piloting'], members: ['A', 'P'] }), expectedRole('Gunner')],
		},
	});
	await step(
		'#109 C6 P dragged before A in Pilot',
		drag({ vehicle: 'V1', tile: roleMemberTile(1, 2) }, { vehicle: 'V1', target: roleMember(1, 1) }),
		{
			V1: {
				passengers: ['B', 'C'],
				roles: [expectedRole('Pilot', { skills: ['E2E Piloting'], members: ['P', 'A'] }), expectedRole('Gunner')],
			},
		},
	);
	await step('#109 C7 C dragged to Gunner', drag({ vehicle: 'V1', tile: passengerTile('C') }, { vehicle: 'V1', target: role(2) }), {
		V1: {
			passengers: ['B'],
			roles: [expectedRole('Pilot', { skills: ['E2E Piloting'], members: ['P', 'A'] }), expectedRole('Gunner', { members: ['C'] })],
		},
	});
	await step(
		'#109 C8 A dragged from Pilot to the passengers',
		drag({ vehicle: 'V1', tile: roleMemberTile(1, 2) }, { vehicle: 'V1', target: passengerSlot(1) }),
		{
			V1: {
				passengers: ['A', 'B'],
				roles: [expectedRole('Pilot', { skills: ['E2E Piloting'], members: ['P'] }), expectedRole('Gunner', { members: ['C'] })],
			},
		},
	);

	// Another vehicle.
	const v1Roles = (pilots: string[]) => [
		expectedRole('Pilot', { skills: ['E2E Piloting'], members: pilots }),
		expectedRole('Gunner', { members: ['C'] }),
	];
	await vehicleE2E('takeCrewUpdates');
	await step('#109 D1 B dragged to V2', drag({ vehicle: 'V1', tile: passengerTile('B') }, { vehicle: 'V2', target: passengerSlot(1) }), {
		V1: { passengers: ['A'], roles: v1Roles(['P']) },
		V2: { passengers: ['B'], roles: [] },
	});
	e2e.expect('#109 D1 B joins V2 before it leaves V1', await vehicleE2E('takeCrewUpdates'), ['V2', 'V1']);
	await step('#109 D2 D dropped from the sidebar on V2', fromSidebar('D', passengerSlot(1), 'V2'), {
		V1: { passengers: ['A'], roles: v1Roles(['P']) },
		V2: { passengers: ['D', 'B'], roles: [] },
	});
	await step(
		'#109 D3 P dragged from Pilot to V2 after D',
		drag({ vehicle: 'V1', tile: roleMemberTile(1, 1) }, { vehicle: 'V2', target: passengerSlot(2) }),
		{ V1: { passengers: ['A'], roles: v1Roles([]) }, V2: { passengers: ['D', 'P', 'B'], roles: [] } },
	);

	await step(
		'#109 E1 Gunner deleted',
		() => vehicleE2E('click', { actor: 'V1', target: ['.tab-crew .roles .role-section|2', '.role-name a|1'] }),
		{
			V1: { passengers: ['A'], roles: [expectedRole('Pilot', { skills: ['E2E Piloting'] })] },
			V2: { passengers: ['D', 'P', 'B'], roles: [] },
		},
	);
	// A Role saved with one skill in two cases, as worlds older than the case-insensitive Role skills may hold.
	await vehicleE2E('setRoleSkills', { vehicle: 'V1', role: 1, skills: ['E2E Piloting', 'E2E piloting'] });
	await e2e.settle();
	await step(
		'#109 E2 a skill removed from its Role menu, in both its cases',
		() => vehicleE2E('menu', { actor: 'V1', target: [...role(1), '.role-skill|1'], icon: 'fa-trash' }),
		{
			V1: { passengers: ['A'], roles: [expectedRole('Pilot')] },
			V2: { passengers: ['D', 'P', 'B'], roles: [] },
		},
	);

	// A move whose second update fails, then a drop of an actor the Crew already has.
	await step(
		'#109 G1 A dragged to V2 while V1 refuses its update is in both Crews',
		() => vehicleE2E('dragRefusedBySource', { vehicle: 'V1', tile: passengerTile('A') }, { vehicle: 'V2', target: passengerSlot(1) }),
		{
			V1: { passengers: ['A'], roles: [expectedRole('Pilot')] },
			V2: { passengers: ['A', 'D', 'P', 'B'], roles: [] },
		},
	);
	await step(
		'#109 G2 A dragged from V1 to V2, which has it, is refused',
		drag({ vehicle: 'V1', tile: passengerTile('A') }, { vehicle: 'V2', target: passengerSlot(3) }),
		{
			V1: { passengers: ['A'], roles: [expectedRole('Pilot')] },
			V2: { passengers: ['A', 'D', 'P', 'B'], roles: [] },
		},
	);
	await step('#109 G3 A deleted leaves both Crews', () => vehicleE2E('deleteActors', ['A']), {
		V1: { passengers: [], roles: [expectedRole('Pilot')] },
		V2: { passengers: ['D', 'P', 'B'], roles: [] },
	});

	// Adversaries, and an actor that makes unlinked tokens, on a third vehicle.
	await vehicleE2E('createActors', [
		{ name: 'R', type: 'rival', linked: true },
		{ name: 'N', type: 'nemesis' },
		{ name: 'L', type: 'minion', linked: true },
		{ name: 'U', type: 'minion' },
		{ name: 'V3', type: 'vehicle' },
	]);
	await step('#109 F1 rival R dropped from the sidebar on the sheet', fromSidebar('R', ['.tab-crew .section-header|1'], 'V3'), {
		V3: { passengers: ['R'], roles: [] },
	});
	await step('#109 F2 nemesis N dropped from the sidebar first', fromSidebar('N', passengerSlot(1), 'V3'), {
		V3: { passengers: ['N', 'R'], roles: [] },
	});
	await step(
		'#109 F3 Minion Group L dropped from the sidebar on a new Role',
		async () => {
			await addRole('V3');
			await e2e.settle();
			await fromSidebar('L', role(1), 'V3')();
		},
		{ V3: { passengers: ['N', 'R'], roles: [expectedRole('', { members: ['L'] })] } },
	);
	await step(
		'#109 F4 R dragged before L in the Role',
		drag({ vehicle: 'V3', tile: passengerTile('R') }, { vehicle: 'V3', target: roleMember(1, 1) }),
		{ V3: { passengers: ['N'], roles: [expectedRole('', { members: ['R', 'L'] })] } },
	);
	await step(
		'#109 F5 R dropped on the empty area of its own Role moves last',
		drag({ vehicle: 'V3', tile: roleMemberTile(1, 1) }, { vehicle: 'V3', target: role(1) }),
		{ V3: { passengers: ['N'], roles: [expectedRole('', { members: ['L', 'R'] })] } },
	);
	await step(
		'#109 F6 R removed from its Role member menu leaves the Crew',
		() => vehicleE2E('menu', { actor: 'V3', target: [...roleMember(1, 2), '.actions|1'], icon: 'fa-trash' }),
		{ V3: { passengers: ['N'], roles: [expectedRole('', { members: ['L'] })] } },
	);
	await step('#109 F7 U, making unlinked tokens, dropped from the sidebar on the Role', fromSidebar('U', role(1), 'V3'), {
		V3: { passengers: ['N'], roles: [expectedRole('', { members: ['L'] })] },
	});
	e2e.expect('#109 F7 the clone prompt opens for U', await vehicleE2E('prompts'), { ...noPrompts, clone: ['U'] });
	await step('#109 F8 the clone prompt closed', () => vehicleE2E('closePrompts'), {
		V3: { passengers: ['N'], roles: [expectedRole('', { members: ['L'] })] },
	});
	e2e.expect('#109 F8 no clone of U is made', await vehicleE2E('actorsNamed', 'U'), ['U']);
	let staleDrop: unknown;
	await step(
		'#109 F9 U dropped on a Role deleted meanwhile',
		async () => (staleDrop = await vehicleE2E('dropOnStaleRole', { name: 'U', vehicle: 'V3', role: 1 })),
		{ V3: { passengers: ['N'], roles: [expectedRole('', { members: ['L'] })] } },
	);
	e2e.expect('#109 F9 the drop meets a Role the data no longer has', staleDrop, { roleShown: true, roles: 0 });
	e2e.expect('#109 F9 no clone prompt opens for a Role deleted meanwhile', await vehicleE2E('prompts'), noPrompts);
	await step(
		'#268 F10 U dropped from the sidebar on the Role, and cloned as U2',
		async () => {
			await fromSidebar('U', role(1), 'V3')();
			await vehicleE2E('submitClone', 'U2');
		},
		{ V3: { passengers: ['N'], roles: [expectedRole('', { members: ['L', 'U2'] })] } },
	);
	e2e.expect('#268 F10 the clone U2 is an independent minion with linked tokens', await vehicleE2E('linkedAndIndependent', 'U2'), {
		actorLink: true,
		independentMinion: true,
	});
	e2e.expect('#268 F10 U itself still makes unlinked tokens', await vehicleE2E('linkedAndIndependent', 'U'), {
		actorLink: false,
		independentMinion: false,
	});

	// §#271: text dragged from outside Foundry carries no drag data.
	const errors = gm.errors.length;
	await step(
		'#271 H1 plain text dropped on the passengers, then on the Role',
		async () => {
			await vehicleE2E('dropText', 'Not an actor', { actor: 'V3', target: passengerSlot(1) });
			await vehicleE2E('dropText', 'Not an actor', { actor: 'V3', target: role(1) });
		},
		{ V3: { passengers: ['N'], roles: [expectedRole('', { members: ['L', 'U2'] })] } },
	);
	e2e.expect(
		'#271 H1 plain text dropped on the Crew tab does nothing, with no prompt and no error in the console',
		{ prompts: await vehicleE2E('prompts'), errors: gm.errors.slice(errors) },
		{ prompts: noPrompts, errors: [] },
	);
}

/**
 * §#129: deleting a vehicle with its crew in one operation logs no error, and the crew leave the other vehicles.
 */
async function deletingCrew(e2e: ScenarioContext) {
	const { gm } = e2e;
	const vehicleE2E = helpersOf(gm);
	await vehicleE2E('createActors', [
		{ name: 'Fleet Pilot', type: 'character', folder: 'Fleet' },
		{ name: 'Fleet Gunner', type: 'character', folder: 'Fleet' },
		{
			name: 'Fleet Ship',
			type: 'vehicle',
			folder: 'Fleet',
			passengers: ['Fleet Pilot'],
			roles: [{ name: 'Gunner', skills: [], members: ['Fleet Gunner'] }],
		},
		{ name: 'Crew First', type: 'character' },
		{ name: 'Crew Second', type: 'character' },
		{
			name: 'Crewed Ship',
			type: 'vehicle',
			passengers: ['Crew First'],
			roles: [{ name: 'Gunner', skills: [], members: ['Crew Second'] }],
		},
		{ name: 'Harbour', type: 'vehicle', passengers: ['Fleet Pilot', 'Crew First'] },
	]);

	let errors = gm.errors.length;
	await e2e.step('#129 the folder of a vehicle and its crew deleted with its contents', () => vehicleE2E('deleteFolder', 'Fleet'));
	e2e.expect(
		'#129 A1 deleting a folder with a vehicle and its crew logs no error, and the crew leave the other vehicles',
		{
			errors: gm.errors.slice(errors),
			left: await vehicleE2E('actorsNamed', 'Fleet'),
			harbour: await vehicleE2E('crew', 'Harbour'),
		},
		{ errors: [], left: [], harbour: { passengers: ['Crew First'], roles: [] } },
	);

	errors = gm.errors.length;
	await e2e.step('#129 a vehicle deleted with its crew, crew first', () =>
		vehicleE2E('deleteActors', ['Crew First', 'Crew Second', 'Crewed Ship']),
	);
	e2e.expect(
		'#129 A2 deleting a vehicle with its crew, crew first, logs no error',
		{
			errors: gm.errors.slice(errors),
			left: [...(await vehicleE2E('actorsNamed', 'Crew')), ...(await vehicleE2E('actorsNamed', 'Crewed'))],
			harbour: await vehicleE2E('crew', 'Harbour'),
		},
		{ errors: [], left: [], harbour: { passengers: [], roles: [] } },
	);
}

/**
 * §#234: deleting a crew member logs no error once an unlinked vehicle token they crewed is gone with its scene or on
 * its own, and the tokens left lose them.
 */
async function deletingCrewOfGoneTokens(e2e: ScenarioContext) {
	const { gm } = e2e;
	const vehicleE2E = helpersOf(gm);
	await vehicleE2E('createActors', [
		{ name: 'Deck Hand', type: 'character' },
		{ name: 'Deck Mate', type: 'character' },
		{ name: 'Skiff', type: 'vehicle' },
	]);

	await e2e.step('#234 A1 Deck Hand crews a token of Skiff on Dock A, whose scene is deleted', async () => {
		await vehicleE2E('placeTokens', { scene: 'Dock A', vehicle: 'Skiff', passengers: [['Deck Hand']] });
		await vehicleE2E('deleteScene', 'Dock A');
	});
	let errors = gm.errors.length;
	await e2e.step('#234 A2 Deck Hand deleted', () => vehicleE2E('deleteActors', ['Deck Hand']));
	e2e.expect('#234 A2 deleting a crew member of a token whose scene was deleted logs no error', gm.errors.slice(errors), []);

	await e2e.step('#234 B1 Deck Mate crews two tokens of Skiff on Dock B, the first deleted', async () => {
		await vehicleE2E('placeTokens', { scene: 'Dock B', vehicle: 'Skiff', passengers: [['Deck Mate'], ['Deck Mate']] });
		await vehicleE2E('deleteToken', { scene: 'Dock B', n: 1 });
	});
	errors = gm.errors.length;
	await e2e.step('#234 B2 Deck Mate deleted', () => vehicleE2E('deleteActors', ['Deck Mate']));
	e2e.expect(
		'#234 B2 deleting a crew member of a deleted token logs no error, and the token left loses them',
		{ errors: gm.errors.slice(errors), dockB: await vehicleE2E('tokenPassengers', 'Dock B') },
		{ errors: [], dockB: [[]] },
	);
}

/**
 * §#127 and §#49: an open vehicle's Skills tab follows its Roles, its crew's skills and characteristics, in both
 * groupings, without switching them.
 */
async function skillsTabFollowsCrew(e2e: ScenarioContext) {
	const vehicleE2E = helpersOf(e2e.gm);
	await vehicleE2E('createActors', [
		{
			name: 'Hal',
			type: 'character',
			system: { ...characteristics(), experienceJournal: { entries: [{ type: 'Starting', amount: 200 }] } },
			items: [skill('Piloting', 'agility', 0), skill('E2E Astrogation', 'intellect', 1)],
		},
		{ name: 'Ivy', type: 'rival', linked: true, system: characteristics({ agility: 3 }), items: [skill('Piloting', 'agility', 1)] },
		// One sheet shows the tab grouped by member, the other grouped by skill.
		{ name: 'By Member', type: 'vehicle', roles: [{ name: 'Crew', skills: ['Piloting'], members: [] }] },
		{ name: 'By Skill', type: 'vehicle', roles: [{ name: 'Crew', skills: ['Piloting'], members: [] }] },
	]);
	await vehicleE2E('skillsTab', 'By Member');
	await vehicleE2E('groupBy', { vehicle: 'By Skill', mode: 'skill' });

	type Row = { name: string; skills: string[] };
	const step = async (name: string, action: (() => Promise<unknown>) | undefined, members: Row[], skills: Row[]) => {
		await e2e.step(name, action);
		e2e.expect(`${name}, grouped by member`, await vehicleE2E('skillsTab', 'By Member'), {
			mode: 'member',
			members: members.map(({ name, skills }) => ({ name, role: 'Role: Crew', skills })),
		});
		const bySkill = await vehicleE2E('skillsTab', 'By Skill');
		e2e.expect(`${name}, grouped by skill`, bySkill.mode === 'skill' ? { mode: bySkill.mode, skills: bySkill.skills } : bySkill, {
			mode: 'skill',
			skills: skills.map(({ name, skills }) => ({ name, members: skills })),
		});
	};
	const onBoth = (drop: (vehicle: string) => Promise<unknown>) => async () => {
		await drop('By Member');
		await drop('By Skill');
	};

	await step('#127 K0 a Role with a skill and no member', undefined, [], [{ name: 'Piloting', skills: [] }]);
	await step(
		'#127 K1 a character dropped on the Role',
		onBoth((vehicle) => vehicleE2E('dropFromSidebar', { type: 'Actor', name: 'Hal' }, { actor: vehicle, target: role(1) })),
		[{ name: 'Hal', skills: ['Piloting (Ag) 0 AA'] }],
		[{ name: 'Piloting', skills: ['Hal Crew 0 AA'] }],
	);
	await step(
		'#127 K2 a rival dropped on the Role',
		onBoth((vehicle) => vehicleE2E('dropFromSidebar', { type: 'Actor', name: 'Ivy' }, { actor: vehicle, target: role(1) })),
		[
			{ name: 'Hal', skills: ['Piloting (Ag) 0 AA'] },
			{ name: 'Ivy', skills: ['Piloting (Ag) 1 PAA'] },
		],
		[{ name: 'Piloting', skills: ['Hal Crew 0 AA', 'Ivy Crew 1 PAA'] }],
	);
	// E2E Astrogation is no skill of the Skills Compendium: it is listed for the members who own it only.
	await step(
		'#127 K3 a skill missing from the Skills Compendium dropped on the Role',
		onBoth((vehicle) => vehicleE2E('dropFromSidebar', { type: 'Item', name: 'Astrogation' }, { actor: vehicle, target: role(1) })),
		[
			{ name: 'Hal', skills: ['E2E Astrogation (Int) 1 PA', 'Piloting (Ag) 0 AA'] },
			{ name: 'Ivy', skills: ['Piloting (Ag) 1 PAA'] },
		],
		[
			{ name: 'E2E Astrogation', skills: ['Hal Crew 1 PA'] },
			{ name: 'Piloting', skills: ['Hal Crew 0 AA', 'Ivy Crew 1 PAA'] },
		],
	);
	await step(
		'#127 K4 the rival given the skill missing from the Skills Compendium',
		() => vehicleE2E('createItem', { actor: 'Ivy', item: skill('E2E Astrogation', 'intellect', 2) }),
		[
			{ name: 'Hal', skills: ['E2E Astrogation (Int) 1 PA', 'Piloting (Ag) 0 AA'] },
			{ name: 'Ivy', skills: ['E2E Astrogation (Int) 2 PP', 'Piloting (Ag) 1 PAA'] },
		],
		[
			{ name: 'E2E Astrogation', skills: ['Hal Crew 1 PA', 'Ivy Crew 2 PP'] },
			{ name: 'Piloting', skills: ['Hal Crew 0 AA', 'Ivy Crew 1 PAA'] },
		],
	);
	const halSkill = ['.skills-row .skill.row|~Piloting'];
	await step(
		'#127 K5 the character given a Free Rank in Piloting',
		() => vehicleE2E('menu', { actor: 'Hal', target: halSkill, icon: 'fa-circle-up' }),
		[
			{ name: 'Hal', skills: ['E2E Astrogation (Int) 1 PA', 'Piloting (Ag) 1 PA'] },
			{ name: 'Ivy', skills: ['E2E Astrogation (Int) 2 PP', 'Piloting (Ag) 1 PAA'] },
		],
		[
			{ name: 'E2E Astrogation', skills: ['Hal Crew 1 PA', 'Ivy Crew 2 PP'] },
			{ name: 'Piloting', skills: ['Hal Crew 1 PA', 'Ivy Crew 1 PAA'] },
		],
	);
	await step(
		'#127 K6 the character buys a rank of Piloting with XP',
		() => vehicleE2E('click', { actor: 'Hal', target: [...halSkill, '.rank-display a|1'] }),
		[
			{ name: 'Hal', skills: ['E2E Astrogation (Int) 1 PA', 'Piloting (Ag) 2 PP'] },
			{ name: 'Ivy', skills: ['E2E Astrogation (Int) 2 PP', 'Piloting (Ag) 1 PAA'] },
		],
		[
			{ name: 'E2E Astrogation', skills: ['Hal Crew 1 PA', 'Ivy Crew 2 PP'] },
			{ name: 'Piloting', skills: ['Hal Crew 2 PP', 'Ivy Crew 1 PAA'] },
		],
	);
	await step(
		'#127 K7 the character raises Agility',
		() => vehicleE2E('click', { actor: 'Hal', target: ['.characteristics-row .characteristic-field|2', 'label a|1'] }),
		[
			{ name: 'Hal', skills: ['E2E Astrogation (Int) 1 PA', 'Piloting (Ag) 2 PPA'] },
			{ name: 'Ivy', skills: ['E2E Astrogation (Int) 2 PP', 'Piloting (Ag) 1 PAA'] },
		],
		[
			{ name: 'E2E Astrogation', skills: ['Hal Crew 1 PA', 'Ivy Crew 2 PP'] },
			{ name: 'Piloting', skills: ['Hal Crew 2 PPA', 'Ivy Crew 1 PAA'] },
		],
	);
	await step(
		"#127 K8 the rival's Piloting rank changed",
		() => vehicleE2E('updateItem', { actor: 'Ivy', item: 'Piloting', data: { 'system.rank': 2 } }),
		[
			{ name: 'Hal', skills: ['E2E Astrogation (Int) 1 PA', 'Piloting (Ag) 2 PPA'] },
			{ name: 'Ivy', skills: ['E2E Astrogation (Int) 2 PP', 'Piloting (Ag) 2 PPA'] },
		],
		[
			{ name: 'E2E Astrogation', skills: ['Hal Crew 1 PA', 'Ivy Crew 2 PP'] },
			{ name: 'Piloting', skills: ['Hal Crew 2 PPA', 'Ivy Crew 2 PPA'] },
		],
	);
	await step(
		"#127 K9 the character's skill missing from the Skills Compendium deleted",
		() => vehicleE2E('deleteItem', { actor: 'Hal', item: 'E2E Astrogation' }),
		[
			{ name: 'Hal', skills: ['Piloting (Ag) 2 PPA'] },
			{ name: 'Ivy', skills: ['E2E Astrogation (Int) 2 PP', 'Piloting (Ag) 2 PPA'] },
		],
		[
			{ name: 'E2E Astrogation', skills: ['Ivy Crew 2 PP'] },
			{ name: 'Piloting', skills: ['Hal Crew 2 PPA', 'Ivy Crew 2 PPA'] },
		],
	);
}

/**
 * §#133 and §#49: the crew members who roll a vehicle's skills, from its Skills tab and its Combat tab, as the GM and
 * as a player owning the vehicle and one crew member.
 */
async function crewRolls(e2e: ScenarioContext) {
	const { gm } = e2e;
	const vehicleE2E = helpersOf(gm);
	await vehicleE2E('createActors', [
		{ name: 'Ace', type: 'character', system: characteristics({ agility: 3 }), items: [skill('Piloting', 'agility', 2)] },
		{
			name: 'Gun',
			type: 'character',
			owner: e2e.playerUser,
			system: characteristics(),
			items: [skill('gunnery', 'agility', 1)],
		},
		{
			name: 'Mob',
			type: 'minion',
			// Three members standing roll at group skill rank 2, whatever the skill item's rank.
			system: { ...characteristics(), groupSize: 3, wounds: { value: 0, threshold: 5 } },
			items: [skill('Gunnery', 'agility', 0)],
		},
		{ name: 'Wrench', type: 'character', system: characteristics({ intellect: 3 }), items: [skill('Mechanics', 'intellect', 3)] },
		{
			name: 'Ship',
			type: 'vehicle',
			owner: e2e.playerUser,
			roles: [
				{ name: 'Pilot', skills: ['Piloting', 'gunnery'], members: ['Ace'] },
				{ name: 'Gunner', skills: ['Gunnery'], members: ['Gun', 'Mob'] },
				{ name: 'Engineer', skills: ['mechanics'], members: ['Wrench'] },
				{ name: 'Spare', skills: ['Cool'], members: [] },
			],
			items: [
				{ name: 'E2E Cannon', type: 'vehicleWeapon', system: { skills: ['Gunnery'], state: 'equipped' } },
				{ name: 'E2E Ram', type: 'vehicleWeapon', system: { skills: ['Piloting'], state: 'equipped' } },
				{ name: 'E2E Hull Breach', type: 'injury', system: { severity: 'hard' } },
			],
		},
	]);
	const gunneryRows = ['Ace Gunnery 0 AAA', 'Gun gunnery 1 PA', 'Mob Gunnery 2 PP'];
	const memberSkill = (member: string, skill: string): Target => [
		`.tab-skills .members-container > section|=${member}`,
		`.member-skill|~${skill}`,
		'a.skill-name|1',
	];
	const skillMember = (skill: string, member: string): Target => [
		`.tab-skills .skills-container > section|~${skill}`,
		`.skill-content-details|~E2E ${member}`,
		':scope > a|2',
	];
	const weapon = (name: string): Target => [`.tab-combat .weapon|~E2E ${name}`, '.name a|1'];

	await e2e.step('#133 the vehicle Skills tab grouped by member');
	e2e.expect(
		'#133 A1 grouped by member, each member rolls their skills at their rank, sorted by name',
		await vehicleE2E('skillsTab', 'Ship'),
		{
			mode: 'member',
			members: [
				{ name: 'Ace', role: 'Role: Pilot', skills: ['Gunnery (Ag) 0 AAA', 'Piloting (Ag) 2 PPA'] },
				{ name: 'Gun', role: 'Role: Gunner', skills: ['gunnery (Ag) 1 PA'] },
				{ name: 'Mob', role: 'Role: Gunner', skills: ['Gunnery (Ag) 2 PP'] },
				{ name: 'Wrench', role: 'Role: Engineer', skills: ['Mechanics (Int) 3 PPP'] },
			],
		},
	);
	await e2e.step('#133 a Role skill rolled from the tab grouped by member', () =>
		vehicleE2E('click', { actor: 'Ship', target: memberSkill('Gun', 'gunnery') }),
	);
	e2e.expect('#133 A2 a Role skill rolled from the tab grouped by member opens the Dice Prompt', await vehicleE2E('prompts'), {
		...noPrompts,
		dice: [{ actor: 'Gun', skill: 'gunnery', rollType: SKILL_ROLL, difficulty: 'DD', pool: 'PA|DD' }],
	});
	await vehicleE2E('closePrompts');

	await e2e.step('#133 the vehicle Skills tab grouped by skill', () => vehicleE2E('groupBy', { vehicle: 'Ship', mode: 'skill' }));
	e2e.expect(
		'#133 A3 grouped by skill, each skill is listed once, named as the Skills Compendium names it, sorted by name',
		await vehicleE2E('skillsTab', 'Ship'),
		{
			mode: 'skill',
			header: ['Crew Member', 'Role', 'Skill'],
			skills: [
				{ name: 'Cool', members: [] },
				{ name: 'Gunnery', members: ['Ace Pilot 0 AAA', 'Gun Gunner 1 PA', 'Mob Gunner 2 PP'] },
				{ name: 'Mechanics', members: ['Wrench Engineer 3 PPP'] },
				{ name: 'Piloting', members: ['Ace Pilot 2 PPA'] },
			],
		},
	);
	await e2e.step('#133 a Role skill rolled from the tab grouped by skill', () =>
		vehicleE2E('click', { actor: 'Ship', target: skillMember('Gunnery', 'Mob') }),
	);
	e2e.expect('#133 A4 a Minion Group rolls a Role skill at its group skill rank', await vehicleE2E('prompts'), {
		...noPrompts,
		dice: [{ actor: 'Mob', skill: 'Gunnery', rollType: SKILL_ROLL, difficulty: 'DD', pool: 'PP|DD' }],
	});
	await vehicleE2E('closePrompts');

	await e2e.step('#133 an attack with a Gunnery vehicle weapon', () => vehicleE2E('click', { actor: 'Ship', target: weapon('Cannon') }));
	e2e.expect(
		'#133 A5 an attack several crew members can roll opens the crew member prompt at the ranks they roll',
		await vehicleE2E('prompts'),
		{ ...noPrompts, crew: [{ title: 'Select Crew Member', rows: gunneryRows }] },
	);
	await e2e.step('#133 the Minion Group picked in the crew member prompt', () => vehicleE2E('selectCrewMember', 'Mob'));
	e2e.expect('#133 A6 the crew member picked rolls the attack', await vehicleE2E('prompts'), {
		...noPrompts,
		dice: [{ actor: 'Mob', skill: 'Gunnery', rollType: ATTACK_ROLL, difficulty: 'DD', pool: 'PP|DD' }],
	});
	await vehicleE2E('closePrompts');

	await e2e.step('#133 an attack with a Piloting vehicle weapon', () => vehicleE2E('click', { actor: 'Ship', target: weapon('Ram') }));
	e2e.expect('#133 A7 an attack one crew member can roll opens the Dice Prompt at once', await vehicleE2E('prompts'), {
		...noPrompts,
		dice: [{ actor: 'Ace', skill: 'Piloting', rollType: ATTACK_ROLL, difficulty: 'DD', pool: 'PPA|DD' }],
	});
	await vehicleE2E('closePrompts');

	await e2e.step('#133 a Critical Hit repaired', () =>
		vehicleE2E('click', { actor: 'Ship', target: ['.tab-combat .critical-hit|~DDD', '.severity a|1'] }),
	);
	e2e.expect('#133 A8 a repair one crew member can roll opens the Dice Prompt at once', await vehicleE2E('prompts'), {
		...noPrompts,
		dice: [{ actor: 'Wrench', skill: 'Mechanics', rollType: SKILL_ROLL, difficulty: 'DDD', pool: 'PPP|DDD' }],
	});
	await vehicleE2E('closePrompts');

	// As a player owning the vehicle and Gun only.
	const player = await e2e.player();
	await player.evaluate(installVehicleHelpers);
	const playerE2E = helpersOf(player);
	const playerRoll = async (name: string, action: () => Promise<unknown>) => {
		let rolled: { prompts: Prompts; notifications: string[] } | undefined;
		await e2e.step(name, async () => {
			// Drops what the previous roll notified while its prompts closed: only this roll's notifications are read.
			await playerE2E('notifications');
			await action();
			await e2e.settle();
			rolled = { prompts: await playerE2E('prompts'), notifications: await playerE2E('notifications') };
			await playerE2E('closePrompts');
		});
		return rolled;
	};
	const cannotSelect = ['warning: Genesys.Notifications.CannotSelectActor'];

	e2e.expect(
		'#133 A9 player, Skills tab: rolling for an owned crew member opens the Dice Prompt',
		await playerRoll('#133 player rolls for Gun from the Skills tab', () =>
			playerE2E('click', { actor: 'Ship', target: memberSkill('Gun', 'gunnery') }),
		),
		{
			prompts: { ...noPrompts, dice: [{ actor: 'Gun', skill: 'gunnery', rollType: SKILL_ROLL, difficulty: 'DD', pool: 'PA|DD' }] },
			notifications: [],
		},
	);
	e2e.expect(
		'#133 A10 player, Skills tab: rolling for a crew member the player does not own warns',
		await playerRoll('#133 player rolls for Ace from the Skills tab', () =>
			playerE2E('click', { actor: 'Ship', target: memberSkill('Ace', 'Piloting') }),
		),
		{ prompts: noPrompts, notifications: cannotSelect },
	);
	e2e.expect(
		'#133 A11 player, Combat tab: rolling for an owned crew member opens the Dice Prompt',
		await playerRoll('#133 player attacks with the Cannon as Gun', async () => {
			await playerE2E('click', { actor: 'Ship', target: weapon('Cannon') });
			await playerE2E('selectCrewMember', 'Gun');
		}),
		{
			prompts: { ...noPrompts, dice: [{ actor: 'Gun', skill: 'gunnery', rollType: ATTACK_ROLL, difficulty: 'DD', pool: 'PA|DD' }] },
			notifications: [],
		},
	);
	e2e.expect(
		'#133 A12 player, Combat tab: rolling for a crew member the player does not own warns',
		await playerRoll('#133 player attacks with the Cannon as Ace', async () => {
			await playerE2E('click', { actor: 'Ship', target: weapon('Cannon') });
			await playerE2E('selectCrewMember', 'Ace');
		}),
		{ prompts: noPrompts, notifications: cannotSelect },
	);
	await player.leave();

	// A Role skill the Minion Group doesn't own is rolled unranked.
	await e2e.step('#49 a skill the Minion Group lacks added to its Role', async () => {
		await vehicleE2E('setRoleSkills', { vehicle: 'Ship', role: 2, skills: ['Gunnery', 'Vigilance'] });
		await vehicleE2E('groupBy', { vehicle: 'Ship', mode: 'member' });
	});
	const tab = await vehicleE2E('skillsTab', 'Ship');
	e2e.expect(
		'#49 A1 a Minion Group rolls an owned Role skill at its group rank, an unowned one at 0',
		tab.mode === 'member' ? tab.members.find((member) => member.name === 'Mob') : tab,
		{ name: 'Mob', role: 'Role: Gunner', skills: ['Gunnery (Ag) 2 PP', 'Vigilance (Will) 0 AA'] },
	);
}
