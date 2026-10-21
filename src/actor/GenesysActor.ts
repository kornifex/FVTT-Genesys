/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file Base Genesys Actor
 */
import type { GenesysRollInitiativeOptions } from '@/combat/GenesysCombat';
import IHasPreCreate from '@/data/IHasPreCreate';
import IHasOnDelete from '@/data/IHasOnDelete';
import { DataModelWithTokenAttributes, TokenAttributeDetails } from '@/token/GenesysTokenDocument';
import type GenesysItem from '@/item/GenesysItem';
import type SkillDataModel from '@/item/data/SkillDataModel';

export default class GenesysActor<ActorDataModel extends foundry.abstract.DataModel = foundry.abstract.DataModel> extends Actor {
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
		await (<IHasPreCreate<this>>this.systemData).preCreate?.(this, data, options, user);

		return super._preCreate(data, options, user);
	}

	/**
	 * Override the _onDelete callback to call onDelete from the data model class, if present.
	 * @inheritDoc
	 */
	protected override _onDelete(options: DocumentModificationContext<this>, userId: string) {
		(<IHasOnDelete<this>>this.systemData).onDelete?.(this, options, userId);

		super._onDelete(options, userId);
	}

	/**
	 * Override the createDialog callback to include an unique class that identifies the created dialog.
	 * @inheritDoc
	 */
	static override createDialog(data?: { folder?: string | undefined } | undefined, options?: Partial<FormApplicationOptions> | undefined): Promise<ClientDocument<foundry.documents.BaseActor> | undefined> {
		// The 'dialog' class needs to be added explicitly, otherwise it won't be added by the super call.
		const touchedOptions = {
			...options,
			classes: [...(options?.classes ?? []), 'dialog', 'dialog-actor-create'],
		};

		return super.createDialog(data, touchedOptions);
	}

	override async modifyTokenAttribute(attribute: string, value: number, isDelta?: boolean, isBar?: boolean) {
		const tokenAttributes = (this.systemData.constructor as DataModelWithTokenAttributes)?.tokenAttributes;
		if (tokenAttributes) {
			const tokenAttribute = tokenAttributes[attribute] as TokenAttributeDetails | undefined;
			if (!tokenAttribute || !tokenAttribute.editable) {
				return this;
			}

			return await this.update({
				[`system.${tokenAttribute.valuePath}`]: isDelta ? Number(foundry.utils.getProperty(this.systemData, tokenAttribute.valuePath)) + value : value,
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
	override async rollInitiative({ createCombatants = false, rerollInitiative = false, initiativeOptions = {} }: { createCombatants?: boolean; rerollInitiative?: boolean; initiativeOptions?: object } | undefined = {}) {
		// Foundry leaves out the combatants that have rolled their own slot: hand them all over, the combat picks the slots.
		const options: GenesysRollInitiativeOptions = { ...initiativeOptions, slotsOfCombatants: rerollInitiative ? 'all' : 'unrolled' };

		return super.rollInitiative({ createCombatants, rerollInitiative: true, initiativeOptions: options });
	}
}
