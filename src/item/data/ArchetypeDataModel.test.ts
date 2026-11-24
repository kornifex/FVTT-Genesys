/** @file Tests for the schema of an Archetype: the non-career skill choices it gives, and the skills chosen for them. */

import { describe, expect, it, vi } from 'vitest';

// Foundry's TypeDataModel and fields, reduced to the options each field is built with, each field a class of its own; a
// SchemaField and an ArrayField keep what they hold.
vi.hoisted(() => {
	const field = class {
		readonly options: object;
		constructor(options: object = {}) {
			this.options = options;
		}
	};
	vi.stubGlobal('foundry', {
		abstract: { TypeDataModel: class {} },
		data: {
			fields: {
				SchemaField: class {
					readonly fields: object;
					constructor(fields: object) {
						this.fields = fields;
					}
				},
				ArrayField: class {
					readonly element: object;
					constructor(element: object) {
						this.element = element;
					}
				},
				HTMLField: class extends field {},
				NumberField: class extends field {},
				ObjectField: class extends field {},
				StringField: class extends field {},
			},
		},
	});
});

import { ArchetypeDataModel } from '@/item/data/ArchetypeDataModel';

describe('archetype schema', () => {
	it('gives no non-career skill choice by default, and a whole number of them from 0, as the Human gives 2 (RoT p. 61)', () => {
		expect(ArchetypeDataModel.defineSchema().nonCareerSkillChoices).toMatchObject({
			options: { required: true, nullable: false, integer: true, min: 0, initial: 0 },
		});
	});

	it("holds the ids of the character's skills chosen for its choices", () => {
		const { chosenSkillIds } = ArchetypeDataModel.defineSchema();

		expect(chosenSkillIds).toBeInstanceOf(foundry.data.fields.ArrayField);
		expect(chosenSkillIds.element).toBeInstanceOf(foundry.data.fields.StringField);
	});
});
