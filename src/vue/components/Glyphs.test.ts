// @vitest-environment happy-dom
/** @file Tests for the element that gives glyphs their label in words. */

import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import ActionButton from '@/vue/components/ActionButton.vue';
import Glyphs from '@/vue/components/Glyphs.vue';

describe('Glyphs', () => {
	beforeEach(() => {
		// Foundry v13's localization, in English: it has no plural rules of its own.
		const en = load(readFileSync('yaml/lang/en.yml', 'utf8'));
		const localize = (key: string) =>
			key.split('.').reduce((node: unknown, part) => (node as Record<string, unknown>)[part], en) as string;
		vi.stubGlobal('game', {
			i18n: {
				lang: 'en',
				localize,
				format: (key: string, data: Record<string, string>) => localize(key).replace(/{(\w+)}/g, (_, name: string) => data[name]),
				getListFormatter: (options: Intl.ListFormatOptions) => new Intl.ListFormat('en', options),
			},
		});
	});

	it('shows its glyphs as an image labelled in words, the label also its tooltip', () => {
		const glyphs = mount(Glyphs, { props: { glyphs: 'ssa' } });

		expect((glyphs.element as HTMLElement).tagName).toBe('SPAN');
		expect(glyphs.text()).toBe('ssa');
		expect(glyphs.attributes()).toEqual({ role: 'img', 'aria-label': '2 Successes, 1 Advantage', 'data-tooltip': '' });
	});

	it('words Pool Modifications as operations', () => {
		const glyphs = mount(Glyphs, { props: { modifications: ['^'] } });

		expect(glyphs.attributes('aria-label')).toBe('Upgrade 1 Ability die');
	});

	it('holds the glyphs its slot shows in the element its tag names', () => {
		const glyphs = mount(Glyphs, {
			props: { glyphs: 'PA', tag: 'div' },
			slots: { default: '<i class="die">P</i><i class="die">A</i>' },
		});

		expect((glyphs.element as HTMLElement).tagName).toBe('DIV');
		expect(glyphs.findAll('i.die')).toHaveLength(2);
		expect(glyphs.attributes('aria-label')).toBe('1 Proficiency die, 1 Ability die');
	});

	it('is no image while its glyphs name nothing, as an empty pool', async () => {
		const glyphs = mount(Glyphs, { props: { glyphs: 's' } });
		await glyphs.setProps({ glyphs: '' });

		expect(glyphs.attributes()).toEqual({});
	});

	it("gives no words inside a button its label names, whose name and tooltip they'd repeat or cover", () => {
		const keyed = mount(ActionButton, {
			props: { label: 'Genesys.Labels.BuySkillRank' },
			slots: { icon: () => h(Glyphs, { glyphs: 'PA' }) },
		});
		const worded = mount(ActionButton, {
			props: { localizedLabel: 'Upgrade 1 Ability die' },
			slots: { icon: () => h(Glyphs, { modifications: ['^'] }) },
		});

		expect(keyed.attributes('aria-label')).toBe('Buy a rank');
		expect(keyed.get('span').attributes()).toEqual({});
		expect(worded.attributes('aria-label')).toBe('Upgrade 1 Ability die');
		expect(worded.get('span').attributes()).toEqual({});
	});

	it('keeps its words inside a button its content names, which they name', () => {
		const button = mount(ActionButton, { slots: { default: () => h(Glyphs, { glyphs: 'DD' }) } });

		expect(button.attributes('aria-label')).toBeUndefined();
		expect(button.get('span').attributes()).toEqual({ role: 'img', 'aria-label': '2 Difficulty dice', 'data-tooltip': '' });
	});
});
