/**
 * @file Document types an actor cares about, grouped by the context they matter in.
 */

/**
 * Lists of Document types, keyed by the context in which an actor cares about them (e.g. the types listed on its Inventory
 * tab).
 */
export type RelevantTypes<Context extends string> = Record<Context, string[]>;

/**
 * Whether a Document type is relevant to an actor in a context. An empty type or an unknown context is never relevant.
 */
export function isRelevantType<Context extends string>(relevantTypes: RelevantTypes<Context>, context: Context, type: string) {
	return !!type && (relevantTypes[context]?.includes(type) ?? false);
}

/**
 * The Document types a Character actor cares about.
 */
const CHARACTER_TYPES = {
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

/**
 * The Document types an Adversary actor cares about.
 */
const ADVERSARY_TYPES = {
	// Types that are related to the Skills tab.
	SKILL: ['skill'],
	// Types that are related to the Combat tab.
	COMBAT: ['injury'],
	// Types that are related to the Talents tab.
	TALENT: ['ability', 'talent'],
	// Types that are related to the equipment.
	INVENTORY: ['weapon', 'armor', 'consumable', 'gear', 'container'],
};

/**
 * The Document types a Vehicle actor cares about.
 */
const VEHICLE_TYPES = {
	// Types that are related to the Combat tab.
	COMBAT: ['injury'],
	// Types that are allowed to be dropped on a role.
	ROLE: ['character', 'minion', 'rival', 'nemesis', 'skill'],
	// Types that are allowed to be added as passengers.
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

/**
 * Whether a Document type is relevant to a Character actor in a context.
 */
export function isRelevantToCharacter(context: keyof typeof CHARACTER_TYPES, type: string) {
	return isRelevantType(CHARACTER_TYPES, context, type);
}

/**
 * Whether a Document type is relevant to an Adversary actor in a context.
 */
export function isRelevantToAdversary(context: keyof typeof ADVERSARY_TYPES, type: string) {
	return isRelevantType(ADVERSARY_TYPES, context, type);
}

/**
 * Whether a Document type is relevant to a Vehicle actor in a context.
 */
export function isRelevantToVehicle(context: keyof typeof VEHICLE_TYPES, type: string) {
	return isRelevantType(VEHICLE_TYPES, context, type);
}
