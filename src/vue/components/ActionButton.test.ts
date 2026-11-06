// @vitest-environment happy-dom
/** @file Tests for the button of a sheet's or a prompt's actions: its name, its tooltip, and its place on a read-only sheet. */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'vue';
import ActionButton from '@/vue/components/ActionButton.vue';
import { provideSheetContext } from '@/vue/SheetContext';

type Props = InstanceType<typeof ActionButton>['$props'];

beforeEach(() => {
	// Foundry localizes a key into its text: here, the key marked as localized.
	vi.stubGlobal('game', { i18n: { localize: (key: string) => `localized ${key}` } });
});

/** Mounts the button in a sheet whose context is given, or alone, as a component test or a prompt renders it. */
function mountButton(props: Props, options: { context?: object; text?: string; icon?: string } = {}) {
	const { context, text, icon } = options;
	const slots = { ...(text === undefined ? {} : { default: text }), ...(icon === undefined ? {} : { icon }) };
	const plugins = context ? [{ install: (app: App) => void provideSheetContext(app, context) }] : [];
	return mount(ActionButton, { props, slots, global: { plugins } });
}

describe('ActionButton', () => {
	it('is a button that submits nothing', () => {
		const button = mountButton({ icon: 'fas fa-trash', label: 'Genesys.Labels.Delete' });

		expect((button.element as HTMLElement).tagName).toBe('BUTTON');
		expect(button.attributes('type')).toBe('button');
	});

	it('is named by its label when it shows an icon alone, which is its tooltip too', () => {
		const button = mountButton({ icon: 'fas fa-trash', label: 'Genesys.Labels.Delete' });

		expect(button.attributes('aria-label')).toBe('localized Genesys.Labels.Delete');
		// A bare `data-tooltip` shows the `aria-label`.
		expect(button.attributes('data-tooltip')).toBe('');
		expect(button.get('i').classes()).toEqual(['fas', 'fa-trash']);
	});

	it('is named by its label when it shows an image or a drawing, which name nothing', () => {
		const image = mountButton({ image: 'skill.webp', label: 'Genesys.Tooltips.OpenSkill' });
		const drawing = mountButton({ label: 'Genesys.Labels.PerformCheck' }, { icon: '<span class="ranks"></span>' });

		expect(image.attributes('aria-label')).toBe('localized Genesys.Tooltips.OpenSkill');
		expect(image.get('img').attributes('alt')).toBe('');
		expect(drawing.attributes('aria-label')).toBe('localized Genesys.Labels.PerformCheck');
		expect(drawing.find('.ranks').exists()).toBe(true);
	});

	it('is named by words already localized in place of a label, which are its tooltip too', () => {
		const button = mountButton({ localizedLabel: 'Remove 1 Ability die' }, { icon: '<span>A</span>' });

		expect(button.attributes('aria-label')).toBe('Remove 1 Ability die');
		expect(button.attributes('data-tooltip')).toBe('');
	});

	it('is named by the text it shows, its label adding a tooltip', () => {
		const labelled = mountButton({ label: 'Genesys.Labels.Quantity' }, { text: '2' });
		const plain = mountButton({}, { text: 'E2E Sword' });

		expect(labelled.attributes('aria-label')).toBeUndefined();
		expect(labelled.text()).toBe('2');
		// Foundry localizes a tooltip's key as it shows it.
		expect(labelled.attributes('data-tooltip')).toBe('Genesys.Labels.Quantity');
		expect(plain.attributes('aria-label')).toBeUndefined();
		expect(plain.attributes('data-tooltip')).toBeUndefined();
	});

	it('takes words already localized as its tooltip alone when it shows text', () => {
		const button = mountButton({ localizedLabel: 'Roll Athletics' }, { text: 'Athletics (Br)' });

		expect(button.attributes('aria-label')).toBeUndefined();
		expect(button.attributes('data-tooltip')).toBe('Roll Athletics');
	});

	it('keeps a space between its icon and its text', () => {
		const button = mountButton({ icon: 'fas fa-plus' }, { text: 'Add' });

		expect((button.element as HTMLElement).textContent).toBe(' Add');
	});

	it('tells whether what it folds is open, and whether it is on, only when it does either', () => {
		const plain = mountButton({ icon: 'fas fa-trash', label: 'Genesys.Labels.Delete' });
		const closed = mountButton({ icon: 'fas fa-chevron-right', label: 'Genesys.Tooltips.ShowDescription', expanded: false });
		const open = mountButton({ icon: 'fas fa-chevron-down', label: 'Genesys.Tooltips.HideDescription', expanded: true });
		const on = mountButton({ icon: 'fas fa-power-off', label: 'Genesys.ActiveEffects.Toggle', pressed: true });
		const off = mountButton({ icon: 'fas fa-power-off', label: 'Genesys.ActiveEffects.Toggle', pressed: false });

		expect(plain.attributes('aria-expanded')).toBeUndefined();
		expect(plain.attributes('aria-pressed')).toBeUndefined();
		expect(closed.attributes('aria-expanded')).toBe('false');
		expect(open.attributes('aria-expanded')).toBe('true');
		expect(on.attributes('aria-pressed')).toBe('true');
		expect(off.attributes('aria-pressed')).toBe('false');
	});

	it('runs its action on a click', async () => {
		const onClick = vi.fn();
		const button = mount(ActionButton, {
			props: { icon: 'fas fa-trash', label: 'Genesys.Labels.Delete' },
			attrs: { onClick },
		});

		await button.trigger('click');

		expect(onClick).toHaveBeenCalledOnce();
	});

	it('releases the focus after a click with a pointer, and keeps it after an activation from the keyboard', () => {
		const onClick = vi.fn();
		const button = mount(ActionButton, {
			props: { icon: 'fas fa-trash', label: 'Genesys.Labels.Delete' },
			attrs: { onClick },
			attachTo: document.body,
		});
		const element = button.element as HTMLButtonElement;
		const clickedBy = (event: MouseEvent) => {
			element.focus();
			element.dispatchEvent(event);
			return document.activeElement === element ? 'kept' : 'released';
		};

		// Enter or Space on a focused button clicks it with no pointer, and a count of 0.
		expect(clickedBy(new PointerEvent('click', { bubbles: true, pointerType: '' }))).toBe('kept');
		expect(clickedBy(new PointerEvent('click', { bubbles: true, pointerType: 'mouse', detail: 1 }))).toBe('released');
		// A browser whose click isn't a PointerEvent counts the clicks.
		expect(clickedBy(new MouseEvent('click', { bubbles: true, detail: 0 }))).toBe('kept');
		expect(clickedBy(new MouseEvent('click', { bubbles: true, detail: 1 }))).toBe('released');
		// The action runs either way.
		expect(onClick).toHaveBeenCalledTimes(4);

		button.unmount();
	});

	it("is left out of a sheet the user can't edit when it edits, and kept when it reads", () => {
		const context = { editable: false };

		expect(
			mountButton({ icon: 'fas fa-trash', label: 'Genesys.Labels.Delete', edits: true }, { context }).find('button').exists(),
		).toBe(false);
		expect(mountButton({ icon: 'fas fa-edit', label: 'Genesys.Labels.Edit' }, { context }).find('button').exists()).toBe(true);
	});

	it('shows an edit on a sheet the user can edit, and where nothing says whether one can', () => {
		const edits = { icon: 'fas fa-trash', label: 'Genesys.Labels.Delete', edits: true };

		expect(
			mountButton(edits, { context: { editable: true } })
				.find('button')
				.exists(),
		).toBe(true);
		// A prompt's context and the Story Point tracker's have no `editable`, nor has a component mounted alone.
		expect(
			mountButton(edits, { context: { roll: {} } })
				.find('button')
				.exists(),
		).toBe(true);
		expect(mountButton(edits).find('button').exists()).toBe(true);
	});
});
