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
				// DiceTerm#mapRandomFace gives Math.ceil((1 - u) * faces), on v12 as on v13: the middle of the face's interval.
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
			if (!canvas.scene) {
				const scene = await Scene.create({ name: 'E2E', width: 2000, height: 2000 });
				await scene.activate();
				while (canvas.scene?.id !== scene.id) await new Promise((resolve) => setTimeout(resolve, 200));
			}

			const isSetUp = (doc: { name: string }) => doc.name.startsWith('E2E ');
			await canvas.scene.deleteEmbeddedDocuments(
				'Token',
				canvas.scene.tokens.filter(isSetUp).map((token: { id: string }) => token.id),
			);
			await Actor.deleteDocuments(game.actors.filter(isSetUp).map((actor: { id: string }) => actor.id));

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
			const tokens = await canvas.scene.createEmbeddedDocuments(
				'Token',
				await Promise.all(
					actors.map(async (actor: { getTokenDocument(): Promise<{ toObject(): object }> }, index: number) => ({
						...(await actor.getTokenDocument()).toObject(),
						x: 100 + 200 * index,
						y: 100,
					})),
				),
			);

			// v12: the created documents come back in another order than they were given, so tokens find their setup by actor.
			const setupOf = (token: { actorId: string }) =>
				combatants.find(({ name }) => `E2E ${name}` === game.actors.get(token.actorId).name)!;
			const combat = await Combat.create({ scene: canvas.scene.id, active: true });
			await combat.createEmbeddedDocuments(
				'Combatant',
				tokens.map((token: { id: string; actorId: string }) => {
					const { name, initiative } = setupOf(token);
					return { tokenId: token.id, sceneId: canvas.scene.id, actorId: token.actorId, name, initiative: initiative ?? null };
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
		return notify.call(this, message, type, ...rest);
	};

	window.e2e = helpers;
}
