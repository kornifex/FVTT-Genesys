import type { GenesysRollInitiativeOptions } from '@/combat/GenesysCombat';
import type { Stored } from '@/data/Stored';
import { DataModelWithTokenAttributes, TokenAttributeDetails } from '@/token/GenesysTokenDocument';
import { newTokenAttributeValue } from '@/token/TokenAttributeValue';
import type { GenesysItem } from '@/item/GenesysItem';
import type { SkillDataModel } from '@/item/data/SkillDataModel';
import { itemsOfType } from '@/item/ItemTypes';
import type { ActorChanges, ActorSource } from '@/migrations/ActorMigration';
import { migrateCreatedActor } from '@/migrations/CreatedActorMigration';

/**
 * An actor of the system, typed by its data model.
 */
export class GenesysActor<ActorDataModel extends foundry.abstract.DataModel.Any = foundry.abstract.DataModel.Any> extends Actor {
	// Foundry builds `system` with the DataModel registered for the actor's type, which the generic names.
	// @ts-expect-error -- The types declare `system` as the union of every type's DataModel, which they narrow by subtype, not by DataModel.
	declare system: ActorDataModel;

	/**
	 * Specialized property for accessing `actor.system` in a typed manner.
	 */
	get systemData(): ActorDataModel {
		return this.system;
	}

	/**
	 * The skills the actor owns, in item order.
	 */
	get skills(): Stored<GenesysItem<SkillDataModel>>[] {
		return itemsOfType(this, 'skill');
	}

	/**
	 * Migrate an actor created with legacy copies of its items' effects.
	 * @inheritDoc
	 */
	protected override async _preCreate(data: Actor.CreateData, options: Actor.Database.PreCreateOptions, user: User.Stored) {
		// An actor created with legacy copies of its items' effects, for instance imported from an older module compendium,
		// loses them and gets its equipment's effects enabled, as the world's actors did in migrations 3 and 4.
		const changes = migrateCreatedActor(this.toObject() as ActorSource);
		if (changes) {
			this.#applyToSource(changes);
		}

		return super._preCreate(data, options, user);
	}

	#applyToSource({ itemEffects = {}, deletedEffects = [] }: ActorChanges) {
		this.updateSource({ items: Object.entries(itemEffects).map(([_id, effects]) => ({ _id, effects })) });

		// A non-recursive update replaces the effects with those listed.
		const keptEffects = this.toObject().effects.filter((effect) => effect._id === null || !deletedEffects.includes(effect._id));
		this.updateSource({ effects: keptEffects }, { recursive: false });
	}

	/**
	 * Change one of the system's token attributes from a token's bar or the Token HUD, within the bounds the rules give
	 * it.
	 * @inheritDoc
	 */
	override async modifyTokenAttribute(attribute: string, value: number, isDelta?: boolean, isBar?: boolean) {
		const tokenAttributes = (this.systemData.constructor as DataModelWithTokenAttributes)?.tokenAttributes;
		if (tokenAttributes) {
			const tokenAttribute = tokenAttributes[attribute] as TokenAttributeDetails | undefined;
			if (!tokenAttribute || !tokenAttribute.editable) {
				return this;
			}

			const read = (path: string) => Number(foundry.utils.getProperty(this.systemData, path));

			return await this.update({
				[`system.${tokenAttribute.valuePath}`]: newTokenAttributeValue({
					current: read(tokenAttribute.valuePath),
					value,
					isDelta: !!isDelta,
					cappedThreshold: tokenAttribute.isBar && tokenAttribute.cappedAtTwiceMax ? read(tokenAttribute.maxPath) : undefined,
				}),
			});
		} else {
			return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
		}
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
