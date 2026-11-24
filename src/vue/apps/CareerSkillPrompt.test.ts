// @vitest-environment happy-dom
/** @file Tests for the window that asks for the skills a Career's Free Ranks or an Archetype's choices give a rank. */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'vue';
import type { CareerSkillPromptContext } from '@/app/CareerSkillPrompt';
import { provideSheetContext } from '@/vue/SheetContext';
import { providePrompt } from '@/vue/usePrompt';
import CareerSkillPrompt from '@/vue/apps/CareerSkillPrompt.vue';

beforeEach(() => {
	vi.stubGlobal('game', { i18n: { localize: (key: string) => `localized ${key}` } });
});

function skill(id: string, name: string) {
	return { id, name, img: null, system: { characteristic: 'agility' } };
}

/** Mounts the window with the skills, number of choices and hint given; the answer it gives reads `answer()`. */
function mountPrompt(count: number, hint: string) {
	const context = {
		skills: [skill('ranged', 'Ranged'), skill('stealth', 'Stealth'), skill('cool', 'Cool')],
		count,
		hint,
	} as unknown as CareerSkillPromptContext; // The window reads the skills' id, name, img and characteristic alone.
	let read: () => unknown = () => undefined;
	const plugins = [
		{
			install: (app: App) => {
				provideSheetContext(app, context);
				providePrompt(app, { answerWith: (reader) => (read = reader), cancel: vi.fn() });
			},
		},
	];
	return { prompt: mount(CareerSkillPrompt, { global: { plugins } }), answer: () => read() };
}

describe('CareerSkillPrompt', () => {
	it.each(['Genesys.CareerSkillPrompt.Hint', 'Genesys.CareerSkillPrompt.NonCareerHint'])(
		'shows the hint it is given above the skills: %s',
		(hint) => {
			const { prompt } = mountPrompt(2, hint);

			expect(prompt.get('.career-skills-hint').text()).toBe(`localized ${hint}`);
		},
	);

	it('asks for no more choices than it offers skills, so Done can be reached', async () => {
		const { prompt, answer } = mountPrompt(4, 'Genesys.CareerSkillPrompt.NonCareerHint');

		expect(prompt.get('.remaining').text()).toBe('localized Genesys.CareerSkillPrompt.RemainingChoices: 3');

		for (const button of prompt.findAll('.select-skill')) {
			await button.trigger('click');
		}

		expect(prompt.get('.prompt-submit').attributes('disabled')).toBeUndefined();
		expect(answer()).toEqual(['ranged', 'stealth', 'cool']);
	});

	it('counts the choices left down from the number it is given, and keeps Done disabled until none is left', async () => {
		const { prompt, answer } = mountPrompt(2, 'Genesys.CareerSkillPrompt.Hint');
		const remaining = () => prompt.get('.remaining').text();
		const done = () => prompt.get('.prompt-submit').attributes('disabled');

		expect(remaining()).toBe('localized Genesys.CareerSkillPrompt.RemainingChoices: 2');
		expect(done()).toBeDefined();

		await prompt.findAll('.select-skill')[0].trigger('click');
		await prompt.findAll('.select-skill')[2].trigger('click');

		expect(remaining()).toBe('localized Genesys.CareerSkillPrompt.RemainingChoices: 0');
		expect(done()).toBeUndefined();
		expect(answer()).toEqual(['ranged', 'cool']);
	});

	it('takes no more skills than the number it is given, each once', async () => {
		const { prompt, answer } = mountPrompt(2, 'Genesys.CareerSkillPrompt.Hint');
		const buttons = prompt.findAll('.select-skill');

		for (const button of [buttons[0], buttons[1], buttons[2]]) {
			await button.trigger('click');
		}

		expect(answer()).toEqual(['ranged', 'stealth']);
		expect(buttons.map((button) => button.attributes('aria-pressed'))).toEqual(['true', 'true', 'false']);
	});
});
