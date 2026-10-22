/**
 * @file Combat Tracker for Foundry v13 and later, which lists Initiative Slots instead of combatants.
 */

import { GenesysCombat } from '@/combat/GenesysCombat';
import { GenesysCombatant } from '@/combat/GenesysCombatant';

type RenderContext = foundry.applications.ApplicationRenderContext;
type RenderOptions = foundry.applications.ApplicationRenderOptions;

// v12: Foundry v12 loads this module too, but has no ApplicationV2 Combat Tracker to extend. It only registers the v12 one, so
// the class is never built on top of this stand-in.
const ExtendedClass =
	foundry.applications.sidebar?.tabs.CombatTracker ??
	(CombatTracker as unknown as typeof foundry.applications.sidebar.tabs.CombatTracker);

/** The id of the Initiative Slot whose row holds the element. */
function slotIdOf(element: HTMLElement) {
	return element.closest<HTMLElement>('[data-slot-id]')?.dataset.slotId;
}

export class GenesysCombatTracker extends ExtendedClass<GenesysCombat> {
	static override DEFAULT_OPTIONS = {
		actions: {
			claimInitiativeSlot: GenesysCombatTracker.#onClaimInitiativeSlot,
			cycleInitiativeSkill: GenesysCombatTracker.#onCycleInitiativeSkill,
			rollInitiative: GenesysCombatTracker.#onRollInitiative,
		},
	};

	static override PARTS = {
		...ExtendedClass.PARTS,
		header: {
			template: 'systems/genesys/templates/sidebar/combat/header.hbs',
		},
		tracker: {
			template: 'systems/genesys/templates/sidebar/combat/tracker.hbs',
			scrollable: [''],
		},
	};

	static async #onClaimInitiativeSlot(this: GenesysCombatTracker, _event: PointerEvent, target: HTMLElement) {
		const slotId = slotIdOf(target);
		if (slotId) {
			await this.viewed?.claimSlotWithControlledToken(slotId);
		}
	}

	static async #onCycleInitiativeSkill(this: GenesysCombatTracker, _event: PointerEvent, target: HTMLElement) {
		const slotId = slotIdOf(target);
		if (slotId) {
			await this.viewed?.cycleInitiativeSkill(slotId);
		}
	}

	static async #onRollInitiative(this: GenesysCombatTracker, _event: PointerEvent, target: HTMLElement) {
		const slotId = slotIdOf(target);
		if (slotId) {
			await this.viewed?.rollSlotInitiative(slotId);
		}
	}

	override async _prepareCombatContext(context: RenderContext, options: RenderOptions) {
		await super._prepareCombatContext(context, options);

		context.control = this.viewed?.userControlsTurn ?? false;
	}

	override async _prepareTrackerContext(context: RenderContext, _options: RenderOptions) {
		const combat = this.viewed;
		if (!combat) {
			return;
		}

		const turns: Record<string, unknown>[] = [];
		context.turns = turns;

		for (const [index, slot] of combat.slots.entries()) {
			const combatant = combat.combatants.get(slot.originId) as GenesysCombatant;
			if (!combatant.visible) {
				continue;
			}

			// Once the combat started, a slot shows the combatant that claimed it, or nobody.
			const claimant = slot.claimantId ? combat.combatants.get<GenesysCombatant>(slot.claimantId) : undefined;
			const turn = await this._prepareTurnContext(combat, combat.started && claimant ? claimant : combatant, index);
			turns.push({ ...turn, ...combat.slotTrackerContext(slot) });
		}
	}

	override _createContextMenu(
		handler: () => foundry.applications.ContextMenuEntry[],
		selector: string,
		options?: foundry.applications.ContextMenuOptions,
	) {
		// Only claimed slots show a combatant to act on.
		return super._createContextMenu(handler, selector === '.combatant' ? '.combatant.claimed' : selector, options);
	}

	override _getEntryContextOptions() {
		const baseEntries = super._getEntryContextOptions();

		// Reroll the initiative of the slot, which may be one of the combatant's Extra Slots.
		const rerollEntry = baseEntries.find((e) => e.name === 'COMBAT.CombatantReroll');
		if (rerollEntry) {
			rerollEntry.callback = async (li: HTMLElement) => {
				const slotId = slotIdOf(li);
				if (slotId) {
					await this.viewed?.rollSlotInitiative(slotId);
				}
			};
		}

		// Allow GMs to revoke an initiative slot claim.
		const revokeClaim = {
			name: 'Genesys.CombatTracker.RevokeInitiativeClaim',
			icon: '<i class="fas fa-broom"></i>',
			condition: (li: HTMLElement) => {
				const slotId = slotIdOf(li);
				return slotId ? this.viewed?.canRevokeClaim(slotId) ?? false : false;
			},
			callback: async (li: HTMLElement) => {
				const slotId = slotIdOf(li);
				const combat = this.viewed;
				if (slotId && combat) {
					await combat.revokeSlot(combat.round, slotId);
				}
			},
		};

		return [...baseEntries, revokeClaim];
	}

	override _onCombatantHoverIn(event: PointerEvent) {
		if (!(event.target instanceof Element) || !event.target.closest('.combatant')?.classList.contains('claimed')) {
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
