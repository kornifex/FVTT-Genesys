/** @file Helpers the harness installs in each joined page as `window.e2e`, for scenarios to call from `client.evaluate`. */

type CombatantSetup = {
	/** The combatant's name; its actor and token are named `E2E <name>`. */
	name: string;
	type: 'character' | 'minion' | 'rival' | 'nemesis';
	disposition?: 'friendly' | 'neutral' | 'hostile';
	/** A user who owns the actor, besides the GM. */
	owner?: string;
	initiative?: number | null;
};

/**
 * What {@link PageHelpers.setUpCombat} creates.
 */
export type CombatSetup = {
	combatants: CombatantSetup[];
	/** Extra Slots, from round 1, in the order of their index. */
	extraSlots?: { name: string; initiative?: number | null }[];
	/** Starts the combat; true by default. */
	start?: boolean;
	/** Puts the turn on this slot, named as in {@link CombatState.slots} (`Hero:-1`), once the combat started. */
	turnOn?: string;
};

/**
 * The combat as a client sees it, with combatant ids replaced by names.
 */
export type CombatState = {
	started: boolean;
	round: number;
	turn: number | null;
	/** The slot whose turn it is, `<combatant>:<extra slot index>`, -1 for the combatant's own slot. */
	current: string | null;
	currentCombatant: string | null;
	/** Every slot in turn order, as `<slot>=<initiative>`. */
	slots: string[];
	/** The slots the combat tracker highlights. */
	trackerActive: string[];
	/** Turn events since the last reset. */
	events: string[];
	/** Notifications since the last reset, as `<type>: <message>`. */
	notifications: string[];
};

/**
 * A die a roll will land on: its face numbered from 1, in the order of the system's `DieFaces`, out of its face count.
 */
export type FixedDie = { face: number; faces: number };

/**
 * A yes-or-no dialog, AppV1 or ApplicationV2: the class of its application, its title and text, its buttons by action,
 * and its default one.
 */
export type ConfirmDialog = { application: string; title: string; content: string; buttons: string[]; defaultButton: string };

/**
 * An expandable description of a row as laid out (#325): its height in px, rounded, or `>cap` past the cap given, since
 * the height of a long text differs between the versions' fonts; how many px of its content it cuts off, it or its
 * content clipping; whether its last element ends inside its box; and how its height animates.
 */
export type DescriptionBox = { height: number | string; clipped: number; lastInside: boolean; transition: string };

/**
 * A Foundry document or application: untyped, as the globals of `foundry.d.ts`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the documents and applications differ between the Foundry versions the harness drives.
type Untyped = any;

/**
 * A collection of the documents a scenario sets up, which {@link PageHelpers.deleteSetUp} empties: `Token` stands for
 * the tokens of the viewed scene.
 */
type SetUpCollection = 'Token' | 'Actor' | 'Item' | 'Folder' | 'Scene' | 'JournalEntry';

type PageHelpers = {
	events: string[];
	notifications: string[];
	/** Clears the recorded turn events and notifications, and makes the dice random again. */
	reset(): void;
	/**
	 * Makes the next dice rolled in this page land on these faces, one die each in the order the roll rolls them, until
	 * the next {@link reset}. Once they run out, the dice are random again and the page logs an error.
	 */
	fixDice(dice: FixedDie[]): void;
	/** Replaces combatant ids with their names in a slot id or any other text. */
	name(text: unknown): string;
	/** The id of a combatant's slot: its own (-1) or the extra slot of that index. */
	slotId(combatant: string, extraSlot?: number): string;
	combatState(): CombatState | null;
	/** Deletes every combat and the previous setup's actors, then creates the combatants, their tokens and the combat. */
	setUpCombat(setup: CombatSetup): Promise<void>;
	/** Adds an Extra Slot for a combatant as the tracker's button does, with its token controlled. */
	addExtraSlotFor(combatant: string): Promise<void>;
	/**
	 * How long the page has done nothing, in ms: no hook called, no socket message sent or received, no socket request or
	 * fetch awaiting its answer, no CSS transition or animation running but the endless ones (0 while one does).
	 */
	idleFor(): number;

	// The scenarios' own page helpers take the helpers below out of `window.e2e`: none of them uses `this`.
	sleep: (ms: number) => Promise<void>;
	/**
	 * Resolves once the page has done nothing for 300 ms ({@link idleFor}), counted from the call, so that the work an
	 * action started has finished; after 15 s, logs an error and resolves.
	 */
	settle: () => Promise<void>;
	/** Polls `find` every 100 ms until it returns something truthy, which it returns, or throws after the timeout. */
	waitFor: <T>(what: string, find: () => T | undefined | null | false, timeout?: number) => Promise<T>;
	/** An element's text, its white space collapsed. */
	text: (element: Element | null | undefined) => string;
	/** A name without its `E2E ` prefix. */
	unprefixed: (name: string) => string;
	/** Whether a scenario set the document up: its name starts with `E2E `. */
	isSetUp: (doc: { name: string }) => boolean;
	/** An effect's duration in rounds, or null when it doesn't last a number of rounds. */
	durationRounds: (effect: { duration: Record<string, unknown> }) => number | null;
	/** The element of a window. */
	htmlOf: (app: { element?: unknown }) => HTMLElement | undefined;
	/**
	 * Renders a window unless it is rendered, and returns its element once `ready` finds in it what the window shows (its
	 * element alone by default); a window it rendered has settled.
	 */
	render: (app: Untyped, ready?: (root: HTMLElement) => unknown) => Promise<HTMLElement>;
	/** Closes the open windows of the documents set up and of the documents they hold. */
	closeSetUp: () => Promise<void>;
	/** The actor `E2E <name>`; throws when there is none. */
	actor: (name: string) => Untyped;
	/** The token of the actor `E2E <name>` on the viewed scene; throws when there is none. */
	token: (name: string) => Untyped;
	/** Targets the token of the actor `E2E <name>` alone, or no token. */
	target: (name: string | null) => void;
	/** The open applications with a CSS class, as `foundry.applications.instances` holds them. */
	apps: (cssClass: string) => Untyped[];
	/** Starts a drag on an element, which writes its drag data as the user's drag does; returns it, for {@link drop}. */
	dragStart: (element: Element) => DataTransfer;
	/**
	 * Dispatches a drop of this drag data, or of a drag's `DataTransfer`, on an element, as Foundry's drag and drop does.
	 * The data is cleared once the event has dispatched, as a browser makes a drop's data unreadable then.
	 */
	drop: (element: Element, data: object | DataTransfer) => void;
	/** Deletes the documents set up in each collection, in the order given. */
	deleteSetUp: (...collections: SetUpCollection[]) => Promise<void>;
	/** Creates and views the scene `E2E` when no scene is viewed. */
	ensureScene: () => Promise<void>;
	/** Creates a world compendium. */
	createCompendium: (metadata: { label: string; name?: string; type: string }) => Promise<Untyped>;
	/** The system settings of these keys, by key. */
	settings: (keys: string[]) => Record<string, unknown>;
	/** Sets the system settings whose value differs, in the order given. */
	setSettings: (values: Record<string, unknown>) => Promise<void>;
	/**
	 * Records the notifications from now on, as `<type>: <message>`: the function returned takes those recorded since its
	 * last call.
	 */
	recordNotifications: () => () => string[];
	/**
	 * Waits up to 2 s for a yes-or-no dialog, reads it, answers it and waits for it to close; null when none opens, as on
	 * a build that doesn't ask.
	 */
	answerConfirm: (answer: 'yes' | 'no') => Promise<ConfirmDialog | null>;
	/** The dice and symbols of a Dice Prompt's pool preview, positive then negative: `PAA|DD`. */
	poolPreview: (root: Element) => string;
	/**
	 * A Pool Modification as a sheet or a prompt shows it, its glyph then the sign of its operator icon: `S+` adds a
	 * Setback, `A^` upgrades an Ability die.
	 */
	poolModification: (element: Element, icon?: Element | null) => string;
	/** Renders the sheet of the actor `E2E <name>` unless it is, and shows its tab by its nav. */
	showTab: (name: string, tab: string) => Promise<void>;
	/**
	 * Gives an element the `active` class, or takes it away: opens or closes an expandable description that no click
	 * toggles, as in the Combat tabs.
	 */
	setActive: (element: Element, active: boolean) => void;
	/** An expandable description as laid out, its height given as `>cap` past `cap` px. */
	descriptionBox: (description: Element, cap: number) => DescriptionBox;
};

declare global {
	interface Window {
		e2e: PageHelpers;
	}
}

/**
 * Installs `window.e2e`. Playwright sends this function's source to the page, so it uses nothing from this module.
 */
export function installHelpers() {
	const combatantNamed = (name: string) => {
		const combatant = game.combat?.combatants.find((c: { name: string }) => c.name === name);
		if (!combatant) throw new Error(`No combatant named ${name}`);
		return combatant;
	};

	// The viewed scene, once the canvas drew it; a client in no-canvas mode views a scene without drawing it.
	const viewedScene = () => (game.settings.get('core', 'noCanvas') ? game.scenes.viewed : canvas.scene);

	const randomUniform = CONFIG.Dice.randomUniform;
	// The face count of the die being rolled, so that a fixed die given for another die type is caught.
	let rolling: number | undefined;
	const DiceTerm = foundry.dice.terms.DiceTerm;
	const randomFace = DiceTerm.prototype.randomFace;
	DiceTerm.prototype.randomFace = function (this: { faces: number }, ...args: unknown[]) {
		rolling = this.faces;
		try {
			return randomFace.apply(this, args);
		} finally {
			rolling = undefined;
		}
	};

	// What idleFor measures: the page's last hook, socket message or answer, and the requests awaiting their answer.
	let lastActivity = performance.now();
	let pending = 0;
	const touch = () => {
		lastActivity = performance.now();
	};

	// The notifications each recordNotifications call records.
	const recorders: string[][] = [];
	const OPERATORS: Record<string, string> = { 'fa-plus': '+', 'fa-minus': '-', 'fa-arrow-up': '^', 'fa-arrow-down': 'v' };

	const helpers: PageHelpers = {
		events: [],
		notifications: [],

		reset() {
			helpers.events.length = 0;
			helpers.notifications.length = 0;
			CONFIG.Dice.randomUniform = randomUniform;
		},

		fixDice(dice) {
			const queue = [...dice];
			CONFIG.Dice.randomUniform = () => {
				const die = queue.shift();
				if (!die) {
					console.error('e2e: no fixed die left, the roll is random');
					CONFIG.Dice.randomUniform = randomUniform;
					return randomUniform();
				}
				if (rolling !== undefined && rolling !== die.faces) {
					console.error(`e2e: a fixed die of ${die.faces} faces was given for a die of ${rolling} faces`);
				}
				// DiceTerm#mapRandomFace gives Math.ceil((1 - u) * faces): the middle of the face's interval.
				return 1 - (die.face - 0.5) / die.faces;
			};
		},

		name(text) {
			let named = String(text);
			for (const combatant of game.combat?.combatants ?? []) named = named.split(combatant.id).join(combatant.name);
			return named;
		},

		slotId(combatant, extraSlot = -1) {
			return `${combatantNamed(combatant).id}:${extraSlot}`;
		},

		combatState() {
			const combat = game.combat;
			if (!combat) return null;
			const slots: { id: string; initiative: number | null }[] = combat.slots;
			return {
				started: combat.started,
				round: combat.round,
				turn: combat.turn,
				current: combat.turn === null ? null : helpers.name(slots[combat.turn]?.id),
				currentCombatant: combat.combatant?.name ?? null,
				slots: slots.map((slot) => `${helpers.name(slot.id)}=${slot.initiative}`),
				trackerActive: [...document.querySelectorAll<HTMLElement>('#combat li.combatant.active')].map((li) =>
					helpers.name(li.dataset.slotId),
				),
				events: [...helpers.events],
				notifications: [...helpers.notifications],
			};
		},

		async setUpCombat({ combatants, extraSlots = [], start = true, turnOn }) {
			for (const combat of [...game.combats]) await combat.delete();
			await helpers.ensureScene();
			await helpers.deleteSetUp('Token', 'Actor');

			const actors = await Actor.createDocuments(
				combatants.map(({ name, type, disposition, owner }) => ({
					name: `E2E ${name}`,
					type,
					ownership: owner
						? { default: 0, [game.users.getName(owner).id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }
						: { default: 0 },
					prototypeToken: {
						actorLink: type === 'character',
						disposition:
							CONST.TOKEN_DISPOSITIONS[(disposition ?? (type === 'character' ? 'friendly' : 'hostile')).toUpperCase()],
					},
				})),
			);
			const tokens = await viewedScene().createEmbeddedDocuments(
				'Token',
				await Promise.all(
					actors.map(async (actor: { getTokenDocument(): Promise<{ toObject(): object }> }, index: number) => ({
						...(await actor.getTokenDocument()).toObject(),
						x: 100 + 200 * index,
						y: 100,
					})),
				),
			);

			// Tokens find their setup by actor, whatever order Foundry returns the created documents in.
			const setupOf = (token: { actorId: string }) =>
				combatants.find(({ name }) => `E2E ${name}` === game.actors.get(token.actorId).name)!;
			const combat = await Combat.create({ scene: viewedScene().id, active: true });
			await combat.createEmbeddedDocuments(
				'Combatant',
				tokens.map((token: { id: string; actorId: string }) => {
					const { name, initiative } = setupOf(token);
					return { tokenId: token.id, sceneId: viewedScene().id, actorId: token.actorId, name, initiative: initiative ?? null };
				}),
			);
			if (extraSlots.length) {
				await combat.setFlag(
					'genesys',
					'extraSlots',
					extraSlots.map(({ name, initiative }) => ({
						activationSource: combatantNamed(name).id,
						initiative: initiative ?? null,
						startingRound: 1,
					})),
				);
			}

			if (!start) return;
			await combat.startCombat();
			if (turnOn) {
				const turn = combat.slots.findIndex((slot: { id: string }) => helpers.name(slot.id) === turnOn);
				if (turn === -1) throw new Error(`No slot ${turnOn}`);
				await combat.update({ turn });
			}
		},

		async addExtraSlotFor(name) {
			canvas.tokens.get(combatantNamed(name).tokenId).control({ releaseOthers: true });
			await game.combat.addInitiativeSlot();
		},

		idleFor() {
			// A sheet's rows move and leave through Vue transitions: a leaving row stays in the page until its transition ends.
			const animating = document
				.getAnimations()
				.some((animation) => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity);
			if (animating) touch();
			return pending ? 0 : performance.now() - lastActivity;
		},

		sleep(ms) {
			return new Promise((resolve) => setTimeout(resolve, ms));
		},

		async settle() {
			// As long as QUIET_MS and SETTLE_TIMEOUT_MS of scenario.ts, which this page can't import.
			const [quiet, timeout] = [300, 15_000];
			const start = performance.now();
			while (Math.min(helpers.idleFor(), performance.now() - start) < quiet) {
				if (performance.now() - start > timeout) {
					console.error(`e2e: the page is still busy after ${timeout} ms`);
					return;
				}
				await helpers.sleep(50);
			}
		},

		async waitFor(what, find, timeout = 10_000) {
			const start = Date.now();
			for (;;) {
				const found = find();
				if (found) return found;
				if (Date.now() - start > timeout) throw new Error(`Timed out waiting for ${what}`);
				await helpers.sleep(100);
			}
		},

		text(element) {
			return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
		},

		unprefixed(name) {
			return name.replace(/^E2E /, '');
		},

		isSetUp(doc) {
			return doc.name.startsWith('E2E ');
		},

		durationRounds({ duration }) {
			// v13: a duration holds its rounds. From v14 on it holds a value and its units, and the legacy `rounds` it shims
			// reads null once the client prepared the duration.
			if (game.release.generation < 14) return typeof duration.rounds === 'number' ? duration.rounds : null;
			return duration.units === 'rounds' && typeof duration.value === 'number' ? duration.value : null;
		},

		htmlOf(app) {
			// An AppV1 window's element is a jQuery object.
			return app.element instanceof HTMLElement ? app.element : (app.element as HTMLElement[] | undefined)?.[0];
		},

		async render(app, ready = () => true) {
			if (!app.rendered) {
				await app.render(true);
				await helpers.settle();
			}
			return helpers.waitFor(`the window of ${app.document?.name ?? app.id}`, () => {
				const root = helpers.htmlOf(app);
				return root && ready(root) ? root : undefined;
			});
		},

		async closeSetUp() {
			for (const app of [...foundry.applications.instances.values()]) {
				const doc = app.document;
				if ((doc?.name && helpers.isSetUp(doc)) || (doc?.parent?.name && helpers.isSetUp(doc.parent))) await app.close();
			}
		},

		actor(name) {
			const found = game.actors.getName(`E2E ${name}`);
			if (!found) throw new Error(`No actor E2E ${name}`);
			return found;
		},

		token(name) {
			const token = canvas.tokens.placeables.find(
				(placeable: { actor?: { name: string } }) => placeable.actor?.name === `E2E ${name}`,
			);
			if (!token) throw new Error(`No token of E2E ${name}`);
			return token;
		},

		target(name) {
			for (const token of [...game.user.targets]) token.setTarget(false, { releaseOthers: false });
			if (name) helpers.token(name).setTarget(true, { releaseOthers: true });
		},

		apps(cssClass) {
			return [...foundry.applications.instances.values()].filter((app: { options?: { classes?: string[] } }) =>
				app.options?.classes?.includes(cssClass),
			);
		},

		dragStart(element) {
			const dataTransfer = new DataTransfer();
			element.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
			return dataTransfer;
		},

		drop(element, data) {
			const dataTransfer = data instanceof DataTransfer ? data : new DataTransfer();
			if (dataTransfer !== data) dataTransfer.setData('text/plain', JSON.stringify(data));
			element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
			dataTransfer.clearData();
		},

		async deleteSetUp(...collections) {
			const ids = (documents: { filter(test: (doc: { name: string }) => boolean): { id: string }[] }) =>
				documents.filter(helpers.isSetUp).map((doc) => doc.id);
			const deletions: Record<SetUpCollection, () => Promise<unknown>> = {
				Token: async () => viewedScene()?.deleteEmbeddedDocuments('Token', ids(viewedScene().tokens)),
				Actor: () => Actor.deleteDocuments(ids(game.actors)),
				Item: () => Item.deleteDocuments(ids(game.items)),
				Folder: () => CONFIG.Folder.documentClass.deleteDocuments(ids(game.folders)),
				Scene: () => Scene.deleteDocuments(ids(game.scenes)),
				JournalEntry: () => CONFIG.JournalEntry.documentClass.deleteDocuments(ids(game.journal)),
			};
			for (const collection of collections) await deletions[collection]();
		},

		async ensureScene() {
			if (viewedScene()) return;
			const scene = await Scene.create({ name: 'E2E', width: 2000, height: 2000 });
			await scene.activate();
			await helpers.waitFor('the scene E2E', () => viewedScene()?.id === scene.id, 60_000);
		},

		createCompendium(metadata) {
			return foundry.documents.collections.CompendiumCollection.createCompendium(metadata);
		},

		settings(keys) {
			return Object.fromEntries(keys.map((key) => [key, game.settings.get('genesys', key)]));
		},

		async setSettings(values) {
			for (const [key, value] of Object.entries(values)) {
				if (game.settings.get('genesys', key) !== value) await game.settings.set('genesys', key, value);
			}
		},

		recordNotifications() {
			const recorded: string[] = [];
			recorders.push(recorded);
			return () => recorded.splice(0);
		},

		async answerConfirm(answer) {
			const find = () =>
				document.querySelector('[data-action="yes"], [data-button="yes"]')?.closest<HTMLElement>('.application, .app');
			let dialog: HTMLElement;
			try {
				dialog = await helpers.waitFor('a confirmation dialog', find, 2000);
			} catch {
				// No dialog opened: the build under test doesn't ask, which the step's assertion reads as null.
				return null;
			}
			// An ApplicationV2 dialog names its buttons by action, an AppV1 one by button.
			const buttons = [...dialog.querySelectorAll<HTMLElement>('.form-footer [data-action], .dialog-buttons [data-button]')];
			const buttonName = (button: Element) => button.getAttribute('data-action') ?? button.getAttribute('data-button') ?? '';
			const application = foundry.applications.instances.get(dialog.id) ?? ui.windows[Number(dialog.dataset.appid)];
			const read: ConfirmDialog = {
				application:
					application instanceof foundry.applications.api.DialogV2
						? 'DialogV2'
						: application instanceof foundry.appv1.api.Dialog
							? 'Dialog'
							: String(application?.constructor.name),
				title: helpers.text(dialog.querySelector('.window-title')),
				content: helpers.text(dialog.querySelector('.dialog-content')),
				buttons: buttons.map(buttonName),
				defaultButton: buttonName(buttons.find((button) => button.matches('[autofocus], .default')) ?? document.body),
			};
			buttons.find((button) => buttonName(button) === answer)!.click();
			await helpers.waitFor('the dialog to close', () => !dialog.isConnected);
			await helpers.settle();
			return read;
		},

		poolPreview(root) {
			const pool = (side: string) => [...root.querySelectorAll(`.preview .${side} > *`)].map(helpers.text).join('');
			return `${pool('positive')}|${pool('negative')}`;
		},

		poolModification(element, icon = element.querySelector('i')) {
			const operator = Object.entries(OPERATORS).find(([name]) => icon?.classList.contains(name))?.[1] ?? '?';
			return `${helpers.text(element)}${operator}`;
		},

		async showTab(name, tab) {
			const root = await helpers.render(helpers.actor(name).sheet);
			const link = root.querySelector<HTMLElement>(`nav.sheet-tabs [data-tab="${tab}"]`);
			if (!link) throw new Error(`No ${tab} tab on the sheet of E2E ${name}`);
			link.click();
			await helpers.waitFor(`the ${tab} tab`, () => root.querySelector(`.tab[data-tab="${tab}"].active`));
		},

		setActive(element, active) {
			element.classList.toggle('active', active);
		},

		descriptionBox(description, cap) {
			const box = description.getBoundingClientRect();
			const last = [...description.querySelectorAll('*')].at(-1);
			const style = getComputedStyle(description);
			const clipped = Math.max(
				...[description, description.firstElementChild].map((element) =>
					element ? element.scrollHeight - element.clientHeight : 0,
				),
			);
			return {
				height: box.height > cap ? `>${cap}` : Math.round(box.height),
				// The two heights are rounded apart, by a pixel at most, when a box's height has a fraction.
				clipped: clipped > 1 ? clipped : 0,
				// Half a pixel of slack, for a box whose edges fall between two pixels.
				lastInside: !!last && last.getBoundingClientRect().bottom <= box.bottom + 0.5,
				transition: `${style.transitionProperty} ${style.transitionDuration}`,
			};
		},
	};

	Hooks.on('combatTurnChange', (_combat: unknown, prior: { turn: number }, current: { turn: number }) =>
		helpers.events.push(`combatTurnChange ${prior.turn}->${current.turn}`),
	);
	const combatPrototype = CONFIG.Combat.documentClass.prototype;
	for (const method of ['_onStartTurn', '_onEndTurn']) {
		const original = combatPrototype[method];
		combatPrototype[method] = function (this: unknown, combatant: { name: string } | undefined, ...rest: unknown[]) {
			helpers.events.push(`${method} ${combatant?.name}`);
			return original.call(this, combatant, ...rest);
		};
	}
	const notify = ui.notifications.notify;
	ui.notifications.notify = function (this: unknown, message: string, type = 'info', ...rest: unknown[]) {
		helpers.notifications.push(`${type}: ${message}`);
		for (const recorded of recorders) recorded.push(`${type}: ${message}`);
		return notify.call(this, message, type, ...rest);
	};

	// Every document change, render and roll calls hooks; every change reaches or leaves the page through the socket.
	for (const method of ['call', 'callAll']) {
		const original = Hooks[method];
		Hooks[method] = function (this: unknown, ...args: unknown[]) {
			touch();
			return original.apply(this, args);
		};
	}
	const emit = game.socket.emit;
	game.socket.emit = function (this: unknown, ...args: unknown[]) {
		touch();
		const answer = args.at(-1);
		if (typeof answer === 'function') {
			pending += 1;
			args[args.length - 1] = (...response: unknown[]) => {
				pending -= 1;
				touch();
				return answer(...response);
			};
		}
		return emit.apply(this, args);
	};
	game.socket.onAny(touch);
	const fetch = window.fetch.bind(window);
	window.fetch = async (...args) => {
		pending += 1;
		touch();
		try {
			return await fetch(...args);
		} finally {
			pending -= 1;
			touch();
		}
	};

	window.e2e = helpers;
}
