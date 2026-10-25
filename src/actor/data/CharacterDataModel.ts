import { GenesysActor } from '@/actor/GenesysActor';
import { EntryType, ExperienceJournal } from '@/actor/data/character/ExperienceJournal';
import * as TalentPyramid from '@/actor/data/character/TalentPyramid';
import { availableXP } from '@/actor/data/character/Advancement';
import { rootContainer } from '@/actor/data/character/Encumbrance';
import { totalDefense, totalSoak } from '@/actor/data/character/Protection';
import { isRelevantType } from '@/actor/data/RelevantTypes';
import { HasPreCreate } from '@/data/HasPreCreate';
import { GenesysItem } from '@/item/GenesysItem';
import { ArmorDataModel } from '@/item/data/ArmorDataModel';
import { EquipmentDataModel, EquipmentState } from '@/item/data/EquipmentDataModel';
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

type Encumbrance = {
	value: number;
	threshold: number;
};

type CharacterActor = GenesysActor<CharacterDataModel>;
type ArmorItem = GenesysItem<ArmorDataModel>;
type EquipmentItem = GenesysItem<EquipmentDataModel>;

/**
 * A list of Document types that a Character actor cares about for different reasons.
 */
const RELEVANT_TYPES = {
	// Types of items that are used to build a character.
	APTITUDE: ['archetype', 'career'],
	// Types that are related to the Skills tab.
	SKILL: ['skill'],
	// Types that are related to the Combat tab.
	COMBAT: ['injury'],
	// Types that are related to the Talents tab.
	TALENT: ['ability', 'talent'],
	// Types that are used to calculate encumbrance values.
	ENCUMBRANCE: ['weapon', 'armor', 'consumable', 'gear', 'container'],
	// Types that are listed on the Inventory tab.
	INVENTORY: ['weapon', 'armor', 'consumable', 'gear', 'container'],
	// Types that can be equipped.
	EQUIPABLE: ['weapon', 'armor'],
	// Types that can be spent.
	CONSUMABLE: ['consumable'],
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

	static isRelevantTypeForContext(this: void, context: keyof typeof RELEVANT_TYPES, type: string) {
		return isRelevantType(RELEVANT_TYPES, context, type);
	}

	/**
	 * Total value for Soak (base + Brawn + Armor).
	 */
	get totalSoak(): number {
		return totalSoak(this.soak, this.characteristics.brawn, this.#equippedArmor());
	}

	/**
	 * Total value for Defense (base defenses + armor).
	 */
	get totalDefense(): Defense {
		return totalDefense(this.defense, this.#equippedArmor());
	}

	#equippedArmor() {
		return (<CharacterActor>(<unknown>this.parent)).items
			.filter((i) => i.type === 'armor' && (<ArmorItem>i).systemData.state === EquipmentState.Equipped)
			.map((i) => (<ArmorItem>i).systemData);
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
		return {
			value: Math.max(
				0,
				(<CharacterActor>(<unknown>this.parent)).items.reduce(
					(total, i) => total + this.#effectiveEncumbranceForItem(<EquipmentItem>i),
					0,
				) + this.encumbrance.value,
			),
			threshold: 5 + this.encumbrance.threshold + this.characteristics.brawn + this.#additionalEncumbranceThreshold(),
		};
	}

	/**
	 * Whether the character is currently encumbered.
	 */
	get isEncumbered() {
		const currentEncumbrance = this.currentEncumbrance;

		return currentEncumbrance.value > currentEncumbrance.threshold;
	}

	get talentPyramidTotals() {
		const allTalents = (<CharacterActor>(<unknown>this.parent)).items.filter(
			(i) => i.type === 'talent',
		) as GenesysItem<TalentDataModel>[];
		return TalentPyramid.countTalentsPerTier(allTalents.map((talent) => talent.systemData));
	}

	#additionalEncumbranceThreshold() {
		return (<CharacterActor>(<unknown>this.parent)).items
			.filter(
				(i) =>
					(<EquipmentItem>i).systemData.encumbrance !== undefined &&
					(i as EquipmentItem).systemData.state !== EquipmentState.Dropped &&
					(i as EquipmentItem).systemData.encumbrance < 0,
			)
			.reduce((total, i) => total + Math.abs((<EquipmentItem>i).systemData.encumbrance), 0);
	}

	#effectiveEncumbranceForItem(item: EquipmentItem) {
		if (!CharacterDataModel.isRelevantTypeForContext('ENCUMBRANCE', item.type)) {
			return 0;
		}

		// Negative encumbrance increases Encumbrance Threshold.
		if (item.systemData.encumbrance < 0 || item.systemData.state === EquipmentState.Dropped) {
			return 0;
		}

		// When armor is worn, its encumbrance rating is reduced by three (to a minimum of 0).
		if (item.type === 'armor') {
			if (item.systemData.state === EquipmentState.Equipped) {
				return (
					Math.max(0, item.systemData.encumbrance - 3) + Math.max(0, item.systemData.encumbrance * (item.systemData.quantity - 1))
				);
			}
		}

		// If it's contained, it doesn't contribute when its root container is dropped.
		if (item.systemData.container !== '') {
			const items = (<CharacterActor>(<unknown>this.parent)).items;
			const root = rootContainer(item.systemData.container, (id) => (<EquipmentItem | undefined>items.get(id))?.systemData);
			if (root?.state === EquipmentState.Dropped) {
				return 0;
			}
		}

		return item.systemData.encumbrance * item.systemData.quantity;
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
			illustration: new fields.StringField(),
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
				gender: new fields.StringField(),
				age: new fields.StringField(),
				height: new fields.StringField(),
				build: new fields.StringField(),
				hair: new fields.StringField(),
				eyes: new fields.StringField(),
				notableFeatures: new fields.StringField(),
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
