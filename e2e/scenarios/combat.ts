/** @file The combat items of the test checklist (#37): the tracker, Initiative Slots, Claims, Extra Slots and initiative rolls. */
import type { ScenarioContext, StepStates } from '../scenario.ts';

// Each step is named after the checklist section it proves, `#57 A1 …` for §#57.

/**
 * A row of a client's Combat Tracker.
 */
type TrackerRow = {
	/** The slot, named as in `CombatState.slots`. */
	slot: string;
	side: string;
	claimed: boolean;
	/** The combatant the row shows, or its "Claim" button or slot label when unclaimed. */
	name: string;
	/** The initiative symbols. */
	initiative: string;
	/** The Initiative Skill button, when shown. */
	skill: string | null;
	canRoll: boolean;
};

/**
 * A chat message a client saw created.
 */
type RecordedMessage = {
	speaker: string;
	formula: string | undefined;
	sound: string | null;
};

/**
 * What the GM's client reads of the combat, as stored: names instead of ids.
 */
type StoredCombat = {
	initiatives: Record<string, number | null>;
	/** Each stored Extra Slot, as `<combatant>@<starting round>=<initiative>`. */
	extraSlots: string[];
	/** The Claims of the current round, by slot. */
	claims: Record<string, string | undefined>;
	/** The chosen Initiative Skill, by combatant. */
	skills: Record<string, string | null>;
};

type CombatHelpers = {
	/** Chat messages created since the last {@link reset}. */
	messages: RecordedMessage[];
	/** `_playCombatSound` announcements since the last {@link reset}: what a combat theme would play. */
	sounds: string[];
	/** Initiative writes since the last {@link reset}, in the order the client received them. */
	writes: string[];
	reset(): void;
	rows(): TrackerRow[];
	stored(): StoredCombat;
	/** Controls a combatant's token, alone. */
	control(combatant: string): void;
	/** Claims a slot for a combatant as the tracker does, with its token controlled. */
	claim(slot: string, claimant: string): Promise<void>;
	/** Clicks an element of a tracker row. */
	clickRow(slot: string, selector: string): void;
	/** Whether a row's context menu shows an entry. */
	menuShows(slot: string, entry: string): boolean;
	runMenuEntry(slot: string, entry: string): Promise<void>;
	/** Answers the Dice Prompts as they open: rolls or closes each one. */
	answerPrompts(answers: ('roll' | 'cancel')[]): Promise<void>;
	openPrompts(): number;
	/** The tokens highlighted while the pointer is over a tracker row. */
	hover(slot: string): string[];
	/** A refusal notification, as the client words it. */
	warning(key: string, name?: string): string;
	effectRemaining(combatant: string, effect: string): number | undefined;
	/** Gives a combatant's token actor an effect adding 1 to its melee defense, from the current turn. */
	addDefenseEffect(combatant: string, effect: string, duration: { rounds?: number; turns?: number }): Promise<void>;
	/** An effect of a combatant's token actor, found through its token: it outlives the combat. */
	expiry(combatant: string, effect: string): EffectExpiry | null;
	/** The rows of the Effects tab of a combatant's token actor. */
	effectRows(combatant: string): Promise<EffectRow[]>;
	/** Clicks the on/off toggle of an effect in the Effects tab of a combatant's token actor. */
	toggleEffect(combatant: string, effect: string): Promise<void>;
};

/**
 * Whether an effect is expired, turned off or suppressed, and the melee defense of its actor.
 */
type EffectExpiry = {
	expired: boolean;
	disabled: boolean;
	suppressed: boolean;
	meleeDefense: number;
};

/**
 * A row of an actor's Effects tab.
 */
type EffectRow = {
	section: 'temporary' | 'passive' | 'suppressed' | '?';
	name: string;
	duration: string;
};

// v12: Foundry passes the tracker's context menu entries a jQuery object.
declare const $: (element: Element) => unknown;

declare global {
	interface Window {
		combatE2E: CombatHelpers;
	}
}

/**
 * Installs `window.combatE2E`. Playwright sends this function's source to the page, so it uses nothing from this module.
 */
function installCombatHelpers() {
	if (window.combatE2E) return;
	const { settle, waitFor, unprefixed, apps } = window.e2e;
	const v13 = game.release.generation >= 13;
	const combatant = (name: string) => {
		const found = game.combat?.combatants.find((candidate: { name: string }) => candidate.name === name);
		if (!found) throw new Error(`No combatant named ${name}`);
		return found;
	};
	const slotId = (slot: string) => {
		const [name, extraSlot] = slot.split(':');
		return window.e2e.slotId(name, Number(extraSlot));
	};
	const row = (slot: string) => {
		const li = document.querySelector<HTMLElement>(`#combat li.combatant[data-slot-id="${slotId(slot)}"]`);
		if (!li) throw new Error(`No tracker row for ${slot}`);
		return li;
	};
	const menuEntry = (slot: string, name: string) => {
		const entry = ui.combat._getEntryContextOptions().find((candidate: { name: string }) => candidate.name === name);
		if (!entry) throw new Error(`No context menu entry ${name}`);
		return { entry, target: v13 ? row(slot) : $(row(slot)) };
	};
	const answered = new Set<unknown>();
	const prompts = () => apps('app-dice-prompt').filter((app: { rendered: boolean }) => app.rendered);

	const helpers: CombatHelpers = {
		messages: [],
		sounds: [],
		writes: [],

		reset() {
			helpers.messages.length = 0;
			helpers.sounds.length = 0;
			helpers.writes.length = 0;
		},

		rows() {
			return [...document.querySelectorAll<HTMLElement>('#combat li.combatant')].map((li) => ({
				slot: window.e2e.name(li.dataset.slotId),
				side: li.classList.contains('slot-pc') ? 'pc' : li.classList.contains('slot-npc') ? 'npc' : '?',
				claimed: li.classList.contains('claimed'),
				name: li.querySelector('.token-name h4, .token-name .name, [data-claim-slot], .claim-slot')?.textContent?.trim() ?? '',
				initiative: li.querySelector('.initiative')?.textContent?.trim() ?? '',
				skill: li.querySelector('.initiative-skill')?.textContent?.trim() ?? null,
				canRoll: !!li.querySelector('.combatant-control.roll'),
			}));
		},

		stored() {
			const combat = game.combat;
			const claims: Record<string, string | undefined> = {};
			for (const [id, claimantId] of Object.entries(combat.claimsForRound(combat.round))) {
				claims[window.e2e.name(id)] = window.e2e.name(claimantId);
			}
			return {
				initiatives: Object.fromEntries(
					combat.combatants.map((c: { name: string; initiative: number | null }) => [c.name, c.initiative]),
				),
				extraSlots: combat.storedExtraSlots.map(
					(slot: { activationSource: string; startingRound: number; initiative: number | null }) =>
						`${window.e2e.name(slot.activationSource)}@${slot.startingRound}=${slot.initiative}`,
				),
				claims,
				skills: Object.fromEntries(
					combat.combatants.map((c: { name: string; getFlag(scope: string, key: string): string | undefined }) => [
						c.name,
						c.getFlag('genesys', 'initiativeSkill') ?? null,
					]),
				),
			};
		},

		control(name) {
			canvas.tokens.get(combatant(name).tokenId).control({ releaseOthers: true });
		},

		async claim(slot, claimant) {
			helpers.control(claimant);
			await game.combat.claimSlotWithControlledToken(slotId(slot));
		},

		clickRow(slot, selector) {
			const element = row(slot).querySelector<HTMLElement>(selector);
			if (!element) throw new Error(`No ${selector} on the tracker row of ${slot}`);
			element.click();
		},

		menuShows(slot, name) {
			const { entry, target } = menuEntry(slot, name);
			return typeof entry.condition === 'function' ? !!entry.condition(target) : entry.condition ?? true;
		},

		async runMenuEntry(slot, name) {
			const { entry, target } = menuEntry(slot, name);
			await entry.callback(target);
		},

		async answerPrompts(answers) {
			for (const answer of answers) {
				const prompt = await waitFor(
					'a Dice Prompt',
					() =>
						prompts().find(
							(app: { element: HTMLElement }) => !answered.has(app) && app.element.querySelector('.roll-button'),
						) as { element: HTMLElement; close(): Promise<void> } | undefined,
				);
				answered.add(prompt);
				if (answer === 'roll') prompt.element.querySelector<HTMLElement>('.roll-button')!.click();
				else await prompt.close();
				await settle();
			}
		},

		openPrompts() {
			return prompts().length;
		},

		hover(slot) {
			canvas.tokens.releaseAll();
			const li = row(slot);
			li.dispatchEvent(v13 ? new PointerEvent('pointerover', { bubbles: true }) : new MouseEvent('mouseover', { bubbles: true }));
			const hovered = canvas.tokens.placeables
				.filter((token: { hover: boolean }) => token.hover)
				.map((token: { document: { name: string } }) => token.document.name);
			li.dispatchEvent(v13 ? new PointerEvent('pointerout', { bubbles: true }) : new MouseEvent('mouseout', { bubbles: true }));
			return hovered;
		},

		warning(key, name) {
			return `warning: ${name === undefined ? game.i18n.localize(key) : game.i18n.format(key, { name })}`;
		},

		effectRemaining(name, effect) {
			return combatant(name).actor.effects.getName(effect)?.duration.remaining;
		},

		async addDefenseEffect(name, effect, duration) {
			const combat = game.combat;
			await combatant(name).actor.createEmbeddedDocuments('ActiveEffect', [
				{
					name: effect,
					changes: [{ key: 'system.defense.melee', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: '1' }],
					duration: { ...duration, combat: combat.id, startRound: combat.round, startTurn: combat.turn },
				},
			]);
		},

		expiry(name, effect) {
			const actor = window.e2e.token(name).actor;
			const found = actor.effects.getName(effect);
			if (!found) return null;
			return {
				expired: found.isExpired,
				disabled: found.disabled,
				suppressed: found.isSuppressed,
				meleeDefense: actor.system.defense.melee,
			};
		},

		async effectRows(name) {
			const sheet = window.e2e.token(name).actor.sheet;
			const root = await window.e2e.render(sheet, (root) => root.querySelector('.effects-view'));
			const sections: Record<string, EffectRow['section']> = {
				[game.i18n.localize('Genesys.ActiveEffects.Temporary')]: 'temporary',
				[game.i18n.localize('Genesys.ActiveEffects.Passive')]: 'passive',
				[game.i18n.localize('Genesys.ActiveEffects.Suppressed')]: 'suppressed',
			};
			const rows = window.e2e.effectRows(root.querySelector('.effects-view')!).map((row) => ({
				section: sections[row.section] ?? '?',
				name: row.name,
				duration: row.duration,
			}));
			await sheet.close();
			return rows;
		},

		async toggleEffect(name, effect) {
			const actor = window.e2e.token(name).actor;
			const disabled = actor.effects.getName(effect).disabled;
			const sheet = actor.sheet;
			const root = await window.e2e.render(sheet, (root) => root.querySelector('.effects-view .effect'));
			const effectRow = window.e2e.effectRows(root.querySelector('.effects-view')!).find((row) => row.name === effect);
			if (!effectRow) throw new Error(`No row for ${effect} in the Effects tab of ${name}`);
			effectRow.element.querySelector<HTMLElement>('.fa-power-off')!.closest('a')!.click();
			await waitFor(`${effect} turned ${disabled ? 'on' : 'off'}`, () => actor.effects.getName(effect).disabled !== disabled);
			await settle();
			await sheet.close();
		},
	};

	Hooks.on('createChatMessage', (message: { speaker: { actor: string }; rolls: { formula: string }[]; sound: string | null }) =>
		helpers.messages.push({
			speaker: unprefixed(game.actors.get(message.speaker.actor)?.name ?? ''),
			formula: message.rolls[0]?.formula,
			sound: message.sound,
		}),
	);
	Hooks.on('updateCombatant', (updated: { name: string }, changed: object) => {
		if ('initiative' in changed) helpers.writes.push(`initiative of ${updated.name}`);
	});
	Hooks.on('updateCombat', (_combat: unknown, changed: object) => {
		if (foundry.utils.hasProperty(changed, 'flags.genesys.extraSlots')) helpers.writes.push('Extra Slots');
	});
	const combatPrototype = CONFIG.Combat.documentClass.prototype;
	const playCombatSound = combatPrototype._playCombatSound;
	combatPrototype._playCombatSound = function (this: unknown, announcement: string, ...rest: unknown[]) {
		helpers.sounds.push(announcement);
		return playCombatSound.call(this, announcement, ...rest);
	};

	window.combatE2E = helpers;
}

/**
 * The combatants every setup of this scenario picks from: player characters, a GM-run friendly rival and a hostile rival.
 */
const COMBATANTS = {
	Hero: { type: 'character', player: true },
	Ally: { type: 'character', player: true },
	Scout: { type: 'character', player: true },
	Rival: { type: 'rival', disposition: 'friendly' },
	Boss: { type: 'rival' },
} as const;

type Name = keyof typeof COMBATANTS;

// The scenario controls tokens and hovers them on the canvas.
export const needsCanvas = true;

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	const player = await e2e.player();
	const clients = () => [gm, player].filter((client) => client.connected);
	const installHelpers = () => Promise.all(clients().map((client) => client.evaluate(installCombatHelpers)));
	await installHelpers();

	const setUp = async (
		initiatives: Partial<Record<Name, number | null>>,
		{
			extraSlots = [],
			start,
			turnOn,
		}: { extraSlots?: { name: Name; initiative?: number | null }[]; start?: boolean; turnOn?: string } = {},
	) => {
		await e2e.setUpCombat({
			combatants: Object.entries(initiatives).map(([name, initiative]) => {
				const combatant = COMBATANTS[name as Name];
				return {
					name,
					type: combatant.type,
					owner: 'player' in combatant ? e2e.playerUser : undefined,
					disposition: 'disposition' in combatant ? combatant.disposition : undefined,
					initiative,
				};
			}),
			extraSlots,
			start,
			turnOn,
		});
		await Promise.all(clients().map((client) => client.evaluate(() => window.combatE2E.reset())));
	};
	// What every connected client records, by user, cleared after reading.
	const recorded = async <T>(read: () => T) => {
		const values: Record<string, T> = {};
		for (const client of clients()) {
			values[client.user] = await client.evaluate(read);
			await client.evaluate(() => window.combatE2E.reset());
		}
		return values;
	};
	const messages = async () => (await recorded(() => window.combatE2E.messages))[gm.user] ?? [];
	const stored = () => gm.evaluate(() => window.combatE2E.stored());
	const rows = async () => {
		const values: Record<string, TrackerRow[]> = {};
		for (const client of clients()) values[client.user] = await client.evaluate(() => window.combatE2E.rows());
		return values;
	};
	const bothClients = <T>(value: T) => Object.fromEntries([gm.user, e2e.playerUser].map((user) => [user, value]));
	const sides = async () =>
		Object.fromEntries(
			Object.entries(await rows()).map(([user, clientRows]) => [user, clientRows.map((row) => `${row.slot} ${row.side}`)]),
		);
	const notifications = (states: StepStates, user: string) => states[user]?.notifications ?? [];
	const warning = (key: string, name?: string) => gm.evaluate((args) => window.combatE2E.warning(args.key, args.name), { key, name });
	const errorCounts = () => new Map(clients().map((client) => [client, client.errors.length]));
	const errorsSince = (counts: Map<unknown, number>) =>
		Object.fromEntries(clients().map((client) => [client.user, client.errors.slice(counts.get(client) ?? 0)]));
	const order = (states: StepStates, user = gm.user) => states[user]?.slots.map((slot) => slot.split('=')[0]);
	const rolled = (initiatives: Record<string, number | null>) =>
		Object.fromEntries(Object.entries(initiatives).map(([name, initiative]) => [name, initiative !== null]));

	await trackerClass();
	await extraSlotKeepsTurn();
	await expiredEffects();
	await rollKeepsTurn();
	await claims();
	await claimedRows();
	await originOwnerRows();
	await initiativeSymbols();
	await slotSides();
	await poolModifications();
	await slotRolls();
	await cancelledPrompt();
	await noGM();
	await trackerGuards();

	/** §#85: the v12 tracker's class name, which Foundry names its render hook after. */
	async function trackerClass() {
		await setUp({ Hero: null, Boss: null });
		const tracker = await gm.evaluate(async () => {
			const fired = new Set<string>();
			const hooks = ['renderGenesysCombatTrackerV12', 'renderGenesysCombatTracker', 'renderCombatTracker'].map((hook) => ({
				hook,
				id: Hooks.on(hook, () => fired.add(hook)),
			}));
			await ui.combat.render(true);
			// v12: an AppV1 window renders after render() returns.
			await window.e2e.settle();
			for (const { hook, id } of hooks) Hooks.off(hook, id);
			return { className: ui.combat.constructor.name, hooks: [...fired].sort() };
		});
		e2e.expect(
			'#85 A1 the Combat Tracker class and the render hooks it fires',
			tracker,
			e2e.version >= 13
				? { className: 'GenesysCombatTracker', hooks: ['renderCombatTracker', 'renderGenesysCombatTracker'] }
				: { className: 'GenesysCombatTrackerV12', hooks: ['renderCombatTracker', 'renderGenesysCombatTrackerV12'] },
		);
	}

	/** §#57, from `extraSlotKeepsTurn.ts` (#54): adding an Extra Slot keeps the turn on its slot, with no turn events. */
	async function extraSlotKeepsTurn() {
		const addExtraSlotFor = (name: string) => () => gm.evaluate((name) => window.e2e.addExtraSlotFor(name), name);
		// #54 showed the turn on one slot and the tracker highlighting another, so both are asserted on every client.
		const turnOn = (step: string, states: StepStates, slot: string | null) =>
			e2e.expect(
				`#57 ${step} the turn is on ${slot ?? 'no slot'}`,
				Object.entries(states).map(([user, state]) => ({ user, current: state?.current, active: state?.trackerActive })),
				[gm.user, e2e.playerUser].map((user) => ({ user, current: slot, active: slot ? [slot] : [] })),
			);
		const noTurnEvent = (step: string, states: StepStates) =>
			e2e.expect(
				`#57 ${step} no turn event`,
				Object.values(states).flatMap((state) => state?.events ?? []),
				[],
			);
		const sortsAs = (step: string, states: StepStates, slots: string[]) =>
			e2e.expect(`#57 ${step} the slots sort as ${slots.join(', ')}`, order(states), slots);

		// No initiative rolled: every slot ties, so Hero's new slot sorts before Boss's, whose turn it is.
		await setUp({ Hero: undefined, Boss: undefined }, { turnOn: 'Boss:-1' });
		await e2e.step('#57 A0 before');
		const a1 = await e2e.step('#57 A1 GM adds an extra slot for Hero', addExtraSlotFor('Hero'));
		sortsAs('A1', a1, ['Hero:-1', 'Hero:0', 'Boss:-1']);
		turnOn('A1', a1, 'Boss:-1');
		noTurnEvent('A1', a1);
		// #35: the player's client orders the turns and renders its tracker without waiting for the GM's socket refresh.
		e2e.expect(
			"#35 A1 the player's tracker lists an added Extra Slot in turn order",
			{ slots: order(a1, e2e.playerUser), rows: (await rows())[e2e.playerUser]?.map((row) => row.slot) },
			{ slots: ['Hero:-1', 'Hero:0', 'Boss:-1'], rows: ['Hero:-1', 'Hero:0', 'Boss:-1'] },
		);
		const a2 = await e2e.step('#57 A2 GM adds an extra slot for Boss', addExtraSlotFor('Boss'));
		sortsAs('A2', a2, ['Hero:-1', 'Hero:0', 'Boss:-1', 'Boss:1']);
		turnOn('A2', a2, 'Boss:-1');
		noTurnEvent('A2', a2);
		// A one-turn effect on Boss, from Boss's own slot.
		await gm.evaluate(async () => {
			const combat = game.combat;
			await combat.combatant.actor.createEmbeddedDocuments('ActiveEffect', [
				{ name: 'E2E Dazed', duration: { turns: 1, combat: combat.id, startRound: combat.round, startTurn: combat.turn } },
			]);
		});
		const effectState = async () =>
			(await gm.evaluate(() => window.combatE2E.effectRemaining('Boss', 'E2E Dazed'))) ? 'running' : 'expired';
		const effectBefore = await effectState();
		const expired = () => gm.evaluate(() => window.combatE2E.expiry('Boss', 'E2E Dazed')?.expired);
		const expiredBefore = await expired();
		const a3 = await e2e.step('#57 A3 GM ends the turn', () => gm.evaluate(() => game.combat.nextTurn()));
		turnOn('A3', a3, 'Boss:1');
		// §#96: Foundry v12 sees no turn change when the turn stays with the same combatant, v13 does.
		e2e.expect(
			"#96 A1 Next Turn from Boss's own slot to its Extra Slot fires turn events on v13 only",
			Object.fromEntries(Object.entries(a3).map(([user, state]) => [user, state?.events])),
			e2e.version >= 13
				? {
						[gm.user]: ['_onEndTurn Boss', '_onStartTurn Boss', 'combatTurnChange 2->3'],
						[e2e.playerUser]: ['combatTurnChange 2->3'],
					}
				: bothClients([]),
		);
		// Foundry counts a turn-based duration from the combat's round and turn, not from the turn events.
		e2e.expect(
			"#96 A2 a one-turn effect on Boss expires from Boss's own slot to its Extra Slot on v12 and v13 alike",
			{ before: effectBefore, after: await effectState() },
			{ before: 'running', after: 'expired' },
		);
		// §#357: the Acting GM marks it expired at that same turn change, which v12 fires no turn events for.
		e2e.expect(
			"#357 A3 a one-turn effect on Boss is marked expired from Boss's own slot to its Extra Slot, as #96 A2 sees it run out",
			{ before: expiredBefore, after: await expired() },
			{ before: false, after: true },
		);

		// Initiatives rolled, Boss ahead: Hero's new slot sorts after the current one.
		await setUp({ Hero: 1, Boss: 2 }, { turnOn: 'Boss:-1' });
		await e2e.step('#57 B0 before');
		const b1 = await e2e.step('#57 B1 GM adds an extra slot for Hero', addExtraSlotFor('Hero'));
		sortsAs('B1', b1, ['Boss:-1', 'Hero:-1', 'Hero:0']);
		turnOn('B1', b1, 'Boss:-1');
		noTurnEvent('B1', b1);

		// Before the combat starts, there is no turn to keep.
		await setUp({ Hero: undefined, Boss: undefined }, { start: false });
		await e2e.step('#57 C0 before');
		const c1 = await e2e.step('#57 C1 GM adds an extra slot for Hero', addExtraSlotFor('Hero'));
		sortsAs('C1', c1, ['Hero:-1', 'Hero:0', 'Boss:-1']);
		turnOn('C1', c1, null);
		noTurnEvent('C1', c1);
		turnOn('C2', await e2e.step('#57 C2 GM starts the combat', () => gm.evaluate(() => game.combat.startCombat())), 'Hero:-1');

		await player.reload();
		await player.evaluate(installCombatHelpers);
		turnOn('C3', await e2e.step('#57 C3 player reloaded'), 'Hero:-1');
	}

	/**
	 * §#357: an effect whose duration in rounds or turns has run out stops applying, and shows as expired, until extended.
	 * Part A sits in `extraSlotKeepsTurn`, beside §#96.
	 */
	async function expiredEffects() {
		const expiry = () => gm.evaluate(() => window.combatE2E.expiry('Boss', 'E2E Guarded'));
		const effectRows = () => gm.evaluate(() => window.combatE2E.effectRows('Boss'));
		const toggle = () => gm.evaluate(() => window.combatE2E.toggleEffect('Boss', 'E2E Guarded'));
		const nextTurn = () => gm.evaluate(() => game.combat.nextTurn());
		const expiredLabel = await gm.evaluate(() => game.i18n.localize('Genesys.ActiveEffects.Expired'));
		const applying = { expired: false, disabled: false, suppressed: false, meleeDefense: 1 };
		const expired = { expired: true, disabled: false, suppressed: true, meleeDefense: 0 };

		// Hero's turn, then Boss's: a round has two turns.
		await setUp({ Hero: 2, Boss: 1 }, { turnOn: 'Hero:-1' });
		await e2e.step("#357 B0 GM gives Boss a one-round effect adding 1 to its melee defense, on Hero's turn", () =>
			gm.evaluate(() => window.combatE2E.addDefenseEffect('Boss', 'E2E Guarded', { rounds: 1 })),
		);
		e2e.expect("#357 B0 the effect adds 1 to Boss's melee defense", await expiry(), applying);

		await e2e.step("#357 B1 GM ends Hero's turn", nextTurn);
		e2e.expect('#357 B1 the effect still applies during its round', await expiry(), applying);

		await e2e.step("#357 B2 GM ends Boss's turn, starting round 2", nextTurn);
		e2e.expect('#357 B2 the one-round effect stops applying at the start of round 2', await expiry(), expired);
		e2e.expect('#357 B2 the expired effect is listed under Suppressed, with "Expired" as its duration', await effectRows(), [
			{ section: 'suppressed', name: 'E2E Guarded', duration: expiredLabel },
		]);

		await e2e.step('#357 B3 GM turns the expired effect off, then on, with its toggle', async () => {
			await toggle();
			await toggle();
		});
		e2e.expect("#357 B3 turning an expired effect on doesn't make it apply", await expiry(), expired);

		await e2e.step('#357 B4 GM extends the effect by one round, from round 2', () =>
			gm.evaluate(() => window.e2e.token('Boss').actor.effects.getName('E2E Guarded').update({ 'duration.rounds': 2 })),
		);
		e2e.expect(
			'#357 B4 the extended effect applies again, as a temporary effect',
			{ expiry: await expiry(), sections: (await effectRows()).map((row) => row.section) },
			{ expiry: applying, sections: ['temporary'] },
		);

		await e2e.step('#357 B5 GM turns the running effect off with its toggle', toggle);
		e2e.expect('#357 B5 turning a running effect off suppresses it', await expiry(), {
			expired: false,
			disabled: true,
			suppressed: true,
			meleeDefense: 0,
		});
		await e2e.step('#357 B6 GM turns it on again', toggle);
		e2e.expect('#357 B6 turning it on again makes it apply', await expiry(), applying);

		await e2e.step("#357 B7 GM ends Hero's turn in round 2", nextTurn);
		e2e.expect('#357 B7 the extended effect still applies during its last round', await expiry(), applying);
		await e2e.step("#357 B8 GM ends Boss's turn, starting round 3", nextTurn);
		e2e.expect('#357 B8 the extended effect expires again once its last round is over', await expiry(), expired);

		await e2e.step('#357 B9 GM deletes the combat', () => gm.evaluate(() => game.combat.delete()));
		e2e.expect(
			'#357 B9 the expired effect stays suppressed, and listed as expired, once the combat is deleted',
			{ expiry: await expiry(), rows: await effectRows() },
			{ expiry: expired, rows: [{ section: 'suppressed', name: 'E2E Guarded', duration: expiredLabel }] },
		);

		// Only the Acting GM marks an effect expired: with no GM online, nobody does; the next turn change with one does.
		await setUp({ Hero: 2, Boss: 1 }, { turnOn: 'Hero:-1' });
		await gm.evaluate(() => window.combatE2E.addDefenseEffect('Boss', 'E2E Guarded', { turns: 1 }));
		await e2e.step('#357 C0 GM leaves', () => gm.leave());
		const errors = errorCounts();
		await e2e.step("#357 C1 player ends Hero's turn, with no GM online", () => player.evaluate(() => game.combat.nextTurn()));
		e2e.expect('#357 C1 with no GM online, the turn change throws nothing', errorsSince(errors), { [e2e.playerUser]: [] });
		await e2e.step('#357 C2 GM joins again', async () => {
			await gm.join();
			await gm.evaluate(installCombatHelpers);
		});
		e2e.expect('#357 C2 with no GM online, the run-out effect was left unmarked, and still applies', await expiry(), applying);
		await e2e.step("#357 C3 GM ends Boss's turn, starting round 2", nextTurn);
		e2e.expect('#357 C3 the next turn change with a GM online marks the effect expired', await expiry(), expired);
	}

	/** §#59, from `rollKeepsTurn.ts` (#58): a roll that moves a slot before the current one keeps the turn, with no turn events. */
	async function rollKeepsTurn() {
		// Hero (the player's) and Boss, with an extra slot each: Hero:0, then Boss:1.
		const setUpRolls = async (initiatives: Record<'Hero:-1' | 'Hero:0' | 'Boss:-1' | 'Boss:1', number | null>, turnOn: string) => {
			await setUp(
				{ Hero: initiatives['Hero:-1'], Boss: initiatives['Boss:-1'] },
				{
					extraSlots: [
						{ name: 'Hero', initiative: initiatives['Hero:0'] },
						{ name: 'Boss', initiative: initiatives['Boss:1'] },
					],
					turnOn,
				},
			);
			// A turn-based effect on the combatant whose turn it is, which turn events would tick.
			await gm.evaluate(async () => {
				const combat = game.combat;
				await combat.combatant.actor.createEmbeddedDocuments('ActiveEffect', [
					{
						name: 'E2E Dazed',
						duration: { rounds: 1, combat: combat.id, startRound: combat.round, startTurn: combat.turn },
					},
				]);
			});
		};
		const gmRolls = (combatant: string, extraSlot: number) => () =>
			gm.evaluate((slot) => game.combat.rollSlotsInitiative([window.e2e.slotId(slot.combatant, slot.extraSlot)]), {
				combatant,
				extraSlot,
			});
		// #58: the turn moved on the client that wrote the roll and stayed on the others, so every client is asserted.
		const turnKept = (step: string, states: StepStates, slot: string) =>
			e2e.expect(
				`#59 ${step} the turn stays on ${slot}, with no turn event`,
				Object.entries(states).map(([user, state]) => ({
					user,
					current: state?.current,
					active: state?.trackerActive,
					events: state?.events,
				})),
				[gm.user, e2e.playerUser].map((user) => ({ user, current: slot, active: [slot], events: [] })),
			);
		const sortsAs = (step: string, states: StepStates, slots: string[]) =>
			e2e.expect(`#59 ${step} the slots sort as ${slots.join(', ')}`, order(states), slots);
		// The combat sounds a theme would play, and the remaining duration of the turn-based effect.
		const noTick = async (step: string, combatant: string) => {
			const sounds = await recorded(() => window.combatE2E.sounds);
			if (e2e.version >= 13) {
				e2e.expect(`#59 ${step} no combat sound`, sounds, bothClients([]));
			} else {
				// v12: Foundry plays "your turn" again on any update of the combat while it's the player's turn, whatever the system.
				e2e.log(`#59 ${step} combat sounds`, sounds);
			}
			// Foundry counts a turn-based duration from the turn's index, which a reorder moves even when the turn stays on its slot.
			e2e.log(
				`#59 ${step} remaining duration of the effect on ${combatant}`,
				await gm.evaluate((name) => window.combatE2E.effectRemaining(name, 'E2E Dazed'), combatant),
			);
		};

		// The GM rolls Boss's extra slot, which moves before Hero's own slot, whose turn it is.
		await setUpRolls({ 'Hero:-1': -50, 'Hero:0': null, 'Boss:-1': 50, 'Boss:1': null }, 'Hero:-1');
		await e2e.step('#59 A0 before');
		await noTick('A0', 'Hero');
		const a1 = await e2e.step("#59 A1 GM rolls Boss's extra slot", gmRolls('Boss', 1));
		sortsAs('A1', a1, ['Boss:-1', 'Boss:1', 'Hero:-1', 'Hero:0']);
		turnKept('A1', a1, 'Hero:-1');
		await noTick('A1', 'Hero');

		// The GM rolls Boss's own slot, which moves before Hero's extra slot, whose turn it is.
		await setUpRolls({ 'Hero:-1': -50, 'Hero:0': null, 'Boss:-1': null, 'Boss:1': 50 }, 'Hero:0');
		await e2e.step('#59 B0 before');
		const b1 = await e2e.step("#59 B1 GM rolls Boss's own slot", gmRolls('Boss', -1));
		sortsAs('B1', b1, ['Boss:1', 'Boss:-1', 'Hero:-1', 'Hero:0']);
		turnKept('B1', b1, 'Hero:0');
		await noTick('B1', 'Hero');

		// The player rolls all of Hero's slots, which move before Boss's extra slot, whose turn it is; the GM writes them.
		await setUpRolls({ 'Hero:-1': null, 'Hero:0': null, 'Boss:-1': -50, 'Boss:1': -50 }, 'Boss:1');
		await e2e.step('#59 C0 before');
		await noTick('C0', 'Boss');
		const c1 = await e2e.step("#59 C1 player rolls all of Hero's slots", () => player.evaluate(() => game.combat.rollAll()));
		sortsAs('C1', c1, ['Hero:-1', 'Hero:0', 'Boss:-1', 'Boss:1']);
		turnKept('C1', c1, 'Boss:1');
		e2e.expect(
			"#59 C1 the player's own initiative is written before the GM writes their Extra Slot",
			(await recorded(() => window.combatE2E.writes))[gm.user],
			['initiative of Hero', 'Extra Slots'],
		);
		await noTick('C1', 'Boss');

		// The turn the server stored, as a client that just joined sees it.
		await player.reload();
		await player.evaluate(installCombatHelpers);
		turnKept('C2', await e2e.step('#59 C2 player reloaded'), 'Boss:1');

		// The GM rolls the NPCs, whose slots move before Hero's own slot, whose turn it is.
		await setUpRolls({ 'Hero:-1': -50, 'Hero:0': -50, 'Boss:-1': null, 'Boss:1': null }, 'Hero:-1');
		await e2e.step('#59 D0 before');
		const d1 = await e2e.step('#59 D1 GM rolls the NPCs', () => gm.evaluate(() => game.combat.rollNPC()));
		sortsAs('D1', d1, ['Boss:-1', 'Boss:1', 'Hero:-1', 'Hero:0']);
		turnKept('D1', d1, 'Hero:-1');
		await noTick('D1', 'Hero');
	}

	/** §#35 and §#94: Claims, their refusals, revoking one, and a player ending their turn. */
	async function claims() {
		await setUp({ Hero: 3, Boss: 2, Ally: null }, { start: false });
		const revokeShown = async () => {
			const shown: Record<string, Record<string, boolean>> = {};
			for (const client of clients()) {
				shown[client.user] = await client.evaluate(() =>
					Object.fromEntries(
						window.combatE2E
							.rows()
							.map((row) => [row.slot, window.combatE2E.menuShows(row.slot, 'Genesys.CombatTracker.RevokeInitiativeClaim')]),
					),
				);
			}
			return shown;
		};
		e2e.expect(
			'#35 A2 before the start, no row offers to revoke a Claim',
			await revokeShown(),
			bothClients({ 'Hero:-1': false, 'Boss:-1': false, 'Ally:-1': false }),
		);
		await e2e.step('#35 GM starts the combat', () => gm.evaluate(() => game.combat.startCombat()));

		// Claims stored by position in the turn order, before #35, are no longer read.
		await e2e.step('#35 GM stores Claims in the former flag', () =>
			gm.evaluate(() =>
				game.combat.setFlag('genesys', 'claimants', {
					1: { 0: window.e2e.slotId('Hero').split(':')[0], 2: window.e2e.slotId('Ally').split(':')[0] },
				}),
			),
		);
		e2e.expect(
			'#35 A3 Claims of the former flag claim no slot and use no activation',
			{
				claims: (await stored()).claims,
				rows: (await rows())[gm.user]?.filter((row) => row.claimed).map((row) => row.slot),
				refusal: await gm.evaluate(() =>
					game.combat.claimRefusal(1, window.e2e.slotId('Hero'), game.combat.combatants.getName('Hero')),
				),
			},
			{ claims: {}, rows: [], refusal: undefined },
		);

		const claim = await e2e.step("#35 player claims Hero's slot from the tracker, with Hero's token controlled", () =>
			player.evaluate(() => {
				window.combatE2E.control('Hero');
				window.combatE2E.clickRow('Hero:-1', '[data-claim-slot], .claim-slot');
			}),
		);
		e2e.expect(
			"#35 A4 Hero claims Hero's slot",
			{
				claims: (await stored()).claims,
				rows: Object.fromEntries(
					Object.entries(await rows()).map(([user, clientRows]) => [
						user,
						clientRows.filter((row) => row.claimed).map((row) => `${row.slot} ${row.name}`),
					]),
				),
				notifications: notifications(claim, e2e.playerUser),
			},
			{ claims: { 'Hero:-1': 'Hero' }, rows: bothClients(['Hero:-1 Hero']), notifications: [] },
		);

		// Each refused claim, with the code of its assertion.
		const refusals: [string, string, string, string, string][] = [
			['A5', "player claims Boss's slot for Hero", 'Boss:-1', 'Hero', 'Genesys.Notifications.CannotClaimOppositeSlot'],
			['A6', "player claims Hero's claimed slot for Ally", 'Hero:-1', 'Ally', 'Genesys.Notifications.SlotAlreadyClaimed'],
			[
				'A7',
				"player claims Ally's slot for Hero, who has no activation left",
				'Ally:-1',
				'Hero',
				'Genesys.Notifications.CombatantHasNoActivationLeft',
			],
		];
		for (const [code, claim, slot, claimant, refusal] of refusals) {
			const states = await e2e.step(`#35 ${claim}`, () =>
				player.evaluate((args) => window.combatE2E.claim(args.slot, args.claimant), { slot, claimant }),
			);
			e2e.expect(
				`#35 ${code} ${claim}: refused`,
				{ claims: (await stored()).claims, notifications: notifications(states, e2e.playerUser) },
				{ claims: { 'Hero:-1': 'Hero' }, notifications: [await warning(refusal, claimant)] },
			);
		}

		await e2e.step("#35 GM claims Boss's slot for Boss", () => gm.evaluate(() => window.combatE2E.claim('Boss:-1', 'Boss')));
		e2e.expect('#35 A8 once the combat started, only the GM is offered to revoke a Claim, on claimed rows', await revokeShown(), {
			[gm.user]: { 'Hero:-1': true, 'Boss:-1': true, 'Ally:-1': false },
			[e2e.playerUser]: { 'Hero:-1': false, 'Boss:-1': false, 'Ally:-1': false },
		});
		// §#94: hovering a claimed row highlights the claimant's token; an unclaimed row highlights none.
		e2e.expect(
			'#94 A1 hovering a claimed row highlights its token, an unclaimed row none',
			await gm.evaluate(() => ({ claimed: window.combatE2E.hover('Hero:-1'), unclaimed: window.combatE2E.hover('Ally:-1') })),
			{ claimed: ['E2E Hero'], unclaimed: [] },
		);

		e2e.expect("#35 the player controls Hero's turn", await player.evaluate(() => game.combat.userControlsTurn), true);
		const ended = await e2e.step("#35 player ends Hero's turn", () => player.evaluate(() => game.combat.nextTurn()));
		e2e.expect(
			"#35 A9 the turn goes on to Boss's slot",
			Object.fromEntries(Object.entries(ended).map(([user, state]) => [user, state?.current])),
			bothClients('Boss:-1'),
		);

		await e2e.step("#35 GM revokes Boss's Claim from the tracker's menu", () =>
			gm.evaluate(() => window.combatE2E.runMenuEntry('Boss:-1', 'Genesys.CombatTracker.RevokeInitiativeClaim')),
		);
		e2e.expect("#35 A10 Boss's Claim is revoked", (await stored()).claims, { 'Hero:-1': 'Hero' });

		const roll = await e2e.step("#35 player rolls Ally's unclaimed slot from the tracker", () =>
			player.evaluate(async () => {
				window.combatE2E.clickRow('Ally:-1', '.combatant-control.roll');
				await window.combatE2E.answerPrompts(['roll']);
			}),
		);
		e2e.expect(
			"#35 A11 Ally's slot is rolled, and the turn stays on Boss's slot",
			{
				rolled: rolled((await stored()).initiatives),
				speakers: (await messages()).map((message) => message.speaker),
				current: roll[gm.user]?.current,
			},
			{ rolled: { Hero: true, Boss: true, Ally: true }, speakers: ['Ally'], current: 'Boss:-1' },
		);
	}

	/** §#38: rolling a claimed slot, or switching its Initiative Skill, acts on the slot's origin, not on its claimant. */
	async function claimedRows() {
		await setUp({ Hero: null, Ally: null, Scout: null, Boss: null }, { extraSlots: [{ name: 'Ally' }] });
		await e2e.step("#38 player claims Ally's own slot for Hero and Ally's Extra Slot for Scout", () =>
			player.evaluate(async () => {
				await window.combatE2E.claim('Ally:-1', 'Hero');
				await window.combatE2E.claim('Ally:0', 'Scout');
			}),
		);
		e2e.expect('#38 A1 Hero and Scout claim the slots of Ally', (await stored()).claims, { 'Ally:-1': 'Hero', 'Ally:0': 'Scout' });

		await e2e.step('#38 player rolls the row Hero claimed', () =>
			player.evaluate(async () => {
				window.combatE2E.clickRow('Ally:-1', '.combatant-control.roll');
				await window.combatE2E.answerPrompts(['roll']);
			}),
		);
		e2e.expect(
			'#38 A2 rolling the row Hero claimed rolls Ally, as the speaker',
			{ rolled: rolled((await stored()).initiatives), speakers: (await messages()).map((message) => message.speaker) },
			{ rolled: { Hero: false, Ally: true, Scout: false, Boss: false }, speakers: ['Ally'] },
		);

		// §#35: with no Initiative Skill chosen, a combatant rolls Vigilance.
		e2e.expect(
			'#35 A12 the row of a combatant with no Initiative Skill chosen shows Vigilance',
			Object.fromEntries(
				Object.entries(await rows()).map(([user, clientRows]) => [user, clientRows.find((row) => row.slot === 'Ally:0')?.skill]),
			),
			bothClients('Vigilance'),
		);
		await e2e.step('#38 player switches the Initiative Skill of the row Scout claimed', () =>
			player.evaluate(() => window.combatE2E.clickRow('Ally:0', '.initiative-skill')),
		);
		e2e.expect(
			"#38 A3 switching the Initiative Skill of the row Scout claimed switches Ally's",
			{
				skills: (await stored()).skills,
				rows: Object.fromEntries(
					Object.entries(await rows()).map(([user, clientRows]) => [
						user,
						clientRows.find((row) => row.slot === 'Ally:0')?.skill,
					]),
				),
			},
			{ skills: { Hero: null, Ally: 'Cool', Scout: null, Boss: null }, rows: bothClients('Cool') },
		);

		await e2e.step('#38 GM rolls the row Scout claimed', () =>
			gm.evaluate(async () => {
				window.combatE2E.clickRow('Ally:0', '.combatant-control.roll');
				await window.combatE2E.answerPrompts(['roll']);
			}),
		);
		const extraRoll = await stored();
		e2e.expect(
			"#38 A4 rolling the row Scout claimed rolls Ally's Extra Slot, as the speaker",
			{
				rolled: rolled(extraRoll.initiatives),
				extraSlotRolled: !extraRoll.extraSlots[0].endsWith('=null'),
				speakers: (await messages()).map((message) => message.speaker),
			},
			{ rolled: { Hero: false, Ally: true, Scout: false, Boss: false }, extraSlotRolled: true, speakers: ['Ally'] },
		);

		await e2e.step("#38 GM rerolls the row Hero claimed from the tracker's menu", () =>
			gm.evaluate(async () => {
				const reroll = window.combatE2E.runMenuEntry('Ally:-1', 'COMBAT.CombatantReroll');
				await window.combatE2E.answerPrompts(['roll']);
				await reroll;
			}),
		);
		const reroll = await stored();
		e2e.expect(
			'#38 A5 rerolling the row Hero claimed rerolls Ally, as the speaker',
			{
				rolled: rolled(reroll.initiatives),
				extraSlot: reroll.extraSlots[0],
				speakers: (await messages()).map((message) => message.speaker),
			},
			{ rolled: { Hero: false, Ally: true, Scout: false, Boss: false }, extraSlot: extraRoll.extraSlots[0], speakers: ['Ally'] },
		);
	}

	/** §#38: the roll and Initiative Skill buttons of a row show for the owners of its slot's origin, not of its claimant. */
	async function originOwnerRows() {
		await setUp({ Hero: null, Ally: null });
		// Ally keeps a player owner, so that its slot stays a PC slot Hero can claim, but not the player of the scenario.
		await e2e.step("#38 GM gives Ally to another player, then claims Ally's slot for Hero and Hero's slot for Ally", () =>
			gm.evaluate(async (playerUser) => {
				const { OWNER, NONE } = CONST.DOCUMENT_OWNERSHIP_LEVELS;
				const other = game.users.getName('E2E Other') ?? (await User.create({ name: 'E2E Other', role: CONST.USER_ROLES.PLAYER }));
				await game.actors
					.getName('E2E Ally')
					.update({ [`ownership.${game.users.getName(playerUser).id}`]: NONE, [`ownership.${other.id}`]: OWNER });
				await window.combatE2E.claim('Ally:-1', 'Hero');
				await window.combatE2E.claim('Hero:-1', 'Ally');
			}, e2e.playerUser),
		);
		const buttons = Object.fromEntries(
			Object.entries(await rows()).map(([user, clientRows]) => [
				user,
				Object.fromEntries(clientRows.map((row) => [row.slot, { claimed: row.claimed, roll: row.canRoll, skill: row.skill }])),
			]),
		);
		e2e.expect(
			"#38 A6 a player sees the roll and Initiative Skill buttons on the row of the slot they own, claimed by another player's combatant, not on the row their own combatant claimed",
			{ claims: (await stored()).claims, buttons },
			{
				claims: { 'Ally:-1': 'Hero', 'Hero:-1': 'Ally' },
				buttons: {
					[gm.user]: {
						'Hero:-1': { claimed: true, roll: true, skill: 'Vigilance' },
						'Ally:-1': { claimed: true, roll: true, skill: 'Vigilance' },
					},
					[e2e.playerUser]: {
						'Hero:-1': { claimed: true, roll: true, skill: 'Vigilance' },
						'Ally:-1': { claimed: true, roll: false, skill: null },
					},
				},
			},
		);
		await gm.evaluate(() => game.users.getName('E2E Other')?.delete());
	}

	/** §#35: the trackers show an initiative as its Successes and Advantage, decoded from the stored value. */
	async function initiativeSymbols() {
		// 2 Successes and 3 Advantage; Advantage alone; none left, as a check with leftover Failures and Threats stores it.
		await setUp({ Hero: 2.03, Ally: 0.02, Boss: 0 });
		e2e.expect(
			'#35 A13 the trackers show the Successes and Advantage of each initiative',
			Object.fromEntries(
				Object.entries(await rows()).map(([user, clientRows]) => [
					user,
					Object.fromEntries(clientRows.map((row) => [row.slot, row.initiative])),
				]),
			),
			bothClients({ 'Hero:-1': 'ssaaa', 'Ally:-1': 'aa', 'Boss:-1': '' }),
		);
	}

	/** §#190: a slot's side comes from the player ownership of the combatant's actor, not from its token's disposition. */
	async function slotSides() {
		await setUp({ Hero: 1, Ally: 1, Rival: 1, Boss: 1 });
		const expectSides = async (name: string, expected: Record<string, string>) => {
			const bySlot = await sides();
			e2e.expect(
				name,
				Object.fromEntries(
					Object.entries(bySlot).map(([user, slots]) => [user, Object.fromEntries(slots.map((slot) => slot.split(' ')))]),
				),
				bothClients(expected),
			);
		};
		await expectSides('#190 A1 the PCs give PC slots, a GM-run friendly rival and a hostile rival NPC slots', {
			'Hero:-1': 'pc',
			'Ally:-1': 'pc',
			'Rival:-1': 'npc',
			'Boss:-1': 'npc',
		});
		e2e.expect(
			'#190 A2 on an initiative tie, PC slots go first',
			Object.fromEntries(Object.entries(await sides()).map(([user, slots]) => [user, slots.map((slot) => slot.split(' ')[1])])),
			bothClients(['pc', 'pc', 'npc', 'npc']),
		);

		const refused = await e2e.step("#190 player claims the friendly rival's slot for Hero", () =>
			player.evaluate(() => window.combatE2E.claim('Rival:-1', 'Hero')),
		);
		e2e.expect(
			"#190 A3 Hero can't claim the friendly rival's slot",
			{ claims: (await stored()).claims, notifications: notifications(refused, e2e.playerUser) },
			{ claims: {}, notifications: [await warning('Genesys.Notifications.CannotClaimOppositeSlot', 'Hero')] },
		);

		await e2e.step("#190 GM turns Hero's token hostile", () =>
			gm.evaluate(() =>
				canvas.tokens
					.get(game.combat.combatants.getName('Hero').tokenId)
					.document.update({ disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE }),
			),
		);
		await expectSides("#190 A4 Hero's hostile token still gives a PC slot", {
			'Hero:-1': 'pc',
			'Ally:-1': 'pc',
			'Rival:-1': 'npc',
			'Boss:-1': 'npc',
		});
		const claimed = await e2e.step("#190 player claims the hostile Hero's slot for Ally", () =>
			player.evaluate(() => window.combatE2E.claim('Hero:-1', 'Ally')),
		);
		e2e.expect(
			"#190 A5 Ally claims the hostile Hero's slot",
			{ claims: (await stored()).claims, notifications: notifications(claimed, e2e.playerUser) },
			{ claims: { 'Hero:-1': 'Ally' }, notifications: [] },
		);

		await e2e.step('#190 GM takes Ally from the player and gives them the rival', () =>
			gm.evaluate(async (playerUser) => {
				const playerId = game.users.getName(playerUser).id;
				const { OWNER, NONE } = CONST.DOCUMENT_OWNERSHIP_LEVELS;
				await game.actors.getName('E2E Ally').update({ [`ownership.${playerId}`]: NONE });
				await game.actors.getName('E2E Rival').update({ [`ownership.${playerId}`]: OWNER });
			}, e2e.playerUser),
		);
		await expectSides('#190 A6 a change of player ownership moves the slots to the other side', {
			'Hero:-1': 'pc',
			'Ally:-1': 'npc',
			'Rival:-1': 'pc',
			'Boss:-1': 'npc',
		});

		await e2e.step('#190 GM adds a vehicle the player owns to the combat', () =>
			gm.evaluate(async (playerUser) => {
				const [vehicle] = await Actor.createDocuments([
					{
						name: 'E2E Rig',
						type: 'vehicle',
						ownership: { default: 0, [game.users.getName(playerUser).id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
					},
				]);
				const [token] = await canvas.scene.createEmbeddedDocuments('Token', [
					{ ...(await vehicle.getTokenDocument()).toObject(), x: 1100, y: 100 },
				]);
				await game.combat.createEmbeddedDocuments('Combatant', [
					{ tokenId: token.id, sceneId: canvas.scene.id, actorId: vehicle.id, name: 'Rig', initiative: 1 },
				]);
			}, e2e.playerUser),
		);
		e2e.expect(
			'#190 A7 a vehicle the player owns gives a PC slot',
			Object.fromEntries(Object.entries(await sides()).map(([user, slots]) => [user, slots.find((slot) => slot.startsWith('Rig:'))])),
			bothClients('Rig:-1 pc'),
		);
	}

	/** §#50: unprompted initiative rolls apply the Pool Modifications as a prompted roll does. */
	async function poolModifications() {
		await setUp({ Hero: null, Boss: null });
		// Hero rolls Cool, with an effect on Cool; Boss rolls Vigilance, with an effect on Vigilance.
		await gm.evaluate(async () => {
			const effect = (skill: string) => ({
				name: 'E2E Focus',
				changes: [{ key: `genesys.pool.skill.self.${skill}`, mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, value: 'B' }],
			});
			const hero = game.combat.combatants.getName('Hero');
			await hero.setFlag('genesys', 'initiativeSkill', 'Cool');
			await hero.actor.createEmbeddedDocuments('ActiveEffect', [effect('Cool')]);
			await game.combat.combatants.getName('Boss').actor.createEmbeddedDocuments('ActiveEffect', [effect('Vigilance')]);
		});
		const autoApply = (on: boolean) => gm.evaluate((on) => game.settings.set('genesys', 'dicePoolAutoApplyModifications', on), on);
		const resetAll = () => gm.evaluate(() => game.combat.resetAll());
		const formulas = async () => Object.fromEntries((await messages()).map((message) => [message.speaker, message.formula ?? '']));
		const promptedFormula = async (step: string) => {
			await resetAll();
			await e2e.step(step, () =>
				gm.evaluate(async () => {
					const roll = game.combat.rollSlotInitiative(window.e2e.slotId('Hero'));
					await window.combatE2E.answerPrompts(['roll']);
					await roll;
				}),
			);
			return (await formulas()).Hero;
		};

		await autoApply(true);
		await resetAll();
		await e2e.step('#50 GM rolls all, with auto-apply on', () => gm.evaluate(() => game.combat.rollAll()));
		const rollAllOn = await formulas();
		const promptedOn = await promptedFormula("#50 GM rolls Hero's slot from the Dice Prompt, with auto-apply on");
		await resetAll();
		await e2e.step('#50 GM rolls the NPCs, with auto-apply on', () => gm.evaluate(() => game.combat.rollNPC()));
		const rollNPCOn = await formulas();
		await resetAll();
		await e2e.step("#50 GM rolls Hero's initiative from the actor, with auto-apply on", () =>
			gm.evaluate(() => game.actors.getName('E2E Hero').rollInitiative()),
		);
		const actorOn = await formulas();
		await resetAll();
		await e2e.step("#50 GM rolls Hero's initiative from the combatant", () =>
			gm.evaluate(() => game.combat.combatants.getName('Hero').rollInitiative()),
		);
		const combatantRoll = { formulas: await formulas(), rolled: rolled((await stored()).initiatives) };

		await autoApply(false);
		await resetAll();
		await e2e.step('#50 GM rolls all, with auto-apply off', () => gm.evaluate(() => game.combat.rollAll()));
		const rollAllOff = await formulas();
		const promptedOff = await promptedFormula("#50 GM rolls Hero's slot from the Dice Prompt, with auto-apply off");

		e2e.log('#50 the pools rolled', { rollAllOn, promptedOn, rollNPCOn, actorOn, combatantRoll, rollAllOff, promptedOff });
		e2e.expect(
			'#50 A1 with auto-apply on, every unprompted roll rolls the pool of a prompted roll, with the Boost of the effects',
			{ rollAll: rollAllOn.Hero, rollNPC: rollNPCOn.Boss, actor: actorOn.Hero, effectAdds: rollAllOn.Hero !== rollAllOff.Hero },
			{ rollAll: promptedOn, rollNPC: rollAllOn.Boss, actor: promptedOn, effectAdds: true },
		);
		e2e.expect('#50 A2 with auto-apply off, Roll All rolls the pool of a prompted roll', rollAllOff.Hero, promptedOff);
		e2e.expect("#50 A3 a combatant's initiative roll posts a message and writes its slot as the combat's roll does", combatantRoll, {
			formulas: { Hero: rollAllOn.Hero },
			rolled: { Hero: true, Boss: false },
		});
	}

	/** §#53: rolls land in their own slots, and going back and forth between rounds keeps the tracker and the turn. */
	async function slotRolls() {
		await setUp({ Hero: null, Boss: null });
		// A turn-based effect from round 1, still running in round 2.
		await gm.evaluate(async () => {
			const combat = game.combat;
			await combat.combatants
				.getName('Boss')
				.actor.createEmbeddedDocuments('ActiveEffect', [
					{ name: 'E2E Dazed', duration: { rounds: 2, combat: combat.id, startRound: 1, startTurn: 0 } },
				]);
		});
		const remaining = () => gm.evaluate(() => window.combatE2E.effectRemaining('Boss', 'E2E Dazed'));
		// The round the clients show after a step: its slots, whether the turn is on one of them, the trackers' rows and
		// the errors since the step began.
		const roundView = async (states: StepStates, counts: Map<unknown, number>) => {
			const slots = order(states) ?? [];
			return {
				round: states[gm.user]?.round,
				slots,
				turnOnASlot: Object.fromEntries(
					Object.entries(states).map(([user, state]) => [user, !!state?.current && slots.includes(state.current)]),
				),
				rows: Object.fromEntries(
					Object.entries(await rows()).map(([user, clientRows]) => [user, clientRows.map((row) => row.slot)]),
				),
				errors: errorsSince(counts),
			};
		};

		await e2e.step('#53 GM goes on to round 2', () => gm.evaluate(() => game.combat.nextRound()));
		await e2e.step('#53 GM adds an extra slot for Boss in round 2', () => gm.evaluate(() => window.e2e.addExtraSlotFor('Boss')));
		const remainingInRound2 = await remaining();
		let counts = errorCounts();
		const back = await e2e.step('#53 GM goes back to round 1', () => gm.evaluate(() => game.combat.previousRound()));
		e2e.expect(
			'#53 A1 back in round 1, the trackers render the round without the Extra Slot of round 2, and the turn is on one of its slots',
			await roundView(back, counts),
			{
				round: 1,
				slots: ['Hero:-1', 'Boss:-1'],
				turnOnASlot: bothClients(true),
				rows: bothClients(['Hero:-1', 'Boss:-1']),
				errors: bothClients([]),
			},
		);

		// #45: Roll All mixed up the slots once an Extra Slot was added after going back a round.
		await e2e.step('#53 GM adds an extra slot for Hero in round 1', () => gm.evaluate(() => window.e2e.addExtraSlotFor('Hero')));
		await e2e.step('#53 player rolls all', () => player.evaluate(() => game.combat.rollAll()));
		await e2e.step('#53 GM rolls the NPCs', () => gm.evaluate(() => game.combat.rollNPC()));
		const rolls = await stored();
		e2e.expect(
			'#53 A2 each roll lands in its own slot, and the Extra Slot of round 2 stays unrolled',
			{ rolled: rolled(rolls.initiatives), extraSlots: rolls.extraSlots.map((slot) => slot.replace(/=(?!null).*/, '=rolled')) },
			{ rolled: { Hero: true, Boss: true }, extraSlots: ['Boss@2=null', 'Hero@1=rolled'] },
		);

		await e2e.step('#53 GM puts the turn on Boss', () =>
			gm.evaluate(() =>
				game.combat.update({ turn: game.combat.slots.findIndex((slot: { id: string }) => slot.id === window.e2e.slotId('Boss')) }),
			),
		);
		await messages();
		const reroll = await e2e.step("#53 GM rerolls Hero's Extra Slot from the tracker's menu", () =>
			gm.evaluate(async () => {
				const done = window.combatE2E.runMenuEntry('Hero:1', 'COMBAT.CombatantReroll');
				await window.combatE2E.answerPrompts(['roll']);
				await done;
			}),
		);
		const rerolled = await stored();
		e2e.expect(
			"#53 A3 rerolling Hero's Extra Slot rolls that slot, and the turn stays on Boss",
			{
				hero: rerolled.initiatives.Hero,
				speakers: (await messages()).map((message) => message.speaker),
				current: Object.fromEntries(Object.entries(reroll).map(([user, state]) => [user, state?.current])),
			},
			{ hero: rolls.initiatives.Hero, speakers: ['Hero'], current: bothClients('Boss:-1') },
		);

		counts = errorCounts();
		const forward = await e2e.step('#53 GM goes forward to round 2', () => gm.evaluate(() => game.combat.nextRound()));
		const round2 = await roundView(forward, counts);
		e2e.expect(
			'#53 A4 forward in round 2, the trackers render its Extra Slots, and the effect has as many rounds left as before',
			{ ...round2, slots: [...round2.slots].sort(), remaining: await remaining() },
			{
				round: 2,
				slots: ['Boss:-1', 'Boss:0', 'Hero:-1', 'Hero:1'],
				turnOnASlot: bothClients(true),
				rows: bothClients(round2.slots),
				errors: bothClients([]),
				remaining: remainingInRound2,
			},
		);

		await e2e.step('#53 GM resets the initiatives', () => gm.evaluate(() => game.combat.resetAll()));
		const reset = await stored();
		e2e.expect('#53 A5 Reset clears every slot, an Extra Slot of a later round too', reset, {
			...reset,
			initiatives: { Hero: null, Boss: null },
			extraSlots: ['Boss@2=null', 'Hero@1=null'],
		});
	}

	/** §#53: the first message of a batch of initiative rolls plays the dice sound, even when an earlier prompt was cancelled. */
	async function cancelledPrompt() {
		await setUp({ Hero: null, Boss: null });
		await e2e.step("#53 GM rolls Hero's and Boss's slots, and cancels Hero's prompt", () =>
			gm.evaluate(async () => {
				const done = game.combat.rollSlotsInitiative([window.e2e.slotId('Hero'), window.e2e.slotId('Boss')], { prompt: true });
				await window.combatE2E.answerPrompts(['cancel', 'roll']);
				await done;
			}),
		);
		const sent = await messages();
		e2e.expect(
			'#53 A6 the first message after a cancelled prompt plays the dice sound',
			{ messages: sent.map(({ speaker, sound }) => ({ speaker, sound })), rolled: rolled((await stored()).initiatives) },
			{ messages: [{ speaker: 'Boss', sound: await gm.evaluate(() => CONFIG.sounds.dice) }], rolled: { Hero: false, Boss: true } },
		);
	}

	/** §#53: with no GM online, a player can't roll an Extra Slot, whose initiative only a GM writes. */
	async function noGM() {
		await setUp({ Hero: null, Boss: null }, { extraSlots: [{ name: 'Hero' }] });
		await e2e.step('#53 GM leaves', () => gm.leave());
		const noGMWarning = await player.evaluate(() => window.combatE2E.warning('Genesys.Notifications.NoGMForExtraSlot'));

		const extra = await e2e.step("#53 player rolls Hero's Extra Slot from the tracker, with no GM online", () =>
			player.evaluate(() => window.combatE2E.clickRow('Hero:0', '.combatant-control.roll')),
		);
		e2e.expect(
			'#53 A7 with no GM online, rolling an Extra Slot warns, with no prompt and no message',
			{
				notifications: notifications(extra, e2e.playerUser),
				prompts: await player.evaluate(() => window.combatE2E.openPrompts()),
				messages: (await recorded(() => window.combatE2E.messages))[e2e.playerUser],
			},
			{ notifications: [noGMWarning], prompts: 0, messages: [] },
		);

		const all = await e2e.step('#53 player rolls all, with no GM online', () => player.evaluate(() => game.combat.rollAll()));
		e2e.expect(
			"#53 A8 with no GM online, Roll All warns and rolls Hero's own slot",
			{
				notifications: notifications(all, e2e.playerUser),
				speakers: (await recorded(() => window.combatE2E.messages))[e2e.playerUser]?.map((message) => message.speaker),
			},
			{ notifications: [noGMWarning], speakers: ['Hero'] },
		);

		await e2e.step('#53 GM joins again', async () => {
			await gm.join();
			await gm.evaluate(installCombatHelpers);
		});
		const after = await stored();
		e2e.expect(
			"#53 A9 Hero's own slot is rolled, its Extra Slot isn't",
			{ rolled: rolled(after.initiatives), extraSlots: after.extraSlots },
			{ rolled: { Hero: true, Boss: false }, extraSlots: ['Hero@1=null'] },
		);
	}

	/** §#94: on v13, the tracker's slot actions and menu entries do nothing without a slot or a combat, and hovering a text node doesn't throw. */
	async function trackerGuards() {
		if (e2e.version < 13) {
			e2e.log('#94 the guards of the v13 tracker', 'v13 only');
			return;
		}
		await setUp({ Hero: null, Boss: null });
		const tryAll = () =>
			gm.evaluate(async () => {
				const thrown: string[] = [];
				const attempt = async (what: string, action: () => unknown) => {
					try {
						await action();
					} catch (error) {
						thrown.push(`${what}: ${String(error)}`);
					}
				};
				const tracker = ui.combat;
				const noSlot = document.createElement('li');
				noSlot.className = 'combatant claimed';
				const slot = document.createElement('li');
				slot.dataset.slotId = 'none:-1';
				for (const target of [noSlot, slot]) {
					for (const action of ['claimInitiativeSlot', 'cycleInitiativeSkill', 'rollInitiative']) {
						const handler = tracker.options.actions[action];
						await attempt(`${action} ${target.dataset.slotId ?? 'without slot'}`, () =>
							(handler.handler ?? handler).call(tracker, new PointerEvent('click'), target),
						);
					}
					for (const entry of tracker._getEntryContextOptions()) {
						if (!['COMBAT.CombatantReroll', 'Genesys.CombatTracker.RevokeInitiativeClaim'].includes(entry.name)) continue;
						if (entry.name !== 'COMBAT.CombatantReroll')
							await attempt(`${entry.name} condition`, () => entry.condition(target));
						await attempt(`${entry.name} ${target.dataset.slotId ?? 'without slot'}`, () => entry.callback(target));
					}
				}
				await attempt('hovering a text node', () => tracker._onCombatantHoverIn({ target: document.createTextNode('E2E') }));
				return thrown;
			});
		e2e.expect('#94 A2 with a combat, the slot actions do nothing on a row without a slot', await tryAll(), []);
		await e2e.step('#94 GM deletes the combat', () => gm.evaluate(() => game.combat.delete()));
		e2e.expect('#94 A3 with no combat, the slot actions do nothing', await tryAll(), []);
	}
}
