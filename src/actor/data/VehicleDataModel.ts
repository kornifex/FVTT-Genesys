import { GenesysActor } from '@/actor/GenesysActor';
import { encumberingItems, EncumbranceRules, equipmentEncumbrance, isEncumbered } from '@/actor/data/Encumbrance';
import { isRelevantType } from '@/actor/data/RelevantTypes';
import { vehicleDefense } from '@/actor/data/Protection';
import { Defense } from '@/data/Actors';
import { HasOnDelete } from '@/data/HasOnDelete';
import { HasPreCreate } from '@/data/HasPreCreate';
import { GenesysItem } from '@/item/GenesysItem';
import { TokenAttributeDetails } from '@/token/GenesysTokenDocument';
import { Crew, hasActor, Passenger, removeActor, Role } from '@/actor/data/CrewRoster';

type ValueWithMax = {
	value: number;
	max: number;
};

type ValueWithThreshold = {
	value: number;
	threshold: number;
};

/**
 * A list of Document types that a Vehicle actor cares about for different reasons.
 */
const RELEVANT_TYPES = {
	// Types that are related to the Combat tab.
	COMBAT: ['injury'],
	// Types that are allowed to be dropped on a role.
	ROLE: ['character', 'minion', 'rival', 'nemesis', 'skill'],
	// Types that are allowed to be a added as passengers.
	PASSENGER: ['character', 'minion', 'rival', 'nemesis'],
	// Types that are used to calculate encumbrance values.
	ENCUMBRANCE: ['vehicleWeapon', 'weapon', 'armor', 'consumable', 'gear', 'container'],
	// Types that are listed on the Inventory tab.
	INVENTORY: ['vehicleWeapon', 'weapon', 'armor', 'consumable', 'gear', 'container'],
	// Types that can be equipped.
	EQUIPABLE: ['vehicleWeapon'],
	// Types that can be spent.
	CONSUMABLE: ['consumable'],
};

// A vehicle's cargo all counts, whatever its Equipment State.
const ENCUMBRANCE_RULES: EncumbranceRules = {
	isRelevant: (type) => VehicleDataModel.isRelevantTypeForContext('ENCUMBRANCE', type),
	ignoresDropped: false,
	reducesEquippedArmor: false,
};

export abstract class VehicleDataModel
	extends foundry.abstract.DataModel
	implements HasPreCreate<GenesysActor<VehicleDataModel>>, HasOnDelete<GenesysActor<VehicleDataModel>>
{
	abstract silhouette: number;
	abstract speed: number;
	abstract handling: number;
	abstract defense: number;
	abstract armor: number;
	abstract hullTrauma: ValueWithMax;
	abstract systemStrain: ValueWithMax;
	abstract illustration: string;
	abstract description: string;
	abstract complement: string;
	abstract consumables: string;
	abstract source: string;
	abstract price: number;
	abstract rarity: number;
	abstract currency: number;
	abstract passengers: ValueWithThreshold & { list: Passenger[] };
	abstract encumbrance: ValueWithThreshold;
	abstract roles: Role[];

	static readonly tokenAttributes: Record<string, TokenAttributeDetails> = {
		trauma: {
			label: 'Hull Trauma',
			isBar: true,
			editable: true,
			valuePath: 'hullTrauma.value',
			maxPath: 'hullTrauma.max',
		},
		strain: {
			label: 'System Strain',
			isBar: true,
			editable: true,
			valuePath: 'systemStrain.value',
			maxPath: 'systemStrain.max',
		},
		armor: {
			label: 'Armor',
			isBar: false,
			editable: false,
			valuePath: 'armor',
		},
	};

	static isRelevantTypeForContext(this: void, context: keyof typeof RELEVANT_TYPES, type: string) {
		return isRelevantType(RELEVANT_TYPES, context, type);
	}

	static readonly _GAME_VEHICLES = new Set<GenesysActor<VehicleDataModel>>();

	static override migrateData(source: { passengers?: { list?: (Passenger & { id?: string })[] } }) {
		const passengers = source.passengers?.list;
		if (passengers) {
			for (const passenger of passengers) {
				if (!Object.hasOwn(passenger, 'id')) {
					break;
				}
				// We removed the `id` property and added `uuid`. We transfer the data from one to the other to allow the migration
				// script that runs after to save the proper data. (See "src\migrations\1-use-uuid-for-vehicle.ts")
				passenger.uuid = passenger.id!;
				delete passenger.id;
			}
		}

		return super.migrateData(source) as typeof source;
	}

	constructor(...args: ConstructorParameters<typeof foundry.abstract.DataModel>) {
		super(...args);

		const actor = this.parent as unknown as GenesysActor<this>;
		if (actor.id) {
			VehicleDataModel._GAME_VEHICLES.add(actor);
		}
	}

	/**
	 * Gets the current encumbrance value and threshold after taking into account item's quantities and containers.
	 */
	get currentEncumbrance() {
		const actor = this.parent as unknown as GenesysActor<this>;
		const cargo = equipmentEncumbrance(encumberingItems(actor.items), ENCUMBRANCE_RULES);

		return {
			value: Math.max(this.encumbrance.value + cargo.value, 0),
			threshold: Math.max(this.encumbrance.threshold + cargo.thresholdBonus, 0),
		};
	}

	get isEncumbered() {
		return isEncumbered(this.currentEncumbrance);
	}

	/**
	 * Total value for Defense, against melee and ranged attacks alike, capped as a character's is.
	 */
	get totalDefense(): Defense {
		return vehicleDefense(this.defense);
	}

	/**
	 * Gets the current number of passengers after including those listed on the sheet.
	 */
	get currentPassengers() {
		return {
			value: Math.max(this.passengers.value + this.passengers.list.length, 0),
			threshold: Math.max(this.passengers.threshold, 0),
		};
	}

	get isOverCapacity() {
		const currentPassengers = this.currentPassengers;
		return currentPassengers.value > currentPassengers.threshold;
	}

	/**
	 * The vehicle's Crew: its passengers and Roles.
	 */
	get crew(): Crew {
		return { passengers: this.passengers.list, roles: this.roles };
	}

	hasCrew(actorUuid: string) {
		return hasActor(this.crew, actorUuid);
	}

	/**
	 * Write the Crew an operation of the CrewRoster module returns, unless it returns nothing to change. Returns whether
	 * it wrote one.
	 */
	async updateCrew(change: (crew: Crew) => Crew | undefined) {
		const crew = change(this.crew);
		if (!crew) {
			return false;
		}

		const actor = this.parent as unknown as GenesysActor<this>;
		await actor.update({ 'system.passengers.list': crew.passengers, 'system.roles': crew.roles });
		return true;
	}

	async preCreate(
		actor: GenesysActor<VehicleDataModel>,
		_data: unknown,
		_options: DocumentModificationContext<GenesysActor<VehicleDataModel>>,
		_user: User,
	) {
		const prototypeToken = {
			bar1: { attribute: 'trauma' },
			bar2: { attribute: 'strain' },
			actorLink: true,
		};

		actor.updateSource({ prototypeToken });
	}

	onDelete(
		actor: GenesysActor<VehicleDataModel>,
		_options: DocumentModificationContext<GenesysActor<VehicleDataModel>>,
		_userId: string,
	) {
		VehicleDataModel._GAME_VEHICLES.delete(actor);
	}

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			silhouette: new fields.NumberField({ integer: true, initial: 0 }),
			speed: new fields.NumberField({ integer: true, initial: 0 }),
			handling: new fields.NumberField({ integer: true, initial: 0 }),
			defense: new fields.NumberField({ integer: true, initial: 0 }),
			armor: new fields.NumberField({ integer: true, initial: 0 }),
			hullTrauma: new fields.SchemaField({
				value: new fields.NumberField({ integer: true, initial: 0 }),
				max: new fields.NumberField({ integer: true, initial: 0 }),
			}),
			systemStrain: new fields.SchemaField({
				value: new fields.NumberField({ integer: true, initial: 0 }),
				max: new fields.NumberField({ integer: true, initial: 0 }),
			}),
			illustration: new fields.StringField({ initial: 'icons/svg/mystery-man.svg' }),
			description: new fields.HTMLField(),
			complement: new fields.StringField({ initial: '' }),
			consumables: new fields.StringField({ initial: '' }),
			source: new fields.HTMLField(),
			price: new fields.NumberField({ initial: 0 }),
			rarity: new fields.NumberField({ integer: true, initial: 0 }),
			currency: new fields.NumberField({ initial: 0 }),
			passengers: new fields.SchemaField({
				value: new fields.NumberField({ integer: true, initial: 0 }),
				threshold: new fields.NumberField({ integer: true, initial: 0 }),
				list: new fields.ArrayField(
					new fields.SchemaField({
						uuid: new fields.StringField(),
						sort: new fields.NumberField({ integer: true, initial: 0 }),
					}),
				),
			}),
			encumbrance: new fields.SchemaField({
				value: new fields.NumberField({ integer: true, initial: 0 }),
				threshold: new fields.NumberField({ integer: true, initial: 0 }),
			}),
			roles: new fields.ArrayField(
				new fields.SchemaField({
					id: new fields.StringField(),
					name: new fields.StringField(),
					skills: new fields.ArrayField(new fields.StringField()),
					members: new fields.ArrayField(new fields.StringField()),
				}),
			),
		};
	}
}

/**
 * Re-render the open sheets of the vehicles whose crew the actor is in, since they show its name and skills.
 */
function renderVehiclesCrewedBy(actor: GenesysActor) {
	if (actor.type === 'vehicle') {
		return;
	}

	for (const vehicle of VehicleDataModel._GAME_VEHICLES) {
		if (vehicle.sheet.rendered && vehicle.systemData.hasCrew(actor.uuid)) {
			void vehicle.sheet.render(true);
		}
	}
}

/**
 * Whether a vehicle of `_GAME_VEHICLES` still exists. A vehicle deleted in the same operation as a crew member, after
 * them, has already left the world but not the set; nothing removes an unlinked token's vehicle from the set when its
 * token or scene is deleted.
 */
function isInWorld(vehicle: GenesysActor<VehicleDataModel>) {
	if (!vehicle.isToken) {
		return game.actors.has(vehicle.id);
	}

	const token = vehicle.token;
	const scene = token?.parent;
	return !!scene && game.scenes.has(scene.id) && scene.tokens.has(token.id);
}

export function register() {
	Hooks.on('updateActor', (actor) => renderVehiclesCrewedBy(actor as GenesysActor));

	// A skill rank can change without its actor being updated, like a free rank or an adversary's rank.
	const renderVehiclesCrewedByParent = (item: unknown) => {
		const actor = (item as GenesysItem).parent;
		if (actor) {
			renderVehiclesCrewedBy(actor);
		}
	};
	Hooks.on('createItem', renderVehiclesCrewedByParent);
	Hooks.on('updateItem', renderVehiclesCrewedByParent);
	Hooks.on('deleteItem', renderVehiclesCrewedByParent);

	Hooks.on('deleteActor', (actor) => {
		const targetActor = actor as GenesysActor;

		if (targetActor.type === 'vehicle') {
			// Whenever a vehicle is deleted remove it from the updates array.
			VehicleDataModel._GAME_VEHICLES.delete(targetActor as GenesysActor<VehicleDataModel>);
		} else {
			// Whenever a non-vehicle actor is deleted let the primary GM remove it from all the vehicles in the world.
			const isGmHub = game.users.activeGM?.isSelf;
			if (isGmHub) {
				const genesysActorUuid = targetActor.uuid;
				for (const vehicle of VehicleDataModel._GAME_VEHICLES) {
					if (!isInWorld(vehicle)) {
						continue;
					}
					void vehicle.systemData.updateCrew((crew) => removeActor(crew, genesysActorUuid));
				}
			}
		}
	});
}
