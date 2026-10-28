import type { GenesysRollInitiativeOptions } from '@/combat/GenesysCombat';
import { HasPreCreate } from '@/data/HasPreCreate';
import { HasOnDelete } from '@/data/HasOnDelete';
import { DataModelWithTokenAttributes, TokenAttributeDetails } from '@/token/GenesysTokenDocument';
import { newTokenAttributeValue } from '@/token/TokenAttributeValue';
import type { GenesysItem } from '@/item/GenesysItem';
import type { SkillDataModel } from '@/item/data/SkillDataModel';
import type { ActorChanges, ActorSource } from '@/migrations/ActorMigration';
import { effectsStayOnItemsWithNotifications } from '@/migrations/3-effects-stay-on-items';

export class GenesysActor<ActorDataModel extends foundry.abstract.DataModel = foundry.abstract.DataModel> extends Actor {
	/**
	 * Specialized property for accessing `actor.system` in a typed manner.
	 */
	get systemData(): ActorDataModel {
		return <ActorDataModel>this.system;
	}

	/**
	 * The skills the actor owns, in item order.
	 */
	get skills(): GenesysItem<SkillDataModel>[] {
		return this.items.filter((item) => item.type === 'skill') as GenesysItem<SkillDataModel>[];
	}

	/**
	 * Override the _preCreate callback to call preCreate from the data model class, if present.
	 * @inheritDoc
	 */
	protected override async _preCreate(data: PreDocumentId<this['_source']>, options: DocumentModificationContext<this>, user: User) {
		await (<HasPreCreate<this>>this.systemData).preCreate?.(this, data, options, user);

		// An actor created with legacy copies of its items' effects, for instance imported from an older module compendium,
		// loses them as the world's actors did in migration 3.
		const changes = effectsStayOnItemsWithNotifications(this.toObject() as ActorSource);
		if (changes) {
			this.#applyToSource(changes);
		}

		return super._preCreate(data, options, user);
	}

	#applyToSource({ itemEffects = {}, deletedEffects = [] }: ActorChanges) {
		this.updateSource({ items: Object.entries(itemEffects).map(([_id, effects]) => ({ _id, effects })) });

		// A non-recursive update replaces the effects with those listed.
		const keptEffects = this.toObject().effects.filter((effect) => !deletedEffects.includes(effect._id));
		this.updateSource({ effects: keptEffects }, { recursive: false });
	}

	/**
	 * Override the _onDelete callback to call onDelete from the data model class, if present.
	 * @inheritDoc
	 */
	protected override _onDelete(options: DocumentModificationContext<this>, userId: string) {
		(<HasOnDelete<this>>this.systemData).onDelete?.(this, options, userId);

		super._onDelete(options, userId);
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
