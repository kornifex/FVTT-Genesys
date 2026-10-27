/** @file The inventory of #37: drops on actor and item sheets, Containers, Equipment States and their effects, armor, encumbrance and inventory rows. */
import type { ScenarioContext } from '../scenario.ts';

type EquipmentState = 'equipped' | 'carried' | 'dropped';

/**
 * What a drag carries: an item of the sidebar, of the system's test compendium, of an actor in the test actor
 * compendium, a folder of the sidebar, or an item an actor holds, dragged from its row on the actor's sheet.
 */
type Source =
	| { sidebar: string }
	| { compendium: string }
	| { compendiumActorItem: string }
	| { folder: string }
	| { held: string; by: string };

/**
 * Where a drop lands on an actor's sheet: on the n-th sort slot of a section (from 0, the slot above its first item), on
 * an item's row, or on another element of the sheet.
 */
type Target = { section: EquipmentState; slot: number } | { item: string } | { on: string };

type MenuAction = 'equip' | 'carry' | 'drop' | 'delete' | 'chat';

/**
 * The helpers name an actor of the setup by its name without `E2E `, or `token:<name>` for the actor of an unlinked token.
 */
type InventoryHelpers = {
	setUp(playerUser: string): Promise<void>;
	tearDown(): Promise<void>;
	/** Runs a drag from its source and drops it on a target of an actor's sheet. */
	drop(source: Source, actor: string, at: Target): Promise<void>;
	/** Drops a drag on the sheet of an item of the sidebar (no actor) or of an actor. */
	dropOnItemSheet(source: Source, item: string, actor?: string): Promise<void>;
	/** Picks an action in the menu of an item's inventory row. */
	menu(actor: string, item: string, action: MenuAction): Promise<void>;
	/** Changes a field of an item's sheet, as typing in it does. */
	editItemSheet(actor: string, item: string, field: string, value: string): Promise<void>;
	/** Damages an item from its row until it's destroyed, and confirms its deletion. */
	damageToNothing(actor: string, item: string): Promise<void>;
	/** Clicks the quantity and the damage state of an item's row once. */
	clickQuantityAndDamage(actor: string, item: string): Promise<void>;
	/** Attacks with a weapon from its inventory row, which opens the dice prompt. */
	attack(actor: string, item: string): Promise<void>;
	/** Rolls the open dice prompt. */
	rollPrompt(): Promise<void>;
	/** Shows a tab of an actor's sheet. */
	showTab(actor: string, tab: string): Promise<void>;
	/** Runs a script on the setup's documents. */
	updateItem(actor: string, item: string, changes: object): Promise<void>;
	deleteItem(actor: string, item: string): Promise<void>;
	createItems(actor: string, items: { name: string; type: string; system?: object; in?: string }[]): Promise<void>;
	updateActor(actor: string, changes: object): Promise<void>;

	/** The actor's items named `E2E …`: equipment as `Name:state` or `Name:state@Container`, others as `Name (type)`. */
	items(actor: string): string[];
	/** The items of a section in sort order, as `Name=sort`. */
	sorts(actor: string, state: EquipmentState): string[];
	/** The rows a section of the Inventory tab lists. */
	section(actor: string, state: EquipmentState): Promise<string[]>;
	/** The rows a Container's row lists once opened. */
	contents(actor: string, container: string): Promise<string[]>;
	effects(actor: string): { onActor: number; applied: string[]; suppressed: string[] };
	/** An item's effects, which live on the item. */
	itemEffects(actor: string, item: string): string[];
	stat(actor: string, path: string): unknown;
	/** The Inactive Effects of the Effects tab, as `Name | tooltip`. */
	inactive(actor: string): Promise<string[]>;
	protection(actor: string): Promise<{ soak: number; defense: number[]; combatTab: string[] }>;
	encumbrance(actor: string): Promise<{ value: number; threshold: number; shown: string }>;
	row(actor: string, item: string): Promise<{ details: string; quantity: string; encumbrance: string; damageState: string | null }>;
	/** The text of the weapon rows of a sheet's Combat tab or an adversary's sheet. */
	weaponList(actor: string): Promise<string[]>;
	/** The texts of the last chat message's elements matched by these selectors. */
	lastMessage(selectors: string[]): string[];
	/** An item of the sidebar, as `skills` and `qualities` or `granted` items. */
	sidebarItem(item: string): { skills?: string[]; qualities?: string[]; granted?: string[] };
	/** The item batches created, updated and deleted on actors since the last call, as `create Actor: A, B`. */
	takeBatches(): string[];
	/** The notifications since the last call. */
	takeNotifications(): string[];
};

declare global {
	interface Window {
		inventoryE2E: InventoryHelpers;
	}
}

/**
 * Installs `window.inventoryE2E`. Playwright sends this function's source to the page, so it uses nothing from this
 * module.
 */
function installInventoryHelpers() {
	if (window.inventoryE2E) {
		return;
	}

	const { settle, waitFor, render, text, unprefixed, isSetUp } = window.e2e;
	const full = (name: string) => `E2E ${name}`;
	const PACKS = { items: 'e2e-inventory-items', actors: 'e2e-inventory-actors' };
	const pack = (key: keyof typeof PACKS) => game.packs.get(`world.${PACKS[key]}`);
	const SECTIONS = ['equipped', 'carried', 'dropped'];

	const actor = (ref: string) => {
		if (!ref.startsWith('token:')) return window.e2e.actor(ref);
		const found = canvas.scene?.tokens.getName(full(ref.slice('token:'.length)))?.actor;
		if (!found) throw new Error(`No actor ${ref}`);
		return found;
	};
	const item = (ref: string, name: string) => {
		const found = actor(ref).items.getName(full(name));
		if (!found) throw new Error(`No item ${name} on ${ref}`);
		return found;
	};
	const sheet = (ref: string) => render(actor(ref).sheet);

	// The children of the Inventory tab from a section's header to the next one: its rows and its sort slots.
	const sectionParts = (root: HTMLElement, state: string) => {
		const tab = root.querySelector('.tab[data-tab="inventory"] .tab-inventory');
		const header = tab?.querySelectorAll(':scope > .section-header')[SECTIONS.indexOf(state)];
		if (!header) throw new Error(`No ${state} section`);
		const parts: Element[] = [];
		for (let next = header.nextElementSibling; next && !next.matches('.section-header, .encumbrance-currency-row'); ) {
			parts.push(next);
			next = next.nextElementSibling;
		}
		return parts;
	};
	const findRow = (root: HTMLElement, name: string) => {
		const row = [...root.querySelectorAll('.tab-inventory .inventory-item')].find(
			(candidate) => text(candidate.querySelector('.name a')) === full(name),
		);
		if (!row) throw new Error(`No row ${name}`);
		return row as HTMLElement;
	};
	const rowOf = async (ref: string, name: string) => findRow(await sheet(ref), name);
	// Opening a Container's row only changes the row's own state: no document changes, so its contents are waited for.
	const openContainer = async (row: HTMLElement) => {
		const toggle = row.querySelector<HTMLElement>('[data-item-type="container"] a');
		if (toggle?.querySelector('.fa-box')) {
			toggle.click();
			await waitFor(`the contents of ${text(row.querySelector('.name a'))}`, () => row.querySelector('.contents'));
		}
	};
	// An item held in a Container has its row in the Container's row, once opened.
	const heldRow = async (ref: string, name: string) => {
		const root = await sheet(ref);
		const holder = actor(ref).items.get(item(ref, name).system.container);
		if (holder) await openContainer(findRow(root, unprefixed(holder.name)));
		return findRow(root, name);
	};

	const dropData = async (source: Source) => {
		if ('sidebar' in source) return { type: 'Item', uuid: game.items.getName(full(source.sidebar)).uuid };
		if ('folder' in source) return { type: 'Folder', uuid: game.folders.getName(full(source.folder)).uuid };
		if ('compendium' in source) {
			const entry = pack('items').index.find((indexed: { name: string }) => indexed.name === full(source.compendium));
			return { type: 'Item', uuid: `Compendium.${pack('items').collection}.Item.${entry._id}` };
		}
		if ('compendiumActorItem' in source) {
			const actors = pack('actors');
			const packed = await actors.getDocument(
				actors.index.find((indexed: { name: string }) => indexed.name === full('Packed Hero'))._id,
			);
			return { type: 'Item', uuid: packed.items.getName(full(source.compendiumActorItem)).uuid };
		}
		throw new Error('A held item is dragged from its row');
	};
	// A held item is dragged from its sheet, which writes the drag data as the user's drag does.
	const dragFrom = async (source: Source) => {
		if ('held' in source) {
			const root = await sheet(source.by);
			const element = ['character', 'vehicle'].includes(actor(source.by).type)
				? await heldRow(source.by, source.held)
				: [...root.querySelectorAll('a[draggable="true"]')].find((link) => text(link).startsWith(full(source.held)));
			if (!element) throw new Error(`No ${source.held} to drag`);
			const dataTransfer = window.e2e.dragStart(element);
			element.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
			return dataTransfer;
		}
		return dropData(source);
	};
	const dropOn = async (element: Element, data: object | DataTransfer) => {
		window.e2e.drop(element, data);
		// The sheets handle a drop asynchronously, and a refused drop changes nothing.
		await settle();
	};
	const clickYes = async () => {
		const yes = await waitFor('a confirmation dialog', () =>
			document.querySelector<HTMLElement>('[data-button="yes"], [data-action="yes"]'),
		);
		yes.click();
	};

	const batches: string[] = [];
	const actorPrototype = CONFIG.Actor.documentClass.prototype;
	for (const [method, label] of [
		['_onCreateDescendantDocuments', 'create'],
		['_onUpdateDescendantDocuments', 'update'],
		['_onDeleteDescendantDocuments', 'delete'],
	]) {
		const original = actorPrototype[method];
		actorPrototype[method] = function (
			this: { name: string },
			parent: unknown,
			collection: string,
			documents: { name: string }[],
			...rest: unknown[]
		) {
			if (collection === 'items') {
				batches.push(
					`${label} ${unprefixed(this.name)}: ${documents
						.map((doc) => unprefixed(doc.name))
						.sort()
						.join(', ')}`,
				);
			}
			return original.call(this, parent, collection, documents, ...rest);
		};
	}
	const takeNotifications = window.e2e.recordNotifications();

	const effect = (name: string, key: string, value: number) => ({
		name: full(name),
		img: 'icons/svg/aura.svg',
		transfer: true,
		changes: [{ key, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value) }],
	});
	// Effects that change nothing the scenario reads: only whether they apply is asserted.
	const marker = (name: string) => effect(name, 'flags.genesys.e2eInventory', 1);
	const gear = (name: string, system: object = {}, effects: object[] = []) => ({ name: full(name), type: 'gear', system, effects });
	const container = (name: string, system: object = {}) => ({ name: full(name), type: 'container', system });
	const weapon = (name: string, system: object = {}, effects: object[] = []) => ({
		name: full(name),
		type: 'weapon',
		system: {
			baseDamage: 2,
			damageCharacteristic: 'brawn',
			critical: 3,
			range: 'engaged',
			skills: ['Melee'],
			encumbrance: 1,
			...system,
		},
		effects,
	});
	const armor = (name: string, system: object, effects: object[] = []) => ({ name: full(name), type: 'armor', system, effects });

	// Gives an actor items made from data, each in a state and maybe in a Container given by name.
	const give = async (
		target: { items: { getName(name: string): { id: string } } } & {
			createEmbeddedDocuments(type: string, data: object[]): Promise<unknown>;
		},
		entries: {
			data: { name: string; type?: string; system?: object; effects?: object[] };
			state?: string;
			in?: string;
			sort?: number;
		}[],
	) => {
		for (const entry of entries) {
			const system: Record<string, unknown> = { ...(entry.data.system ?? {}) };
			if (entry.state) system.state = entry.state;
			if (entry.in) system.container = target.items.getName(full(entry.in)).id;
			await target.createEmbeddedDocuments('Item', [
				{ ...entry.data, system, ...(entry.sort === undefined ? {} : { sort: entry.sort }) },
			]);
		}
	};

	const helpers: InventoryHelpers = {
		async setUp(playerUser) {
			await helpers.tearDown();

			const itemsPack = await window.e2e.createCompendium({ label: 'E2E Inventory Items', name: PACKS.items, type: 'Item' });
			await CONFIG.Item.documentClass.createDocuments(
				[
					armor('Packed Mail', { soak: 2, defense: 1, encumbrance: 4 }, [
						effect('Packed Mail Effect', 'system.wounds.max', 1000),
					]),
					gear('Packed Gear'),
					gear('Packed Rations'),
				],
				{ pack: itemsPack.collection },
			);
			await itemsPack.getIndex();
			const actorsPack = await window.e2e.createCompendium({ label: 'E2E Inventory Actors', name: PACKS.actors, type: 'Actor' });
			await CONFIG.Actor.documentClass.create(
				{ name: full('Packed Hero'), type: 'character', items: [gear('Packed Lamp'), gear('Packed Map')] },
				{ pack: actorsPack.collection },
			);
			await actorsPack.getIndex();

			const folder = await CONFIG.Folder.documentClass.create({ name: full('Folder'), type: 'Item' });
			await Item.createDocuments([
				{ ...gear('Folder Lamp'), folder: folder.id },
				{ ...weapon('Folder Dagger'), folder: folder.id },
				weapon('Sword'),
				weapon('Spear'),
				armor('Mail', { soak: 2, defense: 1, encumbrance: 4 }, [effect('Mail Effect', 'system.wounds.max', 1)]),
				armor('Jacket', { soak: 1, defense: 0, encumbrance: 1 }, [effect('Jacket Effect', 'system.wounds.max', 10)]),
				gear('Rope', { encumbrance: 1 }, [marker('Rope Effect')]),
				gear('Torch', { encumbrance: 1 }),
				gear('Lantern'),
				gear('Knife'),
				container('Backpack', { encumbrance: 1 }),
				gear('Saddlebags', { encumbrance: -2, quantity: 2 }),
				{
					name: full('Blaster'),
					type: 'vehicleWeapon',
					system: { baseDamage: 5, critical: 3, range: 'short', skills: ['Gunnery'] },
				},
				{ name: full('Talent'), type: 'talent', system: { tier: 1 } },
				{ name: full('Skill'), type: 'skill', system: { characteristic: 'brawn' } },
				{ name: full('Quality'), type: 'quality', system: { isRated: true } },
				{ name: full('Archetype'), type: 'archetype' },
			]);

			const character = (name: string, extra: object = {}) => ({
				name: full(name),
				type: 'character',
				system: {
					characteristics: { brawn: 2 },
					wounds: { max: 10 },
					strain: { max: 10 },
					experienceJournal: { entries: [{ amount: 100, type: 'Starting' }] },
				},
				prototypeToken: { actorLink: true },
				...extra,
			});
			const playerId = game.users.getName(playerUser).id;
			const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
			const OBSERVER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
			await Actor.createDocuments([
				character('Hero', { ownership: { default: 0, [playerId]: OWNER } }),
				character('Ally', { ownership: { default: OBSERVER } }),
				...['Receiver', 'Sorter', 'Wearer', 'Packer', 'Looper', 'Deleter', 'Smith'].map((name) => character(name)),
				{ name: full('Vehicle'), type: 'vehicle' },
				{ name: full('Hauler'), type: 'vehicle' },
				{ name: full('Rival'), type: 'rival' },
				{ name: full('Minion'), type: 'minion' },
				{ name: full('Brute'), type: 'rival', system: { characteristics: { brawn: 3 } } },
				{ name: full('Token Rival'), type: 'rival', prototypeToken: { actorLink: false } },
			]);

			await give(actor('Ally'), [
				{ data: weapon('Sword'), state: 'equipped' },
				{
					data: armor('Mail', { soak: 2, defense: 1, encumbrance: 4 }, [effect('Mail Effect', 'system.wounds.max', 1)]),
					state: 'equipped',
				},
				{ data: container('Satchel'), state: 'carried' },
				{ data: gear('Map'), state: 'carried', in: 'Satchel' },
				{ data: gear('Compass'), state: 'carried', in: 'Satchel' },
				{ data: gear('Whistle'), state: 'dropped' },
				{ data: gear('Horn', {}, [marker('Horn Effect')]), state: 'carried' },
				{ data: gear('Lockpick'), state: 'carried' },
				{ data: container('Crate'), state: 'carried' },
				{ data: container('Box'), state: 'carried', in: 'Crate' },
				{ data: gear('Coin'), state: 'carried', in: 'Box' },
			]);
			await give(actor('Hero'), [
				{ data: container('Pack'), state: 'carried' },
				{ data: gear('Rope', {}, [marker('Rope Effect')]), state: 'carried', in: 'Pack' },
				{ data: gear('Flask'), state: 'carried', in: 'Pack' },
				{ data: gear('Bell', {}, [effect('Bell Effect', 'system.strain.max', 100)]), state: 'carried' },
				{ data: { name: full('Potion'), type: 'consumable', effects: [marker('Potion Effect')] }, state: 'carried' },
				{ data: { name: full('Elixir'), type: 'consumable', effects: [marker('Elixir Effect')] }, state: 'used' },
				{ data: weapon('Axe', {}), state: 'carried' },
			]);
			await give(actor('Sorter'), [
				{ data: gear('Ant'), state: 'carried', sort: 1 },
				{ data: gear('Bee'), state: 'carried', sort: 2 },
				{ data: gear('Cat'), state: 'carried', sort: 3 },
			]);
			await give(actor('Wearer'), [
				{
					data: armor('Coat', { soak: 2, defense: 1, encumbrance: 4 }, [effect('Coat Effect', 'system.wounds.max', 1)]),
					state: 'equipped',
				},
				{
					data: armor('Vest', { soak: 1, defense: 2, encumbrance: 1 }, [effect('Vest Effect', 'system.wounds.max', 10)]),
					state: 'carried',
				},
				{
					data: armor('Plate', { soak: 3, defense: 0, encumbrance: 5 }, [effect('Plate Effect', 'system.wounds.max', 100)]),
					state: 'carried',
				},
				{ data: container('Backpack'), state: 'carried' },
				{ data: weapon('Dirk', {}, [effect('Dirk Effect', 'system.strain.max', 5)]), state: 'equipped' },
			]);
			await give(actor('Packer'), [{ data: container('Sack'), state: 'dropped' }]);
			await give(actor('Deleter'), [
				{ data: container('Box1'), state: 'carried' },
				{ data: gear('A1'), state: 'carried', in: 'Box1' },
				{ data: gear('A2'), state: 'carried', in: 'Box1' },
				{ data: container('Box2'), state: 'carried' },
				{ data: gear('B1'), state: 'carried', in: 'Box2' },
				{ data: container('Box3'), state: 'carried' },
				{ data: gear('C1'), state: 'carried', in: 'Box3' },
			]);
			await give(actor('Smith'), [
				{ data: weapon('Blade'), state: 'equipped' },
				{ data: weapon('Club'), state: 'equipped' },
				{ data: weapon('Rock', { damageCharacteristic: '-', baseDamage: null }), state: 'equipped' },
				{ data: weapon('Shiv', { baseDamage: -1 }), state: 'equipped' },
				{ data: armor('Hide', { soak: 1, defense: 1, encumbrance: 2 }), state: 'carried' },
			]);
			await give(actor('Brute'), [{ data: weapon('Maul', { baseDamage: null }) }]);
			const arcs = (fore: boolean, aft: boolean, port: boolean, starboard: boolean) => ({ fore, aft, port, starboard });
			const vehicleWeapon = (name: string, system: object) => ({
				name: full(name),
				type: 'vehicleWeapon',
				system: { baseDamage: 4, critical: 3, range: 'short', skills: ['Gunnery'], ...system },
			});
			await give(actor('Hauler'), [
				{ data: vehicleWeapon('Gun', { baseDamage: null, firingArc: arcs(true, true, true, true) }), state: 'equipped' },
				{ data: vehicleWeapon('Turret', { firingArc: arcs(false, false, false, false) }), state: 'equipped' },
				{ data: vehicleWeapon('Cannon', { baseDamage: -1, firingArc: arcs(true, false, true, false) }), state: 'equipped' },
			]);
			await give(actor('Token Rival'), [{ data: gear('Token Knife') }]);

			await window.e2e.ensureScene();
			const tokenData = (await actor('Token Rival').getTokenDocument()).toObject();
			await canvas.scene.createEmbeddedDocuments('Token', [{ ...tokenData, name: full('Token Rival'), x: 300, y: 700 }]);
		},

		async tearDown() {
			await window.e2e.closeSetUp();
			for (const key of ['items', 'actors'] as const) await pack(key)?.deleteCompendium();
			await window.e2e.deleteSetUp('Token', 'Actor', 'Item', 'Folder');
		},

		async drop(source, ref, at) {
			const dragged = await dragFrom(source);
			const root = await sheet(ref);
			let target: Element | null | undefined;
			if ('item' in at) {
				target = findRow(root, at.item);
			} else if ('on' in at) {
				target = root.querySelector(at.on);
			} else {
				target = sectionParts(root, at.section).filter((part) => part.matches('.sortTarget'))[at.slot];
			}
			if (!target) throw new Error(`No target ${JSON.stringify(at)} on ${ref}`);
			await dropOn(target, dragged);
		},

		async dropOnItemSheet(source, name, ref) {
			const target = ref ? item(ref, name) : game.items.getName(full(name));
			const root = await render(target.sheet, (root) => root.querySelector('.window-content'));
			await dropOn(root.querySelector('.window-content')!, await dragFrom(source));
		},

		async menu(ref, name, action) {
			const icons: Record<MenuAction, string> = {
				equip: '.fa-hand-fist, .fa-shield',
				carry: '.fa-suitcase',
				drop: '.fa-box-archive',
				delete: '.fa-trash',
				chat: '.fa-comment',
			};
			const row = await rowOf(ref, name);
			row.querySelector<HTMLElement>(':scope > .actions')!.click();
			const entry = await waitFor(`${action} in the menu of ${name}`, () =>
				[...row.querySelectorAll<HTMLElement>(':scope > .actions .context-menu .menu-item')].find((menuItem) =>
					menuItem.querySelector(icons[action]),
				),
			);
			entry.click();
			await settle();
		},

		async editItemSheet(ref, name, field, value) {
			const selector = `[name="${field}"]`;
			const root = await render(item(ref, name).sheet, (root) => root.querySelector(selector));
			const input = root.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
			input.value = value;
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
		},

		async damageToNothing(ref, name) {
			for (let step = 0; step < 4; step++) {
				(await rowOf(ref, name)).querySelector<HTMLElement>(':scope > .damage')!.click();
				await settle();
			}
			await clickYes();
			await settle();
		},

		async clickQuantityAndDamage(ref, name) {
			(await rowOf(ref, name)).querySelector<HTMLElement>(':scope > .quantity')!.click();
			await settle();
			(await rowOf(ref, name)).querySelector<HTMLElement>(':scope > .damage')!.click();
			await settle();
		},

		async attack(ref, name) {
			(await rowOf(ref, name)).querySelector<HTMLElement>('button.attack')!.click();
			// The prompt shows a spinner while it counts its chance to succeed, which may roll dice, and builds its pool from
			// the actor once open: the attack's dice are fixed after both.
			await waitFor('the dice prompt', () => {
				const prompt = document.querySelector('.app-dice-prompt');
				return prompt?.querySelector('.roll-button') && !prompt.querySelector('.chance-to-succeed .fa-spinner');
			});
			await settle();
		},

		async rollPrompt() {
			const roll = document.querySelector<HTMLElement>('.app-dice-prompt .roll-button');
			if (!roll) throw new Error('No dice prompt');
			roll.click();
			await settle();
		},

		async showTab(ref, tab) {
			const root = await sheet(ref);
			root.querySelector<HTMLElement>(`nav.sheet-tabs [data-tab="${tab}"]`)!.click();
			await waitFor(`the ${tab} tab`, () => root.querySelector(`.tab[data-tab="${tab}"].active`));
		},

		async updateItem(ref, name, changes) {
			await item(ref, name).update(changes);
		},

		async deleteItem(ref, name) {
			await item(ref, name).delete();
		},

		async createItems(ref, entries) {
			await give(
				actor(ref),
				entries.map((entry) => ({ data: { name: full(entry.name), type: entry.type, system: entry.system ?? {} }, in: entry.in })),
			);
		},

		async updateActor(ref, changes) {
			await actor(ref).update(changes);
		},

		items(ref) {
			const held = actor(ref).items.filter(isSetUp);
			return held
				.map((owned: { name: string; type: string; system: { state?: string; container?: string } }) => {
					if (typeof owned.system.state !== 'string') return `${unprefixed(owned.name)} (${owned.type})`;
					const holder = owned.system.container ? actor(ref).items.get(owned.system.container) : undefined;
					const place = owned.system.container ? `@${holder ? unprefixed(holder.name) : '?'}` : '';
					return `${unprefixed(owned.name)}:${owned.system.state}${place}`;
				})
				.sort();
		},

		sorts(ref, state) {
			return actor(ref)
				.items.filter(
					(owned: { system: { state?: string; container?: string } }) => owned.system.state === state && !owned.system.container,
				)
				.sort((left: { sort: number }, right: { sort: number }) => left.sort - right.sort)
				.map((owned: { name: string; sort: number }) => `${unprefixed(owned.name)}=${owned.sort}`);
		},

		async section(ref, state) {
			return sectionParts(await sheet(ref), state)
				.filter((part) => part.matches('.inventory-item'))
				.map((row) => unprefixed(text(row.querySelector('.name a'))));
		},

		async contents(ref, name) {
			const row = await rowOf(ref, name);
			await openContainer(row);
			return [...row.querySelectorAll('.contents .inventory-item .name a')].map((link) => unprefixed(text(link)));
		},

		effects(ref) {
			const owner = actor(ref);
			const all: { name: string; isSuppressed: boolean }[] = [...owner.allApplicableEffects()];
			const names = (effects: { name: string }[]) => effects.map((applicable) => unprefixed(applicable.name)).sort();
			return {
				onActor: owner.effects.size,
				applied: names(all.filter((applicable) => !applicable.isSuppressed)),
				suppressed: names(all.filter((applicable) => applicable.isSuppressed)),
			};
		},

		itemEffects(ref, name) {
			return item(ref, name).effects.map((owned: { name: string }) => unprefixed(owned.name));
		},

		stat(ref, path) {
			return foundry.utils.getProperty(actor(ref).system, path);
		},

		async inactive(ref) {
			const category = (await sheet(ref)).querySelectorAll('.tab[data-tab="effects"] .effects-category')[2];
			return [...(category?.querySelectorAll('.effect') ?? [])].map(
				(row) => `${unprefixed(text(row.querySelector('.name')))} | ${row.getAttribute('data-tooltip') ?? ''}`,
			);
		},

		async protection(ref) {
			const root = await sheet(ref);
			const system = actor(ref).system;
			return {
				soak: system.totalSoak,
				defense: [system.totalDefense.melee, system.totalDefense.ranged],
				combatTab: [...root.querySelectorAll('.tab[data-tab="combat"] .armors .armor:not(.header) .name')].map((name) =>
					unprefixed(text(name)),
				),
			};
		},

		async encumbrance(ref) {
			const root = await sheet(ref);
			const { value, threshold } = actor(ref).system.currentEncumbrance;
			return { value, threshold, shown: text(root.querySelector('.tab-inventory .encumbrance-row span:last-child')) };
		},

		async row(ref, name) {
			const row = await rowOf(ref, name);
			return {
				details: [...(row.querySelector('[data-item-type]')?.children ?? [])].map((part) => unprefixed(text(part))).join(' | '),
				quantity: text(row.querySelector(':scope > .quantity')),
				encumbrance: text(row.querySelector(':scope > .weight')),
				damageState: row.querySelector(':scope > .damage')?.getAttribute('data-tooltip') ?? null,
			};
		},

		async weaponList(ref) {
			const root = await sheet(ref);
			if (actor(ref).type === 'rival') {
				return [...root.querySelectorAll('.weapon a[draggable="true"]')].map((link) => unprefixed(text(link)));
			}
			const rows = root.querySelectorAll('.tab[data-tab="combat"] .weapons .weapon:not(.header)');
			return [...rows].map((row) =>
				[...row.children]
					.map((part) => unprefixed(text(part)))
					.filter(Boolean)
					.join(' | '),
			);
		},

		lastMessage(selectors) {
			const content = document.createElement('div');
			content.innerHTML = game.messages.contents.at(-1)?.content ?? '';
			return selectors.map((selector) => text(content.querySelector(selector)));
		},

		sidebarItem(name) {
			const system = game.items.getName(full(name)).system;
			return {
				...(system.skills ? { skills: [...system.skills] } : {}),
				...(system.qualities
					? {
							qualities: system.qualities.map(
								(quality: { name: string; rating: number }) => `${quality.name} ${quality.rating}`,
							),
						}
					: {}),
				...(system.grantedItems ? { granted: system.grantedItems.map((granted: { name: string }) => granted.name) } : {}),
			};
		},

		takeBatches() {
			return batches.splice(0);
		},

		takeNotifications() {
			return takeNotifications();
		},
	};

	window.inventoryE2E = helpers;
}

// Foundry v13 throws in no-canvas mode when a token is deleted (CanvasDocument#_onDelete reads its layer's clipboard).
export const needsCanvas = true;

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	await gm.evaluate(installInventoryHelpers);
	await gm.evaluate((playerUser) => window.inventoryE2E.setUp(playerUser), e2e.playerUser);

	const page = gm;
	const drop = (source: Source, actor: string, at: Target) => () =>
		page.evaluate((args) => window.inventoryE2E.drop(args.source, args.actor, args.at), { source, actor, at });
	const drops =
		(...actions: (() => Promise<unknown>)[]) =>
		async () => {
			for (const action of actions) await action();
		};
	const menu = (actor: string, item: string, action: MenuAction) => () =>
		page.evaluate((args) => window.inventoryE2E.menu(args.actor, args.item, args.action), { actor, item, action });
	const updateItem = (actor: string, item: string, changes: object) => () =>
		page.evaluate((args) => window.inventoryE2E.updateItem(args.actor, args.item, args.changes), { actor, item, changes });
	const items = (actor: string) => page.evaluate((ref) => window.inventoryE2E.items(ref), actor);
	const sorts = (actor: string, state: EquipmentState) =>
		page.evaluate((args) => window.inventoryE2E.sorts(args.actor, args.state), { actor, state });
	const section = (actor: string, state: EquipmentState) =>
		page.evaluate((args) => window.inventoryE2E.section(args.actor, args.state), { actor, state });
	const effects = (actor: string) => page.evaluate((ref) => window.inventoryE2E.effects(ref), actor);
	const stat = (actor: string, path: string) => page.evaluate((args) => window.inventoryE2E.stat(args.actor, args.path), { actor, path });
	const inactive = (actor: string) => page.evaluate((ref) => window.inventoryE2E.inactive(ref), actor);
	const protection = (actor: string) => page.evaluate((ref) => window.inventoryE2E.protection(ref), actor);
	const encumbrance = (actor: string) => page.evaluate((ref) => window.inventoryE2E.encumbrance(ref), actor);
	const row = (actor: string, item: string) => page.evaluate((args) => window.inventoryE2E.row(args.actor, args.item), { actor, item });
	const takeBatches = () => page.evaluate(() => window.inventoryE2E.takeBatches());
	const takeNotifications = () => page.evaluate(() => window.inventoryE2E.takeNotifications());
	const errorCount = () => gm.errors.length;
	const sidebar = (name: string): Source => ({ sidebar: name });
	const compendium = (name: string): Source => ({ compendium: name });
	const held = (item: string, by: string): Source => ({ held: item, by });
	const slot = (state: EquipmentState, n: number): Target => ({ section: state, slot: n });
	const onSheet: Target = { on: '.window-content' };
	const tooltip = (item: string, state: string) => `Inactive while E2E ${item} is ${state}.`;

	// #82: drops on item sheets.
	await e2e.step(
		'#82 A1 a skill and a rated quality, twice, dropped on a weapon sheet',
		drops(
			() => page.evaluate(() => window.inventoryE2E.dropOnItemSheet({ sidebar: 'Skill' }, 'Spear')),
			() => page.evaluate(() => window.inventoryE2E.dropOnItemSheet({ sidebar: 'Quality' }, 'Spear')),
			() => page.evaluate(() => window.inventoryE2E.dropOnItemSheet({ sidebar: 'Quality' }, 'Spear')),
		),
	);
	e2e.expect(
		'#82 A1 a weapon takes a skill and a quality dropped on its sheet, a rated quality again raising its rating',
		await page.evaluate(() => window.inventoryE2E.sidebarItem('Spear')),
		{ skills: ['Melee', 'E2E Skill'], qualities: ['E2E Quality 2'] },
	);
	await e2e.step('#82 A2 a talent dropped on an archetype sheet', () =>
		page.evaluate(() => window.inventoryE2E.dropOnItemSheet({ sidebar: 'Talent' }, 'Archetype')),
	);
	e2e.expect(
		'#82 A2 an archetype grants a talent dropped on its sheet',
		await page.evaluate(() => window.inventoryE2E.sidebarItem('Archetype')),
		{
			granted: ['E2E Talent'],
		},
	);

	// #103: drops from the sidebar and a compendium on each actor type.
	await e2e.step(
		'#103 B1 sidebar and compendium items dropped on the sections, a Container and elsewhere on a character',
		drops(
			drop(sidebar('Sword'), 'Receiver', slot('equipped', 0)),
			drop(sidebar('Rope'), 'Receiver', slot('carried', 0)),
			drop(sidebar('Torch'), 'Receiver', slot('dropped', 0)),
			drop(compendium('Packed Gear'), 'Receiver', slot('carried', 0)),
			drop(sidebar('Backpack'), 'Receiver', slot('carried', 0)),
			drop(sidebar('Lantern'), 'Receiver', { item: 'Backpack' }),
			drop(compendium('Packed Rations'), 'Receiver', { item: 'Backpack' }),
			drop(sidebar('Knife'), 'Receiver', onSheet),
		),
	);
	e2e.expect(
		'#103 B1 each item dropped on a character is created once, in the state of the section or Container, or Carried',
		await items('Receiver'),
		[
			'Backpack:carried',
			'Knife:carried',
			'Lantern:carried@Backpack',
			'Packed Gear:carried',
			'Packed Rations:carried@Backpack',
			'Rope:carried',
			'Sword:equipped',
			'Torch:dropped',
		],
	);
	await e2e.step(
		'#103 B2 sidebar and compendium items dropped on the sections, a Container and elsewhere on a vehicle',
		drops(
			drop(sidebar('Blaster'), 'Vehicle', slot('equipped', 0)),
			drop(sidebar('Rope'), 'Vehicle', slot('carried', 0)),
			drop(sidebar('Backpack'), 'Vehicle', slot('carried', 0)),
			drop(sidebar('Lantern'), 'Vehicle', { item: 'Backpack' }),
			drop(compendium('Packed Gear'), 'Vehicle', onSheet),
		),
	);
	e2e.expect(
		'#103 B2 each item dropped on a vehicle is created once, in the state of the section or Container, or Carried',
		await items('Vehicle'),
		['Backpack:carried', 'Blaster:equipped', 'Lantern:carried@Backpack', 'Packed Gear:carried', 'Rope:carried'],
	);
	await e2e.step(
		'#103 B3 sidebar and compendium items dropped on a rival and a minion',
		drops(
			drop(sidebar('Mail'), 'Rival', onSheet),
			drop(compendium('Packed Gear'), 'Rival', onSheet),
			drop(sidebar('Sword'), 'Minion', onSheet),
			drop(compendium('Packed Mail'), 'Minion', onSheet),
		),
	);
	e2e.expect('#103 B3 each item dropped on a rival is created once, Carried', await items('Rival'), [
		'Mail:carried',
		'Packed Gear:carried',
	]);
	e2e.expect('#103 B3 each item dropped on a minion is created once, Carried', await items('Minion'), [
		'Packed Mail:carried',
		'Sword:carried',
	]);
	e2e.expect("#102 B3 the effects of an adversary's equipment apply whatever its state", await effects('Rival'), {
		onActor: 0,
		applied: ['Mail Effect'],
		suppressed: [],
	});

	// #103: what goes on to the sheet.
	await e2e.step(
		'#103 C1 a talent dropped on the Carried section and a skill on a Container of a character',
		drops(drop(sidebar('Talent'), 'Receiver', slot('carried', 0)), drop(sidebar('Skill'), 'Receiver', { item: 'Backpack' })),
	);
	await e2e.step(
		'#103 C2 items of an actor in a compendium dropped on the Dropped section and on a Container',
		drops(
			drop({ compendiumActorItem: 'Packed Lamp' }, 'Receiver', slot('dropped', 0)),
			drop({ compendiumActorItem: 'Packed Map' }, 'Receiver', { item: 'Backpack' }),
		),
	);
	await e2e.step(
		'#103 C3 a folder of items dropped on the Inventory tab',
		drop({ folder: 'Folder' }, 'Receiver', { on: '.tab-inventory .encumbrance-currency-row' }),
	);
	e2e.expect(
		'#103 C1-C3 a talent and a skill go on to the sheet, items of a compendium actor and of a folder land Carried, each once',
		await items('Receiver'),
		[
			'Backpack:carried',
			'Folder Dagger:carried',
			'Folder Lamp:carried',
			'Knife:carried',
			'Lantern:carried@Backpack',
			'Packed Gear:carried',
			'Packed Lamp:carried',
			'Packed Map:carried',
			'Packed Rations:carried@Backpack',
			'Rope:carried',
			'Skill (skill)',
			'Sword:equipped',
			'Talent (talent)',
			'Torch:dropped',
		],
	);

	// #103: moves between actors, from Ally (owned by the GM) to Hero.
	await e2e.step(
		"#103 D1 Ally's equipped Sword dragged to Hero's Carried section",
		drop(held('Sword', 'Ally'), 'Hero', slot('carried', 0)),
	);
	e2e.expect(
		'#103 D1 a weapon moved to another character leaves the first and takes the state of its new section',
		{
			Ally: (await items('Ally')).filter((name) => name.startsWith('Sword')),
			Hero: (await items('Hero')).filter((name) => name.startsWith('Sword')),
		},
		{ Ally: [], Hero: ['Sword:carried'] },
	);
	await takeBatches();
	await e2e.step(
		"#103 D2 Ally's Satchel and its contents dragged to Hero's Carried section",
		drop(held('Satchel', 'Ally'), 'Hero', slot('carried', 0)),
	);
	e2e.expect(
		'#103 D2 a Container moved to another character takes its contents, with new ids, created then deleted in one batch each',
		{
			Ally: (await items('Ally')).filter((name) => /^(Satchel|Map|Compass)/.test(name)),
			Hero: (await items('Hero')).filter((name) => /^(Satchel|Map|Compass)/.test(name)),
			batches: (await takeBatches()).filter((batch) => !batch.startsWith('update')),
		},
		{
			Ally: [],
			Hero: ['Compass:carried@Satchel', 'Map:carried@Satchel', 'Satchel:carried'],
			batches: ['create Hero: Compass, Map, Satchel', 'delete Ally: Compass, Map, Satchel'],
		},
	);
	await takeNotifications();
	const errorsBeforeD3 = errorCount();
	await e2e.step(
		"#102 D3 Ally's equipped Mail dragged to Hero's Equipped section",
		drop(held('Mail', 'Ally'), 'Hero', slot('equipped', 0)),
	);
	e2e.expect(
		'#102 D3 an armor moved to another character keeps its effect, which applies from the item, with no warning or error',
		{
			itemEffects: await page.evaluate(() => window.inventoryE2E.itemEffects('Hero', 'Mail')),
			effects: await effects('Hero'),
			woundsMax: await stat('Hero', 'wounds.max'),
			notifications: await takeNotifications(),
			errors: errorCount() - errorsBeforeD3,
		},
		{
			itemEffects: ['Mail Effect'],
			effects: { onActor: 0, applied: ['Bell Effect', 'Elixir Effect', 'Mail Effect', 'Rope Effect'], suppressed: ['Potion Effect'] },
			woundsMax: 11,
			notifications: [],
			errors: 0,
		},
	);
	e2e.expect(
		'#102 D3 effects follow the Equipment State: equipped armor, carried gear and a used consumable apply, a carried consumable does not',
		(await effects('Hero')).suppressed,
		['Potion Effect'],
	);
	await e2e.step("#103 D4 Ally's Dropped Whistle dropped on Hero's Mail row", drop(held('Whistle', 'Ally'), 'Hero', { item: 'Mail' }));
	e2e.expect(
		'#103 D4 an item from another actor dropped on a row that is no Container lands in Carried',
		{
			Ally: (await items('Ally')).filter((name) => name.startsWith('Whistle')),
			Hero: (await items('Hero')).filter((name) => name.startsWith('Whistle')),
		},
		{ Ally: [], Hero: ['Whistle:carried'] },
	);
	const heroBeforeD5 = { items: await items('Hero'), carried: await sorts('Hero', 'carried') };
	await e2e.step(
		"#103 D5 Hero's Whistle dropped on Hero's Mail row, then elsewhere on Hero's sheet",
		drops(drop(held('Whistle', 'Hero'), 'Hero', { item: 'Mail' }), drop(held('Whistle', 'Hero'), 'Hero', onSheet)),
	);
	e2e.expect(
		'#103 D5 an item dropped on a row or elsewhere on the sheet of the actor that owns it stays where it is',
		{
			items: await items('Hero'),
			carried: await sorts('Hero', 'carried'),
		},
		heroBeforeD5,
	);
	await e2e.step(
		"#103 D6 Ally's Crate, holding the Box that holds a Coin, dragged to Hero's Carried section",
		drop(held('Crate', 'Ally'), 'Hero', slot('carried', 0)),
	);
	e2e.expect(
		'#103 D6 a Container held in another one moves with all it holds',
		{
			Ally: (await items('Ally')).filter((name) => /^(Crate|Box|Coin)/.test(name)),
			Hero: (await items('Hero')).filter((name) => /^(Crate|Box|Coin)/.test(name)),
		},
		{ Ally: [], Hero: ['Box:carried@Crate', 'Coin:carried@Box', 'Crate:carried'] },
	);
	await e2e.step("#103 D7 Hero's Crate deleted by script", () => page.evaluate(() => window.inventoryE2E.deleteItem('Hero', 'Crate')));
	e2e.expect(
		'#103 D7 a Container held in another one is deleted with its outermost Container, with all it holds',
		(await items('Hero')).filter((name) => /^(Crate|Box|Coin)/.test(name)),
		[],
	);
	await e2e.step(
		"#103 D8 Hero's Sword equipped from its menu, then dragged to the rival",
		drops(menu('Hero', 'Sword', 'equip'), drop(held('Sword', 'Hero'), 'Rival', onSheet)),
	);
	await e2e.step("#103 D9 Hero's Satchel and its contents dragged to the rival", drop(held('Satchel', 'Hero'), 'Rival', onSheet));
	e2e.expect(
		'#103 D8-D9 an equipped weapon and a Container with its contents moved to a rival leave the character and are Carried there',
		{
			Hero: (await items('Hero')).filter((name) => /^(Sword|Satchel|Map|Compass)/.test(name)),
			Rival: await items('Rival'),
		},
		{
			Hero: [],
			Rival: [
				'Compass:carried@Satchel',
				'Mail:carried',
				'Map:carried@Satchel',
				'Packed Gear:carried',
				'Satchel:carried',
				'Sword:carried',
			],
		},
	);

	// #103: an unlinked rival token.
	await e2e.step(
		"#103 E1 the Token Knife dragged from the unlinked token's sheet to Hero's Carried section",
		drop(held('Token Knife', 'token:Token Rival'), 'Hero', slot('carried', 0)),
	);
	e2e.expect(
		'#103 E1 an item moved from an unlinked token to a character leaves the token, not its actor',
		{
			token: await items('token:Token Rival'),
			actor: await items('Token Rival'),
			Hero: (await items('Hero')).filter((name) => name.startsWith('Token Knife')),
		},
		{ token: [], actor: ['Token Knife:carried'], Hero: ['Token Knife:carried'] },
	);
	await e2e.step(
		"#103 E2 the Token Knife dragged back from Hero to the token's sheet",
		drop(held('Token Knife', 'Hero'), 'token:Token Rival', onSheet),
	);
	e2e.expect(
		'#103 E2 an item moved from a character back to an unlinked token leaves the character',
		{
			token: await items('token:Token Rival'),
			Hero: (await items('Hero')).filter((name) => name.startsWith('Token Knife')),
		},
		{ token: ['Token Knife:carried'], Hero: [] },
	);

	// #103: refused drops.
	const player = await e2e.player();
	await player.evaluate(installInventoryHelpers);
	await player.evaluate(() => window.inventoryE2E.takeNotifications());
	const heroBeforeF1 = await items('Hero');
	await e2e.step(
		"#103 F1 the player drops an item of an actor they don't own on a section and elsewhere on their character",
		drops(
			() =>
				player.evaluate(() => window.inventoryE2E.drop({ held: 'Lockpick', by: 'Ally' }, 'Hero', { section: 'carried', slot: 0 })),
			() => player.evaluate(() => window.inventoryE2E.drop({ held: 'Lockpick', by: 'Ally' }, 'Hero', { on: '.window-content' })),
		),
	);
	e2e.expect(
		"#103 F1 an item of an actor the player doesn't own is refused, in silence",
		{
			Hero: await items('Hero'),
			Ally: (await items('Ally')).filter((name) => name.startsWith('Lockpick')),
			notifications: await player.evaluate(() => window.inventoryE2E.takeNotifications()),
		},
		{ Hero: heroBeforeF1, Ally: ['Lockpick:carried'], notifications: [] },
	);
	await takeNotifications();
	await e2e.step(
		"#103 F2 the GM drops a Container from the sidebar into Hero's Pack",
		drop(sidebar('Backpack'), 'Hero', { item: 'Pack' }),
	);
	e2e.expect(
		'#103 F2 a Container dropped into a Container is refused, in silence',
		{
			Hero: await items('Hero'),
			notifications: await takeNotifications(),
		},
		{ Hero: heroBeforeF1, notifications: [] },
	);

	// #103, #102: a Container's contents share its state, and their effects follow.
	const pack = async () => ({
		items: (await items('Hero')).filter((name) => /^(Pack|Rope|Flask)/.test(name)),
		rope: (await effects('Hero')).applied.includes('Rope Effect'),
	});
	const packIn = (state: EquipmentState, rope: boolean) => ({
		items: [`Flask:${state}@Pack`, `Pack:${state}`, `Rope:${state}@Pack`],
		rope,
	});
	await e2e.step("#103 G1 Hero's Pack dragged to the Dropped section", drop(held('Pack', 'Hero'), 'Hero', slot('dropped', 0)));
	e2e.expect('#103 G1 a Container dragged to Dropped takes its contents, whose effects stop', await pack(), packIn('dropped', false));
	await e2e.step("#103 G2 Hero's Pack dragged back to the Carried section", drop(held('Pack', 'Hero'), 'Hero', slot('carried', 0)));
	e2e.expect(
		'#103 G2 a Container dragged back to Carried brings its contents, whose effects apply again',
		await pack(),
		packIn('carried', true),
	);
	await e2e.step("#103 G3 Hero's Pack dropped from its menu", menu('Hero', 'Pack', 'drop'));
	e2e.expect('#103 G3 a Container dropped from its menu takes its contents, whose effects stop', await pack(), packIn('dropped', false));
	await e2e.step("#103 G4 Hero's Pack picked up from its menu", menu('Hero', 'Pack', 'carry'));
	e2e.expect(
		'#103 G4 a Container picked up from its menu brings its contents, whose effects apply again',
		await pack(),
		packIn('carried', true),
	);
	await e2e.step("#103 G5 Hero's Pack dropped by script", updateItem('Hero', 'Pack', { 'system.state': 'dropped' }));
	e2e.expect('#103 G5 a Container whose state a script changes takes its contents along', await pack(), packIn('dropped', false));
	await e2e.step(
		"#103 G6 Hero's Pack carried by script, then the Rope in it dropped by script",
		drops(updateItem('Hero', 'Pack', { 'system.state': 'carried' }), async () => {
			// The Pack's contents take its state first, so that the Rope's own change comes after.
			await e2e.settle();
			await updateItem('Hero', 'Rope', { 'system.state': 'dropped' })();
		}),
	);
	e2e.expect(
		"#103 G6 an item in a Container whose state a script changes takes back the Container's state",
		await pack(),
		packIn('carried', true),
	);
	await e2e.step("#103 G7 a Coil created by script in Hero's Carried Pack, Dropped", () =>
		page.evaluate(async () => {
			const hero = game.actors.getName('E2E Hero');
			await hero.createEmbeddedDocuments('Item', [
				{ name: 'E2E Coil', type: 'gear', system: { state: 'dropped', container: hero.items.getName('E2E Pack').id } },
			]);
		}),
	);
	e2e.expect(
		'#103 G7 an item created by script in a Container with another state keeps its own',
		(await items('Hero')).filter((name) => name.startsWith('Coil')),
		['Coil:dropped@Pack'],
	);
	await e2e.step("#103 G8 a Dagger created by script Equipped in Hero's Pack", () =>
		page.evaluate(async () => {
			const hero = game.actors.getName('E2E Hero');
			await hero.createEmbeddedDocuments('Item', [
				{ name: 'E2E Dagger', type: 'weapon', system: { state: 'equipped', container: hero.items.getName('E2E Pack').id } },
			]);
		}),
	);
	e2e.expect(
		'#103 G8 the Equipped section leaves out an item held in a Container, which the Container lists',
		{
			equipped: await section('Hero', 'equipped'),
			pack: await page.evaluate(() => window.inventoryE2E.contents('Hero', 'Pack')),
		},
		{ equipped: ['Mail'], pack: ['Rope', 'Flask', 'Coil', 'Dagger'] },
	);

	// #102: gear and armor effects follow their state, with the tooltip of the Inactive Effects.
	const bell = async () => ({
		state: (await items('Hero')).find((name) => name.startsWith('Bell:')),
		strainMax: await stat('Hero', 'strain.max'),
		inactive: (await inactive('Hero')).filter((effect) => effect.startsWith('Bell')),
	});
	const bellIn = (state: string, label?: string) => ({
		state: `Bell:${state}`,
		strainMax: label ? 10 : 110,
		inactive: label ? [`Bell Effect | ${tooltip('Bell', label)}`] : [],
	});
	await e2e.step("#102 H1 Hero's Bell dropped from its menu", menu('Hero', 'Bell', 'drop'));
	e2e.expect(
		'#102 H1 gear dropped from its menu stops its effect, listed as inactive with the reason',
		await bell(),
		bellIn('dropped', 'Dropped'),
	);
	await e2e.step("#102 H2 Hero's Bell picked up from its menu", menu('Hero', 'Bell', 'carry'));
	e2e.expect('#102 H2 gear picked up from its menu applies its effect again', await bell(), bellIn('carried'));
	await e2e.step("#102 H3 Hero's Bell dragged to the Dropped section", drop(held('Bell', 'Hero'), 'Hero', slot('dropped', 0)));
	e2e.expect(
		'#102 H3 gear dragged to Dropped stops its effect, listed as inactive with the reason',
		await bell(),
		bellIn('dropped', 'Dropped'),
	);
	await e2e.step("#102 H4 Hero's Bell dragged into the Pack", drop(held('Bell', 'Hero'), 'Hero', { item: 'Pack' }));
	e2e.expect('#102 H4 gear put in a Carried Container applies its effect', await bell(), bellIn('carried@Pack'));
	await e2e.step("#102 H5 Ally's Horn dragged to Hero's Dropped section", drop(held('Horn', 'Ally'), 'Hero', slot('dropped', 0)));
	e2e.expect(
		'#102 H5 gear dropped by another actor on Dropped comes with its effect, stopped',
		{
			state: (await items('Hero')).find((name) => name.startsWith('Horn')),
			inactive: (await inactive('Hero')).filter((effect) => effect.startsWith('Horn')),
		},
		{ state: 'Horn:dropped', inactive: [`Horn Effect | ${tooltip('Horn', 'Dropped')}`] },
	);
	await e2e.step("#102 H6 Hero's Mail unequipped from its menu", menu('Hero', 'Mail', 'carry'));
	e2e.expect(
		'#102 H6 armor unequipped from its menu stops its effect, listed as inactive with the reason',
		{
			woundsMax: await stat('Hero', 'wounds.max'),
			inactive: (await inactive('Hero')).filter((effect) => effect.startsWith('Mail')),
		},
		{ woundsMax: 10, inactive: [`Mail Effect | ${tooltip('Mail', 'Carried')}`] },
	);
	await e2e.step("#102 H7 Hero's Mail equipped from its menu", menu('Hero', 'Mail', 'equip'));
	e2e.expect(
		'#102 H7 armor equipped from its menu applies its effect again',
		{
			woundsMax: await stat('Hero', 'wounds.max'),
			inactive: (await inactive('Hero')).filter((effect) => effect.startsWith('Mail')),
		},
		{ woundsMax: 11, inactive: [] },
	);
	await e2e.step(
		"#102 H8 armors dropped from the sidebar and a compendium on Hero's Carried section",
		drops(drop(sidebar('Jacket'), 'Hero', slot('carried', 0)), drop(compendium('Packed Mail'), 'Hero', slot('carried', 0))),
	);
	e2e.expect(
		'#102 H8 an armor dropped from the sidebar or a compendium on Carried has its effect stopped',
		{
			woundsMax: await stat('Hero', 'wounds.max'),
			suppressed: (await effects('Hero')).suppressed.filter((name) => /^(Jacket|Packed Mail)/.test(name)),
		},
		{ woundsMax: 11, suppressed: ['Jacket Effect', 'Packed Mail Effect'] },
	);

	// #193: a character wears one armor.
	const worn = async () => ({
		items: (await items('Wearer')).filter((name) => /^(Coat|Vest|Plate|Packed Mail)/.test(name)),
		...(await protection('Wearer')),
		woundsMax: await stat('Wearer', 'wounds.max'),
	});
	// Wearer's soak is Brawn 2 plus the worn armor's.
	await takeBatches();
	await e2e.step("#193 I1 Wearer's Vest equipped from its menu, while wearing the Coat", menu('Wearer', 'Vest', 'equip'));
	e2e.expect(
		'#193 I1 equipping an armor from its menu takes the worn one off in the same update, and soak, defense, the Combat tab and effects follow',
		{
			...(await worn()),
			lastCarried: (await sorts('Wearer', 'carried')).at(-1)?.split('=')[0],
			batches: (await takeBatches()).filter((batch) => batch.startsWith('update')),
		},
		{
			items: ['Coat:carried', 'Plate:carried', 'Vest:equipped'],
			soak: 3,
			defense: [2, 2],
			combatTab: ['Vest'],
			woundsMax: 20,
			lastCarried: 'Coat',
			batches: ['update Wearer: Coat, Vest'],
		},
	);
	await e2e.step(
		"#193 I2 Wearer's Coat dragged back onto the Equipped section",
		drop(held('Coat', 'Wearer'), 'Wearer', slot('equipped', 0)),
	);
	e2e.expect(
		'#193 I2 an armor dragged onto Equipped takes the worn one off, and soak, defense, the Combat tab and effects follow',
		await worn(),
		{
			items: ['Coat:equipped', 'Plate:carried', 'Vest:carried'],
			soak: 4,
			defense: [1, 1],
			combatTab: ['Coat'],
			woundsMax: 11,
		},
	);
	await e2e.step(
		"#193 I3 an armor dropped from a compendium on Wearer's Equipped section",
		drop(compendium('Packed Mail'), 'Wearer', slot('equipped', 0)),
	);
	e2e.expect('#193 I3 an armor dropped from a compendium on Equipped takes the worn one off', await worn(), {
		items: ['Coat:carried', 'Packed Mail:equipped', 'Plate:carried', 'Vest:carried'],
		soak: 4,
		defense: [1, 1],
		combatTab: ['Packed Mail'],
		woundsMax: 1010,
	});
	await e2e.step("#193 I4 Wearer's Plate equipped by script", updateItem('Wearer', 'Plate', { 'system.state': 'equipped' }));
	e2e.expect(
		'#193 I4 an armor equipped by script leaves the worn one on: soak and defense count the best soak, every effect applies',
		await worn(),
		{
			items: ['Coat:carried', 'Packed Mail:equipped', 'Plate:equipped', 'Vest:carried'],
			soak: 5,
			defense: [0, 0],
			combatTab: ['Plate', 'Packed Mail'],
			woundsMax: 1110,
		},
	);
	await e2e.step("#193 I5 Wearer's Plate unequipped from its menu", menu('Wearer', 'Plate', 'carry'));
	e2e.expect('#193 I5 with two armors worn, unequipping one leaves the other counted', await worn(), {
		items: ['Coat:carried', 'Packed Mail:equipped', 'Plate:carried', 'Vest:carried'],
		soak: 4,
		defense: [1, 1],
		combatTab: ['Packed Mail'],
		woundsMax: 1010,
	});
	await e2e.step("#193 I6 Wearer's Plate equipped again from its menu", menu('Wearer', 'Plate', 'equip'));
	e2e.expect('#193 I6 equipping it again from its menu takes the other off', await worn(), {
		items: ['Coat:carried', 'Packed Mail:carried', 'Plate:equipped', 'Vest:carried'],
		soak: 5,
		defense: [0, 0],
		combatTab: ['Plate'],
		woundsMax: 110,
	});
	await e2e.step(
		"#235 I7 Wearer's Backpack equipped by script, then the Vest dragged into it",
		drops(
			updateItem('Wearer', 'Backpack', { 'system.state': 'equipped' }),
			drop(held('Vest', 'Wearer'), 'Wearer', { item: 'Backpack' }),
		),
	);
	e2e.expect(
		'#235 I7 an armor put in an Equipped Container adds no soak, defense or effect, and leaves the worn one on',
		{ ...(await worn()), inactive: (await inactive('Wearer')).filter((effect) => effect.startsWith('Vest')) },
		{
			items: ['Coat:carried', 'Packed Mail:carried', 'Plate:equipped', 'Vest:equipped@Backpack'],
			soak: 5,
			defense: [0, 0],
			combatTab: ['Plate'],
			woundsMax: 110,
			inactive: [`Vest Effect | Inactive while E2E Vest is in E2E Backpack.`],
		},
	);
	const strainBeforeI8 = (await stat('Wearer', 'strain.max')) as number;
	await e2e.step(
		"#235 I8 Wearer's Equipped Dirk dragged into the Equipped Backpack",
		drop(held('Dirk', 'Wearer'), 'Wearer', { item: 'Backpack' }),
	);
	e2e.expect(
		'#235 I8 a weapon put in an Equipped Container stops its effect, listed as inactive with the Container',
		{
			item: (await items('Wearer')).find((name) => name.startsWith('Dirk')),
			strainLost: strainBeforeI8 - ((await stat('Wearer', 'strain.max')) as number),
			inactive: (await inactive('Wearer')).filter((effect) => effect.startsWith('Dirk')),
		},
		{ item: 'Dirk:equipped@Backpack', strainLost: 5, inactive: [`Dirk Effect | Inactive while E2E Dirk is in E2E Backpack.`] },
	);

	// #124, #39: encumbrance. Packer's threshold is 5 plus Brawn 2; Hauler's is read before the drop.
	await e2e.step(
		"#124 J1 Saddlebags (−2, quantity 2) dropped on Packer's Carried section",
		drop(sidebar('Saddlebags'), 'Packer', slot('carried', 0)),
	);
	e2e.expect("#124 J1 two Saddlebags at −2 raise a character's threshold by 4, on the Inventory tab too", await encumbrance('Packer'), {
		value: 0,
		threshold: 11,
		shown: '0/11',
	});
	const haulerBefore = await encumbrance('Hauler');
	await e2e.step("#124 J2 Saddlebags dropped on Hauler's Carried section", drop(sidebar('Saddlebags'), 'Hauler', slot('carried', 0)));
	const haulerAfter = await encumbrance('Hauler');
	e2e.expect(
		"#124 J2 two Saddlebags at −2 raise a vehicle's threshold by 4, on the Inventory tab too",
		{
			gain: haulerAfter.threshold - haulerBefore.threshold,
			shown: haulerAfter.shown,
		},
		{ gain: 4, shown: `${haulerAfter.value}/${haulerBefore.threshold + 4}` },
	);
	await e2e.step(
		"#124 J3 Packer's Saddlebags dragged into the Dropped Sack",
		drop(held('Saddlebags', 'Packer'), 'Packer', { item: 'Sack' }),
	);
	e2e.expect(
		"#124 J3 Saddlebags in a Dropped Container no longer raise a character's threshold",
		{
			saddlebags: (await items('Packer')).find((name) => name.startsWith('Saddlebags')),
			...(await encumbrance('Packer')),
		},
		{ saddlebags: 'Saddlebags:dropped@Sack', value: 0, threshold: 7, shown: '0/7' },
	);
	await e2e.step(
		"#124 J4 Packer's Saddlebags dragged out to the Carried section",
		drop(held('Saddlebags', 'Packer'), 'Packer', slot('carried', 0)),
	);
	e2e.expect('#124 J4 Saddlebags taken out to Carried raise the threshold again', await encumbrance('Packer'), {
		value: 0,
		threshold: 11,
		shown: '0/11',
	});
	await e2e.step("#124 J5 Packer's Saddlebags dropped from their menu", menu('Packer', 'Saddlebags', 'drop'));
	e2e.expect("#124 J5 Dropped Saddlebags no longer raise a character's threshold", await encumbrance('Packer'), {
		value: 0,
		threshold: 7,
		shown: '0/7',
	});
	await e2e.step("#124 J6 Hauler's Saddlebags dropped by script", updateItem('Hauler', 'Saddlebags', { 'system.state': 'dropped' }));
	e2e.expect(
		"#124 J6 a vehicle's Dropped Saddlebags still raise its threshold",
		(await encumbrance('Hauler')).threshold,
		haulerAfter.threshold,
	);
	await e2e.step('#124 J7 a vehicle weapon at −3 given to Packer by script', () =>
		page.evaluate(() =>
			window.inventoryE2E.createItems('Packer', [{ name: 'Mount', type: 'vehicleWeapon', system: { encumbrance: -3 } }]),
		),
	);
	e2e.expect("#124 J7 a character's encumbrance leaves out an item type that doesn't count", await encumbrance('Packer'), {
		value: 0,
		threshold: 7,
		shown: '0/7',
	});
	await e2e.step('#124 J8 an armor of encumbrance 4 given to Packer, Equipped', () =>
		page.evaluate(() =>
			window.inventoryE2E.createItems('Packer', [{ name: 'Hauberk', type: 'armor', system: { encumbrance: 4, state: 'equipped' } }]),
		),
	);
	e2e.expect('#124 J8 a worn armor of encumbrance 4 counts 1', await encumbrance('Packer'), { value: 1, threshold: 7, shown: '1/7' });
	await e2e.step("#124 J9 the Hauberk's quantity raised to 2", updateItem('Packer', 'Hauberk', { 'system.quantity': 2 }));
	e2e.expect('#124 J9 a worn armor of encumbrance 4 counts 5 with a quantity of 2', await encumbrance('Packer'), {
		value: 5,
		threshold: 7,
		shown: '5/7',
	});
	await e2e.step('#39 J10 a Chest holding a Bag holding an Anvil (3) given to Packer', () =>
		page.evaluate(() =>
			window.inventoryE2E.createItems('Packer', [
				{ name: 'Chest', type: 'container' },
				{ name: 'Bag', type: 'container', in: 'Chest' },
				{ name: 'Anvil', type: 'gear', system: { encumbrance: 3 }, in: 'Bag' },
			]),
		),
	);
	e2e.expect(
		'#39 J10 an item in a Container held in another one counts while the outermost is not Dropped',
		await encumbrance('Packer'),
		{
			value: 8,
			threshold: 7,
			shown: '8/7',
		},
	);
	await e2e.step("#39 J11 Packer's Chest dropped from its menu", menu('Packer', 'Chest', 'drop'));
	e2e.expect(
		'#39 J11 an item in a Container held in another one stops counting once the outermost is Dropped',
		await encumbrance('Packer'),
		{
			value: 5,
			threshold: 7,
			shown: '5/7',
		},
	);
	await e2e.step('#39 J12 a Crate (1) holding a Brick (2) given to Packer', () =>
		page.evaluate(() =>
			window.inventoryE2E.createItems('Packer', [
				{ name: 'Crate', type: 'container', system: { encumbrance: 1 } },
				{ name: 'Brick', type: 'gear', system: { encumbrance: 2 }, in: 'Crate' },
			]),
		),
	);
	e2e.expect('#39 J12 a Carried Container counts with its contents', await encumbrance('Packer'), {
		value: 8,
		threshold: 7,
		shown: '8/7',
	});
	await e2e.step("#39 J13 Packer's Crate dropped from its menu", menu('Packer', 'Crate', 'drop'));
	e2e.expect('#39 J13 a Dropped Container counts neither itself nor its contents', await encumbrance('Packer'), {
		value: 5,
		threshold: 7,
		shown: '5/7',
	});
	await e2e.step('#39 J14 Looper given two Containers that hold each other, one holding a Pebble (2)', () =>
		page.evaluate(async () => {
			await window.inventoryE2E.createItems('Looper', [
				{ name: 'Ring1', type: 'container', system: { encumbrance: 1 } },
				{ name: 'Ring2', type: 'container', system: { encumbrance: 1 }, in: 'Ring1' },
				{ name: 'Pebble', type: 'gear', system: { encumbrance: 2 }, in: 'Ring2' },
			]);
			const looper = game.actors.getName('E2E Looper');
			await looper.items.getName('E2E Ring1').update({ 'system.container': looper.items.getName('E2E Ring2').id });
		}),
	);
	e2e.expect(
		'#39 J14 Containers that hold each other count all their items, and the sheet lists them nowhere',
		{
			...(await encumbrance('Looper')),
			carried: await section('Looper', 'carried'),
		},
		{ value: 4, threshold: 7, shown: '4/7', carried: [] },
	);

	// #103: sorting in a section, from Ant, Bee, Cat.
	await e2e.step(
		"#103 K1 Sorter's Cat dragged to the top of the Carried section",
		drop(held('Cat', 'Sorter'), 'Sorter', slot('carried', 0)),
	);
	e2e.expect(
		'#103 K1 an item dropped on the top slot of its section moves first, the section sorted again evenly',
		{
			sorts: await sorts('Sorter', 'carried'),
			rows: await section('Sorter', 'carried'),
		},
		{ sorts: ['Cat=100000', 'Ant=200000', 'Bee=300000'], rows: ['Cat', 'Ant', 'Bee'] },
	);
	await e2e.step(
		"#103 K2 Sorter's Ant dropped on the slots just above and just below itself",
		drops(drop(held('Ant', 'Sorter'), 'Sorter', slot('carried', 1)), drop(held('Ant', 'Sorter'), 'Sorter', slot('carried', 2))),
	);
	e2e.expect('#103 K2 an item dropped on the slot just above or below itself stays where it is', await sorts('Sorter', 'carried'), [
		'Cat=100000',
		'Ant=200000',
		'Bee=300000',
	]);
	await e2e.step(
		"#103 K3 Sorter's Ant dragged to the end of the Carried section",
		drop(held('Ant', 'Sorter'), 'Sorter', slot('carried', 3)),
	);
	e2e.expect(
		'#103 K3 an item dropped on the last slot of its section moves last',
		{
			sorts: await sorts('Sorter', 'carried'),
			rows: await section('Sorter', 'carried'),
		},
		{ sorts: ['Cat=100000', 'Bee=200000', 'Ant=300000'], rows: ['Cat', 'Bee', 'Ant'] },
	);

	// #103: deleting a Container.
	await e2e.step("#103 L1 Deleter's Box1 deleted by script", () =>
		page.evaluate(() => window.inventoryE2E.deleteItem('Deleter', 'Box1')),
	);
	await e2e.step("#103 L2 Deleter's Box2 deleted from its menu", menu('Deleter', 'Box2', 'delete'));
	await e2e.step("#103 L3 Deleter's Box3 damaged to nothing from its row", () =>
		page.evaluate(() => window.inventoryE2E.damageToNothing('Deleter', 'Box3')),
	);
	e2e.expect(
		'#103 L1-L3 a Container deleted by script, from its menu or damaged to nothing takes its contents',
		await items('Deleter'),
		[],
	);

	// #203, #134: inventory rows, weapon lists and chat cards. Smith has Brawn 2.
	await e2e.step(
		"#134 M1 Smith's Inventory tab shown, then the Club's damage field emptied in its sheet",
		drops(
			() => page.evaluate(() => window.inventoryE2E.showTab('Smith', 'inventory')),
			() => page.evaluate(() => window.inventoryE2E.editItemSheet('Smith', 'Club', 'system.baseDamage', '')),
		),
	);
	e2e.expect(
		'#134 M1 a weapon whose damage was emptied keeps a damage of 0, read as such on its row',
		{
			baseDamage: await page.evaluate(() => game.actors.getName('E2E Smith').items.getName('E2E Club').system.baseDamage),
			row: (await row('Smith', 'Club')).details,
		},
		{ baseDamage: null, row: 'Melee | Damage Br+0 (2) | Critical 3 | Range [Engaged]' },
	);
	e2e.expect(
		"#134 M1 a character's weapon rows read an emptied, a negative and a characteristic-less damage",
		{
			rock: (await row('Smith', 'Rock')).details,
			shiv: (await row('Smith', 'Shiv')).details,
		},
		{
			rock: 'Melee | Damage 0 | Critical 3 | Range [Engaged]',
			shiv: 'Melee | Damage Br-1 (1) | Critical 3 | Range [Engaged]',
		},
	);
	e2e.expect(
		"#134 M1 a character's Combat tab reads each weapon's damage total",
		await page.evaluate(() => window.inventoryE2E.weaponList('Smith')),
		[
			'Blade | Melee | 4 | 3 | Engaged',
			'Club | Melee | 2 | 3 | Engaged',
			'Rock | Melee | 0 | 3 | Engaged',
			'Shiv | Melee | 1 | 3 | Engaged',
		],
	);
	e2e.expect(
		'#134 M1 an adversary lists a weapon whose damage was emptied with its characteristic',
		await page.evaluate(() => window.inventoryE2E.weaponList('Brute')),
		['Maul (MeleeDamage 3Critical 3Range [Engaged])'],
	);
	e2e.expect(
		"#134 M1 a vehicle's Combat tab reads an emptied damage as 0 and its firing arcs",
		await page.evaluate(() => window.inventoryE2E.weaponList('Hauler')),
		['Gun | Gunnery | 0 | 3 | Short | All', 'Turret | Gunnery | 4 | 3 | Short | None', 'Cannon | Gunnery | -1 | 3 | Short | ForePort'],
	);
	e2e.expect(
		"#134 M1 a vehicle's inventory rows read an emptied damage as 0 and the firing arcs",
		{
			gun: (await row('Hauler', 'Gun')).details,
			cannon: (await row('Hauler', 'Cannon')).details,
		},
		{
			gun: 'Gunnery | Firing Arc All | Damage 0 | Critical 3 | Range [Short]',
			cannon: 'Gunnery | Firing Arc ForePort | Damage -1 | Critical 3 | Range [Short]',
		},
	);
	await e2e.step('#134 M2 the Club sent to chat from its menu', menu('Smith', 'Club', 'chat'));
	e2e.expect(
		'#134 M2 a weapon whose damage was emptied is sent to chat with a damage of 0',
		await page.evaluate(() => window.inventoryE2E.lastMessage(['span.damage'])),
		['0 + Br'],
	);
	await e2e.step('#134 M3 an attack with the Club, every die on its fourth face', async () => {
		await page.evaluate(() => window.inventoryE2E.attack('Smith', 'Club'));
		// The prompt may roll its pool to show the chance to succeed: the dice are fixed for the attack's roll only.
		await gm.fixDice([4, 4, 4, 4].map((face) => ({ face, faces: 8 })));
		await page.evaluate(() => window.inventoryE2E.rollPrompt());
	});
	e2e.expect(
		'#134 M3 an attack with a weapon whose damage was emptied posts a base damage of 0',
		await page.evaluate(() => window.inventoryE2E.lastMessage(['.summary-table .label', '.summary-table .count'])),
		['Damage (Br + 0)', '6'],
	);

	await e2e.step(
		"#203 M4 the Blade's damage, critical, range and encumbrance changed in its sheet, and a quality dropped on it",
		drops(
			() => page.evaluate(() => window.inventoryE2E.editItemSheet('Smith', 'Blade', 'system.baseDamage', '4')),
			() => page.evaluate(() => window.inventoryE2E.editItemSheet('Smith', 'Blade', 'system.critical', '2')),
			() => page.evaluate(() => window.inventoryE2E.editItemSheet('Smith', 'Blade', 'system.range', 'short')),
			() => page.evaluate(() => window.inventoryE2E.editItemSheet('Smith', 'Blade', 'system.encumbrance', '3')),
			() => page.evaluate(() => window.inventoryE2E.dropOnItemSheet({ sidebar: 'Quality' }, 'Blade', 'Smith')),
		),
	);
	e2e.expect("#203 M4 a weapon's row follows the changes made in its sheet, with the Inventory tab open", await row('Smith', 'Blade'), {
		details: 'Melee | Damage Br+4 (6) | Critical 2 | Range [Short] | Quality 1',
		quantity: '1',
		encumbrance: '3',
		damageState: 'Genesys.Equipment.DamageState.Undamaged',
	});
	await e2e.step("#203 M5 the Hide's soak and defense updated", updateItem('Smith', 'Hide', { 'system.soak': 3, 'system.defense': 2 }));
	e2e.expect("#203 M5 an armor's row follows its soak and defense", (await row('Smith', 'Hide')).details, 'Soak +3 | Defense +2');
	await e2e.step(
		"#203 M6 Hauler's Inventory tab shown, then the Turret's firing arc updated",
		drops(
			() => page.evaluate(() => window.inventoryE2E.showTab('Hauler', 'inventory')),
			updateItem('Hauler', 'Turret', { 'system.firingArc.aft': true }),
		),
	);
	e2e.expect(
		"#203 M6 a vehicle weapon's row follows its firing arc",
		(await row('Hauler', 'Turret')).details,
		'Gunnery | Firing Arc Aft | Damage 4 | Critical 3 | Range [Short]',
	);
	await e2e.step("#203 M7 Smith's Brawn raised to 3", () =>
		page.evaluate(() => window.inventoryE2E.updateActor('Smith', { 'system.characteristics.brawn': 3 })),
	);
	e2e.expect(
		"#203 M7 a weapon's damage total follows the damage characteristic",
		(await row('Smith', 'Blade')).details,
		'Melee | Damage Br+4 (7) | Critical 2 | Range [Short] | Quality 1',
	);
	await e2e.step("#203 M8 the Blade's quantity and damage state clicked once", () =>
		page.evaluate(() => window.inventoryE2E.clickQuantityAndDamage('Smith', 'Blade')),
	);
	e2e.expect("#203 M8 a click raises an item's quantity and damage state on its row", await row('Smith', 'Blade'), {
		details: 'Melee | Damage Br+4 (7) | Critical 2 | Range [Short] | Quality 1',
		quantity: '2',
		encumbrance: '3',
		damageState: 'Genesys.Equipment.DamageState.Minor',
	});

	await gm.evaluate(() => window.inventoryE2E.tearDown());
}
