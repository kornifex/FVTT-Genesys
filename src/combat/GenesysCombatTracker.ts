/**
 * @file Combat Tracker, which lists Initiative Slots instead of combatants.
 */

import { GenesysCombat } from '@/combat/GenesysCombat';
import { GenesysCombatant } from '@/combat/GenesysCombatant';
import { isFoundryV13 } from '@/foundryGeneration';

type RenderContext = foundry.applications.ApplicationRenderContext;
type RenderOptions = foundry.applications.ApplicationRenderOptions;

/** The id of the Initiative Slot whose row holds the element. */
function slotIdOf(element: HTMLElement) {
	return element.closest<HTMLElement>('[data-slot-id]')?.dataset.slotId;
}

/**
 * The Combat Tracker, whose rows are the Initiative Slots of the round and the combatants that Claim them.
 */
export class GenesysCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker<GenesysCombat> {
	static override DEFAULT_OPTIONS = {
		actions: {
			claimInitiativeSlot: GenesysCombatTracker.#onClaimInitiativeSlot,
			cycleInitiativeSkill: GenesysCombatTracker.#onCycleInitiativeSkill,
			rollInitiative: GenesysCombatTracker.#onRollInitiative,
		},
	};

	static override PARTS = {
		...foundry.applications.sidebar.tabs.CombatTracker.PARTS,
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

	override _getEntryContextOptions(): foundry.applications.ContextMenuEntry[] {
		const baseEntries = super._getEntryContextOptions();

		// Reroll the initiative of the slot, which may be one of the combatant's Extra Slots.
		const rerollSlot = async (li: HTMLElement) => {
			const slotId = slotIdOf(li);
			if (slotId) {
				await this.viewed?.rollSlotInitiative(slotId);
			}
		};

		// Allow GMs to revoke an initiative slot claim.
		const canRevokeClaim = (li: HTMLElement) => {
			const slotId = slotIdOf(li);
			return slotId ? this.viewed?.canRevokeClaim(slotId) ?? false : false;
		};
		const revokeClaim = async (li: HTMLElement) => {
			const slotId = slotIdOf(li);
			const combat = this.viewed;
			if (slotId && combat) {
				await combat.revokeSlot(combat.round, slotId);
			}
		};

		// v13: the entries name their fields `name`, `condition` and `callback`, and core's reroll entry has another key.
		if (isFoundryV13()) {
			const v13RerollEntry = baseEntries.find((e) => e.name === 'COMBAT.CombatantReroll');
			if (v13RerollEntry) {
				v13RerollEntry.callback = rerollSlot;
			}
			const v13RevokeEntry = {
				name: 'Genesys.CombatTracker.RevokeInitiativeClaim',
				icon: '<i class="fas fa-broom"></i>',
				condition: canRevokeClaim,
				callback: revokeClaim,
			};
			return [...baseEntries, v13RevokeEntry];
		}

		const rerollEntry = baseEntries.find((e) => e.label === 'COMBATANT.ACTIONS.Reroll');
		if (rerollEntry) {
			rerollEntry.onClick = (_event, li) => rerollSlot(li);
		}
		const revokeEntry = {
			label: 'Genesys.CombatTracker.RevokeInitiativeClaim',
			icon: 'fa-solid fa-broom',
			visible: canRevokeClaim,
			onClick: (_event: PointerEvent, li: HTMLElement) => revokeClaim(li),
		};
		return [...baseEntries, revokeEntry];
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
