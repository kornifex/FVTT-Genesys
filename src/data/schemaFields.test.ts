/** @file Tests for the schema shapes the DataModels share: each field reads as the options Foundry builds it with. */

import { describe, expect, it, vi } from 'vitest';

// Foundry's fields, reduced to their kind and the options they are built with; a SchemaField also keeps its fields.
vi.hoisted(() => {
	const field = (kind: string) =>
		class {
			kind = kind;
			constructor(readonly options: object = {}) {}
		};
	class SchemaField {
		kind = 'schema';
		constructor(readonly fields: object) {}
	}
	class ArrayField {
		kind = 'array';
		constructor(readonly element: object) {}
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
