/**
 * @file Combat Tracker, which lists Initiative Slots instead of combatants.
 */

import type { DeepPartial } from 'fvtt-types/utils';

import { isFoundryV13 } from '@/foundryGeneration';
import { warn } from '@/log';

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
		tracker: {
			template: 'systems/genesys/templates/sidebar/combat/tracker.hbs',
			templates: ['systems/genesys/templates/sidebar/combat/initiative-slot.hbs'],
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

	override async _onRender(context: DeepPartial<RenderContext>, options: DeepPartial<RenderOptions>) {
		await super._onRender(context, options);

		if (options.parts?.includes('header') && game.user.isGM) {
			this.#addExtraSlotButton();
		}
	}

	/**
	 * Adds the GM's button for an Extra Slot to core's header, after its bulk rolls, and a spacer to the controls on the
	 * other side, which keeps the round centred.
	 */
	#addExtraSlotButton() {
		const controls = this.element.querySelector('.combat-tracker-header .encounter-controls');
		const rollNPC = controls?.querySelector('[data-action="rollNPC"]');
		const menu = controls?.querySelector('.encounter-context-menu');
		if (!rollNPC || !menu) {
			warn("Core's combat tracker header has no NPC roll button or combat menu: the Extra Slot button is left out.");
			return;
		}

		const button = document.createElement('button');
		button.type = 'button';
		// Core's header calls the combat's method named by the action of a `combat-control` button.
		button.className = 'inline-control combat-control icon fa-solid fa-user-plus';
		button.dataset.action = 'addInitiativeSlot' satisfies keyof Combat.Implementation;
		const label = 'Genesys.Tooltips.AddExtraInitiativeSlot';
		button.dataset.tooltip = label;
		button.ariaLabel = game.i18n.localize(label);
		button.disabled = !this.viewed?.turns.length;
		rollNPC.after(button);

		const spacer = document.createElement('div');
		spacer.className = 'spacer';
		menu.before(spacer);
	}

	override async _prepareTurnContext(combat: Combat.Stored, combatant: Combatant.Stored, index: number) {
		// Core prepares one turn per entry of the combat's turns, which `setupTurns` sets to its Initiative Slots, each given
		// by its origin. A turn without a slot, which that leaves none of, is shown as core prepares it rather than failing
		// the render.
		const slot = combat.slots[index];
		if (!slot) {
			return super._prepareTurnContext(combat, combatant, index);
		}

		const turn = await super._prepareTurnContext(combat, combat.slotCombatant(slot) ?? combatant, index);
		return { ...turn, ...combat.slotTrackerContext(slot), controlLabels: controlLabels(turn) };
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
