/**
 * @file Combat Tracker, which lists Initiative Slots instead of combatants.
 */

import { isFoundryV13 } from '@/foundryGeneration';

type RenderContext = foundry.applications.sidebar.tabs.CombatTracker.RenderContext;
type RenderOptions = foundry.applications.api.HandlebarsApplicationMixin.RenderOptions;
type ContextMenuEntry = foundry.applications.ux.ContextMenu.Entry<HTMLElement>;

/** The id of the Initiative Slot whose row holds the element. */
function slotIdOf(element: HTMLElement) {
	return element.closest<HTMLElement>('[data-slot-id]')?.dataset.slotId;
}

/**
 * The keys of core's labels for the controls of a combatant's row, which v14 renamed.
 */
function controlLabels({ hidden, isDefeated }: { hidden: boolean; isDefeated: boolean }) {
	// v13: its keys name each toggle, whatever the combatant's state.
	if (isFoundryV13()) {
		return {
			hidden: 'COMBAT.ToggleVis',
			defeated: 'COMBAT.ToggleDead',
			ping: 'COMBAT.PingCombatant',
			panTo: 'COMBAT.PanToCombatant',
		};
	}

	return {
		hidden: hidden ? 'COMBATANT.Show' : 'COMBATANT.Hide',
		defeated: isDefeated ? 'COMBATANT.UnmarkDefeated' : 'COMBATANT.MarkDefeated',
		ping: 'COMBATANT.Ping',
		panTo: 'COMBATANT.PanTo',
	};
}

/**
 * The Combat Tracker, whose rows are the Initiative Slots of the round and the combatants that Claim them.
 */
export class GenesysCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
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

		const turns: (foundry.applications.sidebar.tabs.CombatTracker.TurnContext & {
			controlLabels: ReturnType<typeof controlLabels>;
		})[] = [];
		context.turns = turns;

		for (const [index, slot] of combat.slots.entries()) {
			// A slot's origin is one of the combat's combatants.
			const combatant = combat.combatants.get(slot.originId)!;
			if (!combatant.visible) {
				continue;
			}

			// Once the combat started, a slot shows the combatant that claimed it, or nobody.
			const claimant = slot.claimantId ? combat.combatants.get(slot.claimantId) : undefined;
			const turn = await this._prepareTurnContext(combat, combat.started && claimant ? claimant : combatant, index);
			turns.push({ ...turn, ...combat.slotTrackerContext(slot), controlLabels: controlLabels(turn) });
		}
	}

	override _createContextMenu(
		handler: foundry.applications.api.ApplicationV2.CreateContextMenuHandler,
		selector: string,
		options: foundry.applications.api.ApplicationV2.CreateContextMenuOptions,
	) {
		// Only claimed slots show a combatant to act on.
		return super._createContextMenu(handler, selector === '.combatant' ? '.combatant.claimed' : selector, options);
	}

	override _getEntryContextOptions(): ContextMenuEntry[] {
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
				v13RerollEntry.callback = (li) => void rerollSlot(li);
			}
			const v13RevokeEntry = {
				name: 'Genesys.CombatTracker.RevokeInitiativeClaim',
				icon: '<i class="fas fa-broom"></i>',
				condition: canRevokeClaim,
				callback: revokeClaim,
			};
			// v13: its entries have no `label`, which v14's require.
			return [...baseEntries, v13RevokeEntry] as ContextMenuEntry[];
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

	override _onCombatantMouseDown(event: PointerEvent, target: foundry.applications.api.ApplicationV2.ActionTarget) {
		if (!target?.classList.contains('claimed')) {
			return;
		}

		return super._onCombatantMouseDown(event, target);
	}
}
