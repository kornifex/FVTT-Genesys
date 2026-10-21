/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file
 */

import GenesysCombatant from '@/combat/GenesysCombatant';
import GenesysRoller, { CheckRoll } from '@/dice/GenesysRoller';
import { checkDescription, checkDicePool, resolveCheck, worldCheckRules } from '@/dice/Check';
import DicePrompt from '@/app/DicePrompt';
import { Characteristic } from '@/data/Characteristics';
import { ClaimInitiativeSlotData, emit as socketEmit, SOCKET_NAME, SocketOperation, SocketPayload, CombatSocketBaseData, UpdateInitiativeForExtraSlotData } from '@/socket';
import {
	buildSlots,
	claimRefusal,
	decodeInitiative,
	encodeInitiative,
	ExtraSlotInitiative,
	extraSlotsForRound,
	InitiativeSlot,
	initiativeWrites,
	ownSlotIds,
	RoundClaims,
	slotIdsOf,
	slotsToRoll,
	slotView,
	StoredExtraSlot,
	withExtraSlotInitiatives,
} from '@/combat/InitiativeSlots';

// Claims are keyed by slot id. They replace the `claimants` flag, which keyed them by position in the turn order.
const FLAG_CLAIMS = 'slotClaims';
const FLAG_EXTRA_SLOTS = 'extraSlots';

type ClaimData = Record<number, RoundClaims>;

export type GenesysRollInitiativeOptions = RollInitiativeOptions & {
	/**
	 * Roll the Initiative Slots that the combatants' initiative gives this round, all of them or only those without
	 * initiative, rather than their own slots. {@link GenesysActor.rollInitiative} passes it.
	 */
	slotsOfCombatants?: 'all' | 'unrolled';
};

export type RollSlotsOptions = Omit<RollInitiativeOptions, 'formula'> & {
	prompt?: boolean;
};

export type InitiativeSkill = {
	skillName: string;
	skillChar: Characteristic;
};

export default class GenesysCombat extends Combat {
	/**
	 * Skills from the Skills Compendium that can be used for initiative.
	 */
	get initiativeSkills(): InitiativeSkill[] {
		const initiativeSkills = CONFIG.genesys.skills.filter((skill) => skill.systemData.initiative).map((skill) => ({ skillName: skill.name, skillChar: skill.systemData.characteristic }));

		// Without any, initiative is a Characteristic Check on Brawn.
		if (initiativeSkills.length === 0) {
			return [{ skillName: game.i18n.localize('Genesys.Characteristics.Brawn'), skillChar: Characteristic.Brawn }];
		}

		return initiativeSkills;
	}

	claimsForRound(round: number): RoundClaims {
		return (this.getFlag('genesys', FLAG_CLAIMS) as ClaimData | undefined)?.[round] ?? {};
	}

	/**
	 * The Initiative Slots of a round in turn order, with their Claims.
	 */
	slotsForRound(round: number): InitiativeSlot[] {
		const combatants = (this.combatants.contents as GenesysCombatant[]).map((combatant) => ({ id: combatant.id, initiative: combatant.initiative, disposition: combatant.disposition }));

		return buildSlots(combatants, this.extraSlotsForRound(round), this.claimsForRound(round));
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
			isPlayerOf: (combatantId) => ((this.combatants.get(combatantId) as GenesysCombatant | undefined)?.players ?? []).includes(game.user),
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
			hasRolled: slot.initiative !== null,
			...decodeInitiative(slot.initiative),
			initiativeSkill: origin.initiativeSkillToRoll.skillName,
			// The slot's initiative is the origin's, whoever claimed it.
			canRollInitiative: origin.isOwner,
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

	canRevokeClaim(slotId: string) {
		const slot = this.slots.find((candidate) => candidate.id === slotId);
		return slot ? this.slotViewForUser(slot).canRevoke : false;
	}

	/**
	 * Roll the initiative of an Initiative Slot of the current round for the combatant whose initiative gave it: its own
	 * slot or one of its extra slots, whoever claimed it.
	 */
	async rollSlotInitiative(slotId: string) {
		const slot = this.slots.find((candidate) => candidate.id === slotId);
		if (!slot) {
			return this;
		}

		return this.rollSlotsInitiative([slot.id], { prompt: true });
	}

	/**
	 * Cycle the Initiative Skill of the combatant whose initiative gave an Initiative Slot of the current round.
	 */
	async cycleInitiativeSkill(slotId: string) {
		const slot = this.slots.find((candidate) => candidate.id === slotId);
		const combatant = slot ? (this.combatants.get(slot.originId) as GenesysCombatant | undefined) : undefined;
		if (combatant?.isOwner) {
			await combatant.cycleInitiativeSkill();
		}
	}

	/**
	 * Why a combatant can't claim an Initiative Slot, as a localization key, or undefined if it can.
	 */
	claimRefusal(round: number, slotId: string, combatant: GenesysCombatant): string | undefined {
		return claimRefusal(this.slotsForRound(round), this.claimsForRound(round), slotId, { id: combatant.id, side: combatant.initiativeSide });
	}

	/**
	 * Claim an Initiative Slot of the current round for the combatant of the single token the user controls.
	 */
	async claimSlotWithControlledToken(slotId: string) {
		// Ensure we have a single token selected to claim this slot.
		if (canvas.tokens.controlled.length !== 1) {
			ui.notifications.warn(game.i18n.localize('Genesys.Notifications.SelectOneTokenForAction'));
			return;
		}

		const combatant = canvas.tokens.controlled[0].combatant as GenesysCombatant;

		// No claiming initiative slots if you aren't in the combat!
		if (!combatant || combatant.parent !== this) {
			ui.notifications.warn(game.i18n.localize('Genesys.Notifications.TokenIsNotCombatant'));
			return;
		}

		const refusal = this.claimRefusal(this.round, slotId, combatant);
		if (refusal) {
			ui.notifications.warn(game.i18n.format(refusal, { name: combatant.name }));
			return;
		}

		await this.claimSlot(this.round, slotId, combatant.id);
	}

	async claimSlot(round: number, slotId: string, combatantId: string) {
		if (!game.user.isGM) {
			socketEmit(SocketOperation.ClaimInitiativeSlot, {
				combatId: this.id,
				combatantId,
				round,
				slotId,
			});
			return;
		}

		// Check the claim again, in case another one reached the GM first.
		const combatant = this.combatants.get(combatantId) as GenesysCombatant | undefined;
		if (!combatant || this.claimRefusal(round, slotId, combatant)) {
			return;
		}

		await this.update({ [`flags.genesys.${FLAG_CLAIMS}.${round}.${slotId}`]: combatantId });
	}

	async revokeSlot(round: number, slotId: string) {
		if (!game.user.isGM || !this.started) {
			return;
		}

		await this.unsetFlag('genesys', `${FLAG_CLAIMS}.${round}.${slotId}`);
	}

	get storedExtraSlots() {
		return (this.getFlag('genesys', FLAG_EXTRA_SLOTS) ?? []) as StoredExtraSlot[];
	}

	extraSlotsForRound(round: number) {
		return extraSlotsForRound(this.storedExtraSlots, round);
	}

	async addExtraSlot(combatantId: string, round: number) {
		await this.setFlag('genesys', FLAG_EXTRA_SLOTS, [...this.storedExtraSlots, { activationSource: combatantId, initiative: null, startingRound: round }]);
	}

	/**
	 * Write the initiative of extra slots, then refresh the turns on every client. Only a GM may write them.
	 */
	async writeExtraSlotsInitiative(writes: ExtraSlotInitiative[]) {
		await this.setFlag('genesys', FLAG_EXTRA_SLOTS, withExtraSlotInitiatives(this.storedExtraSlots, writes));
		this.refreshTurns();
	}

	/**
	 * Order the turns again and render the tracker on every client, for changes that Foundry doesn't order them for.
	 */
	refreshTurns() {
		this.refreshLocalTurns();
		socketEmit(SocketOperation.UpdateCombatTracker, { combatId: this.id });
	}

	refreshLocalTurns() {
		this.setupTurns();
		this.debounceTrackerRender();
	}

	/**
	 * Give the turn back to an Initiative Slot after the turn order changed.
	 */
	async restoreTurn(slotId: string | undefined) {
		const turn = slotId ? this.slots.findIndex((slot) => slot.id === slotId) : -1;
		if (turn !== -1) {
			await this.update({ turn });
		}
	}

	/**
	 * Roll the initiative of combatants. Foundry names combatants: roll their own Initiative Slots, or the slots their
	 * initiative gives this round when asked.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	override async rollInitiative(ids: string | string[], { formula = null, slotsOfCombatants, ...options }: GenesysRollInitiativeOptions = {}) {
		const combatantIds = typeof ids === 'string' ? [ids] : ids;
		const slotIds = slotsOfCombatants ? slotIdsOf(this.slots, combatantIds, { unrolledOnly: slotsOfCombatants === 'unrolled' }) : ownSlotIds(combatantIds);

		return this.rollSlotsInitiative(slotIds, options);
	}

	/**
	 * Roll the initiative of Initiative Slots of the current round, for the combatant whose initiative gives each one.
	 */
	async rollSlotsInitiative(slotIds: string[], { prompt = false, updateTurn = true, messageOptions = {} }: RollSlotsOptions = {}) {
		let slots = slotsToRoll(this.slots, slotIds).filter((slot) => this.combatants.get(slot.originId)?.isOwner);

		// Only a GM may write an extra slot's initiative: a player's roll waits for one.
		if (!game.user.isGM && !game.users.activeGM && slots.some((slot) => slot.activationId >= 0)) {
			ui.notifications.warn(game.i18n.localize('Genesys.Notifications.NoGMForExtraSlot'));
			slots = slots.filter((slot) => slot.activationId < 0);
		}

		const currentSlotId = this.currentSlotId;
		const chatRollMode = game.settings.get('core', 'rollMode');

		const rolls: { slot: InitiativeSlot; initiative: number }[] = [];
		const messages: any[] = [];
		for (const slot of slots) {
			const combatant = this.combatants.get(slot.originId) as Embedded<GenesysCombatant>;

			// Initiative roll result
			const initiativeSkill = combatant.initiativeSkillToRoll;
			let checkRoll: CheckRoll;

			if (prompt) {
				try {
					checkRoll = await DicePrompt.promptForInitiative(combatant.actor, initiativeSkill.skillName, { difficulty: '', characteristic: initiativeSkill.skillChar });
				} catch {
					continue;
				}
			} else {
				// Initiative has no target, and its Pool Modifications are turned on as the world setting says.
				const check = resolveCheck(combatant.actor, { skillName: initiativeSkill.skillName, fallbackCharacteristic: initiativeSkill.skillChar }, worldCheckRules());
				checkRoll = { check, dicePool: checkDicePool(check, { difficulty: '', isEnabled: () => CONFIG.genesys.settings.autoApplyPoolModifications }) };
			}

			const roll = GenesysRoller.rollForPool(checkRoll.dicePool);
			await roll.evaluate();
			const results = GenesysRoller.parseRollResults(roll);
			rolls.push({ slot, initiative: encodeInitiative(results.netSuccess, results.netAdvantage) });

			const chatData = {
				user: game.user.id,
				speaker: { actor: combatant.actorId },
				content: await GenesysRoller.checkMessageContent(checkDescription(checkRoll.check, { kind: 'initiative' }, game.i18n), results),
				sound: messages.length > 0 ? null : CONFIG.sounds.dice,
				rolls: [roll],
			};
			const rollMode = ('rollMode' in messageOptions ? messageOptions.rollMode : combatant.hidden ? CONST.DICE_ROLL_MODES.PRIVATE : chatRollMode) as RollMode;
			ChatMessage.applyRollMode(chatData as any, rollMode);

			messages.push(chatData);
		}

		if (!messages.length) {
			return this;
		}

		const writes = initiativeWrites(rolls);
		let restoreTurn = updateTurn;

		if (writes.extraSlots.length) {
			if (game.user.isGM) {
				await this.writeExtraSlotsInitiative(writes.extraSlots);
			} else {
				// The GM writes them and gives the turn back.
				restoreTurn = false;
				socketEmit(SocketOperation.UpdateInitiativeForExtraSlot, {
					combatId: this.id,
					updates: writes.extraSlots,
					updateTurn,
				});
			}
		}

		if (writes.combatants.length) {
			await this.updateEmbeddedDocuments('Combatant', writes.combatants);
		}

		if (restoreTurn) {
			await this.restoreTurn(currentSlotId);
		}

		await ChatMessage.implementation.create(messages);
		return this;
	}

	async addInitiativeSlot() {
		const controlledTokenCount = canvas.tokens.controlled.length;
		if (controlledTokenCount !== 1) {
			ui.notifications.warn(game.i18n.localize('Genesys.Notifications.SelectOneTokenForAction'));
			return;
		}

		const combatant = canvas.tokens.controlled[0].combatant as GenesysCombatant;
		if (!combatant) {
			ui.notifications.warn(game.i18n.localize('Genesys.Notifications.TokenIsNotCombatant'));
			return;
		}

		await this.addExtraSlot(combatant.id, this.round);
		this.refreshTurns();
	}

	override async resetAll(...args: any[]) {
		// Every extra slot is reset, whatever its starting round, before Foundry orders the turns again.
		const extraSlots = this.storedExtraSlots;
		if (extraSlots.some((slot) => slot.initiative !== null)) {
			await this.writeExtraSlotsInitiative(extraSlots.map((_slot, index) => ({ index, initiative: null })));
		}

		// @ts-ignore: Foundry v13 takes options that v12 doesn't.
		return await super.resetAll(...args);
	}

	override async rollAll(options?: RollInitiativeOptions | undefined, onlyNPCs: boolean = false) {
		const combatantIds = this.combatants.filter((combatant) => combatant.isOwner && (!onlyNPCs || combatant.isNPC)).map((combatant) => combatant.id);

		return this.rollSlotsInitiative(slotIdsOf(this.slots, combatantIds, { unrolledOnly: true }), options);
	}

	override async rollNPC(options?: RollInitiativeOptions | undefined) {
		return this.rollAll(options, true);
	}

	protected override async _preUpdate(changed: DeepPartial<this['_source']>, options: DocumentUpdateContext<this>, user: foundry.documents.BaseUser) {
		// Foundry picks the last turn of a round from the turns of the round it leaves, but a round only has the extra slots
		// added up to it.
		if (typeof changed.round === 'number' && typeof changed.turn === 'number') {
			changed.turn = Math.min(changed.turn, Math.max(this.slotsForRound(changed.round).length - 1, 0));
		}

		return super._preUpdate(changed, options, user);
	}

	protected override _onUpdate(changed: DeepPartial<this['_source']>, options: DocumentUpdateContext<this>, userId: string) {
		// Foundry only orders the turns again when combatants change, but extra slots add turns too, and a round only has
		// the extra slots added up to it. Order them before Foundry works out the current turn from them.
		if (foundry.utils.hasProperty(changed, `flags.genesys.${FLAG_EXTRA_SLOTS}`)) {
			this.setupTurns();
		} else if ('round' in changed) {
			// Leave the current turn to Foundry, which compares it with the new one for its turn events.
			this.turns = this.slotTurns() as any;
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
			// @ts-ignore: This assignment is exactly the same as in the original method.
			this.turn = Math.clamp(this.turn, 0, turns.length - 1);
		}

		const currentCombatant = turns[this.turn];
		this.current = {
			round: this.round,
			turn: this.turn,
			combatantId: currentCombatant ? currentCombatant.id : null,
			tokenId: currentCombatant ? currentCombatant.tokenId : null,
		};

		if (!this.previous) {
			this.previous = this.current;
		}

		return (this.turns = turns as any);
	}

	/**
	 * If this is the currently viewed encounter, re-render the CombatTracker application.
	 * We debounce this call to allow for updates to complete.
	 */
	debounceTrackerRender = foundry.utils.debounce(() => {
		if (ui.combat.viewed === this) {
			ui.combat.render();
		}
	}, 50);
}

/**
 * Register socket listener for Genesys Combats
 */
export function register() {
	// Helper function to determine if the code is being executed by only one GM.
	const isGmHub = () => {
		return game.user.isGM && game.users.filter((user) => user.isGM && user.active).every((candidate) => candidate.id >= game.user.id);
	};

	game.socket.on(SOCKET_NAME, async (payload: SocketPayload<CombatSocketBaseData>) => {
		if (!payload.data) {
			return;
		}

		const combat = game.combats.get(payload.data.combatId) as GenesysCombat | undefined;
		if (!combat) {
			console.error(`Socket received ${SocketOperation[payload.operation]} payload with invalid combat ID ${payload.data.combatId}`);
			return;
		}

		switch (payload.operation) {
			case SocketOperation.ClaimInitiativeSlot:
				if (!isGmHub()) {
					return;
				}

				const cisData = payload.data as ClaimInitiativeSlotData;
				await combat.claimSlot(cisData.round, cisData.slotId, cisData.combatantId);
				break;

			case SocketOperation.UpdateCombatTracker:
				combat.refreshLocalTurns();
				break;

			case SocketOperation.UpdateInitiativeForExtraSlot:
				if (!isGmHub()) {
					return;
				}

				const uifesData = payload.data as UpdateInitiativeForExtraSlotData;
				const currentSlotId = combat.currentSlotId;

				await combat.writeExtraSlotsInitiative(uifesData.updates);

				if (uifesData.updateTurn) {
					await combat.restoreTurn(currentSlotId);
				}
				break;

			default:
				return;
		}
	});
}
