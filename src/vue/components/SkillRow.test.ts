// @vitest-environment happy-dom
/** @file Tests for the cells of a skill's row: its icon, its name that rolls, its rank and the button that buys one. */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type App, h } from 'vue';
import SkillRow from '@/vue/components/SkillRow.vue';
import { provideSheetContext } from '@/vue/SheetContext';

type Props = InstanceType<typeof SkillRow>['$props'];

beforeEach(() => {
	// Each key as its text, and a formatted key followed by its data, so that the test reads what was asked for.
	vi.stubGlobal('game', {
		i18n: {
			lang: 'en',
			localize: (key: string) => key,
			format: (key: string, data: Record<string, string>) => `${key} ${Object.values(data).join(', ')}`,
			getListFormatter: (options: Intl.ListFormatOptions) => new Intl.ListFormat('en', options),
		},
	});
});

const athletics: Props = {
	name: 'Athletics',
	skill: 'Athletics',
	characteristic: 'brawn',
	image: 'athletics.webp',
	rank: 2,
	skillValue: 2,
	characteristicValue: 3,
};

/** Mounts the row's cells in a row, on a sheet the user can edit unless the context says otherwise. */
function mountRow(props: Props, context: object = { editable: true }) {
	return mount(() => h('div', { class: 'row' }, [h(SkillRow, props)]), {
		global: { plugins: [{ install: (app: App) => void provideSheetContext(app, context) }] },
	});
}

describe('SkillRow', () => {
	it('names its icon after the sheet it opens, and its name after the skill and characteristic it shows', () => {
		const row = mountRow(athletics);

		expect(row.get('.skill-icon').attributes('aria-label')).toBe('Genesys.Tooltips.OpenSkill');
		expect(row.get('.skill-name').text()).toBe('Athletics (Genesys.CharacteristicAbbr.Brawn)');
		expect(row.get('.skill-name').attributes('aria-label')).toBeUndefined();
	});

	it('shows a die before its name, hidden from screen readers, and a tooltip naming the check', () => {
		const name = mountRow(athletics).get('.skill-name');

		expect(name.get('i').classes()).toContain('fa-dice-d20');
		expect(name.get('i').attributes('aria-hidden')).toBe('true');
		expect(name.attributes('data-tooltip')).toBe('Genesys.Tooltips.RollSkill Athletics');
	});

	it("names the skill in the tooltip when its name shows a crew member's, whose sheet the icon opens", () => {
		const row = mountRow({ ...athletics, name: 'Hal', characteristic: undefined, openLabel: 'Genesys.Tooltips.OpenActor' });

		expect(row.get('.skill-name').text()).toBe('Hal');
		expect(row.get('.skill-name').attributes('data-tooltip')).toBe('Genesys.Tooltips.RollSkill Athletics');
		expect(row.get('.skill-icon').attributes('aria-label')).toBe('Genesys.Tooltips.OpenActor');
	});

	it('rolls from its name and opens from its icon', async () => {
		const onRoll = vi.fn();
		const onOpen = vi.fn();
		const row = mountRow({ ...athletics, onRoll, onOpen });

		await row.get('.skill-name').trigger('click');
		expect(onRoll).toHaveBeenCalledOnce();
		expect(onOpen).not.toHaveBeenCalled();

		await row.get('.skill-icon').trigger('click');
		expect(onOpen).toHaveBeenCalledOnce();
		expect(onRoll).toHaveBeenCalledOnce();
	});

	it('shows its rank and the dice of its pool, and no rank where it shows elsewhere', () => {
		const row = mountRow(athletics);
		const groupRow = mountRow({ ...athletics, rank: undefined });

		expect(row.get('.skill-rank').text()).toBe('2');
		expect(row.findAll('.skill-ranks .rank.proficiency')).toHaveLength(2);
		expect(row.findAll('.skill-ranks .rank.ability')).toHaveLength(1);
		expect(groupRow.find('.skill-rank').exists()).toBe(false);
	});

	it('buys a rank from its own button, which a sheet the user cannot edit leaves out', async () => {
		const onBuyRank = vi.fn();
		const row = mountRow({ ...athletics, canBuyRank: true, onBuyRank });
		const readOnly = mountRow({ ...athletics, canBuyRank: true }, { editable: false });
		const unaffordable = mountRow(athletics);

		const buy = row.get('.skill-rank button');
		expect(buy.attributes('aria-label')).toBe('Genesys.Labels.BuySkillRank');
		await buy.trigger('click');
		expect(onBuyRank).toHaveBeenCalledOnce();

		expect(readOnly.find('.skill-rank button').exists()).toBe(false);
		expect(unaffordable.find('.skill-rank button').exists()).toBe(false);
	});

	it('marks a career skill with a star', () => {
		expect(
			mountRow({ ...athletics, career: true })
				.find('.skill-name .career-skill')
				.exists(),
		).toBe(true);
		expect(mountRow(athletics).find('.skill-name .career-skill').exists()).toBe(false);
	});
});
