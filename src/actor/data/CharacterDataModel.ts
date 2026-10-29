import { GenesysActor } from '@/actor/GenesysActor';
import { EntryType, ExperienceJournal } from '@/actor/data/character/ExperienceJournal';
import * as TalentPyramid from '@/actor/data/character/TalentPyramid';
import { availableXP } from '@/actor/data/character/Advancement';
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
import { HasPreCreate } from '@/data/HasPreCreate';
import { GenesysItem } from '@/item/GenesysItem';
import { ArmorDataModel } from '@/item/data/ArmorDataModel';
import { Characteristic, CharacteristicsContainer } from '@/data/Characteristics';
import { CombatPool, Defense } from '@/data/Actors';
import { TalentDataModel } from '@/item/data/TalentDataModel';
import { TokenAttributeDetails } from '@/token/GenesysTokenDocument';

type Motivation = {
	name: string;
	description: string;
};

type Motivations = {
	strength: Motivation;
	flaw: Motivation;
	desire: Motivation;
	fear: Motivation;
};

type Details = {
	gender: string;
	age: string;
	height: string;
	build: string;
	hair: string;
	eyes: string;
	notableFeatures: string;
};

type CharacterActor = GenesysActor<CharacterDataModel>;
type ArmorItem = GenesysItem<ArmorDataModel>;

// A character's Dropped equipment counts towards neither the value nor the threshold, and their worn armor counts 3 less.
const ENCUMBRANCE_RULES: EncumbranceRules = {
	isRelevant: (type) => isRelevantToCharacter('ENCUMBRANCE', type),
	ignoresDropped: true,
	reducesEquippedArmor: true,
};

export abstract class CharacterDataModel extends foundry.abstract.DataModel implements HasPreCreate<CharacterActor> {
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

	static readonly tokenAttributes: Record<string, TokenAttributeDetails> = {
		wounds: {
			label: 'Wounds',
			isBar: true,
			editable: true,
			valuePath: 'wounds.value',
			maxPath: 'wounds.max',
			cappedAtTwiceMax: true,
		},
		strain: {
			label: 'Strain',
			isBar: true,
			editable: true,
			valuePath: 'strain.value',
			maxPath: 'strain.max',
		},
		soak: {
			label: 'Soak',
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
		return wornArmor((<CharacterActor>(<unknown>this.parent)).items.contents as ArmorItem[]).map((armor) => armor.systemData);
	}

	/**
	 * Amount of XP the character has available to spend right now.
	 */
	get availableXP() {
		return availableXP(this.experienceJournal.entries);
	}

	/**
	 * Amount of experience the character has available to spend solely from their starting XP pool.
	 */
	get availableStartingXP() {
		const startingXP = this.experienceJournal.entries[0];
		if (!startingXP || startingXP.type !== EntryType.Starting) {
			return 0;
		}

		return this.experienceJournal.entries.reduce((total, entry) => total + Math.min(0, entry.amount), startingXP.amount);
	}

	/**
	 * Total amount of experience the character has gained over their lifetime.
	 */
	get totalXP() {
		return this.experienceJournal.entries.reduce((total, entry) => total + Math.max(0, entry.amount), 0);
	}

	/**
	 * Player's current Encumbrance value, including both ActiveEffects and equipment.
	 */
	get currentEncumbrance(): Encumbrance {
		const equipment = equipmentEncumbrance(encumberingItems((<CharacterActor>(<unknown>this.parent)).items), ENCUMBRANCE_RULES);

		return characterEncumbrance(equipment, this.encumbrance, this.characteristics.brawn);
	}

	/**
	 * Whether the character is currently encumbered.
	 */
	get isEncumbered() {
		return isEncumbered(this.currentEncumbrance);
	}

	get talentPyramidTotals() {
		const allTalents = (<CharacterActor>(<unknown>this.parent)).items.filter(
			(i) => i.type === 'talent',
		) as GenesysItem<TalentDataModel>[];
		return TalentPyramid.countTalentsPerTier(allTalents.map((talent) => talent.systemData));
	}

	async preCreate(actor: CharacterActor, _data: unknown, _options: DocumentModificationContext<CharacterActor>, _user: User) {
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
			characteristics: new fields.SchemaField({
				brawn: new fields.NumberField({ integer: true, initial: 0 }),
				agility: new fields.NumberField({ integer: true, initial: 0 }),
				intellect: new fields.NumberField({ integer: true, initial: 0 }),
				cunning: new fields.NumberField({ integer: true, initial: 0 }),
				willpower: new fields.NumberField({ integer: true, initial: 0 }),
				presence: new fields.NumberField({ integer: true, initial: 0 }),
			}),
			soak: new fields.NumberField({ integer: true, initial: 0 }),
			defense: new fields.SchemaField({
				melee: new fields.NumberField({ integer: true, initial: 0 }),
				ranged: new fields.NumberField({ integer: true, initial: 0 }),
			}),
			wounds: new fields.SchemaField({
				value: new fields.NumberField({ integer: true, initial: 0 }),
				max: new fields.NumberField({ integer: true, initial: 0 }),
			}),
			strain: new fields.SchemaField({
				value: new fields.NumberField({ integer: true, initial: 0 }),
				max: new fields.NumberField({ integer: true, initial: 0 }),
			}),
			illustration: new fields.StringField({ initial: 'icons/svg/mystery-man.svg' }),
			motivations: new fields.SchemaField({
				strength: new fields.SchemaField({
					name: new fields.StringField(),
					description: new fields.HTMLField(),
				}),
				flaw: new fields.SchemaField({
					name: new fields.StringField(),
					description: new fields.HTMLField(),
				}),
				desire: new fields.SchemaField({
					name: new fields.StringField(),
					description: new fields.HTMLField(),
				}),
				fear: new fields.SchemaField({
					name: new fields.StringField(),
					description: new fields.HTMLField(),
				}),
			}),
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
			encumbrance: new fields.SchemaField({
				value: new fields.NumberField({ integer: true, initial: 0 }),
				threshold: new fields.NumberField({ integer: true, initial: 0 }),
			}),
			currency: new fields.NumberField({ initial: 500 }),
			superCharacteristics: new fields.SetField(new fields.StringField()),
		};
	}
}
