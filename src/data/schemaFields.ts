/** @file The schema fields several DataModels share, built by one factory each, with the types of the data they hold. */

import { Characteristic } from '@/data/Characteristics';

/**
 * A count against its maximum, such as wounds and strain, or a vehicle's hull trauma and system strain.
 */
export type CombatPool = {
	value: number;
	max: number;
};

/**
 * A count against its threshold, such as encumbrance.
 */
export type ValueWithThreshold = {
	value: number;
	threshold: number;
};

/**
 * The four Motivations of a character or an adversary.
 */
export type Motivations = Record<'strength' | 'flaw' | 'desire' | 'fear', { name: string; description: string }>;

/**
 * How an ability, a talent or a quality is activated: passively, or by an action.
 */
export const ACTIVATION_TYPES = ['passive', 'active'] as const;

/**
 * How a Special Ability or a talent is activated, with the detail of its activation (the action it takes, for
 * instance).
 */
export type AbilityActivation = {
	type: (typeof ACTIVATION_TYPES)[number];
	detail: string;
};

function integerField(initial: number) {
	return new foundry.data.fields.NumberField({ integer: true, initial });
}

/**
 * The six characteristics, each starting at `initial`.
 */
export function characteristicsField(initial: number) {
	return new foundry.data.fields.SchemaField(
		Object.fromEntries(Object.values(Characteristic).map((characteristic) => [characteristic, integerField(initial)])),
	);
}

/**
 * The silhouette of a character or an adversary: a whole number from 0, without maximum. Every one starts human-sized,
 * at 1 (CRB p. 109), which an actor stored before it had a silhouette reads too.
 */
export function silhouetteField() {
	return new foundry.data.fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 1 });
}

/**
 * The melee and ranged defenses of a character or an adversary.
 */
export function defenseField() {
	return new foundry.data.fields.SchemaField({
		melee: integerField(0),
		ranged: integerField(0),
	});
}

/**
 * A {@link CombatPool}. Wounds and strain, like a vehicle's hull trauma and system strain, are whole numbers: a fraction
 * typed in, or stored before the field asked for integers, is rounded when Foundry cleans the data.
 */
export function combatPoolField() {
	return new foundry.data.fields.SchemaField({
		value: integerField(0),
		max: integerField(0),
	});
}

/**
 * A {@link ValueWithThreshold}, with the other fields given beside the value and its threshold.
 */
export function valueWithThresholdField(fields: Record<string, foundry.data.fields.DataField> = {}) {
	return new foundry.data.fields.SchemaField({
		value: integerField(0),
		threshold: integerField(0),
		...fields,
	});
}

/**
 * The {@link Motivations} of a character or an adversary.
 */
export function motivationsField() {
	const motivation = () =>
		new foundry.data.fields.SchemaField({
			name: new foundry.data.fields.StringField(),
			description: new foundry.data.fields.HTMLField(),
		});

	return new foundry.data.fields.SchemaField({
		strength: motivation(),
		flaw: motivation(),
		desire: motivation(),
		fear: motivation(),
	});
}

/**
 * A string that takes one of `choices`, from the same `as const` list its type is read from.
 */
export function choiceField<const Choices extends readonly string[]>(choices: Choices, initial: Choices[number]) {
	return new foundry.data.fields.StringField({ initial, choices: [...choices] });
}

/**
 * The {@link AbilityActivation} of a Special Ability or a talent.
 */
export function activationField() {
	return new foundry.data.fields.SchemaField({
		type: choiceField(ACTIVATION_TYPES, 'passive'),
		detail: new foundry.data.fields.StringField({ initial: '' }),
	});
}

/**
 * The qualities a weapon or an armor holds, copied from the quality items dropped on it.
 */
export function qualitiesField() {
	return new foundry.data.fields.ArrayField(
		new foundry.data.fields.SchemaField({
			name: new foundry.data.fields.StringField(),
			description: new foundry.data.fields.HTMLField(),
			isRated: new foundry.data.fields.BooleanField({ initial: true }),
			rating: integerField(1),
		}),
	);
}
