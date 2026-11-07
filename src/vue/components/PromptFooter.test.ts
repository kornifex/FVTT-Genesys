// @vitest-environment happy-dom
/** @file Tests for a prompt's footer: its primary button, which submits the prompt's form, and Cancel. */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'vue';
import PromptFooter from '@/vue/components/PromptFooter.vue';
import { type PromptControls, providePrompt } from '@/vue/usePrompt';

type Props = InstanceType<typeof PromptFooter>['$props'];

beforeEach(() => {
	vi.stubGlobal('game', { i18n: { localize: (key: string) => `localized ${key}` } });
});

/** Mounts the footer in a prompt whose controls are given, with the attributes given. */
function mountFooter(props: Props, attrs: Record<string, string> = {}, controls: Partial<PromptControls> = {}) {
	const prompt: PromptControls = { answerWith: vi.fn(), cancel: vi.fn(), ...controls };
	const plugins = [{ install: (app: App) => providePrompt(app, prompt) }];
	return { footer: mount(PromptFooter, { props, attrs, global: { plugins } }), prompt };
}

describe('PromptFooter', () => {
	it("shows a primary button that submits the prompt's form, with the prompt's label, then Cancel", () => {
		const { footer } = mountFooter({ label: 'Genesys.DicePrompt.Roll' });
		const buttons = footer.findAll('button');

		expect(buttons.map((button) => [button.attributes('type'), button.text()])).toEqual([
			['submit', 'localized Genesys.DicePrompt.Roll'],
			['button', 'localized Genesys.Labels.Cancel'],
		]);
	});

	it('disables the primary button while the prompt has no answer, and leaves Cancel enabled', () => {
		const { footer } = mountFooter({ label: 'Genesys.Labels.Select', disabled: true });

		expect(footer.get('.prompt-submit').attributes('disabled')).toBeDefined();
		expect(footer.get('.prompt-cancel').attributes('disabled')).toBeUndefined();
	});

	it('enables the primary button by default', () => {
		const { footer } = mountFooter({ label: 'Genesys.Labels.Select' });

		expect(footer.get('.prompt-submit').attributes('disabled')).toBeUndefined();
	});

	it('gives the attributes it is given to its primary button', () => {
		const { footer } = mountFooter({ label: 'Genesys.DicePrompt.Roll' }, { class: 'roll-button' });

		expect(footer.classes()).toEqual(['prompt-footer']);
		expect(footer.get('.prompt-submit').classes()).toContain('roll-button');
	});

	it('cancels the prompt on Cancel, without submitting its form', async () => {
		const cancel = vi.fn();
		const { footer } = mountFooter({ label: 'Genesys.Labels.Add' }, {}, { cancel });

		await footer.get('.prompt-cancel').trigger('click');

		expect(cancel).toHaveBeenCalledOnce();
	});

	it("submits the form it renders in from its primary button, and doesn't from Cancel", async () => {
		const form = document.createElement('form');
		document.body.append(form);
		const submitted = vi.fn((event: Event) => event.preventDefault());
		form.addEventListener('submit', submitted);
		const prompt: PromptControls = { answerWith: vi.fn(), cancel: vi.fn() };
		const footer = mount(PromptFooter, {
			props: { label: 'Genesys.Labels.Add' },
			attachTo: form,
			global: { plugins: [{ install: (app: App) => providePrompt(app, prompt) }] },
		});

		(footer.get('.prompt-cancel').element as HTMLButtonElement).click();
		expect(submitted).not.toHaveBeenCalled();

		(footer.get('.prompt-submit').element as HTMLButtonElement).click();
		expect(submitted).toHaveBeenCalledOnce();

		footer.unmount();
		form.remove();
	});
});
