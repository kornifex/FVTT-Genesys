// @vitest-environment happy-dom
/** @file Tests for the display of a Weapon Profile's damage, Critical rating and range. */

import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WeaponProfileStats from '@/vue/components/WeaponProfileStats.vue';

// The English texts of the keys the display shows.
const ENGLISH: Record<string, string> = {
	'Genesys.Labels.Damage': 'Damage',
	'Genesys.Labels.Critical': 'Critical',
	'Genesys.Labels.Range': 'Range',
	'Genesys.Range.Engaged': 'Engaged',
	'Genesys.Range.Short': 'Short',
	'Genesys.CharacteristicAbbr.Brawn': 'Br',
};

const characteristics = { brawn: 2, agility: 3, intellect: 1, cunning: 2, willpower: 2, presence: 1 };
// A dagger whose damage adds its wielder's Brawn, and a gun whose damage is its own.
const dagger = { baseDamage: 1, damageCharacteristic: 'brawn', critical: 3, range: 'engaged' } as const;
const gun = { baseDamage: 6, damageCharacteristic: '-', critical: 2, range: 'short' } as const;

/** The display's elements, each read as its class and its text. */
function read(wrapper: ReturnType<typeof mount>) {
	return wrapper
		.findAll('.damage, .critical, .range')
		.map((element) => `${element.element.tagName} ${element.classes()[0]}: ${element.text()}`);
}

beforeEach(() => {
	vi.stubGlobal('game', { i18n: { localize: (key: string) => ENGLISH[key] ?? key } });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('WeaponProfileStats', () => {
	describe('in the grid of the Combat tabs', () => {
		it("shows a characteristic's damage as the characteristic and the weapon's damage, then the total", () => {
			const stats = mount(WeaponProfileStats, { props: { layout: 'grid', profile: dagger, characteristics } });

			expect(read(stats)).toEqual(['DIV damage: Br+1 (3)', 'DIV critical: 3', 'DIV range: Engaged']);
		});

		it('shows the total alone for a damage no characteristic adds to', () => {
			const stats = mount(WeaponProfileStats, { props: { layout: 'grid', profile: gun, characteristics } });

			expect(read(stats)).toEqual(['DIV damage: 6', 'DIV critical: 2', 'DIV range: Short']);
		});

		it("shows a vehicle weapon's damage, a vehicle having no characteristics", () => {
			const stats = mount(WeaponProfileStats, {
				props: { layout: 'grid', profile: { baseDamage: 4, critical: 3, range: 'short' } },
			});

			expect(read(stats)).toEqual(['DIV damage: 4', 'DIV critical: 3', 'DIV range: Short']);
		});

		it("shows the columns' labels in the grid's first row", () => {
			const stats = mount(WeaponProfileStats, { props: { layout: 'grid', labels: true } });

			expect(read(stats)).toEqual(['DIV damage: Damage', 'DIV critical: Critical', 'DIV range: Range']);
		});
	});

	describe("in a row's details", () => {
		it("shows a characteristic's damage, the Critical rating and the range after their labels, the range without brackets", () => {
			const stats = mount(WeaponProfileStats, { props: { layout: 'inline', profile: dagger, characteristics } });

			expect(read(stats)).toEqual(['SPAN damage: Damage Br+1 (3)', 'SPAN critical: Critical 3', 'SPAN range: Range Engaged']);
		});

		it('shows the total alone for a damage no characteristic adds to', () => {
			const stats = mount(WeaponProfileStats, { props: { layout: 'inline', profile: gun, characteristics } });

			expect(read(stats)).toEqual(['SPAN damage: Damage 6', 'SPAN critical: Critical 2', 'SPAN range: Range Short']);
		});

		it('writes a negative base damage with its sign', () => {
			const stats = mount(WeaponProfileStats, {
				props: { layout: 'inline', profile: { ...dagger, baseDamage: -1 }, characteristics },
			});

			expect(read(stats)[0]).toBe('SPAN damage: Damage Br-1 (1)');
		});
	});
});
