/**
 * @file Combat Tracker for Foundry v12, which lists Initiative Slots instead of combatants.
 */

import { GenesysCombat } from '@/combat/GenesysCombat';
import { GenesysCombatant } from '@/combat/GenesysCombatant';

export class GenesysCombatTracker extends CombatTracker<GenesysCombat> {
	override get template(): string {
		return 'systems/genesys/templates/sidebar/combat-tracker.v12.hbs';
	}

	async _onClaimInitiativeSlot(event: JQuery.ClickEvent) {
		await this.viewed.claimSlotWithControlledToken((event.currentTarget as HTMLElement).dataset.claimSlot as string);
	}

	override activateListeners(html: JQuery) {
		super.activateListeners(html);

		html.find('a[data-claim-slot]').on('click', (event) => void this._onClaimInitiativeSlot(event));
	}

	override async getData(options: CombatTrackerOptions) {
		const data = await super.getData(options);
		const combat = this.viewed;

		if (!combat) {
			return data;
		}

		const slots = combat.slots;

		// The core tracker only lists the turns the user can see, but Initiative Slots are indexed on every turn.
		const visibleSlotIndices = combat.turns.flatMap((combatant, index) => (combatant.visible ? [index] : []));

		const turns = data.turns.map((t, visibleIndex) => {
			const slot = slots[visibleSlotIndices[visibleIndex]];
			const claimant = slot.claimantId ? combat.combatants.get<GenesysCombatant>(slot.claimantId) : undefined;

			let claimantOverride = {};

			// Once the combat started, a slot shows the combatant that claimed it.
			if (combat.started && claimant) {
				let defeated = claimant.isDefeated;
				const effects = new Set();
				if (claimant.token) {
					claimant.token.effects.forEach((e) => effects.add(e));
					// The types we have lack the token's overlay effect.
					const { overlayEffect } = claimant.token as { overlayEffect?: string };
					if (overlayEffect) {
						effects.add(overlayEffect);
					}
				}
				if (claimant.actor) {
					for (const e of claimant.actor.temporaryEffects) {
						if ((e as ActiveEffect).getFlag('core', 'statusId') === CONFIG.specialStatusEffects.DEFEATED) {
							defeated = true;
						} else if (e.img) {
							effects.add(e.img);
						}
					}
				}

				claimantOverride = {
					id: claimant.id,
					name: claimant.name,
					img: claimant.img ?? CONST.DEFAULT_TOKEN,
					owner: claimant.isOwner,
					defeated,
					hidden: claimant.hidden,
					canPing: claimant.sceneId === canvas.scene?.id && game.user.hasPermission('PING_CANVAS'),
					effects,
				};
			}

			return {
				...t,
				...claimantOverride,
				...combat.slotTrackerContext(slot),
			};
		});

		return {
			...data,
			turns,
			control: combat.userControlsTurn,
		};
	}

	protected override _contextMenu(html: JQuery<HTMLElement>) {
		ContextMenu.create(this, html, '.directory-item.claimed', this._getEntryContextOptions());
	}

	protected override _getEntryContextOptions(): EntryContextOption[] {
		const baseEntries = super._getEntryContextOptions();

		// Reroll the initiative of the slot, which may be one of the combatant's extra slots.
		const rerollIndex = baseEntries.findIndex((e) => e.name === 'COMBAT.CombatantReroll');

		if (rerollIndex >= 0) {
			baseEntries[rerollIndex].callback = (li) => void this.viewed.rollSlotInitiative(li[0].dataset.slotId as string);
		}

		// Allow GMs to revoke an initiative slot claim.
		const revokeClaim = {
			name: 'Genesys.CombatTracker.RevokeInitiativeClaim',
			icon: '<i class="fas fa-broom"></i>',
			condition: (li: JQuery<HTMLElement>) => this.viewed.canRevokeClaim(li[0].dataset.slotId as string),
			callback: async (li: JQuery<HTMLElement>) => {
				await this.viewed.revokeSlot(this.viewed.round, li[0].dataset.slotId as string);
			},
		};

		return [...baseEntries, revokeClaim];
	}

	protected override async _onCombatantControl(event: JQuery.ClickEvent<HTMLElement, HTMLElement, HTMLElement>) {
		event.preventDefault();
		event.stopPropagation();

		const btn = event.currentTarget;
		const li = btn.closest('.combatant') as HTMLElement;
		const combat = this.viewed;

		// Intercept use of the individual Roll Initiative buttons.
		switch (btn.dataset.control) {
			case 'rollInitiative':
				await combat.rollSlotInitiative(li.dataset.slotId as string);
				break;

			case 'cycleInitiativeSkill':
				await combat.cycleInitiativeSkill(li.dataset.slotId as string);
				break;

			default:
				await super._onCombatantControl(event);
		}
	}

	protected override async _onCombatantHoverIn(event: MouseEvent) {
		event.preventDefault();

		if (!(event.currentTarget as HTMLElement).classList.contains('claimed')) {
			return;
		}

		return super._onCombatantHoverIn(event);
	}

	protected override async _onCombatantMouseDown(event: MouseEvent) {
		event.preventDefault();

		if (!(event.currentTarget as HTMLElement).classList.contains('claimed')) {
			return;
		}

		return super._onCombatantMouseDown(event);
	}
}
