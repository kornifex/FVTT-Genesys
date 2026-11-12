/** @file Tests for the schema shapes the DataModels share: each field reads as the options Foundry builds it with. */

import { describe, expect, it, vi } from 'vitest';

// Foundry's fields, reduced to their kind and the options they are built with; a SchemaField also keeps its fields.
vi.hoisted(() => {
	const field = (kind: string) =>
		class {
			kind = kind;
			readonly options: object;
			constructor(options: object = {}) {
				this.options = options;
			}
		};
	class SchemaField {
		kind = 'schema';
		readonly fields: object;
		constructor(fields: object) {
			this.fields = fields;
		}
	}
	class ArrayField {
		kind = 'array';
		readonly element: object;
		constructor(element: object) {
			this.element = element;
		}
	}
	vi.stubGlobal('foundry', {
		data: {
			fields: {
				SchemaField,
				ArrayField,
				NumberField: field('number'),
				StringField: field('string'),
				HTMLField: field('html'),
				BooleanField: field('boolean'),
			},
		},
	});
});

import {
	activationField,
	characteristicsField,
	choiceField,
	combatPoolField,
	defenseField,
	motivationsField,
	qualitiesField,
	valueWithThresholdField,
} from '@/data/schemaFields';

const integer = (initial: number) => ({ kind: 'number', options: { integer: true, initial } });

describe('characteristicsField', () => {
	it('holds the six characteristics as integers, starting at the value given', () => {
		const integerAt2 = integer(2);

		expect(characteristicsField(2)).toMatchObject({
			kind: 'schema',
			fields: {
				brawn: integerAt2,
				agility: integerAt2,
				intellect: integerAt2,
				cunning: integerAt2,
				willpower: integerAt2,
				presence: integerAt2,
			},
		});
		expect(Object.keys((characteristicsField(0) as unknown as { fields: object }).fields)).toHaveLength(6);
	});
});

describe('defenseField', () => {
	it('holds the melee and ranged defenses as integers starting at 0', () => {
		expect(defenseField()).toMatchObject({ kind: 'schema', fields: { melee: integer(0), ranged: integer(0) } });
	});
});

describe('combatPoolField', () => {
	it('holds a value and its maximum as integers starting at 0, as wounds and strain are counted', () => {
		expect(combatPoolField()).toMatchObject({ kind: 'schema', fields: { value: integer(0), max: integer(0) } });
	});
});

describe('valueWithThresholdField', () => {
	it('holds a value and its threshold as integers starting at 0', () => {
		expect(valueWithThresholdField()).toMatchObject({ kind: 'schema', fields: { value: integer(0), threshold: integer(0) } });
	});
});

describe('motivationsField', () => {
	it('holds the four Motivations, each with a name and a description', () => {
		const motivation = { kind: 'schema', fields: { name: { kind: 'string' }, description: { kind: 'html' } } };

		expect(motivationsField()).toMatchObject({
			kind: 'schema',
			fields: { strength: motivation, flaw: motivation, desire: motivation, fear: motivation },
		});
	});
});

describe('choiceField', () => {
	it('takes one of the choices listed, starting at the one given', () => {
		expect(choiceField(['engaged', 'short', 'medium'], 'short')).toMatchObject({
			kind: 'string',
			options: { choices: ['engaged', 'short', 'medium'], initial: 'short' },
		});
	});
});

describe('qualitiesField', () => {
	it('lists qualities, each rated 1 at first', () => {
		expect(qualitiesField()).toMatchObject({
			kind: 'array',
			element: {
				kind: 'schema',
				fields: {
					name: { kind: 'string' },
					description: { kind: 'html' },
					isRated: { kind: 'boolean', options: { initial: true } },
					rating: integer(1),
				},
			},
		});
	});

	// Foundry fills the fields a stored copy lacks with their initial values: a copy stored with only its name,
	// description, rating and whether it is rated keeps them, and reads as passive, costing 2 Advantage (CRB p. 86).
	it('reads a copy stored before its id, activation and Advantage cost as passive, costing 2, without an id', () => {
		expect(qualitiesField()).toMatchObject({
			element: {
				fields: {
					id: { kind: 'string', options: { initial: '' } },
					activation: { kind: 'string', options: { choices: ['passive', 'active'], initial: 'passive' } },
					advantageCost: { kind: 'number', options: { integer: true, min: 0, initial: 2 } },
				},
			},
		});
	});
});

describe('activationField', () => {
	it('holds whether an ability or a talent is passive, as at first, or active, with the detail of its activation', () => {
		expect(activationField()).toMatchObject({
			kind: 'schema',
			fields: {
				type: { kind: 'string', options: { choices: ['passive', 'active'], initial: 'passive' } },
				detail: { kind: 'string', options: { initial: '' } },
			},
		});
	});
});
