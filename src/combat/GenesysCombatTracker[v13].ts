// @ts-nocheck -- The types we have are not v13 compatible

/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @file Combat Tracker for Foundry v13, which lists Initiative Slots instead of combatants.
 */

import GenesysCombat from '@/combat/GenesysCombat';
import GenesysCombatant from '@/combat/GenesysCombatant';

// Foundry v12 loads this module too, but has no ApplicationV2 Combat Tracker to extend.
const ExtendedClass = foundry?.applications?.sidebar?.tabs?.CombatTracker ?? CombatTracker<GenesysCombat>;

export default class GenesysCombatTracker extends ExtendedClass {
	static DEFAULT_OPTIONS = {
		actions: {
			claimInitiativeSlot: GenesysCombatTracker.#onClaimInitiativeSlot,
			cycleInitiativeSkill: GenesysCombatTracker.#onCycleInitiativeSkill,
			rollInitiative: GenesysCombatTracker.#onRollInitiative,
		},
	};

	static PARTS = {
		...ExtendedClass.PARTS,
		header: {
			template: 'systems/genesys/templates/sidebar/combat/header.hbs',
		},
		tracker: {
			template: 'systems/genesys/templates/sidebar/combat/tracker.hbs',
			scrollable: [''],
		},
	};

	static async #onClaimInitiativeSlot(_event: PointerEvent, target: HTMLElement) {
		const { slotIndex } = target.closest('[data-slot-index]').dataset;
		await this.viewed.claimSlotWithControlledToken(+slotIndex);
	}

	static async #onCycleInitiativeSkill(_event: PointerEvent, target: HTMLElement) {
		const { combatantId } = target.closest('[data-combatant-id]').dataset;
		const combatant = this.viewed.combatants.get(combatantId) as GenesysCombatant | undefined;
		if (combatant?.isOwner) {
			await combatant.cycleInitiativeSkill();
		}
	}

	static async #onRollInitiative(_event: PointerEvent, target: HTMLElement) {
		const { combatantId, activationId } = target.closest('[data-combatant-id]').dataset;
		const extraSlotsRolls = +activationId >= 0 ? [+activationId] : [];
		await this.viewed.rollInitiative([combatantId], {}, { prompt: true, extraSlotsRolls });
	}

	override async _prepareCombatContext(context, options) {
		await super._prepareCombatContext(context, options);

		// Give the player that claims the current slot the ability to control the turn.
		const combat: GenesysCombat | null = this.viewed;
		const claimantId = combat?.claimantForSlot(combat.round, combat.turn);
		const claimant = claimantId ? (combat.combatants.get(claimantId) as GenesysCombatant) : undefined;
		context.control = claimant?.players?.includes(game.user) ?? false;
	}

	override async _prepareTrackerContext(context, _options) {
		const combat: GenesysCombat | null = this.viewed;
		if (!combat) {
			return;
		}

		const slotInitiatives = combat.slotInitiatives;
		const turns = (context.turns = []);

		for (const [slotIndex, combatant] of combat.turns.entries()) {
			if (!combatant.visible) {
				continue;
			}

			const claimantId = combat.claimantForSlot(combat.round, slotIndex);
			const claimant = claimantId ? (combat.combatants.get(claimantId) as GenesysCombatant | undefined) : undefined;
			const { activationId, initiative } = slotInitiatives[slotIndex];

			// Once the combat started, a slot shows the combatant that claimed it, or nobody.
			const turn = await this._prepareTurnContext(combat, combat.started && claimant ? claimant : combatant, slotIndex);
			turns.push({
				...turn,
				claimed: combat.started ? claimant !== undefined : true,
				canClaim: combatant.disposition === 'friendly' || game.user.isGM,
				slotType: combatant.disposition === 'friendly' ? 'pc' : 'npc',
				slotIndex,
				activationId,
				hasRolled: initiative !== null,
				successes: Math.floor(initiative ?? 0),
				advantages: Math.round(((initiative ?? 0) - Math.floor(initiative ?? 0)) * 100),
				initiativeSkill: (combatant as GenesysCombatant).initiativeSkill?.skillName ?? combat.initiativeSkills[0].skillName,
			});
		}
	}

	override _createContextMenu(handler, selector, options) {
		// Only claimed slots show a combatant to act on.
		return super._createContextMenu(handler, selector === '.combatant' ? '.combatant.claimed' : selector, options);
	}

	override _getEntryContextOptions() {
		const baseEntries = super._getEntryContextOptions();

		// Reroll the initiative of the slot, which may be one of the combatant's extra slots.
		const rerollEntry = baseEntries.find((e) => e.name === 'COMBAT.CombatantReroll');
		if (rerollEntry) {
			rerollEntry.callback = (li: HTMLElement) => {
				const activationId = +li.dataset.activationId;
				const extraSlotsRolls = activationId >= 0 ? [activationId] : [];
				return this.viewed.rollInitiative([li.dataset.combatantId], {}, { prompt: true, extraSlotsRolls });
			};
		}

		// Allow GMs to revoke an initiative slot claim.
		const revokeClaim = {
			name: 'Genesys.CombatTracker.RevokeInitiativeClaim',
			icon: '<i class="fas fa-broom"></i>',
			condition: () => game.user.isGM && this.viewed?.started,
			callback: async (li: HTMLElement) => {
				const index = +li.dataset.slotIndex;
				if (!isNaN(index)) {
					await this.viewed.revokeSlot(this.viewed.round, index);
				}
			},
		};

		return [...baseEntries, revokeClaim];
	}

	override _onCombatantHoverIn(event: PointerEvent) {
		if (!event.target.closest('.combatant')?.classList.contains('claimed')) {
			return;
		}

		return super._onCombatantHoverIn(event);
	}

	override _onCombatantMouseDown(event: PointerEvent, target: HTMLElement) {
		if (!target?.classList.contains('claimed')) {
			return;
		}

		return super._onCombatantMouseDown(event, target);
	}
}
