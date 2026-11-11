import type { GenesysRollInitiativeOptions } from '@/combat/GenesysCombat';
import type { Stored } from '@/data/Stored';
import { DataModelWithTokenAttributes, TokenAttributeDetails } from '@/token/GenesysTokenDocument';
import { newTokenAttributeValue, tokenAttributeMax } from '@/token/TokenAttributeValue';
import type { GenesysItem } from '@/item/GenesysItem';
import { itemsOfType } from '@/item/ItemTypes';
import type { ActorChanges, ActorSource } from '@/migrations/ActorMigration';
import { migrateCreatedActor } from '@/migrations/CreatedActorMigration';
import { removeDeletedFromCrews } from '@/operations/CrewDeletion';
import * as log from '@/log';
import { applyLapsingState, lapsingStateApplied, type ToggleStatusEffectOptions } from '@/effects/tokenStateMenu';

/**
 * An actor of the system, typed by its subtype: its `system` is the DataModel registered for that type.
 */
export class GenesysActor<SubType extends Actor.SubType = Actor.SubType> extends Actor<SubType> {
	/**
	 * The skills the actor owns, in item order.
	 */
	get skills(): Stored<GenesysItem<'skill'>>[] {
		return itemsOfType(this, 'skill');
	}

	/**
	 * Migrate an actor created from older data.
	 * @inheritDoc
	 */
	protected override async _preCreate(data: Actor.CreateData, options: Actor.Database.PreCreateOptions, user: User.Stored) {
		// An actor created from older data, for instance imported from an older module compendium, gets the migrations
		// the world's actors got: it loses its legacy copies of its items' effects and gets its equipment's effects
		// enabled (migrations 3 and 4), and its talent purchases linked to their talent (migration 5).
		const changes = migrateCreatedActor(this.toObject() as ActorSource);
		if (changes) {
			this.#applyToSource(changes);
		}

		return super._preCreate(data, options, user);
	}

	/**
	 * Remove the actors an operation deleted from the Crews of the world's vehicles. Foundry calls this once per
	 * operation with every actor it deleted, where the `deleteActor` hook runs once per actor.
	 * @inheritDoc
	 */
	protected static override async _onDeleteOperation(
		documents: Stored<GenesysActor>[],
		operation: Actor.Database.OnDeleteOperation,
		user: User.Stored,
	) {
		// fvtt-types declares the base method's documents as `never`, since no subclass's documents fit the base's type.
		await super._onDeleteOperation(documents as never, operation, user);
		// Foundry awaits this before it updates the Actors directory and resolves the deletion: the Crew writes don't hold
		// either back, and one that fails doesn't fail a deletion already done.
		removeDeletedFromCrews(documents).catch((error: unknown) => log.error('Removing deleted actors from the Crews failed', error));
	}

	#applyToSource({ update, itemEffects = {}, deletedEffects = [] }: ActorChanges) {
		if (update) {
			this.updateSource(update);
		}

		this.updateSource({ items: Object.entries(itemEffects).map(([_id, effects]) => ({ _id, effects })) });

		if (deletedEffects.length > 0) {
			// A non-recursive update replaces the effects with those listed.
			const keptEffects = this.toObject().effects.filter((effect) => effect._id === null || !deletedEffects.includes(effect._id));
			this.updateSource({ effects: keptEffects }, { recursive: false });
		}
	}

	/**
	 * Toggle a status effect, as the token's status menu does. A Lapsing Token State is applied for the rounds given, or
	 * those the user is asked for, and lasts until the end of its actor's turn when they have run out (CRB p. 114).
	 * @inheritDoc
	 */
	override async toggleStatusEffect(statusId: string, options: ToggleStatusEffectOptions = {}) {
		const state = lapsingStateApplied(this, statusId, options);
		if (!state) {
			return super.toggleStatusEffect(statusId, options);
		}

		return applyLapsingState(this, state, options);
	}

	/**
	 * Change one of the system's token attributes from a token's bar, the Token HUD or a counter of the sheet, within the
	 * bounds the rules give it.
	 * @inheritDoc
	 */
	override async modifyTokenAttribute(attribute: string, value: number, isDelta?: boolean, isBar?: boolean) {
		const tokenAttributes = (this.system.constructor as DataModelWithTokenAttributes)?.tokenAttributes;
		if (tokenAttributes) {
			const tokenAttribute = tokenAttributes[attribute] as TokenAttributeDetails | undefined;
			if (!tokenAttribute || !tokenAttribute.editable) {
				return this;
			}

			return await this.update({
				[`system.${tokenAttribute.valuePath}`]: newTokenAttributeValue({
					current: this.#read(tokenAttribute.valuePath),
					value,
					isDelta: !!isDelta,
					cappedThreshold: this.#cappedThreshold(tokenAttribute),
				}),
			});
		} else {
			return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
		}
	}

	/**
	 * The highest value one of the system's token attributes takes, such as twice a character's wound threshold:
	 * undefined when nothing caps it.
	 */
	tokenAttributeMax(attribute: string): number | undefined {
		const tokenAttribute = (this.system.constructor as DataModelWithTokenAttributes)?.tokenAttributes?.[attribute];
		return tokenAttribute ? tokenAttributeMax(this.#cappedThreshold(tokenAttribute)) : undefined;
	}

	#read(path: string) {
		return Number(foundry.utils.getProperty(this.system, path));
	}

	#cappedThreshold(tokenAttribute: TokenAttributeDetails) {
		return tokenAttribute.isBar && tokenAttribute.cappedAtTwiceMax ? this.#read(tokenAttribute.maxPath) : undefined;
	}

	/**
	 * Roll the Initiative Slots that this actor's combatants give this round: those without initiative, or all of them
	 * when rerolling.
	 * @inheritDoc
	 */
	override async rollInitiative({
		createCombatants = false,
		rerollInitiative = false,
		initiativeOptions = {},
	}: { createCombatants?: boolean; rerollInitiative?: boolean; initiativeOptions?: object } | undefined = {}) {
		// Foundry leaves out the combatants that have rolled their own slot: hand them all over, the combat picks the slots.
		const options: GenesysRollInitiativeOptions = { ...initiativeOptions, slotsOfCombatants: rerollInitiative ? 'all' : 'unrolled' };

		return super.rollInitiative({ createCombatants, rerollInitiative: true, initiativeOptions: options });
	}
}
