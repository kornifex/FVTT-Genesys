/** @file The inventory of #37: drops on actor and item sheets, Containers, Equipment States and their effects, armor, encumbrance and inventory rows. */
import type { ConfirmDialog, CounterState, FoldToggle, Point } from '../page.ts';
import type { Client, ScenarioContext } from '../scenario.ts';

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
	| { held: string; by: string }
	| { deleted: { sidebar: string } | { held: string; by: string } };

/**
 * The half of an inventory row a drag points at: the upper one, before its item, or the lower one, after it.
 */
type RowEdge = 'before' | 'after';

/**
 * Where a drop lands on an actor's sheet: on the n-th sort slot of a section (from 0, the slot above its first item), on
 * an item's row, maybe on one of its halves (at the top of the window otherwise), or on another element of the sheet.
 */
type Target = { section: EquipmentState; slot: number } | { item: string; edge?: RowEdge } | { on: string };

type MenuAction = 'equip' | 'carry' | 'drop' | 'delete' | 'chat';

/**
 * A window a drag starts from, as the user's drag does: an entry of the Actors or Items directory, or of a compendium's
 * window, by its full name.
 */
type DragWindow = { directory: 'Actor' | 'Item'; name: string } | { pack: string; name: string };

/**
 * A drag started from a window and moved over an Inventory tab: the Genesys type it carries, read from its formats as a
 * drop target reads it during the drag, and the sections whose sort slots open for it.
 */
type WindowDrag = { genesysType: string | null; sections: EquipmentState[] };

/**
 * A row's menu as it opened: the corner of it that lies on the point it opened from, if any; whether it lies inside what
 * the sheet and the viewport show; the points of it where another element shows instead (its entries' middles and its
 * inner corners); and its look, the computed styles of it and of its first entry, but the transform that moves it.
 */
type OpenMenu = { corner: string; inside: boolean; covered: string[]; look: Record<string, string> };

/**
 * A row's menu as the keyboard finds it (#576): what has the focus (the ⋮ by its name, an entry by its label, or else
 * the element's tag), whether the menu is open, at its ⋮ (its top-right corner on the bottom-right of the ⋮'s
 * container), and what the ⋮'s `aria-expanded` says; whether the actor's sheet is still open; the chat messages; the
 * item's Equipment State and damage; and the Escape keydowns that reached the window since the first
 * {@link InventoryHelpers.readyMenuKeys}.
 */
type MenuKeys = {
	focus: string;
	open: boolean;
	atTrigger: boolean;
	expanded: string | null;
	sheetOpen: boolean;
	messages: number;
	state: string;
	damage: string;
	escapes: number;
};

/**
 * A Container's contents as laid out in its row (#516): the rows they list; their height in px, rounded, or `>100` past
 * the 100px that once capped them; whether they or their box show a scrollbar of their own; whether the last row ends
 * inside them; and its visibility, which Tab follows.
 */
type ContentsBox = { rows: string[]; height: number | string; scrollbar: boolean; lastInside: boolean; visibility: string };

/**
 * The helpers name an actor of the setup by its name without `E2E `, or `token:<name>` for the actor of an unlinked token.
 */
type InventoryHelpers = {
	setUp(playerUser: string): Promise<void>;
	tearDown(): Promise<void>;
	/** Runs a drag from its source and drops it on a target of an actor's sheet. */
	drop(source: Source, actor: string, at: Target): Promise<void>;
	/** Starts a drag from a window, opening it unless it is, moves it over an actor's Inventory tab, then ends it. */
	windowDrag(from: DragWindow, actor: string): Promise<WindowDrag>;
	/** Drops a drag on the sheet of an item of the sidebar (no actor) or of an actor. */
	dropOnItemSheet(source: Source, item: string, actor?: string): Promise<void>;
	/**
	 * Types a rating in the n-th quality of a sidebar weapon's or armor's sheet, as leaving the field does, or deletes the
	 * quality from its trash icon when the rating is `null`, answering Yes to the dialog that asks first: the dialog read,
	 * null when none opens.
	 */
	editQuality(item: string, quality: number, rating: string | null): Promise<ConfirmDialog | null>;
	/** Picks an action in the menu of an item's inventory row. */
	menu(actor: string, item: string, action: MenuAction): Promise<void>;
	/** Changes a field of an item's sheet, as typing in it does. */
	editItemSheet(actor: string, item: string, field: string, value: string): Promise<void>;
	/**
	 * Runs the entry of that label from the ⋮ menu of an item's inventory row (#577), the row of a Container's contents
	 * once the Container is opened, and gives the menu's labels.
	 */
	menuEntry(actor: string, item: string, label: string): Promise<string[]>;
	/** The entries of the menu of an item's inventory row, as `Label [icon]`, a separator as `---`. */
	menuEntries(actor: string, item: string): Promise<string[]>;
	/**
	 * Right-clicks an item's inventory row, on its image or on its quantity, and reads the entries of the menu that opens
	 * in the Inventory tab as {@link menuEntries} does, or null when none opens. An item held in a Container is
	 * right-clicked in the Container's opened row.
	 */
	rightClickMenu(actor: string, item: string, on?: 'image' | 'quantity'): Promise<string[] | null>;
	/**
	 * Opens the menu of an item's inventory row, tells which corner of the menu lies on the point it opens from, and closes
	 * it: a right-click on the row's image, or near the row's bottom-right corner with the sheet cut short right under the
	 * row, opens it from the pointer; a click on the row's … button, from the button's bottom-right corner.
	 */
	menuCorner(actor: string, item: string, at: 'image' | 'sheetEdge' | 'button'): Promise<string>;
	/**
	 * Drags an item from its source over the halves of an item's row, one after the other, then out of it: the edge each
	 * half shows, or null when it shows none.
	 */
	edgesShown(source: Source, actor: string, item: string, edges: RowEdge[]): Promise<(RowEdge | null)[]>;
	/**
	 * Steps an item's quantity down or its damage up once from its row, which asks to confirm its deletion, reads the
	 * dialog, and answers it.
	 */
	stepToDeletion(actor: string, item: string, kind: 'quantity' | 'damage', answer: 'yes' | 'no'): Promise<ConfirmDialog | null>;
	/** Damages an item from its row until it's destroyed, and confirms its deletion. */
	damageToNothing(actor: string, item: string): Promise<void>;
	/** Clicks the quantity and the damage state of an item's row once. */
	clickQuantityAndDamage(actor: string, item: string): Promise<void>;
	/** Focuses the spin button of a row's quantity or damage counter, its text selected when it can be typed into. */
	focusCounter(actor: string, item: string, kind: 'quantity' | 'damage'): Promise<void>;
	counter(actor: string, item: string, kind: 'quantity' | 'damage'): Promise<CounterState | null>;
	/** Attacks with a weapon from its inventory row, which opens the dice prompt. */
	attack(actor: string, item: string): Promise<void>;
	/** Rolls the open dice prompt. */
	rollPrompt(): Promise<void>;
	/**
	 * Brings an actor's sheet to the front on its Inventory tab, cut short so that the tab scrolls, and scrolls the tab so
	 * that an item's row shows in its upper part, or at its lower edge with the sheet's bottom on the viewport's: the middle of
	 * the row's image, which nothing covers, for a real mouse to click, and how far the tab is scrolled.
	 */
	pointAtRow(actor: string, item: string, where: 'middle' | 'lowerEdge'): Promise<{ point: Point; scrolled: number }>;
	/** The middle of the … button of an item's row, which nothing covers. */
	buttonPoint(actor: string, item: string): Promise<Point>;
	/** Reads the menu open on an item's row, opened from that point; null when none is open. */
	openMenu(actor: string, item: string, from: Point): Promise<OpenMenu | null>;
	/** Closes the menu of an item's row, as a click elsewhere does. */
	closeMenu(actor: string, item: string): Promise<void>;
	/**
	 * Brings an actor's sheet to the front on its Inventory tab, and focuses the control of an item's row before its ⋮,
	 * its damage state's spin button, so that one Tab reaches the ⋮ (#576, #580).
	 */
	readyMenuKeys(actor: string, item: string): Promise<void>;
	/** The menu of an item's row as the keyboard finds it. */
	menuKeys(actor: string, item: string): MenuKeys;
	/** Puts an actor's sheet back to the size and place it had before {@link pointAtRow}. */
	restoreSheet(actor: string): Promise<void>;
	/** Writes an item's damage state to the database, past the client's data model, as a broken world may hold it. */
	seedDamage(actor: string, item: string, damage: string): Promise<void>;
	/** Runs a script on the setup's documents. */
	updateItem(actor: string, item: string, changes: object): Promise<void>;
	/** Writes an Equipment State by script, and tells whether the write threw and which state the item and the database keep. */
	writeState(actor: string, item: string, state: string): Promise<{ threw: boolean; state: string; database: string }>;
	deleteItem(actor: string, item: string): Promise<void>;
	/**
	 * The ways an item's row and sheet offer to change its Equipment State or delete it: a quantity control on its row, a
	 * field of its sheet writing `system.state`, an action of its sheet that deletes.
	 */
	stateAndDeletePaths(actor: string, item: string): Promise<{ quantity: boolean; stateField: boolean; deleteAction: boolean }>;
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
	/** Opens or closes a Container's row in the Inventory tab, and waits for its fold to end. */
	foldContainer(actor: string, container: string, open: boolean): Promise<void>;
	/** The toggle of a Container's row, which folds its contents, as read (#579); null when the row shows none. */
	containerToggle(actor: string, container: string): Promise<FoldToggle | null>;
	/** A Container's contents as laid out, or null while the row renders none. */
	contentsBox(actor: string, container: string): Promise<ContentsBox | null>;
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

	/** Creates a consumable with an effect in each place #205 seeds the Used state, but the character's, which has one. */
	createConsumables(): Promise<void>;
	/** Writes the Used state to the database for each place's consumable, past the client's data model, as older data holds it. */
	seedUsed(): Promise<void>;
	/** How each place's consumable loads: its state, its source's, the database's, and whether its collection holds invalid documents. */
	loadedConsumables(): Promise<Record<ConsumablePlace, { state: string; source: string; database: string; invalid: boolean }>>;
};

/**
 * Where #205 seeds a consumable in the Used state: the Items directory, a character, the actor of an unlinked token, and a
 * compendium.
 */
type ConsumablePlace = 'world' | 'actor' | 'token' | 'pack';

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

	const { settle, waitFor, render, text, unprefixed, isSetUp, effectRows, counterValue, clickCounter, counterState } = window.e2e;
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

	// The children of the Inventory tab from a section's heading to the next one: its rows and its sort slots.
	const sectionParts = (root: HTMLElement, state: string) => {
		const tab = root.querySelector('.tab[data-tab="inventory"] .tab-inventory');
		const heading = tab?.querySelectorAll(':scope > h3')[SECTIONS.indexOf(state)];
		if (!heading) throw new Error(`No ${state} section`);
		const parts: Element[] = [];
		for (let next = heading.nextElementSibling; next && !next.matches('h3, .encumbrance-currency-row'); ) {
			parts.push(next);
			next = next.nextElementSibling;
		}
		return parts;
	};
	const findRow = (root: HTMLElement, name: string) => {
		const row = [...root.querySelectorAll('.tab-inventory .inventory-item')].find(
			(candidate) => text(candidate.querySelector('.name button')) === full(name),
		);
		if (!row) throw new Error(`No row ${name}`);
		return row as HTMLElement;
	};
	const rowOf = async (ref: string, name: string) => findRow(await sheet(ref), name);
	// Opening or closing a Container's row only changes the row's own state: no document changes, so its toggle is waited
	// for, then the fold of its contents, which stay rendered while closed since #516.
	// The toggle is the chevron of the row's details since #579, and was a box before, on the build a comparison runs; both
	// tell whether the Container is open.
	const toggleOf = (row: HTMLElement) =>
		row.querySelector<HTMLElement>(':scope > .details > .description-toggle, :scope [data-item-type="container"] button');
	const foldRow = async (row: HTMLElement, open: boolean) => {
		const toggle = () => toggleOf(row);
		const isOpen = () => toggle()?.getAttribute('aria-expanded') === 'true';
		if (toggle() && isOpen() !== open) {
			toggle()!.click();
			await waitFor(`the toggle of ${text(row.querySelector('.name button'))}`, () => isOpen() === open);
			await settle();
		}
	};
	const openContainer = (row: HTMLElement) => foldRow(row, true);
	// An item held in a Container has its row in the Container's row, once opened.
	const heldRow = async (ref: string, name: string) => {
		const root = await sheet(ref);
		const holder = actor(ref).items.get(item(ref, name).system.container);
		if (holder) await openContainer(findRow(root, unprefixed(holder.name)));
		return findRow(root, name);
	};

	const dropData = async (source: Exclude<Source, { deleted: unknown }>) => {
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
	const dragFrom = async (source: Source): Promise<object | DataTransfer> => {
		if ('deleted' in source) {
			const dragged = await dragFrom(source.deleted);
			await (
				'held' in source.deleted ? item(source.deleted.by, source.deleted.held) : game.items.getName(full(source.deleted.sidebar))
			).delete();
			return dragged;
		}
		if ('held' in source) {
			const root = await sheet(source.by);
			const element = ['character', 'vehicle'].includes(actor(source.by).type)
				? await heldRow(source.by, source.held)
				: [...root.querySelectorAll('.adversary-items [draggable="true"]')].find((link) =>
						text(link).startsWith(full(source.held)),
					);
			if (!element) throw new Error(`No ${source.held} to drag`);
			const dataTransfer = window.e2e.dragStart(element);
			element.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
			return dataTransfer;
		}
		return dropData(source);
	};
	// The point of a half of a row, as a drag pointing at it gives. The row's tab must be shown, for the row to have a size.
	const edgePoint = (row: HTMLElement, edge: RowEdge): Point => {
		const rect = row.getBoundingClientRect();
		if (!rect.height) throw new Error(`The row of ${text(row.querySelector('.name button'))} isn't shown`);
		return { x: rect.left + rect.width / 2, y: rect.top + rect.height * (edge === 'before' ? 0.25 : 0.75) };
	};
	const menuEntriesOf = (menu: Element) =>
		[...menu.children].map((entry) =>
			entry.matches('hr')
				? '---'
				: `${text(entry.querySelector('.menu-label'))} [${[...(entry.querySelector('.menu-icon i')?.classList ?? [])].filter((name) => name !== 'fas').join(' ')}]`,
		);
	const dropOn = async (element: Element, data: object | DataTransfer, point?: Point) => {
		window.e2e.drop(element, data, point);
		// The sheets handle a drop asynchronously, and a refused drop changes nothing.
		await settle();
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

	// The raw documents the server sends back, as far as #205 reads them: what the database holds, past the client's data model.
	type Stored = { _id: string; system: { state: string } };
	type RawResponse = { result: (Stored & { items?: Stored[] })[] };
	const raw = (request: object) =>
		new Promise<RawResponse>((resolve, reject) =>
			game.socket.emit('modifyDocument', request, (response: RawResponse & { error?: { message: string } }) =>
				response.error ? reject(new Error(response.error.message)) : resolve(response),
			),
		);
	const CONSUMABLE_PLACES: ConsumablePlace[] = ['world', 'actor', 'token', 'pack'];
	// Each place's consumable, where it sits in the database. The unlinked token's consumable is its actor's, seen through
	// the token, whose own actor is made from it.
	const consumableAt = async (place: ConsumablePlace) => {
		if (place === 'pack') {
			const document = (await pack('items').getDocuments()).find((packed: { name: string }) => packed.name === full('Packed Stim'));
			return { id: document.id, operation: { pack: pack('items').collection } as Record<string, string>, document };
		}
		if (place === 'world') {
			const document = game.items.getName(full('Stim'));
			return { id: document.id, operation: {} as Record<string, string>, document };
		}
		const [ref, name] = place === 'actor' ? ['Hero', 'Elixir'] : ['Token Rival', 'Tonic'];
		const held = window.e2e.actor(ref).items.getName(full(name));
		const document = place === 'actor' ? held : game.scenes.viewed.tokens.getName(full('Token Rival')).actor.items.getName(full(name));
		return { id: held.id, operation: { parentUuid: window.e2e.actor(ref).uuid } as Record<string, string>, document };
	};

	// The sheets pointAtRow moved and cut short, with the size, place and minimum height to put back.
	const movedSheets = new Map<string, { position: object; minHeight: string }>();
	// The Escape keydowns that reached the window, once the keyboard steps of #576 count them.
	let escapesOnWindow = 0;
	let countingEscapes = false;
	// The element that scrolls a row into view: its nearest ancestor that scrolls its overflow, and has some.
	const scrollerOf = (element: Element) => {
		for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
			if (/auto|scroll/.test(getComputedStyle(ancestor).overflowY) && ancestor.scrollHeight > ancestor.clientHeight) return ancestor;
		}
		throw new Error(`Nothing scrolls ${text(element)}`);
	};
	// The middle of an element, which a real mouse can click only when the element shows there, under no other.
	const uncoveredMiddle = (element: Element): Point => {
		const box = element.getBoundingClientRect();
		const point = { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
		if (!element.contains(document.elementFromPoint(point.x, point.y))) {
			throw new Error(`${element.className} is covered at ${point.x}, ${point.y}`);
		}
		return point;
	};
	// What the viewport shows of an element: each ancestor that clips its overflow cuts it down.
	const shownArea = (element: Element) => {
		const area = { left: 0, top: 0, right: document.documentElement.clientWidth, bottom: document.documentElement.clientHeight };
		for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
			if (getComputedStyle(ancestor).overflow === 'visible') continue;
			const box = ancestor.getBoundingClientRect();
			area.left = Math.max(area.left, box.left);
			area.top = Math.max(area.top, box.top);
			area.right = Math.min(area.right, box.right);
			area.bottom = Math.min(area.bottom, box.bottom);
		}
		return area;
	};
	const MENU_LOOK = [
		'display',
		'position',
		'flex-direction',
		'gap',
		'min-width',
		'width',
		'z-index',
		'background-image',
		'background-color',
		'border-top-width',
		'border-top-style',
		'border-top-color',
		'border-top-left-radius',
		'padding-top',
		'padding-left',
		'font-family',
		'font-size',
		'color',
		'opacity',
	];
	const ENTRY_LOOK = ['display', 'height', 'padding-top', 'padding-left', 'font-family', 'font-size', 'color', 'background-color'];

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

			const character = (name: string) => ({
				name: full(name),
				type: 'character',
				system: {
					characteristics: { brawn: 2 },
					wounds: { max: 10 },
					strain: { max: 10 },
					experienceJournal: { entries: [{ amount: 100, type: 'Starting' }] },
				},
				prototypeToken: { actorLink: true },
			});
			await Actor.createDocuments([
				...[
					'Hero',
					'Ally',
					'Receiver',
					'Sorter',
					'Wearer',
					'Packer',
					'Looper',
					'Deleter',
					'Smith',
					'Stepper',
					'Placer',
					'Hoarder',
				].map(character),
				{ name: full('Vehicle'), type: 'vehicle' },
				{ name: full('Hauler'), type: 'vehicle' },
				{ name: full('Barge'), type: 'vehicle' },
				{ name: full('Rover'), type: 'vehicle' },
				{ name: full('Rival'), type: 'rival' },
				{ name: full('Minion'), type: 'minion' },
				{ name: full('Brute'), type: 'rival', system: { characteristics: { brawn: 3 } } },
				{ name: full('Token Rival'), type: 'rival', prototypeToken: { actorLink: false } },
			]);
			await window.e2e.setOwnership(actor('Hero'), playerUser, 'OWNER');
			await window.e2e.setOwnership(actor('Ally'), 'default', 'OBSERVER');

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
				{ data: { name: full('Elixir'), type: 'consumable', effects: [marker('Elixir Effect')] }, state: 'carried' },
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
			await give(actor('Stepper'), [
				{ data: weapon('Pick'), state: 'carried' },
				{ data: armor('Gambeson', { soak: 1, defense: 0, encumbrance: 2 }), state: 'equipped' },
				{ data: armor('Hauberk', { soak: 2, defense: 0, encumbrance: 4 }), state: 'carried' },
				{ data: gear('Twine'), state: 'dropped' },
				{ data: container('Pouch'), state: 'carried' },
				{ data: gear('Pebble', { quantity: 1 }), state: 'carried' },
				{ data: gear('Shard', { damage: 'major' }), state: 'carried' },
			]);
			await give(actor('Barge'), [
				{ data: vehicleWeapon('Harpoon', {}), state: 'carried' },
				{ data: gear('Tarp'), state: 'carried' },
			]);
			await give(actor('Placer'), [
				{ data: weapon('Glaive'), state: 'equipped', sort: 1 },
				{ data: weapon('Halberd'), state: 'equipped', sort: 2 },
				{ data: weapon('Lance'), state: 'carried', sort: 1 },
				{ data: weapon('Pike'), state: 'carried', sort: 2 },
				{ data: gear('Twig', { quantity: 3 }), state: 'carried', sort: 3 },
				{ data: container('Basket'), state: 'carried', sort: 4 },
				{ data: gear('Berry'), state: 'carried', in: 'Basket' },
				{ data: gear('Pinecone'), state: 'dropped', sort: 1 },
			]);
			await give(actor('Rover'), [
				{ data: vehicleWeapon('Laser', {}), state: 'equipped', sort: 1 },
				{ data: vehicleWeapon('Railgun', {}), state: 'equipped', sort: 2 },
				{ data: vehicleWeapon('Flak', {}), state: 'carried', sort: 1 },
				{ data: gear('Winch'), state: 'carried', sort: 2 },
				{ data: container('Locker'), state: 'carried', sort: 3 },
			]);

			await window.e2e.ensureScene();
			const tokenData = (await actor('Token Rival').getTokenDocument()).toObject();
			await canvas.scene.createEmbeddedDocuments('Token', [{ ...tokenData, name: full('Token Rival'), x: 300, y: 700 }]);
		},

		async createConsumables() {
			const consumable = (name: string) => ({ name: full(name), type: 'consumable', effects: [marker(`${name} Effect`)] });
			await Item.create(consumable('Stim'));
			await actor('Token Rival').createEmbeddedDocuments('Item', [consumable('Tonic')]);
			await CONFIG.Item.documentClass.create(consumable('Packed Stim'), { pack: pack('items').collection });
		},

		async seedUsed() {
			for (const place of CONSUMABLE_PLACES) {
				const { id, operation } = await consumableAt(place);
				await raw({
					type: 'Item',
					action: 'update',
					operation: { ...operation, updates: [{ _id: id, system: { state: 'used' } }], diff: true, recursive: true },
				});
			}
		},

		async loadedConsumables() {
			const loaded: Partial<Awaited<ReturnType<InventoryHelpers['loadedConsumables']>>> = {};
			for (const place of CONSUMABLE_PLACES) {
				const { id, operation, document } = await consumableAt(place);
				const parentId = operation.parentUuid?.split('.')[1];
				const response = parentId
					? await raw({ type: 'Actor', action: 'get', operation: { query: { _id: parentId } } })
					: await raw({ type: 'Item', action: 'get', operation: { ...operation, query: { _id: id } } });
				const stored = parentId ? response.result[0].items?.find((held) => held._id === id) : response.result[0];
				const collection = document.pack ? game.packs.get(document.pack) : document.parent?.items ?? game.items;
				loaded[place] = {
					state: document.system.state,
					source: document._source.system.state,
					database: stored?.system.state ?? '',
					invalid: collection.invalidDocumentIds.size > 0,
				};
			}
			return loaded as Awaited<ReturnType<InventoryHelpers['loadedConsumables']>>;
		},

		async tearDown() {
			await window.e2e.closeSetUp();
			for (const key of ['items', 'actors'] as const) await pack(key)?.deleteCompendium();
			await window.e2e.deleteSetUp('Token', 'Actor', 'Item', 'Folder');
		},

		async windowDrag(from, ref) {
			const id =
				'directory' in from
					? (from.directory === 'Actor' ? game.actors : game.items).getName(from.name)?.id
					: game.packs.get(from.pack).index.find((indexed: { name: string }) => indexed.name === from.name)?._id;
			if (!id) throw new Error(`No ${from.name} to drag`);
			const app = 'directory' in from ? (from.directory === 'Actor' ? ui.actors : ui.items) : game.packs.get(from.pack).apps[0];
			const selector = `.directory-item[data-entry-id="${id}"]`;
			const entry = (await render(app, (root) => root.querySelector(selector))).querySelector(selector)!;
			const dataTransfer = window.e2e.dragStart(entry);
			// The format is `genesys/<type>/<uuid>`, its uppercase letters encoded as `|<code point>|`.
			const format = dataTransfer.types.find((type) => type.startsWith('genesys/'));
			const genesysType =
				format?.split('/')[1].replace(/\|(\d+)\|/g, (_match, code: string) => String.fromCodePoint(Number(code))) ?? null;

			const root = await sheet(ref);
			await window.e2e.showTab(ref, 'inventory');
			const tab = root.querySelector('.tab-inventory')!;
			tab.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }));
			await settle();
			const sections = SECTIONS.filter((state) => sectionParts(root, state)[0]?.classList.contains('active')) as EquipmentState[];
			tab.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true, dataTransfer }));
			entry.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
			await settle();
			return { genesysType, sections };
		},

		async drop(source, ref, at) {
			const dragged = await dragFrom(source);
			const root = await sheet(ref);
			let target: Element | null | undefined;
			let point: Point | undefined;
			if ('item' in at) {
				target = findRow(root, at.item);
				if (at.edge) {
					await window.e2e.showTab(ref, 'inventory');
					point = edgePoint(target as HTMLElement, at.edge);
				}
			} else if ('on' in at) {
				target = root.querySelector(at.on);
			} else {
				target = sectionParts(root, at.section).filter((part) => part.matches('.sortTarget'))[at.slot];
			}
			if (!target) throw new Error(`No target ${JSON.stringify(at)} on ${ref}`);
			await dropOn(target, dragged, point);
		},

		async dropOnItemSheet(source, name, ref) {
			const target = ref ? item(ref, name) : game.items.getName(full(name));
			const root = await render(target.sheet, (root) => root.querySelector('.window-content'));
			await dropOn(root.querySelector('.window-content')!, await dragFrom(source));
		},

		async editQuality(name, index, rating) {
			const root = await render(game.items.getName(full(name)).sheet, (root) => root.querySelectorAll('.data-rated')[index]);
			const row = root.querySelectorAll('.data-rated')[index];
			if (rating === null) {
				row.querySelector<HTMLElement>('button')!.click();
				// The removal asks first since #577: Yes removes the quality.
				return window.e2e.answerConfirm('yes');
			}
			const input = row.querySelector<HTMLInputElement>('input')!;
			input.value = rating;
			input.dispatchEvent(new FocusEvent('blur'));
			await settle();
			return null;
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
			row.querySelector<HTMLElement>(':scope > .actions > .menu-trigger')!.click();
			const entry = await waitFor(`${action} in the menu of ${name}`, () =>
				[...row.querySelectorAll<HTMLElement>(':scope > .actions .context-menu .menu-item')].find((menuItem) =>
					menuItem.querySelector(icons[action]),
				),
			);
			entry.click();
			await settle();
		},

		async menuEntry(ref, name, label) {
			await window.e2e.showTab(ref, 'inventory');
			return window.e2e.rowMenu(await heldRow(ref, name), label);
		},

		async menuEntries(ref, name) {
			const row = await rowOf(ref, name);
			row.querySelector<HTMLElement>(':scope > .actions > .menu-trigger')!.click();
			const menu = await waitFor(`the menu of ${name}`, () => row.querySelector(':scope > .actions .context-menu'));
			const entries = menuEntriesOf(menu);
			// Any click outside closes the menu.
			document.body.click();
			await waitFor(`the menu of ${name} to close`, () => !row.querySelector(':scope > .actions .context-menu'));
			return entries;
		},

		async rightClickMenu(ref, name, on = 'image') {
			const root = await sheet(ref);
			const row = await heldRow(ref, name);
			const target = row.querySelector(on === 'image' ? ':scope > .item-icon' : ':scope > .quantity');
			if (!target) throw new Error(`No ${on} on the row of ${name}`);
			target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			// Opening a menu changes no document: the row's render is waited for.
			await settle();
			const menu = root.querySelector('.tab-inventory .context-menu');
			if (!menu) return null;
			const entries = menuEntriesOf(menu);
			document.body.click();
			await waitFor(`the menu of ${name} to close`, () => !root.querySelector('.tab-inventory .context-menu'));
			return entries;
		},

		async menuCorner(ref, name, at) {
			const app = actor(ref).sheet;
			await window.e2e.showTab(ref, 'inventory');
			const row = await heldRow(ref, name);
			const { height } = app.position;
			const { minHeight } = app.element.style;
			let point: Point;
			if (at === 'button') {
				// The menu hangs from its container, which holds its ⋮.
				const container = row.querySelector<HTMLElement>(':scope > .actions')!;
				container.querySelector<HTMLElement>(':scope > .menu-trigger')!.click();
				const box = container.getBoundingClientRect();
				point = { x: box.right, y: box.bottom };
			} else {
				if (at === 'sheetEdge') {
					// The sheet's minimum height would keep room for the menu under the row.
					app.element.style.minHeight = '0';
					app.setPosition({ height: row.getBoundingClientRect().bottom - app.element.getBoundingClientRect().top + 8 });
				}
				const target = at === 'image' ? row.querySelector(':scope > .item-icon')! : row;
				const box = target.getBoundingClientRect();
				point =
					at === 'image' ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : { x: box.right - 4, y: box.bottom - 4 };
				target.dispatchEvent(
					new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: point.x, clientY: point.y }),
				);
			}
			// Opening a menu changes no document: the row's render is waited for.
			await settle();
			const menu = row.querySelector(':scope > .actions .context-menu');
			const box = menu?.getBoundingClientRect();
			const corners = box && {
				'top-left': [box.left, box.top],
				'top-right': [box.right, box.top],
				'bottom-left': [box.left, box.bottom],
				'bottom-right': [box.right, box.bottom],
			};
			const corner = Object.entries(corners ?? {}).find(([, [x, y]]) => Math.abs(x - point.x) < 1 && Math.abs(y - point.y) < 1);
			document.body.click();
			await waitFor(`the menu of ${name} to close`, () => !row.querySelector(':scope > .actions .context-menu'));
			if (at === 'sheetEdge') {
				app.element.style.minHeight = minHeight;
				app.setPosition({ height });
			}
			if (corner) return corner[0];
			return box ? `none: top-left at ${Math.round(box.left - point.x)}, ${Math.round(box.top - point.y)}` : 'no menu';
		},

		async pointAtRow(ref, name, where) {
			const app = actor(ref).sheet;
			await window.e2e.showTab(ref, 'inventory');
			if (!movedSheets.has(ref)) movedSheets.set(ref, { position: { ...app.position }, minHeight: app.element.style.minHeight });
			app.bringToFront();
			// The sheet's minimum height would show the whole tab, which then wouldn't scroll.
			app.element.style.minHeight = '0';
			const height = 560;
			app.setPosition({ left: 300, top: where === 'lowerEdge' ? document.documentElement.clientHeight - height : 80, height });
			await settle();
			const row = await heldRow(ref, name);
			const scroller = scrollerOf(row);
			const shown = scroller.getBoundingClientRect();
			const box = row.getBoundingClientRect();
			scroller.scrollTop += where === 'middle' ? box.top - (shown.top + shown.height / 5) : box.bottom - (shown.bottom - 2);
			await settle();
			return { point: uncoveredMiddle(row.querySelector(':scope > .item-icon')!), scrolled: Math.round(scroller.scrollTop) };
		},

		async buttonPoint(ref, name) {
			return uncoveredMiddle((await heldRow(ref, name)).querySelector(':scope > .actions > .menu-trigger')!);
		},

		async openMenu(ref, name, from) {
			// Opening a menu changes no document: the row's render is waited for.
			await settle();
			const menu = (await heldRow(ref, name)).querySelector<HTMLElement>(':scope > .actions .context-menu');
			if (!menu) return null;
			const box = menu.getBoundingClientRect();
			const corners: Record<string, Point> = {
				'top-left': { x: box.left, y: box.top },
				'top-right': { x: box.right, y: box.top },
				'bottom-left': { x: box.left, y: box.bottom },
				'bottom-right': { x: box.right, y: box.bottom },
			};
			const corner = Object.entries(corners).find(([, { x, y }]) => Math.abs(x - from.x) < 1 && Math.abs(y - from.y) < 1)?.[0];
			const area = shownArea(menu);
			// The points a user aims at: each entry's middle, and the menu's corners, inside its rounded border.
			const inset = 8;
			const points: Record<string, Point> = {
				'inner top-left': { x: box.left + inset, y: box.top + inset },
				'inner top-right': { x: box.right - inset, y: box.top + inset },
				'inner bottom-left': { x: box.left + inset, y: box.bottom - inset },
				'inner bottom-right': { x: box.right - inset, y: box.bottom - inset },
			};
			for (const entry of menu.querySelectorAll('.menu-item')) {
				const entryBox = entry.getBoundingClientRect();
				points[text(entry.querySelector('.menu-label'))] = {
					x: entryBox.left + entryBox.width / 2,
					y: entryBox.top + entryBox.height / 2,
				};
			}
			const look = (element: Element | null, prefix: string, properties: string[]) => {
				const style = element ? getComputedStyle(element) : undefined;
				return Object.fromEntries(properties.map((property) => [`${prefix}${property}`, style?.getPropertyValue(property) ?? '']));
			};
			return {
				corner: corner ?? `none: top-left at ${Math.round(box.left - from.x)}, ${Math.round(box.top - from.y)}`,
				inside:
					box.left >= area.left - 0.5 &&
					box.top >= area.top - 0.5 &&
					box.right <= area.right + 0.5 &&
					box.bottom <= area.bottom + 0.5,
				covered: Object.entries(points)
					.filter(([, { x, y }]) => !menu.contains(document.elementFromPoint(x, y)))
					.map(([point]) => point),
				look: {
					class: menu.className,
					...look(menu, '', MENU_LOOK),
					...look(menu.querySelector('.menu-item'), 'entry ', ENTRY_LOOK),
				},
			};
		},

		async closeMenu(ref, name) {
			const row = await heldRow(ref, name);
			document.body.click();
			await waitFor(`the menu of ${name} to close`, () => !row.querySelector(':scope > .actions .context-menu'));
		},

		async readyMenuKeys(ref, name) {
			if (!countingEscapes) {
				countingEscapes = true;
				// Where Foundry's keybindings listen, `core.dismiss` among them.
				window.addEventListener('keydown', (event) => {
					if (event.key === 'Escape') escapesOnWindow++;
				});
			}
			await window.e2e.showTab(ref, 'inventory');
			actor(ref).sheet.bringToFront();
			const row = await heldRow(ref, name);
			// The damage counter's spin button, its only Tab stop (§#580).
			const damage = row.querySelector<HTMLElement>(':scope > .damage [role="spinbutton"]')!;
			damage.focus();
			if (document.activeElement !== damage) throw new Error(`The damage state of ${name} took no focus`);
			await settle();
		},

		menuKeys(ref, name) {
			const app = actor(ref).sheet;
			// A row moved to another section leaves its old one through a transition, which keeps it a while.
			const row = app.rendered
				? [...(app.element as HTMLElement).querySelectorAll('.tab-inventory .inventory-item')].find(
						(candidate) =>
							text(candidate.querySelector('.name button')) === full(name) &&
							![...candidate.classList].some((cssClass) => cssClass.includes('leave')),
					)
				: undefined;
			const container = row?.querySelector(':scope > .actions');
			const trigger = container?.querySelector(':scope > .menu-trigger');
			const menu = container?.querySelector(':scope > [role="menu"]');
			const active = document.activeElement;
			const entry = active?.closest('[role="menuitem"]');
			let focus = active?.tagName.toLowerCase() ?? 'none';
			if (active && active === trigger) focus = active.getAttribute('aria-label') ?? '⋮';
			else if (entry) focus = text(entry.querySelector('.menu-label'));
			const box = menu?.getBoundingClientRect();
			const under = container?.getBoundingClientRect();
			return {
				focus,
				open: !!menu,
				atTrigger: !!box && !!under && Math.abs(box.right - under.right) < 1 && Math.abs(box.top - under.bottom) < 1,
				expanded: trigger?.getAttribute('aria-expanded') ?? null,
				sheetOpen: app.rendered,
				messages: game.messages.size,
				state: item(ref, name).system.state,
				damage: item(ref, name).system.damage,
				escapes: escapesOnWindow,
			};
		},

		async restoreSheet(ref) {
			const moved = movedSheets.get(ref);
			if (!moved) return;
			const app = actor(ref).sheet;
			app.element.style.minHeight = moved.minHeight;
			app.setPosition(moved.position);
			movedSheets.delete(ref);
			await settle();
		},

		async seedDamage(ref, name, damage) {
			await raw({
				type: 'Item',
				action: 'update',
				operation: {
					parentUuid: actor(ref).uuid,
					updates: [{ _id: item(ref, name).id, system: { damage } }],
					diff: true,
					recursive: true,
				},
			});
		},

		async edgesShown(source, ref, name, edges) {
			const dataTransfer = await dragFrom(source);
			if (!(dataTransfer instanceof DataTransfer)) throw new Error('Only a held item is dragged over a row');
			const row = findRow(await sheet(ref), name);
			const shown: (RowEdge | null)[] = [];
			await window.e2e.showTab(ref, 'inventory');
			row.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }));
			for (const edge of edges) {
				const { x, y } = edgePoint(row, edge);
				row.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer, clientX: x, clientY: y }));
				await settle();
				shown.push(row.classList.contains('drop-before') ? 'before' : row.classList.contains('drop-after') ? 'after' : null);
			}
			row.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true, dataTransfer }));
			await settle();
			return shown;
		},

		async stepToDeletion(ref, name, kind, answer) {
			const counter = (await rowOf(ref, name)).querySelector<HTMLElement>(`:scope > .${kind}`)!;
			// The quantity steps down on a right click, the damage up with its +.
			if (kind === 'quantity') {
				counter.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
			} else {
				clickCounter(counter, 1);
			}
			return window.e2e.answerConfirm(answer);
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
				clickCounter((await rowOf(ref, name)).querySelector<HTMLElement>(':scope > .damage')!, 1);
				await settle();
			}
			await window.e2e.answerConfirm('yes');
		},

		async focusCounter(ref, name, kind) {
			// An element of a hidden tab takes no focus.
			await window.e2e.showTab(ref, 'inventory');
			const spinButton = (await rowOf(ref, name)).querySelector<HTMLElement>(`:scope > .${kind} [role="spinbutton"]`);
			if (!spinButton) throw new Error(`No ${kind} spin button on the row of ${name}`);
			spinButton.focus();
			if (document.activeElement !== spinButton) throw new Error(`The ${kind} spin button of ${name} took no focus`);
			if (spinButton instanceof HTMLInputElement) spinButton.select();
		},

		async counter(ref, name, kind) {
			return counterState((await rowOf(ref, name)).querySelector(`:scope > .${kind}`));
		},

		async clickQuantityAndDamage(ref, name) {
			clickCounter((await rowOf(ref, name)).querySelector<HTMLElement>(':scope > .quantity')!, 1);
			await settle();
			clickCounter((await rowOf(ref, name)).querySelector<HTMLElement>(':scope > .damage')!, 1);
			await settle();
		},

		async attack(ref, name) {
			// An Equipped weapon's name attacks (#578).
			(await rowOf(ref, name)).querySelector<HTMLElement>('.name .roll-link')!.click();
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

		async updateItem(ref, name, changes) {
			await item(ref, name).update(changes);
		},

		async writeState(ref, name, state) {
			let threw = false;
			try {
				await item(ref, name).update({ 'system.state': state });
			} catch {
				// The data model refuses the state: the step reads that it threw.
				threw = true;
			}
			const held = item(ref, name);
			const response = await raw({ type: 'Actor', action: 'get', operation: { query: { _id: actor(ref).id } } });
			const stored = response.result[0].items?.find((entry) => entry._id === held.id);
			return { threw, state: held.system.state, database: stored?.system.state ?? '' };
		},

		async deleteItem(ref, name) {
			await item(ref, name).delete();
		},

		async stateAndDeletePaths(ref, name) {
			const quantity = !!(await rowOf(ref, name)).querySelector(':scope > .quantity');
			const app = item(ref, name).sheet;
			const root = await render(app);
			const fields = [...root.querySelectorAll<HTMLInputElement>('[name]')].map((field) => field.name);
			const actions = [
				...[...root.querySelectorAll<HTMLElement>('[data-action]')].map((element) => element.dataset.action!),
				...app._getHeaderControls().map((control: { action: string }) => control.action),
			];
			await app.close();
			await settle();
			return {
				quantity,
				stateField: fields.some((field) => field.endsWith('.state')),
				deleteAction: actions.some((action) => /delete/i.test(action)),
			};
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
				.map((row) => unprefixed(text(row.querySelector('.name button'))));
		},

		async contents(ref, name) {
			const row = await rowOf(ref, name);
			await openContainer(row);
			return [...row.querySelectorAll('.contents .inventory-item .name button')].map((link) => unprefixed(text(link)));
		},

		async foldContainer(ref, name, open) {
			await window.e2e.showTab(ref, 'inventory');
			await foldRow(await rowOf(ref, name), open);
		},

		async containerToggle(ref, name) {
			const toggle = toggleOf(await rowOf(ref, name));
			return toggle && window.e2e.foldToggle(toggle);
		},

		async contentsBox(ref, name) {
			// The fold of a `DescriptionFold` since #579; `.contents` before.
			const contents = (await rowOf(ref, name)).querySelector<HTMLElement>(':scope > :is(.description-fold, .contents)');
			if (!contents) return null;
			const rows = [...contents.querySelectorAll('.inventory-item')];
			const box = contents.getBoundingClientRect();
			const last = rows.at(-1);
			return {
				rows: rows.map((row) => unprefixed(text(row.querySelector('.name button')))),
				height: box.height > 100 ? '>100' : Math.round(box.height),
				// A scrollbar shows on an element that scrolls its overflow, and has some.
				scrollbar: [contents, ...contents.children].some(
					(element) => /auto|scroll/.test(getComputedStyle(element).overflowY) && element.scrollHeight - element.clientHeight > 1,
				),
				// Half a pixel of slack, for a box whose edges fall between two pixels.
				lastInside: !!last && last.getBoundingClientRect().bottom <= box.bottom + 0.5,
				visibility: last ? getComputedStyle(last).visibility : 'none',
			};
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
			const root = await sheet(ref);
			const inactive = game.i18n.localize('Genesys.ActiveEffects.Suppressed');
			return effectRows(root)
				.filter((row) => row.section === inactive)
				.map((row) => `${unprefixed(row.name)} | ${row.tooltip ?? ''}`);
		},

		async protection(ref) {
			const root = await sheet(ref);
			const system = actor(ref).system;
			return {
				soak: system.totalSoak,
				defense: [system.totalDefense.melee, system.totalDefense.ranged],
				combatTab: [...root.querySelectorAll('.tab[data-tab="combat"] .armors .armor:not(.columns) .name')].map((name) =>
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
				quantity: counterValue(row.querySelector(':scope > .quantity')),
				encumbrance: text(row.querySelector(':scope > .weight')),
				// The damage counter's value, its state's name, which it shows and reads to a screen reader.
				damageState: row.querySelector(':scope > .damage [role="spinbutton"]')?.getAttribute('aria-valuetext') ?? null,
			};
		},

		async weaponList(ref) {
			const root = await sheet(ref);
			if (actor(ref).type === 'rival') {
				// Each row's attack button, then the weapon's details.
				return [...root.querySelectorAll('.adversary-items .weapon.menu-container')].map((row) => unprefixed(text(row)));
			}
			const rows = root.querySelectorAll('.tab[data-tab="combat"] .weapons .weapon:not(.columns)');
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

/** The steps' calls of the inventory helpers in a client's page. */
function inventorySteps(page: Client) {
	return {
		drop: (source: Source, actor: string, at: Target) => () =>
			page.evaluate((args) => window.inventoryE2E.drop(args.source, args.actor, args.at), { source, actor, at }),
		items: (actor: string) => page.evaluate((ref) => window.inventoryE2E.items(ref), actor),
		section: (actor: string, state: EquipmentState) =>
			page.evaluate((args) => window.inventoryE2E.section(args.actor, args.state), { actor, state }),
		entries: (actor: string, item: string) =>
			page.evaluate((args) => window.inventoryE2E.menuEntries(args.actor, args.item), { actor, item }),
	};
}

/** Runs actions one after the other, as a single step. */
function drops(...actions: (() => Promise<unknown>)[]) {
	return async () => {
		for (const action of actions) await action();
	};
}

function held(item: string, by: string): Source {
	return { held: item, by };
}

// The entries every inventory row's menu ends with, under the labels every row's menu shares since #577.
const MENU_TAIL = ['Send to chat [fa-comment]', 'Edit [fa-edit]', 'Delete [fa-trash]'];

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	await gm.evaluate(installInventoryHelpers);
	// §#416: the system's compendium window is open before the setup creates the scenario's compendiums.
	await gm.evaluate(() => window.e2e.render(game.packs.get('genesys.crb-skills').apps[0]));
	await gm.evaluate((playerUser) => window.inventoryE2E.setUp(playerUser), e2e.playerUser);

	const page = gm;
	const { drop, items, section } = inventorySteps(page);
	const menu = (actor: string, item: string, action: MenuAction) => () =>
		page.evaluate((args) => window.inventoryE2E.menu(args.actor, args.item, args.action), { actor, item, action });
	// Answers the dialog an action opened: the menu's Delete asks to confirm.
	const answer = (yesOrNo: 'yes' | 'no') => () => page.evaluate((value) => window.e2e.answerConfirm(value), yesOrNo);
	const updateItem = (actor: string, item: string, changes: object) => () =>
		page.evaluate((args) => window.inventoryE2E.updateItem(args.actor, args.item, args.changes), { actor, item, changes });
	const sorts = (actor: string, state: EquipmentState) =>
		page.evaluate((args) => window.inventoryE2E.sorts(args.actor, args.state), { actor, state });
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
	const slot = (state: EquipmentState, n: number): Target => ({ section: state, slot: n });
	const onSheet: Target = { on: '.window-content' };
	const tooltip = (item: string, state: string) => `Inactive while E2E ${item} is ${state}.`;

	// One part: the moves of §#103 read the items the drops before them left.
	await e2e.part('dropsAndMoves', async () => {
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

		// #251: the qualities of a weapon's and an armor's sheet, each change written as a new list.
		const editQuality = (item: string, rating: string | null) => () =>
			page.evaluate((args) => window.inventoryE2E.editQuality(args.item, 0, args.rating), { item, rating });
		const qualities = async (item: string) => (await page.evaluate((name) => window.inventoryE2E.sidebarItem(name), item)).qualities;
		await e2e.step("#251 a rating of 3 typed for the Spear's quality in its sheet", editQuality('Spear', '3'));
		e2e.expect("#251 a weapon's quality takes the rating typed in its sheet", await qualities('Spear'), ['E2E Quality 3']);
		await e2e.step("#251 a rating of 0 typed for the Spear's quality in its sheet", editQuality('Spear', '0'));
		e2e.expect("#251 a weapon's quality given a rating of 0 in its sheet is removed", await qualities('Spear'), []);
		await e2e.step(
			'#251 a rated quality, twice, dropped on an armor sheet',
			drops(
				() => page.evaluate(() => window.inventoryE2E.dropOnItemSheet({ sidebar: 'Quality' }, 'Mail')),
				() => page.evaluate(() => window.inventoryE2E.dropOnItemSheet({ sidebar: 'Quality' }, 'Mail')),
			),
		);
		e2e.expect(
			'#251 an armor takes a quality dropped on its sheet, a rated quality again raising its rating',
			await qualities('Mail'),
			['E2E Quality 2'],
		);
		await e2e.step("#251 a rating of 4 typed for the Mail's quality in its sheet", editQuality('Mail', '4'));
		e2e.expect("#251 an armor's quality takes the rating typed in its sheet", await qualities('Mail'), ['E2E Quality 4']);
		let askedForQuality: unknown;
		await e2e.step("#251 the Mail's quality deleted from its sheet", async () => {
			askedForQuality = await editQuality('Mail', null)();
		});
		e2e.expect(
			'#577 Q1 removing a Quality of a list asks first, in the deletion dialog that names it, No by default',
			askedForQuality,
			{
				application: 'DialogV2',
				title: 'Confirm Deletion',
				content: "Delete E2E Quality? This can't be undone.",
				buttons: ['yes', 'no'],
				defaultButton: 'no',
			},
		);
		e2e.expect("#251 an armor's quality deleted from its sheet is removed", await qualities('Mail'), []);

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

		// #416: a drag started from a directory or a compendium window carries the dragged document's type, for which the
		// sections of an Inventory tab open: from the system's compendium, opened before the setup created the scenario's, and
		// from those created during the session.
		const fromWindows: Record<string, DragWindow> = {
			'Items directory': { directory: 'Item', name: 'E2E Sword' },
			'Actors directory': { directory: 'Actor', name: 'E2E Hero' },
			'Core Skills': { pack: 'genesys.crb-skills', name: 'Athletics' },
			'E2E Inventory Items': { pack: 'world.e2e-inventory-items', name: 'E2E Packed Mail' },
			'E2E Inventory Actors': { pack: 'world.e2e-inventory-actors', name: 'E2E Packed Hero' },
		};
		const windowDrags: Record<string, WindowDrag> = {};
		await e2e.step('#416 A1 drags from the directories and the compendium windows moved over the Inventory tab', async () => {
			for (const [label, from] of Object.entries(fromWindows)) {
				windowDrags[label] = await page.evaluate((args) => window.inventoryE2E.windowDrag(args.from, 'Receiver'), { from });
			}
		});
		const allSections: EquipmentState[] = ['equipped', 'carried', 'dropped'];
		e2e.expect('#416 A1 each drag carries its document type, and the sections taking it open', windowDrags, {
			'Items directory': { genesysType: 'weapon', sections: allSections },
			'Actors directory': { genesysType: 'character', sections: [] },
			'Core Skills': { genesysType: 'skill', sections: [] },
			'E2E Inventory Items': { genesysType: 'armor', sections: allSections },
			'E2E Inventory Actors': { genesysType: 'character', sections: [] },
		});

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
				effects: {
					onActor: 0,
					applied: ['Bell Effect', 'Mail Effect', 'Rope Effect'],
					suppressed: ['Elixir Effect', 'Potion Effect'],
				},
				woundsMax: 11,
				notifications: [],
				errors: 0,
			},
		);
		e2e.expect(
			'#102 D3 effects follow the Equipment State: equipped armor and carried gear apply, a carried consumable does not',
			(await effects('Hero')).suppressed,
			['Elixir Effect', 'Potion Effect'],
		);
		// Since #358 a row that is no Container places a drop in its section, as its sort slots do: on a Carried row, in Carried.
		await e2e.step(
			"#103 D4 Ally's Dropped Whistle dropped on Hero's Bell row",
			drop(held('Whistle', 'Ally'), 'Hero', { item: 'Bell' }),
		);
		e2e.expect(
			'#103 D4 an item from another actor dropped on a Carried row that is no Container lands in Carried',
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
			'#103 D5 an item dropped on the row of a section that refuses it, or elsewhere on the sheet of the actor that owns it, stays where it is',
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
		await e2e.step("#103 D7 Hero's Crate deleted by script", () =>
			page.evaluate(() => window.inventoryE2E.deleteItem('Hero', 'Crate')),
		);
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
					player.evaluate(() =>
						window.inventoryE2E.drop({ held: 'Lockpick', by: 'Ally' }, 'Hero', { section: 'carried', slot: 0 }),
					),
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
		e2e.expect(
			'#103 G3 a Container dropped from its menu takes its contents, whose effects stop',
			await pack(),
			packIn('dropped', false),
		);
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
				// The Backpack's row moves to the Equipped section as a new row. Vue ignores an event dispatched in the
				// millisecond its listener was attached (runtime-dom's `_vts` check), so a drop right after the update can
				// miss the new row. A `waitFor` the row would return in that same millisecond: settling lets time pass.
				() => e2e.settle(),
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
		e2e.expect(
			"#124 J1 two Saddlebags at −2 raise a character's threshold by 4, on the Inventory tab too",
			await encumbrance('Packer'),
			{
				value: 0,
				threshold: 11,
				shown: '0/11',
			},
		);
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
				window.inventoryE2E.createItems('Packer', [
					{ name: 'Hauberk', type: 'armor', system: { encumbrance: 4, state: 'equipped' } },
				]),
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
		await e2e.step(
			"#103 L2 Deleter's Box2 deleted from its menu, and Yes answered",
			drops(menu('Deleter', 'Box2', 'delete'), answer('yes')),
		);
		await e2e.step("#103 L3 Deleter's Box3 damaged to nothing from its row", () =>
			page.evaluate(() => window.inventoryE2E.damageToNothing('Deleter', 'Box3')),
		);
		e2e.expect(
			'#103 L1-L3 a Container deleted by script, from its menu or damaged to nothing takes its contents',
			await items('Deleter'),
			[],
		);
		// The other ways the checklist names, a Container's quantity down to zero and an item's sheet, don't exist.
		const paths = async (actor: string, item: string) =>
			page.evaluate((args) => window.inventoryE2E.stateAndDeletePaths(args.actor, args.item), { actor, item });
		e2e.expect(
			"#103 L4 a Container's row has no quantity control, and no item's sheet changes its Equipment State or deletes it",
			{ sack: await paths('Packer', 'Sack'), coat: await paths('Wearer', 'Coat') },
			{
				sack: { quantity: false, stateField: false, deleteAction: false },
				coat: { quantity: true, stateField: false, deleteAction: false },
			},
		);

		// #203, #134: inventory rows, weapon lists and chat cards. Smith has Brawn 2.
		await e2e.step(
			"#134 M1 Smith's Inventory tab shown, then the Club's damage field emptied in its sheet",
			drops(
				() => page.evaluate(() => window.e2e.showTab('Smith', 'inventory')),
				() => page.evaluate(() => window.inventoryE2E.editItemSheet('Smith', 'Club', 'system.baseDamage', '')),
			),
		);
		e2e.expect(
			'#134 M1 a weapon whose damage was emptied keeps a damage of 0, read as such on its row',
			{
				baseDamage: await page.evaluate(() => game.actors.getName('E2E Smith').items.getName('E2E Club').system.baseDamage),
				row: (await row('Smith', 'Club')).details,
			},
			{ baseDamage: null, row: 'Melee | Damage Br+0 (2) | Critical 3 | Range Engaged' },
		);
		e2e.expect(
			"#134 M1 a character's weapon rows read an emptied, a negative and a characteristic-less damage",
			{
				rock: (await row('Smith', 'Rock')).details,
				shiv: (await row('Smith', 'Shiv')).details,
			},
			{
				rock: 'Melee | Damage 0 | Critical 3 | Range Engaged',
				shiv: 'Melee | Damage Br-1 (1) | Critical 3 | Range Engaged',
			},
		);
		e2e.expect(
			"#134 M1 a character's Combat tab reads each weapon's damage total",
			await page.evaluate(() => window.inventoryE2E.weaponList('Smith')),
			[
				'Blade | Melee | Br+2 (4) | 3 | Engaged',
				'Club | Melee | Br+0 (2) | 3 | Engaged',
				'Rock | Melee | 0 | 3 | Engaged',
				'Shiv | Melee | Br-1 (1) | 3 | Engaged',
			],
		);
		e2e.expect(
			'#134 M1 an adversary lists a weapon whose damage was emptied with its characteristic',
			await page.evaluate(() => window.inventoryE2E.weaponList('Brute')),
			['Maul (MeleeDamage Br+0 (3)Critical 3Range Engaged)'],
		);
		e2e.expect(
			"#134 M1 a vehicle's Combat tab reads an emptied damage as 0 and its firing arcs",
			await page.evaluate(() => window.inventoryE2E.weaponList('Hauler')),
			[
				'Gun | Gunnery | 0 | 3 | Short | All',
				'Turret | Gunnery | 4 | 3 | Short | None',
				'Cannon | Gunnery | -1 | 3 | Short | ForePort',
			],
		);
		e2e.expect(
			"#134 M1 a vehicle's inventory rows read an emptied damage as 0 and the firing arcs",
			{
				gun: (await row('Hauler', 'Gun')).details,
				cannon: (await row('Hauler', 'Cannon')).details,
			},
			{
				gun: 'Gunnery | Firing Arc All | Damage 0 | Critical 3 | Range Short',
				cannon: 'Gunnery | Firing Arc ForePort | Damage -1 | Critical 3 | Range Short',
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
		e2e.expect(
			"#203 M4 a weapon's row follows the changes made in its sheet, with the Inventory tab open",
			await row('Smith', 'Blade'),
			{
				details: 'Melee | Damage Br+4 (6) | Critical 2 | Range Short | Quality 1',
				quantity: '1',
				encumbrance: '3',
				damageState: 'Undamaged',
			},
		);
		await e2e.step(
			"#203 M5 the Hide's soak and defense updated",
			updateItem('Smith', 'Hide', { 'system.soak': 3, 'system.defense': 2 }),
		);
		e2e.expect("#203 M5 an armor's row follows its soak and defense", (await row('Smith', 'Hide')).details, 'Soak +3 | Defense +2');
		await e2e.step(
			"#203 M6 Hauler's Inventory tab shown, then the Turret's firing arc updated",
			drops(
				() => page.evaluate(() => window.e2e.showTab('Hauler', 'inventory')),
				updateItem('Hauler', 'Turret', { 'system.firingArc.aft': true }),
			),
		);
		e2e.expect(
			"#203 M6 a vehicle weapon's row follows its firing arc",
			(await row('Hauler', 'Turret')).details,
			'Gunnery | Firing Arc Aft | Damage 4 | Critical 3 | Range Short',
		);
		await e2e.step("#203 M7 Smith's Brawn raised to 3", () =>
			page.evaluate(() => window.inventoryE2E.updateActor('Smith', { 'system.characteristics.brawn': 3 })),
		);
		e2e.expect(
			"#203 M7 a weapon's damage total follows the damage characteristic",
			(await row('Smith', 'Blade')).details,
			'Melee | Damage Br+4 (7) | Critical 2 | Range Short | Quality 1',
		);
		await e2e.step("#203 M8 the Blade's quantity and damage state clicked once", () =>
			page.evaluate(() => window.inventoryE2E.clickQuantityAndDamage('Smith', 'Blade')),
		);
		e2e.expect("#203 M8 a click raises an item's quantity and damage state on its row", await row('Smith', 'Blade'), {
			details: 'Melee | Damage Br+4 (7) | Critical 2 | Range Short | Quality 1',
			quantity: '2',
			encumbrance: '3',
			damageState: 'Minor Damage',
		});
	});

	await e2e.part('itemActions', () => itemActions(e2e));
	await e2e.part('rowMenuAndDrops', () => rowMenuAndDrops(e2e));
	await e2e.part('deletedDrops', () => deletedDrops(e2e));
	await e2e.part('unknownDamageState', () => unknownDamageState(e2e));
	await e2e.part('usedState', () => usedState(e2e));
	await e2e.part('containerFold', () => containerFold(e2e));
	await e2e.part('menuKeyboard', () => menuKeyboard(e2e));

	await gm.evaluate(() => window.inventoryE2E.tearDown());
}

/**
 * §#576: an inventory row's menu from the keyboard, with real key presses: Tab reaches its ⋮, Enter opens it, the arrow
 * keys and Enter run an entry, and Escape closes it without closing the sheet.
 */
async function menuKeyboard(e2e: ScenarioContext) {
	const { gm } = e2e;
	const keys = () => gm.evaluate(() => window.inventoryE2E.menuKeys('Hoarder', 'Lantern'));
	let state: MenuKeys | undefined;
	// The menu of a carried gear, with no Container to put it in: Drop, then a separator, Send to chat, Edit and Delete.
	await gm.evaluate(() => window.inventoryE2E.createItems('Hoarder', [{ name: 'Lantern', type: 'gear', system: { state: 'carried' } }]));

	try {
		await e2e.step("#576 K1 Hoarder's Lantern row: Tab pressed from its damage state", async () => {
			await gm.evaluate(() => window.inventoryE2E.readyMenuKeys('Hoarder', 'Lantern'));
			await gm.page.keyboard.press('Tab');
			state = await keys();
		});
		e2e.expect(
			"#576 K1 Tab reaches the row's ⋮, a button named Actions, which says its menu is closed",
			{ focus: state?.focus, open: state?.open, expanded: state?.expanded },
			{ focus: 'Actions', open: false, expanded: 'false' },
		);

		await e2e.step('#576 K2 Enter pressed on the ⋮', async () => {
			await gm.page.keyboard.press('Enter');
			state = await keys();
		});
		e2e.expect(
			'#576 K2 Enter opens the menu under the ⋮, on its first entry, and the ⋮ says it is open',
			{ focus: state?.focus, open: state?.open, atTrigger: state?.atTrigger, expanded: state?.expanded },
			{ focus: 'Drop', open: true, atTrigger: true, expanded: 'true' },
		);

		const messages = state?.messages ?? 0;
		await e2e.step('#576 K3 ArrowDown pressed in the menu, then Enter', async () => {
			await gm.page.keyboard.press('ArrowDown');
			state = await keys();
			await gm.page.keyboard.press('Enter');
		});
		const afterRun = await keys();
		e2e.expect(
			'#576 K3 ArrowDown moves past the separator to Send to chat, and Enter runs it, closes the menu and gives the focus back to the ⋮',
			{ moved: state?.focus, posted: afterRun.messages - messages, open: afterRun.open, focus: afterRun.focus },
			{ moved: 'Send to chat', posted: 1, open: false, focus: 'Actions' },
		);

		await e2e.step('#576 E1 the menu opened again with ArrowUp, then Escape pressed', async () => {
			await gm.page.keyboard.press('ArrowUp');
			state = await keys();
			await gm.page.keyboard.press('Escape');
		});
		const afterEscape = await keys();
		// Foundry skips its keybindings while a form's button has focus, which leaves the sheet open on its own: the menu
		// stopping Escape shows in what reaches the window.
		e2e.expect(
			'#576 E1 ArrowUp opens the menu on its last entry, and Escape closes it without reaching the window, leaves the sheet open and gives the focus back to the ⋮',
			{
				openedOn: state?.focus,
				open: afterEscape.open,
				escapesOnWindow: afterEscape.escapes - (state?.escapes ?? 0),
				sheetOpen: afterEscape.sheetOpen,
				focus: afterEscape.focus,
			},
			{ openedOn: 'Delete', open: false, escapesOnWindow: 0, sheetOpen: true, focus: 'Actions' },
		);

		await e2e.step('#576 K4 Shift+F10 pressed on the ⋮, then Tab', async () => {
			await gm.page.keyboard.press('Shift+F10');
			state = await keys();
			await gm.page.keyboard.press('Tab');
		});
		const afterTab = await keys();
		e2e.expect(
			'#576 K4 Shift+F10 opens the menu at the ⋮, on its first entry, and Tab closes it, going on from the ⋮',
			{
				opened: state && { focus: state.focus, atTrigger: state.atTrigger },
				open: afterTab.open,
				// On the control after the ⋮, whichever it is, rather than the ⋮, an entry or the page.
				movedOn: ['a', 'button', 'input', 'select', 'textarea'].includes(afterTab.focus),
			},
			{ opened: { focus: 'Drop', atTrigger: true }, open: false, movedOn: true },
		);

		await e2e.step('#576 K5 Shift+F10 pressed on the damage state of the row', async () => {
			await gm.evaluate(() => window.inventoryE2E.readyMenuKeys('Hoarder', 'Lantern'));
			state = await keys();
			await gm.page.keyboard.press('Shift+F10');
		});
		const onDamage = await keys();
		e2e.expect(
			"#576 K5 Shift+F10 on the damage state opens the row's menu at the ⋮, on its first entry, rather than repairing the item",
			{ focus: onDamage.focus, atTrigger: onDamage.atTrigger, damage: onDamage.damage },
			{ focus: 'Drop', atTrigger: true, damage: state?.damage },
		);
		await gm.page.keyboard.press('Escape');

		await e2e.step('#576 K6 Enter pressed on the ⋮, then Enter on Drop', async () => {
			await gm.page.keyboard.press('Enter');
			await gm.page.keyboard.press('Enter');
		});
		const afterDrop = await keys();
		e2e.expect(
			"#576 K6 Drop run from the keyboard moves the row to the Dropped section, and the focus goes on to the row's ⋮ there",
			{ state: afterDrop.state, open: afterDrop.open, focus: afterDrop.focus },
			{ state: 'dropped', open: false, focus: 'Actions' },
		);
		await e2e.step('#576 E2 Escape pressed after the Drop', () => gm.page.keyboard.press('Escape'));
		e2e.expect('#576 E2 Escape after an entry that moved the row leaves the sheet open', (await keys()).sheetOpen, true);
	} finally {
		await gm.evaluate(() => window.inventoryE2E.deleteItem('Hoarder', 'Lantern'));
		await gm.evaluate(() => window.e2e.closeSetUp());
	}
}

/**
 * §#516: an open Container shows all its contents, with no cap or scrollbar of its own, and closes over them. §#579: its
 * count is a `DescriptionFold`'s chevron.
 */
async function containerFold(e2e: ScenarioContext) {
	const { gm } = e2e;
	const HELD = ['Awl', 'Bobbin', 'Candle', 'Dice', 'Eyeglass', 'Flint', 'Gloves', 'Hook'];
	const box = () => gm.evaluate(() => window.inventoryE2E.contentsBox('Hoarder', 'Chest'));

	await e2e.step("#516 A1 Hoarder's Chest, which holds eight items, opened in the Inventory tab", async () => {
		await gm.evaluate(
			(held) =>
				window.inventoryE2E.createItems('Hoarder', [
					{ name: 'Chest', type: 'container', system: { state: 'carried' } },
					...held.map((name) => ({ name, type: 'gear', system: { state: 'carried' }, in: 'Chest' })),
				]),
			HELD,
		);
		await gm.evaluate(() => window.inventoryE2E.foldContainer('Hoarder', 'Chest', true));
	});
	e2e.expect('#516 A1 the open Container shows all its contents, past 100px, without a scrollbar of its own', await box(), {
		rows: HELD,
		height: '>100',
		scrollbar: false,
		lastInside: true,
		visibility: 'visible',
	});
	const toggle = () => gm.evaluate(() => window.inventoryE2E.containerToggle('Hoarder', 'Chest'));
	e2e.expect(
		"#579 D1 the open Container's count tells it is expanded, points at the fold of its contents, and shows a chevron pointing down",
		await toggle(),
		{ text: '8 Items', expanded: true, icon: 'fa-chevron-down', controlsFold: true },
	);

	await e2e.step("#516 A2 Hoarder's Chest closed", () => gm.evaluate(() => window.inventoryE2E.foldContainer('Hoarder', 'Chest', false)));
	e2e.expect(
		'#516 A2 the closed Container keeps its contents rendered, which take no height and are hidden from Tab once the fold ends',
		await box(),
		{ rows: HELD, height: 0, scrollbar: false, lastInside: false, visibility: 'hidden' },
	);
	e2e.expect(
		'#579 D2 the closed Container keeps its count as its name, tells it is collapsed, and shows a chevron pointing right',
		await toggle(),
		{ text: '8 Items', expanded: false, icon: 'fa-chevron-right', controlsFold: true },
	);
	// The Chest goes with its contents: the parts after this one find the Hoarder's rows offering no Container (#577).
	await gm.evaluate(() => window.inventoryE2E.deleteItem('Hoarder', 'Chest'));
	await gm.evaluate(() => window.e2e.closeSetUp());
}

/** §#252: the Equipment State moves an inventory row's menu offers, and the dialogs confirming a deletion from its row and its menu. */
async function itemActions(e2e: ScenarioContext) {
	const { gm } = e2e;
	const { entries } = inventorySteps(gm);
	const stepToDeletion = (actor: string, item: string, kind: 'quantity' | 'damage', answer: 'yes' | 'no') =>
		gm.evaluate((args) => window.inventoryE2E.stepToDeletion(args.actor, args.item, args.kind, args.answer), {
			actor,
			item,
			kind,
			answer,
		});
	const stepperItems = async () =>
		(await gm.evaluate(() => window.inventoryE2E.items('Stepper'))).filter((name) => /^(Pebble|Shard)/.test(name));

	e2e.expect(
		"#252 B1 a character's row offers to equip a weapon or an armor or put it back to Carried, and to drop or pick up any item; a vehicle's row to equip or unequip a vehicle weapon only",
		{
			weapon: await entries('Stepper', 'Pick'),
			wornArmor: await entries('Stepper', 'Gambeson'),
			carriedArmor: await entries('Stepper', 'Hauberk'),
			droppedGear: await entries('Stepper', 'Twine'),
			container: await entries('Stepper', 'Pouch'),
			vehicleWeapon: await entries('Barge', 'Harpoon'),
			vehicleGear: await entries('Barge', 'Tarp'),
		},
		// The Stepper's Pouch is a Container, which the items that are none can be put in (#577).
		{
			weapon: ['Equip [fa-hand-fist]', 'Drop [fa-box-archive]', 'Put in E2E Pouch [fa-box-open]', '---', ...MENU_TAIL],
			wornArmor: ['Unequip [fa-suitcase]', 'Drop [fa-box-archive]', 'Put in E2E Pouch [fa-box-open]', '---', ...MENU_TAIL],
			carriedArmor: ['Equip [fa-shield]', 'Drop [fa-box-archive]', 'Put in E2E Pouch [fa-box-open]', '---', ...MENU_TAIL],
			droppedGear: ['Pick Up [fa-suitcase]', 'Put in E2E Pouch [fa-box-open]', '---', ...MENU_TAIL],
			container: ['Drop [fa-box-archive]', '---', ...MENU_TAIL],
			vehicleWeapon: ['Equip [fa-hand-fist]', '---', ...MENU_TAIL],
			vehicleGear: MENU_TAIL,
		},
	);

	// The deletion dialog, which names the item since #577.
	// §#577: putting an item in a Container and taking it out, which a drag did alone, from the row's menu.
	const menuEntry = (item: string, label: string) =>
		gm.evaluate((args) => window.inventoryE2E.menuEntry('Stepper', args.item, args.label), { item, label });
	const hauberk = async () =>
		(await gm.evaluate(() => window.inventoryE2E.items('Stepper'))).filter((name) => name.startsWith('Hauberk'));
	await e2e.step("#577 M1 Stepper's Hauberk put in the Pouch from its menu", () => menuEntry('Hauberk', 'Put in E2E Pouch'));
	e2e.expect('#577 M1 Put in moves the item into the Container, which gives it its Equipment State', await hauberk(), [
		'Hauberk:carried@Pouch',
	]);
	let heldMenu: string[] = [];
	await e2e.step("#577 M2 the Hauberk taken out of the Pouch from its row's menu, in the Pouch's contents", async () => {
		heldMenu = await menuEntry('Hauberk', 'Take out of E2E Pouch');
	});
	e2e.expect(
		"#577 M2 an item in a Container offers to take it out, and Take out puts it back in the Container's section",
		{ menu: heldMenu, items: await hauberk() },
		{ menu: ['Take out of E2E Pouch', '---', 'Send to chat', 'Edit', 'Delete'], items: ['Hauberk:carried'] },
	);

	const dialog = (name: string) => ({
		application: 'DialogV2',
		title: 'Confirm Deletion',
		content: `Delete E2E ${name}? This can't be undone.`,
		buttons: ['yes', 'no'],
		defaultButton: 'no',
	});
	let asked: ConfirmDialog | null = null;
	await e2e.step("#252 A1 Stepper's Pebble stepped down to a quantity of 0 from its row, and No answered", async () => {
		asked = await stepToDeletion('Stepper', 'Pebble', 'quantity', 'no');
	});
	e2e.expect('#252 A1 an item stepped down to a quantity of 0 asks in an ApplicationV2 dialog, No by default', asked, dialog('Pebble'));
	e2e.expect('#252 A1 No keeps the item, at its quantity', await stepperItems(), ['Pebble:carried', 'Shard:carried']);
	await e2e.step("#252 A2 Stepper's Pebble stepped down again, and Yes answered", async () => {
		asked = await stepToDeletion('Stepper', 'Pebble', 'quantity', 'yes');
	});
	e2e.expect('#252 A2 Yes deletes an item stepped down to a quantity of 0', await stepperItems(), ['Shard:carried']);
	await e2e.step("#252 A3 Stepper's Shard, at major damage, damaged once more from its row, and Yes answered", async () => {
		asked = await stepToDeletion('Stepper', 'Shard', 'damage', 'yes');
	});
	e2e.expect(
		'#252 A3 an item damaged past major damage asks in the same dialog, and Yes deletes it',
		{ asked, items: await stepperItems() },
		{
			asked: dialog('Shard'),
			items: [],
		},
	);

	const deleteFromMenu = (item: string, yesOrNo: 'yes' | 'no') =>
		gm.evaluate(
			async (args) => {
				await window.inventoryE2E.menu('Stepper', args.item, 'delete');
				return window.e2e.answerConfirm(args.answer);
			},
			{ item, answer: yesOrNo },
		);
	const twine = async () => (await gm.evaluate(() => window.inventoryE2E.items('Stepper'))).filter((name) => name.startsWith('Twine'));
	await e2e.step("#252 D1 Stepper's Twine deleted from its menu, and No answered", async () => {
		asked = await deleteFromMenu('Twine', 'no');
	});
	e2e.expect(
		"#252 D1 an inventory row's Delete asks in the deletion dialog, which names the item, No by default",
		asked,
		dialog('Twine'),
	);
	e2e.expect('#252 D1 No keeps the item', await twine(), ['Twine:dropped']);
	await e2e.step("#252 D2 Stepper's Twine deleted from its menu, and Yes answered", async () => {
		asked = await deleteFromMenu('Twine', 'yes');
	});
	e2e.expect("#252 D2 Yes deletes the item from the row's Delete", await twine(), []);

	// §#580: a row's quantity and damage are counters, stepped from the keyboard, the quantity typed in too.
	const counter = (item: string, kind: 'quantity' | 'damage') =>
		gm.evaluate((args) => window.inventoryE2E.counter('Stepper', args.item, args.kind), { item, kind });
	const pressOn = async (item: string, kind: 'quantity' | 'damage', keys: string[]) => {
		await gm.evaluate((args) => window.inventoryE2E.focusCounter('Stepper', args.item, args.kind), { item, kind });
		for (const key of keys) {
			await gm.page.keyboard.press(key);
			// Each step writes the item before the next one reads it, as a user's next key would wait for the row.
			await gm.evaluate(() => window.e2e.settle());
		}
	};
	e2e.expect(
		"#580 A1 a row's quantity is a spin button named Quantity, which can be typed into, and its damage one named Damage that reads its state in words; a − and a + where a step is possible",
		{ quantity: await counter('Pick', 'quantity'), damage: await counter('Pick', 'damage') },
		{
			quantity: {
				shown: '1',
				spinButton: { name: 'Quantity', now: '1', min: '0', max: null, text: null, typed: true },
				buttons: ['Decrease', 'Increase'],
			},
			damage: {
				shown: 'Undamaged',
				spinButton: { name: 'Damage', now: '0', min: '0', max: null, text: 'Undamaged', typed: false },
				buttons: ['Increase'],
			},
		},
	);
	await e2e.step("#580 A2 Stepper's Pick's quantity and damage each focused, then ArrowUp pressed twice and ArrowDown once", async () => {
		await pressOn('Pick', 'quantity', ['ArrowUp', 'ArrowUp', 'ArrowDown']);
		await pressOn('Pick', 'damage', ['ArrowUp', 'ArrowUp', 'ArrowDown']);
	});
	e2e.expect(
		"#580 A2 ArrowUp and ArrowDown step a row's quantity and damage",
		{ quantity: (await counter('Pick', 'quantity'))?.shown, damage: (await counter('Pick', 'damage'))?.shown },
		{ quantity: '2', damage: 'Minor Damage' },
	);
	await e2e.step("#580 A3 5 typed into Stepper's Pick's quantity, then Enter", () => pressOn('Pick', 'quantity', ['5', 'Enter']));
	e2e.expect("#580 A3 a quantity typed into a row's counter is written", (await counter('Pick', 'quantity'))?.shown, '5');
	await e2e.step("#580 A4 0 typed into Stepper's Pick's quantity, then Enter, and No answered", async () => {
		await pressOn('Pick', 'quantity', ['0', 'Enter']);
		asked = await gm.evaluate(() => window.e2e.answerConfirm('no'));
	});
	e2e.expect(
		'#580 A4 a quantity of 0 typed into a row asks as a step down to 0 does, and No keeps the item at its quantity',
		{ asked, quantity: (await counter('Pick', 'quantity'))?.shown },
		{ asked: dialog('Pick'), quantity: '5' },
	);
}

/** §#358: an inventory row's menu opens on a right-click, and an item dropped on a row lands before or after it. */
async function rowMenuAndDrops(e2e: ScenarioContext) {
	const { gm } = e2e;
	const { drop, items, section, entries } = inventorySteps(gm);
	const rightClick = (actor: string, item: string, on: 'image' | 'quantity' = 'image') =>
		gm.evaluate((args) => window.inventoryE2E.rightClickMenu(args.actor, args.item, args.on), { actor, item, on });
	const menuCorner = (actor: string, item: string, at: 'image' | 'sheetEdge' | 'button') =>
		gm.evaluate((args) => window.inventoryE2E.menuCorner(args.actor, args.item, args.at), { actor, item, at });
	const edgesShown = (source: Source, actor: string, item: string, edges: RowEdge[]) =>
		gm.evaluate((args) => window.inventoryE2E.edgesShown(args.source, args.actor, args.item, args.edges), {
			source,
			actor,
			item,
			edges,
		});
	const placer = async () => ({
		equipped: await section('Placer', 'equipped'),
		carried: await section('Placer', 'carried'),
		dropped: await section('Placer', 'dropped'),
	});
	const rover = async () => ({ equipped: await section('Rover', 'equipped'), carried: await section('Rover', 'carried') });
	await gm.evaluate(() => window.e2e.showTab('Placer', 'inventory'));
	// The Placer's Basket is a Container, which the Lance can be put in (#577).
	const lanceMenu = ['Equip [fa-hand-fist]', 'Drop [fa-box-archive]', 'Put in E2E Basket [fa-box-open]', '---', ...MENU_TAIL];
	e2e.expect(
		"#358 A1 a right-click on a character's inventory row opens the menu of its … button, which a left-click still opens",
		{ rightClick: await rightClick('Placer', 'Lance'), button: await entries('Placer', 'Lance') },
		{ rightClick: lanceMenu, button: lanceMenu },
	);
	// §#429: a right-click opens the menu at the pointer, as Foundry's context menus open, and the … button under itself.
	e2e.expect(
		"#429 A1 a right-click on a character's inventory row opens its menu with the menu's top-left corner under the pointer",
		await menuCorner('Placer', 'Glaive', 'image'),
		'top-left',
	);
	e2e.expect(
		"#429 A2 a right-click near the bottom-right corner of what the sheet shows opens the menu to the pointer's left and above it",
		await menuCorner('Placer', 'Lance', 'sheetEdge'),
		'bottom-right',
	);
	e2e.expect(
		"#429 A3 a click on a row's … button still opens its menu under the button, its right edge on the button's, after a right-click opened it at the pointer",
		await menuCorner('Placer', 'Lance', 'button'),
		'top-right',
	);
	// §#429: with a real mouse, which only reaches what shows under it, on a sheet whose Inventory tab is scrolled, then near
	// the sheet's lower edge, which lies on the viewport's. The menu the row's … button opens is the one to look like.
	const realMouse = async (item: string, where: 'middle' | 'lowerEdge') => {
		const { point, scrolled } = await gm.evaluate((args) => window.inventoryE2E.pointAtRow('Placer', args.item, args.where), {
			item,
			where,
		});
		await gm.page.mouse.click(point.x, point.y, { button: 'right' });
		const menu = await gm.evaluate((args) => window.inventoryE2E.openMenu('Placer', args.item, args.point), { item, point });
		await gm.evaluate((name) => window.inventoryE2E.closeMenu('Placer', name), item);
		const button = await gm.evaluate((name) => window.inventoryE2E.buttonPoint('Placer', name), item);
		await gm.page.mouse.click(button.x, button.y);
		const byButton = await gm.evaluate((args) => window.inventoryE2E.openMenu('Placer', args.item, args.button), { item, button });
		await gm.evaluate((name) => window.inventoryE2E.closeMenu('Placer', name), item);
		return { scrolled, menu, byButton };
	};
	let mouse: Awaited<ReturnType<typeof realMouse>> | undefined;
	const placed = () => mouse?.menu && { corner: mouse.menu.corner, inside: mouse.menu.inside, covered: mouse.menu.covered };
	const looks = () => ({ rightClick: mouse?.menu?.look, button: mouse?.byButton?.look });
	await e2e.step(
		"#429 B1 Placer's Inventory tab scrolled to the Pike row, right-clicked with a real mouse, then its … button clicked",
		async () => {
			mouse = await realMouse('Pike', 'middle');
		},
	);
	e2e.expect(
		'#429 B1 a real right-click on a row of a scrolled Inventory tab opens its menu with its top-left corner under the pointer, inside what the sheet shows, with nothing over it',
		{ scrolled: (mouse?.scrolled ?? 0) > 0, ...placed() },
		{ scrolled: true, corner: 'top-left', inside: true, covered: [] },
	);
	e2e.expect(
		"#429 B1 the menu a real right-click opens has the look of the one the row's … button opens",
		looks().rightClick,
		looks().button,
	);
	await e2e.step(
		"#429 B2 Placer's sheet moved down to the viewport's lower edge, its Pinecone row scrolled to the tab's lower edge and right-clicked with a real mouse, then its … button clicked",
		async () => {
			mouse = await realMouse('Pinecone', 'lowerEdge');
			await gm.evaluate(() => window.inventoryE2E.restoreSheet('Placer'));
		},
	);
	e2e.expect(
		"#429 B2 a real right-click near the sheet's lower edge opens the menu above the pointer, its bottom-left corner under it, inside what the sheet shows, with nothing over it",
		placed(),
		{ corner: 'bottom-left', inside: true, covered: [] },
	);
	e2e.expect(
		"#429 B2 the menu a real right-click opens above the pointer has the look of the one the row's … button opens",
		looks().rightClick,
		looks().button,
	);

	let quantityMenu: string[] | null = null;
	await e2e.step("#358 A2 Placer's Twig, at a quantity of 3, right-clicked on its quantity", async () => {
		quantityMenu = await rightClick('Placer', 'Twig', 'quantity');
	});
	e2e.expect(
		"#358 A2 a right-click on a row's quantity steps it down, and opens no menu",
		{
			menu: quantityMenu,
			quantity: await gm.evaluate(() => game.actors.getName('E2E Placer').items.getName('E2E Twig').system.quantity),
		},
		{ menu: null, quantity: 2 },
	);
	const player = await e2e.player();
	await player.evaluate(installInventoryHelpers);
	// §#577: a sheet the user can't edit keeps the entries that edit nothing, and a Container's contents have a menu of
	// their own, which takes them out of it.
	e2e.expect(
		"#577 C1 a right-click opens the row's menu on a sheet the user can't edit, with Send to chat and Edit alone, and on a Container's contents, which it takes out",
		{
			observer: await player.evaluate(() => window.inventoryE2E.rightClickMenu('Ally', 'Lockpick')),
			contents: await rightClick('Placer', 'Berry'),
		},
		{
			observer: ['Send to chat [fa-comment]', 'Edit [fa-edit]'],
			contents: ['Take out of E2E Basket [fa-arrow-right-from-bracket]', '---', ...MENU_TAIL],
		},
	);

	e2e.expect(
		'#358 B1 a weapon dragged over the halves of an Equipped row shows the edge it would land next to; a gear item, which Equipped refuses, none',
		{
			weapon: await edgesShown(held('Pike', 'Placer'), 'Placer', 'Glaive', ['after', 'before']),
			gear: await edgesShown(held('Twig', 'Placer'), 'Placer', 'Glaive', ['after', 'before']),
		},
		{ weapon: ['after', 'before'], gear: [null, null] },
	);
	await e2e.step(
		"#358 B2 Placer's Carried Lance dropped on the lower half of the Equipped Glaive's row",
		drop(held('Lance', 'Placer'), 'Placer', { item: 'Glaive', edge: 'after' }),
	);
	e2e.expect("#358 B2 an item dropped on the lower half of an Equipped weapon's row is equipped right after it", await placer(), {
		equipped: ['Glaive', 'Lance', 'Halberd'],
		carried: ['Pike', 'Twig', 'Basket'],
		dropped: ['Pinecone'],
	});
	await e2e.step(
		"#358 B3 Placer's Carried Pike dropped on the upper half of the Equipped Halberd's row",
		drop(held('Pike', 'Placer'), 'Placer', { item: 'Halberd', edge: 'before' }),
	);
	e2e.expect("#358 B3 an item dropped on the upper half of an Equipped weapon's row is equipped right before it", await placer(), {
		equipped: ['Glaive', 'Lance', 'Pike', 'Halberd'],
		carried: ['Twig', 'Basket'],
		dropped: ['Pinecone'],
	});
	await e2e.step(
		"#358 B4 a weapon from the sidebar dropped on the lower half of Placer's Glaive row",
		drop({ sidebar: 'Sword' }, 'Placer', { item: 'Glaive', edge: 'after' }),
	);
	e2e.expect('#358 B4 an item from the sidebar dropped on a row is placed the same way', await placer(), {
		equipped: ['Glaive', 'Sword', 'Lance', 'Pike', 'Halberd'],
		carried: ['Twig', 'Basket'],
		dropped: ['Pinecone'],
	});
	await e2e.step(
		"#358 B5 Placer's Carried Twig dropped on the lower half of the Dropped Pinecone's row",
		drop(held('Twig', 'Placer'), 'Placer', { item: 'Pinecone', edge: 'after' }),
	);
	e2e.expect('#358 B5 an item dropped on a row of the Dropped section is dropped there', await placer(), {
		equipped: ['Glaive', 'Sword', 'Lance', 'Pike', 'Halberd'],
		carried: ['Basket'],
		dropped: ['Pinecone', 'Twig'],
	});
	const placerBeforeB6 = { items: await items('Placer'), rows: await placer() };
	await e2e.step(
		"#358 B6 Placer's Dropped Twig dropped on the upper, then the lower half of the Equipped Glaive's row",
		drops(
			drop(held('Twig', 'Placer'), 'Placer', { item: 'Glaive', edge: 'before' }),
			drop(held('Twig', 'Placer'), 'Placer', { item: 'Glaive', edge: 'after' }),
		),
	);
	e2e.expect(
		"#358 B6 an item that can't be equipped dropped on an Equipped row is refused, as on the Equipped sort slots",
		{ items: await items('Placer'), rows: await placer() },
		placerBeforeB6,
	);
	await e2e.step(
		"#358 B7 Placer's Dropped Twig dropped on the lower half of the Carried Basket's row",
		drop(held('Twig', 'Placer'), 'Placer', { item: 'Basket', edge: 'after' }),
	);
	e2e.expect(
		"#358 B7 an item dropped anywhere on a Container's row goes inside it",
		(await items('Placer')).filter((name) => /^(Twig|Berry)/.test(name)),
		['Berry:carried@Basket', 'Twig:carried@Basket'],
	);
	await e2e.step(
		"#358 B8 an item of a compendium dropped on the upper half of Placer's Dropped Pinecone row",
		drop({ compendium: 'Packed Gear' }, 'Placer', { item: 'Pinecone', edge: 'before' }),
	);
	e2e.expect('#358 B8 an item from a compendium dropped on a row is placed the same way', await placer(), {
		equipped: ['Glaive', 'Sword', 'Lance', 'Pike', 'Halberd'],
		carried: ['Basket'],
		dropped: ['Packed Gear', 'Pinecone'],
	});

	await gm.evaluate(() => window.e2e.showTab('Rover', 'inventory'));
	// The Rover's Locker is a Container, which the Railgun can be put in (#577).
	const railgunMenu = ['Unequip [fa-suitcase]', 'Put in E2E Locker [fa-box-open]', '---', ...MENU_TAIL];
	e2e.expect(
		"#358 C1 a right-click on a vehicle's inventory row opens the menu of its … button",
		{ rightClick: await rightClick('Rover', 'Railgun'), button: await entries('Rover', 'Railgun') },
		{ rightClick: railgunMenu, button: railgunMenu },
	);
	e2e.expect(
		"#429 A4 a right-click on a vehicle's inventory row opens its menu with the menu's top-left corner under the pointer",
		await menuCorner('Rover', 'Railgun', 'image'),
		'top-left',
	);
	await e2e.step(
		"#358 C2 Rover's Carried Flak dropped on the lower half of the Equipped Laser's row",
		drop(held('Flak', 'Rover'), 'Rover', { item: 'Laser', edge: 'after' }),
	);
	e2e.expect("#358 C2 a vehicle weapon dropped on the lower half of a vehicle's Equipped row is equipped right after it", await rover(), {
		equipped: ['Laser', 'Flak', 'Railgun'],
		carried: ['Winch', 'Locker'],
	});
	await e2e.step(
		"#358 C3 Rover's Carried Winch dropped on the upper half of the Equipped Laser's row",
		drop(held('Winch', 'Rover'), 'Rover', { item: 'Laser', edge: 'before' }),
	);
	e2e.expect("#358 C3 a gear item dropped on a vehicle's Equipped row is refused", await rover(), {
		equipped: ['Laser', 'Flak', 'Railgun'],
		carried: ['Winch', 'Locker'],
	});
	await e2e.step(
		"#358 C4 Rover's Equipped Railgun dropped on the upper half of the Carried Winch's row",
		drop(held('Railgun', 'Rover'), 'Rover', { item: 'Winch', edge: 'before' }),
	);
	e2e.expect("#358 C4 an item dropped on the upper half of a vehicle's Carried row is carried right before it", await rover(), {
		equipped: ['Laser', 'Flak'],
		carried: ['Railgun', 'Winch', 'Locker'],
	});
	await e2e.step(
		"#358 C5 Rover's Carried Winch dropped on the upper half of the Locker's row",
		drop(held('Winch', 'Rover'), 'Rover', { item: 'Locker', edge: 'before' }),
	);
	e2e.expect(
		"#358 C5 an item dropped on a vehicle's Container row goes inside it",
		(await items('Rover')).filter((name) => name.startsWith('Winch')),
		['Winch:carried@Locker'],
	);
}

/** §#271: a drop carrying an item deleted since its drag began, or since its link was made, on an item's sheet or an inventory. */
async function deletedDrops(e2e: ScenarioContext) {
	const { gm } = e2e;
	const { drop, items } = inventorySteps(gm);
	const spear = () => gm.evaluate(() => window.inventoryE2E.sidebarItem('Spear'));
	const carried: Target = { section: 'carried', slot: 0 };
	const spearBefore = await spear();
	let errors = gm.errors.length;
	await e2e.step("#271 A1 a link to a deleted world quality dropped on a weapon's sheet", async () => {
		await gm.evaluate(() => Item.create({ name: 'E2E Ghost Quality', type: 'quality', system: { isRated: true } }));
		await gm.evaluate(() => window.inventoryE2E.dropOnItemSheet({ deleted: { sidebar: 'Ghost Quality' } }, 'Spear'));
	});
	e2e.expect(
		"#271 A1 a link to a deleted item dropped on an item's sheet does nothing, with no error in the console",
		{ spear: await spear(), errors: gm.errors.slice(errors) },
		{ spear: spearBefore, errors: [] },
	);

	const receiverBefore = await items('Receiver');
	errors = gm.errors.length;
	await e2e.step(
		"#271 A2 Sorter's Wisp dragged from its inventory row, deleted, then dropped on Receiver's Carried section",
		async () => {
			await gm.evaluate(() => window.inventoryE2E.createItems('Sorter', [{ name: 'Wisp', type: 'gear' }]));
			await e2e.settle();
			await drop({ deleted: { held: 'Wisp', by: 'Sorter' } }, 'Receiver', carried)();
		},
	);
	e2e.expect(
		"#271 A2 an inventory row's drag whose item is deleted before the drop, dropped on an inventory, does nothing, with no error in the console",
		{
			receiver: await items('Receiver'),
			wisp: (await items('Sorter')).filter((name) => name.startsWith('Wisp')),
			errors: gm.errors.slice(errors),
		},
		{ receiver: receiverBefore, wisp: [], errors: [] },
	);

	// §#254: a link carries no Genesys type, so the inventory leaves it to the sheet, whose Foundry handler logs an error
	// when the item the link names is gone.
	errors = gm.errors.length;
	await e2e.step("#271 A3 a link to a deleted world gear dropped on Receiver's Carried section", async () => {
		await gm.evaluate(() => Item.create({ name: 'E2E Ghost Gear', type: 'gear' }));
		await drop({ deleted: { sidebar: 'Ghost Gear' } }, 'Receiver', carried)();
	});
	e2e.expect(
		"#271 A3 a link to a deleted item dropped on an inventory changes nothing, and the actor's sheet logs Foundry's error in the console",
		{
			receiver: await items('Receiver'),
			errors: gm.errors.slice(errors).map((error) => /Failed to resolve Document from provided DragData/.test(error)),
		},
		{ receiver: receiverBefore, errors: [true] },
	);
}

/**
 * §#348: a damage state none of the four known gets no tooltip. A world can't load one: Foundry keeps an item whose stored
 * state fails the schema's choices out of its actor. Only its prepared data can hold one, as a module or a script may write.
 */
async function unknownDamageState(e2e: ScenarioContext) {
	const { gm } = e2e;
	await e2e.step(
		"#348 B1 Sorter's Splinter saved with the damage state wrecked, past the client's data model, then the world reloaded",
		async () => {
			await gm.evaluate(() => window.inventoryE2E.createItems('Sorter', [{ name: 'Splinter', type: 'gear' }]));
			await gm.evaluate(() => window.inventoryE2E.seedDamage('Sorter', 'Splinter', 'wrecked'));
			await gm.reload();
			await gm.evaluate(installInventoryHelpers);
		},
	);
	e2e.expect(
		'#348 B1 an item stored with an unknown damage state loads as an invalid document, which the inventory leaves out',
		{
			invalid: await gm.evaluate(() => {
				const items = game.actors.getName('E2E Sorter').items;
				return [...items.invalidDocumentIds].map((id: string) => items.getInvalid(id).name);
			}),
			items: (await gm.evaluate(() => window.inventoryE2E.items('Sorter'))).filter((name) => name.startsWith('Splinter')),
		},
		{ invalid: ['E2E Splinter'], items: [] },
	);
	e2e.log(
		'#348 B1 invalid items left on Sorter once deleted',
		await gm.evaluate(async () => {
			const sorter = game.actors.getName('E2E Sorter');
			await sorter.deleteEmbeddedDocuments('Item', [...sorter.items.invalidDocumentIds]);
			return [
				...sorter.items.invalidDocumentIds,
				...sorter._source.items
					.filter((item: { name: string }) => item.name === 'E2E Splinter')
					.map((item: { _id: string }) => item._id),
			];
		}),
	);

	let tooltips: (string | null)[] = [];
	let errors = gm.errors.length;
	await e2e.step(
		"#348 B2 Sorter's Sliver given the damage state wrecked in its prepared data, and the sheet rendered again",
		async () => {
			await gm.evaluate(() => window.inventoryE2E.createItems('Sorter', [{ name: 'Sliver', type: 'gear' }]));
			await e2e.settle();
			e2e.log('#348 B2 console errors while Sliver is created', gm.errors.slice(errors));
			errors = gm.errors.length;
			const before = (await gm.evaluate(() => window.inventoryE2E.row('Sorter', 'Sliver'))).damageState;
			await gm.evaluate(async () => {
				game.actors.getName('E2E Sorter').items.getName('E2E Sliver').system.damage = 'wrecked';
				await game.actors.getName('E2E Sorter').sheet.render();
			});
			await e2e.settle();
			tooltips = [before, (await gm.evaluate(() => window.inventoryE2E.row('Sorter', 'Sliver'))).damageState];
			await gm.evaluate(async () => {
				game.actors.getName('E2E Sorter').items.getName('E2E Sliver').reset();
				await game.actors.getName('E2E Sorter').sheet.render();
			});
		},
	);
	e2e.expect(
		"#348 B2 an item whose damage state is none of the four known shows its row's damage with no tooltip, and no error",
		{ tooltips, errors: gm.errors.slice(errors) },
		{ tooltips: ['Undamaged', null], errors: [] },
	);
}

/** §#239: the Used Equipment State is gone, a consumable saved in it loads as Carried, and a consumable's effects never apply. */
async function usedState(e2e: ScenarioContext) {
	const { gm } = e2e;
	// A world saved before #205, or a macro's write: the Used state in the database, past the client's data model, which no
	// longer accepts it.
	await e2e.step(
		"#239 N1 consumables saved in the Used state in the Items directory, on a character, on an unlinked token's actor and in a compendium, then the world reloaded",
		async () => {
			await gm.evaluate(() => window.inventoryE2E.createConsumables());
			await gm.evaluate(() => window.inventoryE2E.seedUsed());
			const errors = gm.errors.length;
			await gm.reload();
			await gm.evaluate(installInventoryHelpers);
			e2e.log('#239 N1 console errors while loading the world', gm.errors.slice(errors));
		},
	);
	const asCarried = { state: 'carried', source: 'carried', database: 'used', invalid: false };
	e2e.expect(
		'#239 N1 a consumable saved in the Used state loads as Carried with no error, while the database keeps Used until it is saved again',
		await gm.evaluate(() => window.inventoryE2E.loadedConsumables()),
		{ world: asCarried, actor: asCarried, token: asCarried, pack: asCarried },
	);
	const reason = (item: string) => `Inactive: E2E ${item} is a consumable, whose effects don't apply.`;
	e2e.expect(
		"#239 N2 a character's consumables, the one saved as Used included, list their effects as inactive, with the consumable reason",
		(await gm.evaluate(() => window.inventoryE2E.inactive('Hero'))).filter((effect) => /^(Elixir|Potion)/.test(effect)).sort(),
		[`Elixir Effect | ${reason('Elixir')}`, `Potion Effect | ${reason('Potion')}`],
	);
	e2e.expect(
		"#239 N3 an adversary's consumable still applies its effect",
		(await gm.evaluate(() => window.inventoryE2E.effects('token:Token Rival'))).applied.filter((name) => name.startsWith('Tonic')),
		['Tonic Effect'],
	);
	await e2e.step("#239 N4 Hero's Potion dropped by script", () =>
		gm.evaluate(() => window.inventoryE2E.updateItem('Hero', 'Potion', { 'system.state': 'dropped' })),
	);
	e2e.expect(
		'#239 N4 a script writing the Used state on a consumable gets Carried, in the database too, with no error',
		await gm.evaluate(() => window.inventoryE2E.writeState('Hero', 'Potion', 'used')),
		{ threw: false, state: 'carried', database: 'carried' },
	);
}
