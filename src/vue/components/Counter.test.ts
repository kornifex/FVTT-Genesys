// @vitest-environment happy-dom
/** @file Tests for a counter: its spin button, its − and + buttons, its keys, its right-click and its place on a read-only sheet. */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'vue';
import Counter from '@/vue/components/Counter.vue';
import { provideSheetContext } from '@/vue/SheetContext';

type Props = InstanceType<typeof Counter>['$props'];

beforeEach(() => {
	vi.stubGlobal('game', { i18n: { localize: (key: string) => `localized ${key}` } });
});

/** Mounts the counter in a sheet whose context is given, or alone, as the Story Point tracker renders it. */
function mountCounter(props: Props, options: { context?: object; slot?: string } = {}) {
	const { context, slot } = options;
	const plugins = context ? [{ install: (app: App) => void provideSheetContext(app, context) }] : [];
	return mount(Counter, {
		props,
		slots: slot === undefined ? {} : { default: slot },
		global: { plugins },
		attachTo: document.body,
	});
}

describe('Counter', () => {
	it('is a spin button named by its label, with its value and bounds', () => {
		const counter = mountCounter({ value: 3, label: 'Genesys.Counter.CurrentWounds', max: 24 });
		const spinButton = counter.get('[role="spinbutton"]');

		expect(spinButton.attributes('aria-label')).toBe('localized Genesys.Counter.CurrentWounds');
		expect(spinButton.attributes('data-tooltip')).toBe('');
		expect(spinButton.attributes('aria-valuenow')).toBe('3');
		expect(spinButton.attributes('aria-valuemin')).toBe('0');
		expect(spinButton.attributes('aria-valuemax')).toBe('24');
		expect((spinButton.element as HTMLInputElement).value).toBe('3');
		counter.unmount();
	});

	it('gives no maximum when nothing caps it', () => {
		const counter = mountCounter({ value: 3, label: 'Genesys.Counter.CurrentStrain' });

		expect(counter.get('[role="spinbutton"]').attributes('aria-valuemax')).toBeUndefined();
		counter.unmount();
	});

	it('shows words in place of its number, which a screen reader reads as its value', () => {
		const counter = mountCounter({
			value: 1,
			label: 'Genesys.Counter.Damage',
			valueLabel: 'Genesys.Equipment.DamageState.Minor',
			canType: false,
		});
		const spinButton = counter.get('[role="spinbutton"]');

		expect(spinButton.text()).toBe('localized Genesys.Equipment.DamageState.Minor');
		expect(spinButton.attributes('aria-valuenow')).toBe('1');
		expect(spinButton.attributes('aria-valuetext')).toBe('localized Genesys.Equipment.DamageState.Minor');
		counter.unmount();
	});

	it('has − and + buttons, named, out of the Tab order, that step it', async () => {
		const counter = mountCounter({ value: 3, label: 'Genesys.Labels.Quantity' });
		const decrease = counter.get('button.decrease');
		const increase = counter.get('button.increase');

		expect(decrease.attributes('aria-label')).toBe('localized Genesys.Counter.Decrease');
		expect(increase.attributes('aria-label')).toBe('localized Genesys.Counter.Increase');
		expect(decrease.attributes('tabindex')).toBe('-1');
		expect(increase.attributes('tabindex')).toBe('-1');

		await decrease.trigger('click');
		await increase.trigger('click');

		expect(counter.emitted('step')).toEqual([[-1], [1]]);
		counter.unmount();
	});

	it('names its buttons by the labels given', () => {
		const counter = mountCounter({
			value: 2,
			label: 'Genesys.StoryPoints.Player',
			decreaseLabel: 'Genesys.StoryPoints.Spend',
			increaseLabel: 'Genesys.StoryPoints.Add',
		});

		expect(counter.get('button.decrease').attributes('aria-label')).toBe('localized Genesys.StoryPoints.Spend');
		expect(counter.get('button.increase').attributes('aria-label')).toBe('localized Genesys.StoryPoints.Add');
		counter.unmount();
	});

	it('shows no − at 0 and no + at its cap, and their keys step nothing there', async () => {
		const empty = mountCounter({ value: 0, label: 'Genesys.Counter.CurrentWounds', max: 24 });
		const full = mountCounter({ value: 24, label: 'Genesys.Counter.CurrentWounds', max: 24 });

		expect(empty.find('button.decrease').exists()).toBe(false);
		expect(full.find('button.increase').exists()).toBe(false);
		await empty.get('[role="spinbutton"]').trigger('keydown', { key: 'ArrowDown' });
		await full.get('[role="spinbutton"]').trigger('keydown', { key: 'ArrowUp' });

		expect(empty.emitted('step')).toBeUndefined();
		expect(full.emitted('step')).toBeUndefined();
		empty.unmount();
		full.unmount();
	});

	it('only goes down from a value past its cap, as older data may hold', () => {
		const counter = mountCounter({ value: 30, label: 'Genesys.Counter.CurrentWounds', max: 24 });

		expect(counter.find('button.decrease').exists()).toBe(true);
		expect(counter.find('button.increase').exists()).toBe(false);
		counter.unmount();
	});

	it('steps one up with ArrowUp and one down with ArrowDown', async () => {
		const counter = mountCounter({ value: 3, label: 'Genesys.Labels.Quantity' });
		const spinButton = counter.get('[role="spinbutton"]');

		await spinButton.trigger('keydown', { key: 'ArrowUp' });
		await spinButton.trigger('keydown', { key: 'ArrowDown' });

		expect(counter.emitted('step')).toEqual([[1], [-1]]);
		counter.unmount();
	});

	it('takes one off on a right-click, which opens no menu around it', async () => {
		// The row the counter sits in opens its menu on a right-click that reaches it.
		const rowMenu = vi.fn();
		document.body.addEventListener('contextmenu', rowMenu);
		const counter = mountCounter({ value: 3, label: 'Genesys.Labels.Quantity' });
		const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });

		counter.get('[role="spinbutton"]').element.dispatchEvent(event);

		expect(counter.emitted('step')).toEqual([[-1]]);
		expect(event.defaultPrevented).toBe(true);
		expect(rowMenu).not.toHaveBeenCalled();
		document.body.removeEventListener('contextmenu', rowMenu);
		counter.unmount();
	});

	it('writes a value typed into it on Enter or a blur, parsed and within its bounds', async () => {
		const counter = mountCounter({ value: 5, label: 'Genesys.Counter.CurrentWounds', max: 24 });
		const input = counter.get('input');

		await input.setValue('40');
		await input.trigger('keydown', { key: 'Enter' });
		await input.setValue(' 2.6 ');
		await input.trigger('blur');

		expect(counter.emitted('type')).toEqual([[24], [3]]);
		counter.unmount();
	});

	it('writes nothing for text that is no number or the value it holds, and Escape drops the text typed', async () => {
		const counter = mountCounter({ value: 3, label: 'Genesys.Labels.Quantity' });
		const input = counter.get('input');

		await input.setValue('abc');
		await input.trigger('keydown', { key: 'Enter' });
		await input.setValue('3');
		await input.trigger('blur');
		await input.setValue('5');
		await input.trigger('keydown', { key: 'Escape' });
		await input.trigger('blur');

		expect(counter.emitted('type')).toBeUndefined();
		expect((input.element as HTMLInputElement).value).toBe('3');
		counter.unmount();
	});

	it('keeps the text being typed through a render, until it is written', async () => {
		const counter = mountCounter({ value: 3, label: 'Genesys.Labels.Quantity' });
		const input = counter.get('input');

		await input.setValue('7');
		await counter.setProps({ value: 4 });

		expect((input.element as HTMLInputElement).value).toBe('7');
		await input.trigger('keydown', { key: 'Enter' });
		expect(counter.emitted('type')).toEqual([[7]]);
		counter.unmount();
	});

	it('is a read-only spin button, without +, where only a step down is allowed', async () => {
		const counter = mountCounter({ value: 2, label: 'Genesys.StoryPoints.Player', canIncrease: false, canType: false });
		const spinButton = counter.get('[role="spinbutton"]');

		expect(counter.find('input').exists()).toBe(false);
		expect(spinButton.attributes('tabindex')).toBe('0');
		expect(spinButton.attributes('aria-readonly')).toBe('true');
		// Foundry skips its keybindings while it has focus.
		expect(spinButton.attributes('data-keyboard-focus')).toBe('true');
		expect(counter.find('button.increase').exists()).toBe(false);
		expect(counter.find('button.decrease').exists()).toBe(true);

		await spinButton.trigger('keydown', { key: 'ArrowUp' });
		await spinButton.trigger('keydown', { key: 'ArrowDown' });
		expect(counter.emitted('step')).toEqual([[-1]]);
		counter.unmount();
	});

	it('shows its value alone where none of its changes is allowed', () => {
		const counter = mountCounter(
			{ value: 2, label: 'Genesys.StoryPoints.GM', canDecrease: false, canIncrease: false, canType: false },
			{ slot: '<i class="fas fa-suitcase"></i>' },
		);

		expect(counter.find('[role="spinbutton"]').exists()).toBe(false);
		expect(counter.find('button').exists()).toBe(false);
		expect(counter.text()).toBe('2');
		expect(counter.find('i.fa-suitcase').exists()).toBe(true);
		counter.unmount();
	});

	it("shows its value alone on a sheet the user can't edit, and a right-click there takes nothing off", async () => {
		const counter = mountCounter({ value: 2, label: 'Genesys.Labels.Quantity' }, { context: { editable: false } });

		expect(counter.find('[role="spinbutton"]').exists()).toBe(false);
		expect(counter.find('button').exists()).toBe(false);
		expect(counter.attributes('data-tooltip')).toBe('Genesys.Labels.Quantity');
		await counter.trigger('contextmenu');
		expect(counter.emitted('step')).toBeUndefined();
		counter.unmount();
	});

	it('is a spin button on a sheet the user can edit', () => {
		const counter = mountCounter({ value: 2, label: 'Genesys.Labels.Quantity' }, { context: { editable: true } });

		expect(counter.find('input[role="spinbutton"]').exists()).toBe(true);
		counter.unmount();
	});
});
