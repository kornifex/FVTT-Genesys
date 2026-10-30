import { GenesysActor } from '@/actor/GenesysActor';
import { encumberingItems, EncumbranceRules, equipmentEncumbrance, isEncumbered } from '@/actor/data/Encumbrance';
import { isRelevantToVehicle } from '@/actor/data/RelevantTypes';
import { vehicleDefense } from '@/actor/data/Protection';
import { Defense } from '@/data/Actors';
import { GenesysItem } from '@/item/GenesysItem';
import { TokenAttributeDetails } from '@/token/GenesysTokenDocument';
import { Crew, hasActor, Passenger, removeActor, Role } from '@/actor/data/CrewRoster';
import { isActingGm } from '@/socket';
import { CombatPool, combatPoolField, ValueWithThreshold, valueWithThresholdField } from '@/data/schemaFields';

// A vehicle's cargo all counts, whatever its Equipment State.
const ENCUMBRANCE_RULES: EncumbranceRules = {
	isRelevant: (type) => isRelevantToVehicle('ENCUMBRANCE', type),
	ignoresDropped: false,
	reducesEquippedArmor: false,
};

/**
 * The data of a vehicle, with its Crew and its cargo.
 */
export abstract class VehicleDataModel extends foundry.abstract.TypeDataModel<
	foundry.data.fields.DataSchema,
	GenesysActor<VehicleDataModel>
> {
	abstract silhouette: number;
	abstract speed: number;
	abstract handling: number;
	abstract defense: number;
	abstract armor: number;
	abstract hullTrauma: CombatPool;
	abstract systemStrain: CombatPool;
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
			label: 'Genesys.Labels.HullTrauma',
			isBar: true,
			editable: true,
			valuePath: 'hullTrauma.value',
			maxPath: 'hullTrauma.max',
		},
		strain: {
			label: 'Genesys.Labels.SystemStrain',
			isBar: true,
			editable: true,
			valuePath: 'systemStrain.value',
			maxPath: 'systemStrain.max',
		},
		armor: {
			label: 'Genesys.Labels.Armor',
			isBar: false,
			editable: false,
			valuePath: 'armor',
		},
	};

	/**
	 * Whether a Document type is relevant to a Vehicle actor in a context.
	 */
	static isRelevantTypeForContext(this: void, context: Parameters<typeof isRelevantToVehicle>[0], type: string) {
		return isRelevantToVehicle(context, type);
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

	constructor(...args: foundry.abstract.DataModel.ConstructorArgs<foundry.data.fields.DataSchema, GenesysActor<VehicleDataModel>>) {
		super(...args);

		if (this.parent.id) {
			VehicleDataModel._GAME_VEHICLES.add(this.parent);
		}
	}

	/**
	 * Gets the current encumbrance value and threshold after taking into account item's quantities and containers.
	 */
	get currentEncumbrance() {
		const cargo = equipmentEncumbrance(encumberingItems(this.parent.items), ENCUMBRANCE_RULES);

		return {
			value: Math.max(this.encumbrance.value + cargo.value, 0),
			threshold: Math.max(this.encumbrance.threshold + cargo.thresholdBonus, 0),
		};
	}

	/**
	 * Whether the vehicle's cargo exceeds its encumbrance threshold.
	 */
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

	/**
	 * Whether the vehicle carries more passengers than its capacity.
	 */
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

	/**
	 * Whether an actor is in the vehicle's Crew, as a passenger or in a Role.
	 */
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

		await this.parent.update({ system: { passengers: { list: crew.passengers }, roles: crew.roles } });
		return true;
	}

	/**
	 * Show the hull trauma and system strain on the bars of the vehicle's token, which is linked to the actor.
	 * @inheritDoc
	 */
	protected override async _preCreate() {
		const prototypeToken = {
			bar1: { attribute: 'trauma' },
			bar2: { attribute: 'strain' },
			actorLink: true,
		};

		this.parent.updateSource({ prototypeToken });
	}

	/**
	 * Forget a deleted vehicle, whose Crew no longer needs to follow its members.
	 * @inheritDoc
	 */
	protected override _onDelete() {
		VehicleDataModel._GAME_VEHICLES.delete(this.parent);
	}

	static override defineSchema() {
		const fields = foundry.data.fields;

		return {
			silhouette: new fields.NumberField({ integer: true, initial: 0 }),
			speed: new fields.NumberField({ integer: true, initial: 0 }),
			handling: new fields.NumberField({ integer: true, initial: 0 }),
			defense: new fields.NumberField({ integer: true, initial: 0 }),
			armor: new fields.NumberField({ integer: true, initial: 0 }),
			hullTrauma: combatPoolField(),
			systemStrain: combatPoolField(),
			illustration: new fields.StringField({ initial: 'icons/svg/mystery-man.svg' }),
			description: new fields.HTMLField(),
			complement: new fields.StringField({ initial: '' }),
			consumables: new fields.StringField({ initial: '' }),
			source: new fields.HTMLField(),
			price: new fields.NumberField({ initial: 0 }),
			rarity: new fields.NumberField({ integer: true, initial: 0 }),
			currency: new fields.NumberField({ initial: 0 }),
			passengers: valueWithThresholdField({
				list: new fields.ArrayField(
					new fields.SchemaField({
						uuid: new fields.StringField(),
						sort: new fields.NumberField({ integer: true, initial: 0 }),
					}),
				),
			}),
			encumbrance: valueWithThresholdField(),
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
	// The hooks hand over stored actors: the guard only tells the types that they have a uuid.
	const uuid = actor.uuid;
	if (actor.type === 'vehicle' || !uuid) {
		return;
	}

	for (const vehicle of VehicleDataModel._GAME_VEHICLES) {
		if (vehicle.sheet?.rendered && vehicle.systemData.hasCrew(uuid)) {
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
		return !!vehicle.id && game.actors.has(vehicle.id);
	}

	const token = vehicle.token;
	const scene = token?.parent;
	return !!token?.id && !!scene?.id && game.scenes.has(scene.id) && scene.tokens.has(token.id);
}

/**
 * Render the sheets of the vehicles an actor crews when one of the actor's items changes, and remove a deleted actor
 * from the Crew of every vehicle in the world.
 */
export function register() {
	Hooks.on('updateActor', (actor) => renderVehiclesCrewedBy(actor));

	// A skill rank can change without its actor being updated, like a free rank or an adversary's rank.
	const renderVehiclesCrewedByParent = (item: GenesysItem) => {
		const actor = item.parent;
		if (actor) {
			renderVehiclesCrewedBy(actor);
		}
	};
	Hooks.on('createItem', renderVehiclesCrewedByParent);
	Hooks.on('updateItem', renderVehiclesCrewedByParent);
	Hooks.on('deleteItem', renderVehiclesCrewedByParent);

	Hooks.on('deleteActor', (actor) => {
		if (actor.type === 'vehicle') {
			VehicleDataModel._GAME_VEHICLES.delete(actor as GenesysActor<VehicleDataModel>);
		} else {
			// Every client sees the deletion: one GM writes the vehicles, which a player may not, and writes them once.
			const genesysActorUuid = actor.uuid;
			if (isActingGm() && genesysActorUuid) {
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
