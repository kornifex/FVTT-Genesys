// @vitest-environment happy-dom
/** @file Tests for the fold of a row: its chevron, its open state, and what it shows. */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import DescriptionFold from '@/vue/components/DescriptionFold.vue';

beforeEach(() => {
	// Foundry localizes a key into its text: here, the key marked as localized.
	vi.stubGlobal('game', { i18n: { localize: (key: string) => `localized ${key}` } });
});

type Props = InstanceType<typeof DescriptionFold>['$props'];

/**
 * Mounts a fold after a row's name, as the Combat tabs do, with the slots given. The enriched text is stubbed: enriching
 * is Foundry's.
 */
function mountFold(props: Props, slots: Record<string, string> = { default: '<button class="name">Dagger</button>' }) {
	return mount(DescriptionFold, { props, slots, global: { stubs: { Enriched: true } } });
}

describe('DescriptionFold', () => {
	it('starts closed', () => {
		const fold = mountFold({ description: '<p>Sharp.</p>' });

		expect(fold.get('.description-fold').classes()).not.toContain('open');
		expect(fold.get('button.description-toggle').attributes('aria-expanded')).toBe('false');
	});

	it('names its chevron Details, open or closed, and tells whether the fold is open', async () => {
		const fold = mountFold({ description: '<p>Sharp.</p>' });
		const chevron = fold.get('button.description-toggle');
		expect([chevron.attributes('aria-label'), chevron.get('i').classes()]).toEqual([
			'localized Genesys.Tooltips.Details',
			['fas', 'fa-chevron-right'],
		]);

		await chevron.trigger('click');

		expect([chevron.attributes('aria-label'), chevron.attributes('aria-expanded'), chevron.get('i').classes()]).toEqual([
			'localized Genesys.Tooltips.Details',
			'true',
			['fas', 'fa-chevron-down'],
		]);
		expect(fold.get('.description-fold').classes()).toContain('open');

		await chevron.trigger('click');

		expect(chevron.attributes('aria-expanded')).toBe('false');
	});

	it('points its chevron at the fold it opens', () => {
		const fold = mountFold({ description: '<p>Sharp.</p>' });
		const controls = fold.get('button.description-toggle').attributes('aria-controls');

		expect(controls).toBeTruthy();
		expect(fold.get('.description-fold').attributes('id')).toBe(controls);
	});

	it('gives two folds two ids', () => {
		const two = mount(
			defineComponent(() => () => [
				h(DescriptionFold, { description: '<p>A.</p>' }, { default: () => 'A' }),
				h(DescriptionFold, { description: '<p>B.</p>' }, { default: () => 'B' }),
			]),
			{ global: { stubs: { Enriched: true } } },
		);
		const ids = two.findAll('.description-fold').map((fold) => fold.attributes('id'));

		expect(new Set(ids).size).toBe(2);
	});

	it('shows its head after the row gives it, the chevron last, with the attributes given to the fold', () => {
		const fold = mount(DescriptionFold, {
			props: { description: '<p>Sharp.</p>' },
			attrs: { class: 'name' },
			slots: { default: '<button class="roll">Dagger</button>' },
			global: { stubs: { Enriched: true } },
		});
		const head = fold.get('.description-fold-head');

		expect(head.classes()).toContain('name');
		expect([...head.element.children].map((child) => child.className)).toEqual(['roll', 'action-button description-toggle icon-only']);
	});

	it('follows and sets v-model:open', async () => {
		const open = ref(true);
		const fold = mount(
			defineComponent(
				() => () =>
					h(
						DescriptionFold,
						{
							description: '<p>Sharp.</p>',
							open: open.value,
							'onUpdate:open': (value: boolean) => (open.value = value),
						},
						{ default: () => 'Dagger' },
					),
			),
			{ global: { stubs: { Enriched: true } } },
		);
		expect(fold.get('button.description-toggle').attributes('aria-expanded')).toBe('true');

		await fold.get('button.description-toggle').trigger('click');
		expect(open.value).toBe(false);
		expect(fold.get('.description-fold').classes()).not.toContain('open');

		open.value = true;
		await fold.vm.$nextTick();
		expect(fold.get('.description-fold').classes()).toContain('open');
	});

	it('shows no chevron when the fold has nothing to show, and leaves the head', () => {
		const empty = mountFold({ description: '<p>&nbsp;</p>' });
		const none = mountFold({});

		for (const fold of [empty, none]) {
			expect(fold.find('.description-toggle').exists()).toBe(false);
			expect(fold.find('.description-fold-head .name').exists()).toBe(true);
			expect(fold.find('.description').exists()).toBe(false);
		}
	});

	it('shows a chevron when its slots add something to the fold without a description, such as a tier', () => {
		const tier = mountFold(
			{ description: '' },
			{ default: 'Grit', fold: '<span class="tier">Tier: 1</span>', 'fold-end': '<span class="source">Core, p. 72</span>' },
		);

		expect(tier.find('.description-toggle').exists()).toBe(true);
		expect(tier.get('.description-fold-content').element.children.length).toBe(2);
	});

	it('shows the description with what its slots add, in order', () => {
		const fold = mountFold(
			{ description: '<p>Sharp.</p>' },
			{ default: 'Grit', fold: '<span class="tier">Tier</span>', 'fold-end': '<span class="source">Source</span>' },
		);

		expect([...fold.get('.description-fold-content').element.children].map((child) => child.classList[0])).toEqual([
			'tier',
			'description',
			'source',
		]);
	});

	it('makes its chevron the head without a default slot, its summary naming it, with no tooltip', () => {
		const fold = mount(DescriptionFold, {
			attrs: { class: 'pool-modifications-title' },
			slots: { summary: 'Pool Modifications', fold: '<div class="rows">Difficulty</div>' },
		});
		const chevron = fold.get('button.description-toggle');

		expect(fold.find('.description-fold-head').exists()).toBe(false);
		expect(chevron.classes()).toContain('pool-modifications-title');
		expect(chevron.classes()).not.toContain('icon-only');
		expect([chevron.text(), chevron.attributes('aria-label'), chevron.attributes('data-tooltip')]).toEqual([
			'Pool Modifications',
			undefined,
			undefined,
		]);
		expect(chevron.attributes('aria-expanded')).toBe('false');
		expect(fold.get('.description-fold').attributes('id')).toBe(chevron.attributes('aria-controls'));
		expect(chevron.get('i').classes()).toEqual(['fas', 'fa-chevron-right']);
	});
});
