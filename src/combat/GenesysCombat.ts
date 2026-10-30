import { GenesysCombatant } from '@/combat/GenesysCombatant';
import { InitiativeSkill } from '@/combat/InitiativeSkills';
import { checkMessageData, CheckRoll, rollPool } from '@/dice/CheckRoll';
import { checkDicePool, resolveCheck, worldCheckRules } from '@/dice/Check';
import { DicePrompt } from '@/app/DicePrompt';
import * as log from '@/log';
import { CHARACTERISTIC_LABELS, Characteristic } from '@/data/Characteristics';
import { emit as socketEmit, handle as handleSocket, SocketOperation } from '@/socket';
import {
	buildSlots,
	claimRefusal,
	decodeInitiative,
	encodeInitiative,
	ExtraSlotInitiative,
	extraSlotResets,
	extraSlotsForRound,
	InitiativeSlot,
	initiativeWrites,
	isExtraSlot,
	ownSlotIds,
	RoundClaims,
	SIDE_LABELS,
	slotIdsOf,
	slotsToRoll,
	slotView,
	StoredExtraSlot,
	withExtraSlotInitiatives,
} from '@/combat/InitiativeSlots';

// Claims are keyed by slot id. They replace the `claimants` flag, which keyed them by position in the turn order.
const FLAG_CLAIMS = 'slotClaims';
const FLAG_EXTRA_SLOTS = 'extraSlots';

/**
 * The Claims on the Initiative Slots, by round.
 */
export type ClaimData = Record<number, RoundClaims>;

/**
 * Foundry's options for rolling initiative, with the system's own.
 */
export type GenesysRollInitiativeOptions = Combat.InitiativeOptions & {
	/**
	 * Roll the Initiative Slots that the combatants' initiative gives this round, all of them or only those without
	 * initiative, rather than their own slots. {@link GenesysActor.rollInitiative} passes it.
	 */
	slotsOfCombatants?: 'all' | 'unrolled';
};

/**
 * The options of a roll of Initiative Slots, which roll each slot's Initiative Skill rather than a formula.
 */
export type RollSlotsOptions = Omit<Combat.InitiativeOptions, 'formula'> & {
	/**
	 * Open the Dice Prompt for each slot, rather than rolling its Initiative Skill at once.
	 */
	prompt?: boolean;
};

/**
 * A combat whose turns are Initiative Slots, which the combatants of their side Claim (CRB p. 96).
 */
export class GenesysCombat extends Combat {
	/**
	 * The id the socket operations name the combat by: the world stores the combats they run on.
	 */
	get #storedId() {
		return this.id!;
	}

	/**
	 * Skills from the Skills Compendium that can be used for initiative.
	 */
	get initiativeSkills(): InitiativeSkill[] {
		const initiativeSkills = CONFIG.genesys.skills
			.filter((skill) => skill.system.initiative)
			.map((skill) => ({ skillName: skill.name, skillChar: skill.system.characteristic }));

		// Without any, initiative is a Characteristic Check on Brawn.
		if (initiativeSkills.length === 0) {
			return [{ skillName: game.i18n.localize(CHARACTERISTIC_LABELS[Characteristic.Brawn]), skillChar: Characteristic.Brawn }];
		}

		return initiativeSkills;
	}

	/**
	 * The Claims on the Initiative Slots of a round, by slot id.
	 */
	claimsForRound(round: number): RoundClaims {
		return this.getFlag('genesys', FLAG_CLAIMS)?.[round] ?? {};
	}

	/**
	 * The Initiative Slots of a round in turn order, with their Claims.
	 */
	slotsForRound(round: number): InitiativeSlot[] {
		const combatants = this.combatants.contents.map((combatant) => ({
			id: combatant.id,
			initiative: combatant.initiative,
			hasPlayerOwner: combatant.actorHasPlayerOwner,
		}));

		return buildSlots(combatants, extraSlotsForRound(this.storedExtraSlots, round), this.claimsForRound(round));
	}

	/**
	 * The Initiative Slots of the current round, in the order of the combat's turns.
	 */
	get slots() {
		return this.slotsForRound(this.round);
	}

	/**
	 * The id of the Initiative Slot whose turn it is.
	 */
	get currentSlotId() {
		return this.turn === null ? undefined : this.slots[this.turn]?.id;
	}

	/**
	 * What the current user sees of an Initiative Slot and may do with it.
	 */
	slotViewForUser(slot: InitiativeSlot) {
		return slotView(slot, this.started, {
			isGM: game.user.isGM,
			isPlayerOf: (combatantId) => (this.combatants.get(combatantId)?.players ?? []).includes(game.user),
			isOwnerOf: (combatantId) => this.combatants.get(combatantId)?.isOwner ?? false,
		});
	}

	/**
	 * What the combat trackers show of an Initiative Slot, on top of the turn of the combatant it shows.
	 */
	slotTrackerContext(slot: InitiativeSlot) {
		const view = this.slotViewForUser(slot);
		const origin = this.combatants.get(slot.originId) as GenesysCombatant;

		return {
			slotId: slot.id,
			slotType: slot.side,
			slotLabel: SIDE_LABELS[slot.side],
			hasRolled: slot.initiative !== null,
			...decodeInitiative(slot.initiative),
			initiativeSkill: origin.initiativeSkillToRoll.skillName,
			canRollInitiative: view.canRollInitiative,
			claimed: view.showsAsClaimed,
			canClaim: view.canClaim,
		};
	}

	/**
	 * Whether the current user may end the current turn, as a player of the combatant that claimed its slot.
	 */
	get userControlsTurn() {
		const slot = this.turn === null ? undefined : this.slots[this.turn];
		return slot ? this.slotViewForUser(slot).controlsTurn : false;
	}

	/**
	 * An Initiative Slot of the current round, by its id.
	 */
	#slot(slotId: string) {
		return this.slots.find((slot) => slot.id === slotId);
	}

	/**
	 * Whether the user may revoke the Claim on a claimed Initiative Slot of the current round: a GM may, once the combat
	 * started.
	 */
	canRevokeClaim(slotId: string) {
		const slot = this.#slot(slotId);
		return slot ? this.slotViewForUser(slot).canRevoke : false;
	}

	/**
	 * Roll the initiative of an Initiative Slot of the current round for the combatant whose initiative gave it: its own
	 * slot or one of its extra slots, whoever claimed it.
	 */
	async rollSlotInitiative(slotId: string) {
		return this.rollSlotsInitiative([slotId], { prompt: true });
	}

	/**
	 * Cycle the Initiative Skill of the combatant whose initiative gave an Initiative Slot of the current round.
	 */
	async cycleInitiativeSkill(slotId: string) {
		const slot = this.#slot(slotId);
		const combatant = slot ? this.combatants.get(slot.originId) : undefined;
		if (combatant?.isOwner) {
			await combatant.cycleInitiativeSkill();
		}
	}

	/**
	 * Why a combatant can't claim an Initiative Slot, as a localization key, or undefined if it can.
	 */
	claimRefusal(round: number, slotId: string, combatant: Combatant.Stored): string | undefined {
		return claimRefusal(this.slotsForRound(round), this.claimsForRound(round), slotId, {
			id: combatant.id,
			side: combatant.initiativeSide,
		});
	}

	/**
	 * The combatant of the single token the user controls, or undefined after warning the user that there is none.
	 */
	#controlledCombatant() {
		if (canvas.tokens.controlled.length !== 1) {
			ui.notifications.warn(game.i18n.localize('Genesys.Notifications.SelectOneTokenForAction'));
			return undefined;
		}

		// Foundry finds a token's combatant in `game.combat`, which may not be this one: a macro can call on any combat, and
		// v14's `game.combat` is the active combat until the tracker renders.
		const combatant = canvas.tokens.controlled[0].combatant;
		if (!combatant || combatant.parent !== this) {
			ui.notifications.warn(game.i18n.localize('Genesys.Notifications.TokenIsNotCombatant'));
			return undefined;
		}

		return combatant;
	}

	/**
	 * Claim an Initiative Slot of the current round for the combatant of the single token the user controls.
	 */
	async claimSlotWithControlledToken(slotId: string) {
		const combatant = this.#controlledCombatant();
		if (!combatant) {
			return;
		}

		const refusal = this.claimRefusal(this.round, slotId, combatant);
		if (refusal) {
			ui.notifications.warn(game.i18n.format(refusal, { name: combatant.name }));
			return;
		}

		await this.claimSlot(this.round, slotId, combatant.id);
	}

	/**
	 * Claim an Initiative Slot of a round for a combatant. A player's Claim goes to the Acting GM, who checks it again
	 * and writes it.
	 */
	async claimSlot(round: number, slotId: string, combatantId: string) {
		if (!game.user.isGM) {
			socketEmit(SocketOperation.ClaimInitiativeSlot, {
				combatId: this.#storedId,
				combatantId,
				round,
				slotId,
			});
			return;
		}

		// Check the claim again, in case another one reached the GM first.
		const combatant = this.combatants.get(combatantId);
		if (!combatant || this.claimRefusal(round, slotId, combatant)) {
			return;
		}

		await this.update({ [`flags.genesys.${FLAG_CLAIMS}.${round}.${slotId}`]: combatantId });
	}

	/**
	 * Revoke the Claim on an Initiative Slot of a round. Only a GM may, once the combat started.
	 */
	async revokeSlot(round: number, slotId: string) {
		if (!game.user.isGM || !this.started) {
			return;
		}

		// Foundry unsets a key within a flag too, which the types don't take.
		await this.unsetFlag('genesys', `${FLAG_CLAIMS}.${round}.${slotId}` as typeof FLAG_CLAIMS);
	}

	/**
	 * Every extra slot the combat stores, whatever round it starts from.
	 */
	get storedExtraSlots() {
		return this.getFlag('genesys', FLAG_EXTRA_SLOTS) ?? [];
	}

	/**
	 * Give a combatant an Extra Slot from a round on, keeping the turn on the current slot.
	 */
	async addExtraSlot(combatantId: string, round: number) {
		// The new slot may sort before the current one.
		await this.updateExtraSlots(
			[...this.storedExtraSlots, { activationSource: combatantId, initiative: null, startingRound: round }],
			this.currentSlotId,
		);
	}

	/**
	 * Write the initiative of extra slots, then refresh the turns on every client. Only a GM may write them.
	 */
	async writeExtraSlotsInitiative(writes: ExtraSlotInitiative[], keepTurnOn?: string) {
		await this.updateExtraSlots(withExtraSlotInitiatives(this.storedExtraSlots, writes), keepTurnOn);
		this.refreshTurns();
	}

	/**
	 * Write the stored extra slots, keeping the turn on an Initiative Slot of the current round when one is given.
	 */
	async updateExtraSlots(extraSlots: StoredExtraSlot[], keepTurnOn: string | undefined) {
		const changes = { flags: { genesys: { [FLAG_EXTRA_SLOTS]: extraSlots } } };
		const turn = this.turnOfSlotAfter(keepTurnOn, changes);

		await this.update(turn === undefined ? changes : { ...changes, turn });
	}

	/**
	 * The turn of an Initiative Slot of the current round once changes to the combat are made. Written with them, it keeps
	 * the turn on that slot: Foundry then sees no turn change and fires no turn events.
	 */
	turnOfSlotAfter(slotId: string | undefined, changes: object) {
		if (!slotId || !this.started) {
			return undefined;
		}

		const combat = this.clone() as GenesysCombat;
		combat.updateSource(changes);
		const turn = combat.slots.findIndex((slot) => slot.id === slotId);

		return turn === -1 ? undefined : turn;
	}

	/**
	 * Order the turns again and render the tracker on every client, for changes that Foundry doesn't order them for.
	 */
	refreshTurns() {
		this.refreshLocalTurns();
		socketEmit(SocketOperation.UpdateCombatTracker, { combatId: this.#storedId });
	}

	/**
	 * Order the turns again and render the tracker, on this client only.
	 */
	refreshLocalTurns() {
		this.setupTurns();
		this.debounceTrackerRender();
	}

	/**
	 * Roll the initiative of combatants. Foundry names combatants: roll their own Initiative Slots, or the slots their
	 * initiative gives this round when asked.
	 */
	override async rollInitiative(
		ids: string | string[],
		{ formula: _formula = null, slotsOfCombatants, ...options }: GenesysRollInitiativeOptions = {},
	) {
		const combatantIds = typeof ids === 'string' ? [ids] : ids;
		const slotIds = slotsOfCombatants
			? slotIdsOf(this.slots, combatantIds, { unrolledOnly: slotsOfCombatants === 'unrolled' })
			: ownSlotIds(combatantIds);

		return this.rollSlotsInitiative(slotIds, options);
	}

	/**
	 * Roll the initiative of Initiative Slots of the current round, for the combatant whose initiative gives each one.
	 */
	async rollSlotsInitiative(slotIds: string[], { prompt = false, updateTurn = true, messageOptions = {} }: RollSlotsOptions = {}) {
		let slots = slotsToRoll(this.slots, slotIds).filter((slot) => this.combatants.get(slot.originId)?.isOwner);

		// Only a GM may write an extra slot's initiative: a player's roll waits for one.
		if (!game.user.isGM && !game.users.activeGM && slots.some(isExtraSlot)) {
			ui.notifications.warn(game.i18n.localize('Genesys.Notifications.NoGMForExtraSlot'));
			slots = slots.filter((slot) => !isExtraSlot(slot));
		}

		const currentSlotId = this.currentSlotId;
		const chatRollMode = game.settings.get('core', 'rollMode');

		const rolls: { slot: InitiativeSlot; initiative: number }[] = [];
		const messages: object[] = [];
		for (const slot of slots) {
			// The slots to roll are those of combatants the combat holds.
			const combatant = this.combatants.get(slot.originId)!;

			const initiativeSkill = combatant.initiativeSkillToRoll;
			let checkRoll: CheckRoll;

			if (prompt) {
				try {
					checkRoll = await DicePrompt.promptForInitiative(combatant.actor ?? undefined, initiativeSkill.skillName, {
						difficulty: '',
						characteristic: initiativeSkill.skillChar,
					});
				} catch {
					continue;
				}
			} else {
				// Initiative has no target, and its Pool Modifications are turned on as the world setting says.
				const check = resolveCheck(
					combatant.actor ?? undefined,
					{
						purpose: { kind: 'initiative' },
						skillName: initiativeSkill.skillName,
						fallbackCharacteristic: initiativeSkill.skillChar,
					},
					worldCheckRules(),
				);
				checkRoll = {
					check,
					dicePool: checkDicePool(check, { difficulty: '', isEnabled: () => CONFIG.genesys.settings.autoApplyPoolModifications }),
				};
			}

			const poolRoll = await rollPool(checkRoll.dicePool);
			rolls.push({ slot, initiative: encodeInitiative(poolRoll.results.netSuccess, poolRoll.results.netAdvantage) });

			const chatData = {
				...(await checkMessageData(checkRoll.check, poolRoll)),
				speaker: { actor: combatant.actorId },
				sound: messages.length > 0 ? null : CONFIG.sounds.dice,
			};
			const rollMode = (
				'rollMode' in messageOptions ? messageOptions.rollMode : combatant.hidden ? CONST.DICE_ROLL_MODES.PRIVATE : chatRollMode
			) as ChatMessage.PassableRollMode;
			ChatMessage.applyRollMode(chatData, rollMode);

			messages.push(chatData);
		}

		if (!messages.length) {
			return this;
		}

		const writes = initiativeWrites(rolls);
		// Each write keeps the turn on its slot.
		const keepTurnOn = updateTurn ? currentSlotId : undefined;

		if (writes.combatants.length) {
			// Without a turn, Foundry keeps it on the current combatant's first slot.
			const combatTurn = this.turnOfSlotAfter(keepTurnOn, { combatants: writes.combatants });
			await this.updateEmbeddedDocuments(
				'Combatant',
				writes.combatants,
				combatTurn === undefined ? {} : { combatTurn, turnEvents: false },
			);
		}

		if (writes.extraSlots.length) {
			if (game.user.isGM) {
				await this.writeExtraSlotsInitiative(writes.extraSlots, keepTurnOn);
			} else {
				// The GM writes them and keeps the turn, once the combatants' initiative is written.
				socketEmit(SocketOperation.UpdateInitiativeForExtraSlot, {
					combatId: this.#storedId,
					updates: writes.extraSlots,
					updateTurn,
				});
			}
		}

		await ChatMessage.implementation.create(messages);
		return this;
	}

	/**
	 * Add an extra slot from the current round on for the combatant of the single token the user controls.
	 */
	async addInitiativeSlot() {
		const combatant = this.#controlledCombatant();
		if (!combatant) {
			return;
		}

		await this.addExtraSlot(combatant.id, this.round);
		this.refreshTurns();
	}

	override async resetAll(options?: Combat.ResetAllOptions) {
		// The extra slots are reset before Foundry orders the turns again.
		const resets = extraSlotResets(this.storedExtraSlots);
		if (resets.length > 0) {
			await this.writeExtraSlotsInitiative(resets);
		}

		return await super.resetAll(options);
	}

	override async rollAll(options?: Combat.InitiativeOptions, onlyNPCs: boolean = false) {
		const combatantIds = this.combatants
			.filter((combatant) => combatant.isOwner && (!onlyNPCs || combatant.isNPC))
			.map((combatant) => combatant.id);

		return this.rollSlotsInitiative(slotIdsOf(this.slots, combatantIds, { unrolledOnly: true }), options);
	}

	override async rollNPC(options?: Combat.InitiativeOptions) {
		return this.rollAll(options, true);
	}

	protected override async _preUpdate(changed: Combat.UpdateData, options: Combat.Database.PreUpdateOptions, user: User.Stored) {
		// Foundry picks the last turn of a round from the turns of the round it leaves, but a round only has the extra slots
		// added up to it.
		if (typeof changed.round === 'number' && typeof changed.turn === 'number') {
			changed.turn = Math.min(changed.turn, Math.max(this.slotsForRound(changed.round).length - 1, 0));
		}

		return super._preUpdate(changed, options, user);
	}

	protected override _onUpdate(changed: Combat.UpdateData, options: Combat.Database.OnUpdateOptions, userId: string) {
		// Foundry only orders the turns again when combatants change, but extra slots add turns too, and a round only has
		// the extra slots added up to it. Order them before Foundry works out the current turn from them.
		if (foundry.utils.hasProperty(changed, `flags.genesys.${FLAG_EXTRA_SLOTS}`)) {
			this.setupTurns();
		} else if ('round' in changed) {
			// Leave the current turn to Foundry, which compares it with the new one for its turn events.
			this.turns = this.slotTurns();
		}

		super._onUpdate(changed, options, userId);
	}

	/**
	 * The turns of the current round: each one is an Initiative Slot, given by the combatant whose initiative it holds.
	 */
	slotTurns() {
		return this.slots.map((slot) => this.combatants.get(slot.originId)!);
	}

	override setupTurns() {
		const turns = this.slotTurns();

		if (this.turn !== null) {
			this.turn = Math.clamp(this.turn, 0, turns.length - 1);
		}

		const currentCombatant = this.turn === null ? undefined : turns[this.turn];
		this.current = {
			round: this.round,
			turn: this.turn,
			combatantId: currentCombatant ? currentCombatant.id : null,
			tokenId: currentCombatant ? currentCombatant.tokenId : null,
		};

		if (!this.previous) {
			this.previous = this.current;
		}

		return (this.turns = turns);
	}

	/**
	 * If this is the currently viewed encounter, re-render the CombatTracker application.
	 * We debounce this call to allow for updates to complete.
	 */
	debounceTrackerRender = foundry.utils.debounce(() => {
		if (ui.combat.viewed === this) {
			void ui.combat.render();
		}
	}, 50);
}

/**
 * Handle the combat's socket operations: the Acting GM writes the players' Claims and Extra Slot initiatives.
 */
export function register() {
	const combatOf = (operation: SocketOperation, combatId: string) => {
		const combat = game.combats.get(combatId);
		if (!combat) {
			log.error(`Socket received ${operation} payload with invalid combat ID ${combatId}`);
		}
		return combat;
	};

	handleSocket(SocketOperation.ClaimInitiativeSlot, async ({ combatId, round, slotId, combatantId }) => {
		await combatOf(SocketOperation.ClaimInitiativeSlot, combatId)?.claimSlot(round, slotId, combatantId);
	});

	handleSocket(SocketOperation.UpdateCombatTracker, ({ combatId }) => {
		combatOf(SocketOperation.UpdateCombatTracker, combatId)?.refreshLocalTurns();
	});

	handleSocket(SocketOperation.UpdateInitiativeForExtraSlot, async ({ combatId, updates, updateTurn }) => {
		const combat = combatOf(SocketOperation.UpdateInitiativeForExtraSlot, combatId);
		await combat?.writeExtraSlotsInitiative(updates, updateTurn ? combat.currentSlotId : undefined);
	});
}
