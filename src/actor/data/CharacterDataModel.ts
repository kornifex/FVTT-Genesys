import { GenesysActor } from '@/actor/GenesysActor';
import { ExperienceJournal } from '@/actor/data/character/ExperienceJournal';
import * as TalentPyramid from '@/actor/data/character/TalentPyramid';
import { availableXP, totalXP } from '@/actor/data/character/Advancement';
import {
	characterEncumbrance,
	encumberingItems,
	Encumbrance,
	EncumbranceRules,
	equipmentEncumbrance,
	isEncumbered,
} from '@/actor/data/Encumbrance';
import { totalDefense, totalSoak } from '@/actor/data/Protection';
import { wornArmor } from '@/actor/data/Inventory';
import { isRelevantToCharacter } from '@/actor/data/RelevantTypes';
import { itemsOfType } from '@/item/ItemTypes';
import { Characteristic, CharacteristicsContainer } from '@/data/Characteristics';
import { Defense } from '@/data/Actors';
import {
	characteristicsField,
	CombatPool,
	combatPoolField,
	defenseField,
	Motivations,
	motivationsField,
	silhouetteField,
	valueWithThresholdField,
} from '@/data/schemaFields';
import { TokenAttributeDetails } from '@/token/GenesysTokenDocument';

type Details = {
	gender: string;
	age: string;
	height: string;
	build: string;
	hair: string;
	eyes: string;
	notableFeatures: string;
};

type CharacterActor = GenesysActor<'character'>;

// A character's Dropped equipment counts towards neither the value nor the threshold, and their worn armor counts 3 less.
const ENCUMBRANCE_RULES: EncumbranceRules = {
	isRelevant: (type) => isRelevantToCharacter('ENCUMBRANCE', type),
	ignoresDropped: true,
	reducesEquippedArmor: true,
};

/**
 * The data of a player character.
 */
export abstract class CharacterDataModel extends foundry.abstract.TypeDataModel<foundry.data.fields.DataSchema, CharacterActor> {
	abstract characteristics: CharacteristicsContainer;
	abstract soak: number;
	abstract defense: Defense;
	abstract wounds: CombatPool;
	abstract strain: CombatPool;
	abstract illustration: string;
	abstract motivations: Motivations;
	abstract details: Details;
	abstract experienceJournal: ExperienceJournal;
	abstract encumbrance: Encumbrance;
	abstract currency: number;
	abstract notes: string;
	abstract superCharacteristics: Set<Characteristic>;
	abstract silhouette: number;

	static readonly tokenAttributes: Record<string, TokenAttributeDetails> = {
		wounds: {
			label: 'Genesys.Labels.Wounds',
			isBar: true,
			editable: true,
			valuePath: 'wounds.value',
			maxPath: 'wounds.max',
			cappedAtTwiceMax: true,
		},
		strain: {
			label: 'Genesys.Labels.Strain',
			isBar: true,
			editable: true,
			valuePath: 'strain.value',
			maxPath: 'strain.max',
		},
		soak: {
			label: 'Genesys.Labels.Soak',
			isBar: false,
			editable: false,
			valuePath: 'totalSoak',
		},
	};

	/**
	 * Whether a Document type is relevant to a Character actor in a context.
	 */
	static isRelevantTypeForContext(this: void, context: Parameters<typeof isRelevantToCharacter>[0], type: string) {
		return isRelevantToCharacter(context, type);
	}

	/**
	 * Total value for Soak (base + Brawn + worn armor).
	 */
	get totalSoak(): number {
		return totalSoak(this.soak, this.characteristics.brawn, this.#wornArmor());
	}

	/**
	 * Total value for Defense (base defenses + worn armor).
	 */
	get totalDefense(): Defense {
		return totalDefense(this.defense, this.#wornArmor());
	}

	#wornArmor() {
		return wornArmor(itemsOfType(this.parent, 'armor')).map((armor) => armor.system);
	}

	/**
	 * Amount of XP the character has available to spend right now.
	 */
	get availableXP() {
		return availableXP(this.experienceJournal.entries);
	}

	/**
	 * Total amount of experience the character has gained over their lifetime.
	 */
	get totalXP() {
		return totalXP(this.experienceJournal.entries);
	}

	/**
	 * Player's current Encumbrance value, including both ActiveEffects and equipment.
	 */
	get currentEncumbrance(): Encumbrance {
		const equipment = equipmentEncumbrance(encumberingItems(this.parent.items), ENCUMBRANCE_RULES);

		return characterEncumbrance(equipment, this.encumbrance, this.characteristics.brawn);
	}

	/**
	 * Whether the character is currently encumbered.
	 */
	get isEncumbered() {
		return isEncumbered(this.currentEncumbrance);
	}

	/**
	 * How many talents the character holds at each tier of the Talent Pyramid, counting the tiers their ranks reached.
	 */
	get talentPyramidTotals() {
		const allTalents = itemsOfType(this.parent, 'talent');
		return TalentPyramid.countTalentsPerTier(allTalents.map((talent) => talent.system));
	}

	/**
	 * Give a new character a Friendly token, linked to the actor, and the skills of the Skills Compendium unless they come
	 * with skills.
	 * @inheritDoc
	 */
	protected override async _preCreate() {
		const actor = this.parent;

		// Player character tokens should default to being Friendly.
		const prototypeToken = {
			bar1: { attribute: 'wounds' },
			bar2: { attribute: 'strain' },
			disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
			actorLink: true,
		};
		actor.updateSource({ prototypeToken });

		// Already have skills data, so we have no reason to add new ones.
		if (actor.items.find((i) => i.type === 'skill')) {
			return;
		}

		const skills = CONFIG.genesys.skills;

		if (skills.length === 0) {
			ui.notifications.warn('Genesys.Notifications.CharacterWithNoSkills', { localize: true });
			return;
		}

		const skillItems = skills.map((i) => i.toObject());
		actor.updateSource({ items: skillItems });
	}

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			characteristics: characteristicsField(0),
			soak: new fields.NumberField({ integer: true, initial: 0 }),
			defense: defenseField(),
			wounds: combatPoolField(),
			strain: combatPoolField(),
			illustration: new fields.StringField({ initial: 'icons/svg/mystery-man.svg' }),
			motivations: motivationsField(),
			details: new fields.SchemaField({
				gender: new fields.StringField({ initial: '' }),
				age: new fields.StringField({ initial: '' }),
				height: new fields.StringField({ initial: '' }),
				build: new fields.StringField({ initial: '' }),
				hair: new fields.StringField({ initial: '' }),
				eyes: new fields.StringField({ initial: '' }),
				notableFeatures: new fields.StringField({ initial: '' }),
			}),
			notes: new fields.HTMLField(),
			experienceJournal: new fields.SchemaField({
				entries: new fields.ArrayField(
					new fields.SchemaField({
						amount: new fields.NumberField({ integer: true, initial: 0 }),
						type: new fields.StringField({ required: true }),
						data: new fields.ObjectField(),
					}),
				),
			}),
			encumbrance: valueWithThresholdField(),
			currency: new fields.NumberField({ initial: 500 }),
			superCharacteristics: new fields.SetField(new fields.StringField()),
			silhouette: silhouetteField(),
		};
	}
}
