/** @file Tests for the schemas of the Adversaries: their wounds and strain are whole numbers, as a character's are. */

import { describe, expect, it, vi } from 'vitest';

// Foundry's DataModel and fields, reduced to the options each field is built with; a SchemaField keeps its fields.
vi.hoisted(() => {
	const field = class {
		constructor(readonly options: object = {}) {}
	};
	vi.stubGlobal('foundry', {
		abstract: { DataModel: class {} },
		data: {
			fields: {
				SchemaField: class {
					constructor(readonly fields: object) {}
				},
				ArrayField: field,
				BooleanField: field,
				HTMLField: field,
				NumberField: field,
				SetField: field,
				StringField: field,
			},
		},
	});
});

import { MinionDataModel } from '@/actor/data/MinionDataModel';
import { NemesisDataModel } from '@/actor/data/NemesisDataModel';
import { RivalDataModel } from '@/actor/data/RivalDataModel';

const integer = { options: { integer: true, initial: 0 } };

describe('adversary schemas', () => {
	it("holds a rival's wounds as integers", () => {
		expect(RivalDataModel.defineSchema().wounds).toMatchObject({ fields: { value: integer, max: integer } });
	});

	it("holds a nemesis's wounds and strain as integers", () => {
		const schema = NemesisDataModel.defineSchema();

		expect(schema.wounds).toMatchObject({ fields: { value: integer, max: integer } });
		expect(schema.strain).toMatchObject({ fields: { value: integer, max: integer } });
	});

	it("holds a Minion Group's wounds as integers", () => {
		expect(MinionDataModel.defineSchema().wounds).toMatchObject({ fields: { value: integer, threshold: integer } });
	});
});
