// @vitest-environment happy-dom
/** @file Tests for a characteristic's label, which rolls its check, and the ↑ beside it, which raises it. */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'vue';
import Characteristic from '@/vue/components/character/Characteristic.vue';
import { provideSheetContext } from '@/vue/SheetContext';

type Props = InstanceType<typeof Characteristic>['$props'];

beforeEach(() => {
	// Each key as its text, and a formatted key followed by its data, so that the test reads what was asked for.
	vi.stubGlobal('game', {
		i18n: {
			localize: (key: string) => key,
			format: (key: string, data: Record<string, string>) => `${key} ${Object.values(data).join(', ')}`,
		},
	});
	vi.stubGlobal('CONFIG', { genesys: { settings: { useSuperCharacteristics: false } } });
});

const brawn: Props = { label: 'Genesys.Characteristics.Brawn', value: 3, canRollCharacteristicCheck: true };

function mountCharacteristic(props: Props, context: object = { editable: true }) {
	return mount(Characteristic, { props, global: { plugins: [{ install: (app: App) => void provideSheetContext(app, context) }] } });
}

describe('Characteristic', () => {
	it('rolls from its label, which names the check in its tooltip', async () => {
		const onRollCharacteristicCheck = vi.fn();
		const label = mountCharacteristic({ ...brawn, onRollCharacteristicCheck }).get('.characteristic-label .roll-link');

		expect(label.text()).toBe('Genesys.Characteristics.Brawn');
		expect(label.attributes('data-tooltip-text')).toBe('Genesys.Tooltips.RollCharacteristic Genesys.Characteristics.Brawn');
		await label.trigger('click');

		expect(onRollCharacteristicCheck).toHaveBeenCalledOnce();
	});

	it('still rolls from its label while a raise is affordable, which its ↑ makes', async () => {
		const onRollCharacteristicCheck = vi.fn();
		const onUpgrade = vi.fn();
		const characteristic = mountCharacteristic({ ...brawn, canUpgrade: true, onRollCharacteristicCheck, onUpgrade });

		await characteristic.get('.roll-link').trigger('click');
		expect(onRollCharacteristicCheck).toHaveBeenCalledOnce();
		expect(onUpgrade).not.toHaveBeenCalled();

		const raise = characteristic.get('.raise');
		expect(raise.attributes('aria-label')).toBe('Genesys.Labels.RaiseCharacteristic');
		await raise.trigger('click');
		expect(onUpgrade).toHaveBeenCalledOnce();
		expect(onRollCharacteristicCheck).toHaveBeenCalledOnce();
	});

	it("shows no ↑ when no raise is affordable, nor on a sheet the user can't edit", () => {
		expect(mountCharacteristic(brawn).find('.raise').exists()).toBe(false);
		expect(
			mountCharacteristic({ ...brawn, canUpgrade: true }, { editable: false })
				.find('.raise')
				.exists(),
		).toBe(false);
	});

	it('puts its ↑ in its label right after the name, so that it sits beside the name in the box fitted to the label', () => {
		const label = mountCharacteristic({ ...brawn, canUpgrade: true }).get('.characteristic-label');

		expect([...label.element.children].map((child) => child.className)).toEqual(['action-button roll-link', 'action-button raise']);
	});

	it("keeps its ↑'s room on a sheet that raises characteristics, unread and out of reach, while the ↑ doesn't show", () => {
		const unaffordable = mountCharacteristic({ ...brawn, raisable: true });
		const observed = mountCharacteristic({ ...brawn, raisable: true, canUpgrade: true }, { editable: false });

		for (const characteristic of [unaffordable, observed]) {
			const room = characteristic.get('.characteristic-label > .raise-room');
			expect(room.attributes('aria-hidden')).toBe('true');
			expect(room.find('button, [tabindex]').exists()).toBe(false);
			expect(characteristic.find('.raise').exists()).toBe(false);
		}
	});

	it('shows its ↑ in place of its room once a raise is affordable', () => {
		const characteristic = mountCharacteristic({ ...brawn, raisable: true, canUpgrade: true });

		expect(characteristic.find('.raise').exists()).toBe(true);
		expect(characteristic.find('.raise-room').exists()).toBe(false);
	});

	it('keeps no room for an ↑ on a sheet that never raises characteristics', () => {
		expect(mountCharacteristic(brawn).find('.raise-room').exists()).toBe(false);
	});

	it("marks a super-characteristic with a star on its value, where the world's setting allows them", () => {
		expect(
			mountCharacteristic({ ...brawn, isSuper: true })
				.find('.super-star')
				.exists(),
		).toBe(false);

		vi.stubGlobal('CONFIG', { genesys: { settings: { useSuperCharacteristics: true } } });
		// Decorative: the ⋮ menu's entry says whether the characteristic is superior.
		const star = mountCharacteristic({ ...brawn, isSuper: true }).get('.value > .super-star');
		expect(star.attributes('aria-hidden')).toBe('true');
		expect(mountCharacteristic(brawn).find('.super-star').exists()).toBe(false);
	});

	it('shows its label as text where it rolls nothing, as on an Archetype', () => {
		const characteristic = mountCharacteristic({ ...brawn, canRollCharacteristicCheck: false });

		expect(characteristic.find('.roll-link').exists()).toBe(false);
		expect(characteristic.get('.characteristic-label').text()).toBe('Genesys.Characteristics.Brawn');
	});
});
