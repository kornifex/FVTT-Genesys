/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file
 */

import GenesysCombat from '@/combat/GenesysCombat';
import GenesysCombatant from '@/combat/GenesysCombatant';

export default class GenesysCombatTracker extends CombatTracker<GenesysCombat> {
	override get template(): string {
		return 'systems/genesys/templates/sidebar/combat-tracker.hbs';
	}

	async _onClaimInitiativeSlot(event: JQuery.ClickEvent) {
		await this.viewed.claimSlotWithControlledToken(+$(event.currentTarget).data('claim-slot'));
	}

	override activateListeners(html: JQuery) {
		super.activateListeners(html);

		html.find('a[data-claim-slot]').on('click', this._onClaimInitiativeSlot.bind(this));
	}

	override async getData(options: CombatTrackerOptions) {
		const data = await super.getData(options);
		const combat = this.viewed;

		if (!combat) {
			return data;
		}

		const slotInitiatives = combat.slotInitiatives;

		// The core tracker only lists the turns the user can see, but Initiative Slots are indexed on every turn.
		const visibleSlotIndices = combat.turns.flatMap((combatant, index) => (combatant.visible ? [index] : []));

		const turns = data.turns.map((t, visibleIndex) => {
			const slotIndex = visibleSlotIndices[visibleIndex];
			const combatant = combat.combatants.get(t.id) as GenesysCombatant;
			const claimantId = combat.claimantForSlot(combat.round, slotIndex);
			const claimant = claimantId ? (combat.combatants.get(claimantId) as GenesysCombatant) : undefined;

			const claimed = combat.started ? claimantId !== undefined : true;
			const canClaim = combatant.disposition === 'friendly' || game.user.isGM;

			const slotInitiative = slotInitiatives[slotIndex];

			let claimantOverride = {};

			if (combat.started && claimant) {
				let defeated = claimant.isDefeated;
				const effects = new Set();
				if (claimant.token) {
					claimant.token.effects.forEach((e) => effects.add(e));
					if ((claimant.token as any).overlayEffect) {
						effects.add((claimant.token as any).overlayEffect);
					}
				}
				if (claimant.actor) {
					for (const e of claimant.actor.temporaryEffects) {
						if ((e as any).getFlag('core', 'statusId') === CONFIG.specialStatusEffects.DEFEATED) {
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
				slotType: combatant.disposition === 'friendly' ? 'pc' : 'npc',
				initiative: slotInitiative.initiative,
				hasRolled: slotInitiative.initiative !== null,
				initiativeSkill: combatant.initiativeSkill?.skillName ?? combat.initiativeSkills[0].skillName,
				claimed,
				canClaim,
				slotIndex,
				activationId: slotInitiative.activationId,
			};
		});

		// Give the player that claims the current slot the ability to control the turn.
		const claimantId = combat.claimantForSlot(combat.round, combat.turn);
		const claimant = claimantId ? (combat.combatants.get(claimantId) as GenesysCombatant) : undefined;

		return {
			...data,
			turns,
			control: claimant?.players?.includes(game.user) ?? false,
		};
	}

	protected override _contextMenu(html: JQuery<HTMLElement>) {
		ContextMenu.create(this, html, '.directory-item.claimed', this._getEntryContextOptions());
	}

	protected override _getEntryContextOptions(): EntryContextOption[] {
		const baseEntries = super._getEntryContextOptions();

		// Update the Reroll Initiative behavior.
		const rerollIndex = baseEntries.findIndex((e) => e.name === 'COMBAT.CombatantReroll');

		if (rerollIndex >= 0) {
			baseEntries[rerollIndex].callback = (li) => {
				const combatant = this.viewed.combatants.get(li.data('combatant-id'));
				const activationId = +li.data('activation-id');
				const extraSlotsRolls = activationId >= 0 ? [activationId] : [];
				if (combatant) {
					return this.viewed.rollInitiative([combatant.id], {}, { prompt: true, extraSlotsRolls });
				}
			};
		}

		// Allow GMs to revoke an initiative slot claim.
		const revokeClaim = {
			name: 'Genesys.CombatTracker.RevokeInitiativeClaim',
			icon: '<i class="fas fa-broom"></i>',
			callback: async (li: JQuery<HTMLElement>) => {
				const index = +li.data('slot-index');
				if (!isNaN(index)) {
					await this.viewed.revokeSlot(this.viewed.round, index);
				}
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
				const activationId = +(li.dataset.activationId as string);
				const extraSlotsRolls = activationId >= 0 ? [activationId] : [];
				await combat.rollInitiative([li.dataset.combatantId as string], {}, { prompt: true, extraSlotsRolls });
				break;

			case 'cycleInitiativeSkill':
				const combatant = this.viewed.combatants.get(li.dataset.combatantId as string) as GenesysCombatant | undefined;
				if (combatant?.isOwner) {
					await combatant.cycleInitiativeSkill();
				}
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
