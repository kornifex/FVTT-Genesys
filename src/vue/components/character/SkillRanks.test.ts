// @vitest-environment happy-dom
/** @file Tests for the dice a skill's ranks show, and read in words. */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SkillRanks from '@/vue/components/character/SkillRanks.vue';

describe('SkillRanks', () => {
	beforeEach(() => {
		// Each label as its key and count, so that the test reads which dice it names.
		vi.stubGlobal('game', {
			i18n: {
				lang: 'en',
				localize: (key: string) => key,
				format: (key: string, data: Record<string, string>) => `${data['count']} ${key.split('.').slice(-2).join('.')}`,
				getListFormatter: (options: Intl.ListFormatOptions) => new Intl.ListFormat('en', options),
			},
		});
	});

	const ranks = (skillValue: number, characteristicValue: number) => {
		const wrapper = mount(SkillRanks, { props: { skillValue, characteristicValue } });
		return {
			ability: wrapper.findAll('.rank.ability').length,
			proficiency: wrapper.findAll('.rank.proficiency').length,
			label: wrapper.attributes('aria-label') ?? null,
		};
	};

	it('shows the dice of a skill rank and a characteristic, the Proficiency dice first in words', () => {
		expect(ranks(1, 3)).toEqual({ ability: 2, proficiency: 1, label: '1 Proficiency.one, 2 Ability.other' });
	});

	it('shows no Proficiency die for a characteristic an Active Effect lowered below 0, nor throws', () => {
		expect(ranks(2, -1)).toEqual({ ability: 3, proficiency: 0, label: '3 Ability.other' });
	});

	it('shows no dice and no label without a rank or a characteristic', () => {
		expect(ranks(0, 0)).toEqual({ ability: 0, proficiency: 0, label: null });
	});
});
