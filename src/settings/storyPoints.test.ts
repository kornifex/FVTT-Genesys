/** @file Tests for the field the Story Point pools are stored with. */

import { describe, expect, it, vi } from 'vitest';

// Foundry's fields, reduced to the options they are built with; a SchemaField keeps its fields.
vi.hoisted(() => {
	vi.stubGlobal('foundry', {
		data: {
			fields: {
				SchemaField: class {
					readonly fields: object;
					constructor(fields: object) {
						this.fields = fields;
					}
				},
				NumberField: class {
					readonly options: object;
					constructor(options: object) {
						this.options = options;
					}
				},
			},
		},
	});
});

import { storyPointsField } from '@/settings/storyPoints';

describe('storyPointsField', () => {
	it('holds the GM and player pools as whole counts starting at 0, refused below 0 with a localized error', () => {
		const count = {
			options: {
				required: true,
				nullable: false,
				integer: true,
				initial: 0,
				validationError: 'localized Genesys.Settings.CountError',
			},
		};
		expect(storyPointsField((key) => `localized ${key}`)).toMatchObject({ fields: { gm: count, player: count } });
	});
});
