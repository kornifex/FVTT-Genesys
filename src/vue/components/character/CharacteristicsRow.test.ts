// @vitest-environment happy-dom
/** @file Tests for the row of characteristic boxes that the character, adversary, vehicle and archetype sheets share. */

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CharacteristicsRow from '@/vue/components/character/CharacteristicsRow.vue';

const boxes = { default: '<div class="characteristic-field">Brawn</div><div class="characteristic-field">Agility</div>' };

describe('CharacteristicsRow', () => {
	it('holds the boxes it is given, in their order', () => {
		const row = mount(CharacteristicsRow, { slots: boxes });

		expect(row.classes()).toContain('characteristics-row');
		expect(row.findAll(':scope > .characteristic-field').map((box) => box.text())).toEqual(['Brawn', 'Agility']);
	});

	it('draws the gold band behind its boxes, unless its sheet draws one behind more than the row', () => {
		expect(mount(CharacteristicsRow, { slots: boxes }).classes()).toContain('band');
		expect(mount(CharacteristicsRow, { slots: boxes, props: { band: false } }).classes()).not.toContain('band');
	});
});
