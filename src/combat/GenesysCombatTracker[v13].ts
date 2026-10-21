// @ts-nocheck -- The types we have are not v13 compatible

/**
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
		const { slotId } = target.closest('[data-slot-id]').dataset;
		await this.viewed.claimSlotWithControlledToken(slotId);
	}

	static async #onCycleInitiativeSkill(_event: PointerEvent, target: HTMLElement) {
		const { slotId } = target.closest('[data-slot-id]').dataset;
		await this.viewed.cycleInitiativeSkill(slotId);
	}

	static async #onRollInitiative(_event: PointerEvent, target: HTMLElement) {
		const { slotId } = target.closest('[data-slot-id]').dataset;
		await this.viewed.rollSlotInitiative(slotId);
	}

	override async _prepareCombatContext(context, options) {
		await super._prepareCombatContext(context, options);

		const combat: GenesysCombat | null = this.viewed;
		context.control = combat?.userControlsTurn ?? false;
	}

	override async _prepareTrackerContext(context, _options) {
		const combat: GenesysCombat | null = this.viewed;
		if (!combat) {
			return;
		}

		const turns = (context.turns = []);

		for (const [index, slot] of combat.slots.entries()) {
			const combatant = combat.combatants.get(slot.originId) as GenesysCombatant;
			if (!combatant.visible) {
				continue;
			}

			// Once the combat started, a slot shows the combatant that claimed it, or nobody.
			const claimant = slot.claimantId ? (combat.combatants.get(slot.claimantId) as GenesysCombatant | undefined) : undefined;
			const turn = await this._prepareTurnContext(combat, combat.started && claimant ? claimant : combatant, index);
			turns.push({ ...turn, ...combat.slotTrackerContext(slot) });
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
			rerollEntry.callback = (li: HTMLElement) => this.viewed.rollSlotInitiative(li.dataset.slotId);
		}

		// Allow GMs to revoke an initiative slot claim.
		const revokeClaim = {
			name: 'Genesys.CombatTracker.RevokeInitiativeClaim',
			icon: '<i class="fas fa-broom"></i>',
			condition: (li: HTMLElement) => this.viewed?.canRevokeClaim(li.dataset.slotId) ?? false,
			callback: async (li: HTMLElement) => {
				await this.viewed.revokeSlot(this.viewed.round, li.dataset.slotId);
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
