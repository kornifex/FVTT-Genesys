/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file
 */

import GenesysCombatant from '@/combat/GenesysCombatant';
import GenesysRoller from '@/dice/GenesysRoller';
import DicePrompt from '@/app/DicePrompt';
import { Characteristic } from '@/data/Characteristics';
import { ClaimInitiativeSlotData, emit as socketEmit, SOCKET_NAME, SocketOperation, SocketPayload, CombatSocketBaseData, UpdateInitiativeForExtraSlotData } from '@/socket';
import { buildSlots, claimRefusal, decodeInitiative, encodeInitiative, ExtraSlot, InitiativeSlot, RoundClaims, slotView } from '@/combat/InitiativeSlots';

// Claims are keyed by slot id. They replace the `claimants` flag, which keyed them by position in the turn order.
const FLAG_CLAIMS = 'slotClaims';
const FLAG_EXTRA_SLOTS = 'extraSlots';

type ClaimData = Record<number, RoundClaims>;

export type GenesysRollInitiativeOptions = {
	prompt?: boolean;
	extraSlotsRolls?: number[];
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
			activationId: slot.activationId,
			hasRolled: slot.initiative !== null,
			...decodeInitiative(slot.initiative),
			initiativeSkill: origin.initiativeSkill?.skillName ?? this.initiativeSkills[0].skillName,
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
	 * Roll the initiative of one Initiative Slot of a combatant, its own (activation -1) or one of its extra slots.
	 */
	async rollSlotInitiative(combatantId: string, activationId: number) {
		return this.rollInitiative([combatantId], {}, { prompt: true, extraSlotsRolls: activationId >= 0 ? [activationId] : [] });
	}

	async cycleInitiativeSkill(combatantId: string) {
		const combatant = this.combatants.get(combatantId) as GenesysCombatant | undefined;
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

	extraSlotsForRound(round: number) {
		const extraSlots = (this.getFlag('genesys', FLAG_EXTRA_SLOTS) ?? []) as Omit<ExtraSlot, 'index'>[];

		return extraSlots.reduce((accum, slot, index) => {
			if (slot.startingRound <= round) {
				accum.push({ ...slot, index });
			}
			return accum;
		}, [] as ExtraSlot[]);
	}

	async addExtraSlot(combatantId: string, round: number) {
		const extraSlots = [...((this.getFlag('genesys', FLAG_EXTRA_SLOTS) ?? []) as Omit<ExtraSlot, 'index'>[])];

		extraSlots.push({
			activationSource: combatantId,
			initiative: null,
			startingRound: round,
		});

		await this.setFlag('genesys', FLAG_EXTRA_SLOTS, extraSlots);
	}

	async updateExtraSlotsInitiative(updates: Omit<ExtraSlot, 'activationSource' | 'startingRound'>[]) {
		const extraSlots = (this.getFlag('genesys', FLAG_EXTRA_SLOTS) ?? []) as Omit<ExtraSlot, 'index'>[];

		for (const update of updates) {
			extraSlots[update.index].initiative = update.initiative;
		}

		await this.setFlag('genesys', FLAG_EXTRA_SLOTS, extraSlots);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	override async rollInitiative(ids: string | string[], { formula = null, updateTurn = true, messageOptions = {} }: RollInitiativeOptions = {}, { prompt = false, extraSlotsRolls = [] }: GenesysRollInitiativeOptions = {}) {
		ids = typeof ids === 'string' ? [ids] : ids;
		const currentId = this.combatant?.id;
		const chatRollMode = game.settings.get('core', 'rollMode');

		const remainingExtraSlotsRolls = [...extraSlotsRolls];
		const extraSlotsPerCombatant = this.extraSlotsForRound(this.round).reduce(
			(accum, slot, index) => {
				if (accum[slot.activationSource]) {
					accum[slot.activationSource].push(index);
				} else {
					accum[slot.activationSource] = [index];
				}
				return accum;
			},
			{} as Record<string, number[]>,
		);

		let ignoreUpdateTurn = false;
		const extraSlotsUpdates: { index: number; initiative: number }[] = [];
		const combatantsUpdates: { _id: string; initiative: number }[] = [];
		const messages: any[] = [];
		for (const [i, id] of ids.entries()) {
			// Combatant data
			const combatant = this.combatants.get(id) as Embedded<GenesysCombatant> | undefined;
			if (!combatant?.isOwner) {
				continue;
			}

			// Initiative roll result
			const initiativeSkill = combatant.initiativeSkill ?? this.initiativeSkills[0];
			let skillName = initiativeSkill.skillName;
			let roll: Roll | undefined;

			if (prompt) {
				try {
					const promptedRoll = await DicePrompt.promptForInitiative(combatant.actor, skillName, { difficulty: '', characteristic: initiativeSkill.skillChar });

					roll = promptedRoll.roll;
					skillName = promptedRoll.skillName;
				} catch {
					continue;
				}
			}

			if (!roll) {
				roll = combatant.getInitiativeRoll(skillName, initiativeSkill.skillChar);
			}

			await roll.evaluate();
			const results = GenesysRoller.parseRollResults(roll);
			const superCharClass = roll.formula.toLowerCase().includes('dpx') ? 'super-char' : 'hide-it';
			const newInitiative = encodeInitiative(results.netSuccess, results.netAdvantage);

			if (extraSlotsPerCombatant[combatant.id]) {
				// Check if the combatant is tied to an extra initiative slot that we want to roll.
				const resrIndex = remainingExtraSlotsRolls.findIndex((slotId) => extraSlotsPerCombatant[combatant.id].includes(slotId));
				if (resrIndex === -1) {
					combatantsUpdates.push({ _id: combatant.id, initiative: newInitiative });
				} else {
					const extraSlotIndex = remainingExtraSlotsRolls.splice(resrIndex, 1)[0];
					extraSlotsUpdates.push({ index: extraSlotIndex, initiative: newInitiative });
				}
			} else {
				combatantsUpdates.push({ _id: combatant.id, initiative: newInitiative });
			}

			const rollData = {
				description: game.i18n.format('Genesys.Rolls.Description.Initiative', { skill: skillName, superChar: superCharClass }),
				results,
			};
			const html = await renderTemplate('systems/genesys/templates/chat/rolls/skill.hbs', rollData);

			const chatData = {
				user: game.user.id,
				speaker: { actor: combatant.actorId },
				content: html,
				sound: i > 0 ? null : CONFIG.sounds.dice,
				rolls: [roll],
			};
			const rollMode = ('rollMode' in messageOptions ? messageOptions.rollMode : combatant.hidden ? CONST.DICE_ROLL_MODES.PRIVATE : chatRollMode) as RollMode;
			ChatMessage.applyRollMode(chatData as any, rollMode);

			messages.push(chatData);
		}

		if (!messages.length) {
			return this;
		}

		if (extraSlotsUpdates.length) {
			if (game.user.isGM) {
				this.updateExtraSlotsInitiative(extraSlotsUpdates);

				// Force a re-calculation of turns and a re-render of the tracker if there are no updates that would do it for us.
				if (!combatantsUpdates.length) {
					this.setupTurns();
					this.debounceTrackerRender();
					socketEmit(SocketOperation.UpdateCombatTracker, { combatId: this.id });
				}
			} else {
				ignoreUpdateTurn = true;
				socketEmit(SocketOperation.UpdateInitiativeForExtraSlot, {
					combatId: this.id,
					updates: extraSlotsUpdates,
					updateTurn,
				});
			}
		}

		if (combatantsUpdates.length) {
			await this.updateEmbeddedDocuments('Combatant', combatantsUpdates);
		}

		if (!ignoreUpdateTurn && updateTurn && currentId) {
			await this.update({ turn: this.turns.findIndex((t) => t.id === currentId) });
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

		// Force a re-calculation of turns and a re-render of the tracker
		this.setupTurns();
		this.debounceTrackerRender();
		socketEmit(SocketOperation.UpdateCombatTracker, { combatId: this.id });
	}

	override async resetAll() {
		this.updateExtraSlotsInitiative(
			this.extraSlotsForRound(this.round).map((slot) => ({
				index: slot.index,
				initiative: null,
			})),
		);

		return await super.resetAll();
	}

	override async rollAll(options?: RollInitiativeOptions | undefined, onlyNPCs: boolean = false) {
		const combatantIds = this.combatants.reduce((accum, combatant) => {
			if (combatant.isOwner && (!onlyNPCs || combatant.isNPC) && combatant.initiative === null) {
				accum.push(combatant.id);
			}
			return accum;
		}, [] as string[]);

		const extraSlotsRolls = this.extraSlotsForRound(this.round).reduce((accum, slot) => {
			if (slot.initiative === null) {
				const combatant = this.combatants.get(slot.activationSource) as GenesysCombatant | undefined;
				if (combatant && combatant.isOwner && (!onlyNPCs || combatant.isNPC)) {
					combatantIds.push(combatant.id);
					accum.push(slot.index);
				}
			}
			return accum;
		}, [] as number[]);

		return this.rollInitiative(combatantIds, options, { extraSlotsRolls });
	}

	override async rollNPC(options?: RollInitiativeOptions | undefined) {
		return this.rollAll(options, true);
	}

	override setupTurns() {
		// Each turn is an Initiative Slot, given by the combatant whose initiative it holds.
		const turns = this.slots.map((slot) => this.combatants.get(slot.originId)!);

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
				combat.setupTurns();
				combat.debounceTrackerRender();
				break;

			case SocketOperation.UpdateInitiativeForExtraSlot:
				if (!isGmHub()) {
					return;
				}

				const uifesData = payload.data as UpdateInitiativeForExtraSlotData;
				const currentCombatantId = combat.combatant?.id;

				await combat.updateExtraSlotsInitiative(uifesData.updates);
				combat.setupTurns();
				combat.debounceTrackerRender();
				socketEmit(SocketOperation.UpdateCombatTracker, { combatId: uifesData.combatId });

				if (uifesData.updateTurn && currentCombatantId) {
					await combat.update({ turn: combat.turns.findIndex((combatant) => combatant.id === currentCombatantId) });
				}
				break;

			default:
				return;
		}
	});
}
