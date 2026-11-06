// @vitest-environment happy-dom
/** @file Tests for a sheet's tabs: their roles, the keys that move between them, and the active tab the sheet keeps. */

import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'vue';
import SheetTabs from '@/vue/components/SheetTabs.vue';
import { provideSheetContext } from '@/vue/SheetContext';

const TABS = [
	{ id: 'skills', label: 'Genesys.Tabs.Skills' },
	{ id: 'combat', label: 'Genesys.Tabs.Combat' },
	{ id: 'talents', label: 'Genesys.Tabs.Talents' },
];

type Sheet = { id: string; tabGroups: Record<string, string | null>; initialTab?: string };

beforeEach(() => {
	// Foundry localizes a key into its text: here, the key marked as localized.
	vi.stubGlobal('game', { i18n: { localize: (key: string) => `localized ${key}` } });
});

afterEach(() => {
	document.body.replaceChildren();
});

/** Mounts the tabs in a sheet, each panel showing its tab's id, attached to the page so that focus moves. */
function mountTabs(sheet: Sheet, tabs = TABS) {
	const slots = Object.fromEntries(tabs.map(({ id }) => [id, `<p>${id} panel</p>`]));
	const plugins = [{ install: (app: App) => void provideSheetContext(app, { sheet, document: {}, editable: true }) }];
	return mount(SheetTabs, { props: { tabs }, slots, global: { plugins }, attachTo: document.body });
}

function sheetOn(tab?: string, initialTab = 'skills'): Sheet {
	return { id: 'CharacterSheet-Actor-hero', tabGroups: tab ? { primary: tab } : {}, initialTab };
}

describe('SheetTabs', () => {
	it('is a tab list of buttons, each a tab controlling its panel, which it labels', () => {
		const wrapper = mountTabs(sheetOn());
		const list = wrapper.get('nav.sheet-tabs');
		const tabs = list.findAll('[role="tab"]');
		const panels = wrapper.findAll('.sheet-body > [role="tabpanel"]');

		expect(list.attributes('role')).toBe('tablist');
		expect(tabs.map((tab) => tab.text())).toEqual(TABS.map(({ label }) => `localized ${label}`));
		expect(panels.map((panel) => panel.text())).toEqual(['skills panel', 'combat panel', 'talents panel']);
		tabs.forEach((tab, index) => {
			const panel = panels[index];
			expect(tab.element.tagName).toBe('BUTTON');
			expect(tab.attributes('type')).toBe('button');
			expect(tab.attributes('aria-controls')).toBe(panel.attributes('id'));
			expect(panel.attributes('aria-labelledby')).toBe(tab.attributes('id'));
			expect(tab.attributes('data-tab')).toBe(TABS[index].id);
			expect(panel.attributes('data-tab')).toBe(TABS[index].id);
		});
		// The ids are the sheet's own, as several sheets show at once.
		expect(tabs[0].attributes('id')).toBe('CharacterSheet-Actor-hero-tab-skills');
		expect(panels[0].attributes('id')).toBe('CharacterSheet-Actor-hero-panel-skills');
		// The decorations around the tabs say nothing.
		expect(list.findAll('.spacer').map((spacer) => spacer.attributes('aria-hidden'))).toEqual(['true', 'true']);
	});

	it('selects the active tab alone, the one Tab reaches, and shows its panel alone, keeping the others rendered', () => {
		const wrapper = mountTabs(sheetOn('combat'));
		const tabs = wrapper.findAll('[role="tab"]');
		const panels = wrapper.findAll('[role="tabpanel"]');

		expect(tabs.map((tab) => tab.attributes('aria-selected'))).toEqual(['false', 'true', 'false']);
		expect(tabs.map((tab) => tab.attributes('tabindex'))).toEqual(['-1', '0', '-1']);
		expect(tabs.map((tab) => tab.classes('active'))).toEqual([false, true, false]);
		expect(tabs.every((tab) => tab.classes('item'))).toBe(true);
		expect(panels.map((panel) => panel.classes())).toEqual([['tab'], ['tab', 'active'], ['tab']]);
	});

	it('shows the tab the sheet keeps in its tabGroups, else the one it opens on, else the first', () => {
		const active = (sheet: Sheet, tabs = TABS) => mountTabs(sheet, tabs).get('[aria-selected="true"]').attributes('data-tab');

		expect(active(sheetOn('talents'))).toBe('talents');
		expect(active(sheetOn(undefined, 'combat'))).toBe('combat');
		// A tab the sheet kept that isn't there any more, as an item's Effects tab.
		expect(active(sheetOn('effects', 'combat'))).toBe('combat');
		expect(active({ id: 'sheet', tabGroups: {} })).toBe('skills');
	});

	it("shows a tab clicked, and keeps it in the sheet's tabGroups for the sheet to reopen on", async () => {
		const sheet = sheetOn();
		const wrapper = mountTabs(sheet);

		await wrapper.get('[data-tab="talents"][role="tab"]').trigger('click');

		expect(sheet.tabGroups.primary).toBe('talents');
		expect(wrapper.get('.tab.active').attributes('data-tab')).toBe('talents');
		// Reopened, the sheet mounts its tabs again.
		expect(mountTabs(sheet).get('.tab.active').attributes('data-tab')).toBe('talents');
	});

	it('keeps the active tab in the group it is given', async () => {
		const sheet = sheetOn();
		const slots = Object.fromEntries(TABS.map(({ id }) => [id, id]));
		const plugins = [{ install: (app: App) => void provideSheetContext(app, { sheet }) }];
		const wrapper = mount(SheetTabs, { props: { tabs: TABS, group: 'secondary' }, slots, global: { plugins } });

		await wrapper.get('[data-tab="combat"][role="tab"]').trigger('click');

		expect(sheet.tabGroups).toEqual({ secondary: 'combat' });
	});

	it.each([
		['ArrowRight', 'skills', 'combat'],
		['ArrowRight', 'talents', 'skills'],
		['ArrowLeft', 'combat', 'skills'],
		['ArrowLeft', 'skills', 'talents'],
		['Home', 'talents', 'skills'],
		['End', 'skills', 'talents'],
	])('moves the focus with %s from the %s tab to the %s tab, and shows it', async (key, from, to) => {
		const sheet = sheetOn(from);
		const wrapper = mountTabs(sheet);
		const tab = wrapper.get(`[data-tab="${from}"][role="tab"]`);
		(tab.element as HTMLElement).focus();

		await tab.trigger('keydown', { key });

		const reached = wrapper.get(`[data-tab="${to}"][role="tab"]`);
		expect(document.activeElement).toBe(reached.element);
		expect(reached.attributes('aria-selected')).toBe('true');
		expect(reached.attributes('tabindex')).toBe('0');
		expect(wrapper.get('.tab.active').attributes('data-tab')).toBe(to);
		expect(sheet.tabGroups.primary).toBe(to);
	});

	it('leaves the other keys to the page', async () => {
		const sheet = sheetOn('combat');
		const wrapper = mountTabs(sheet);
		const tab = wrapper.get('[data-tab="combat"][role="tab"]');
		const keydown = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });

		tab.element.dispatchEvent(keydown);
		await wrapper.vm.$nextTick();

		expect(keydown.defaultPrevented).toBe(false);
		expect(wrapper.get('[aria-selected="true"]').attributes('data-tab')).toBe('combat');
	});

	it.each(['altKey', 'ctrlKey', 'metaKey'])('leaves an arrow key held with %s to the page', async (modifier) => {
		const sheet = sheetOn('combat');
		const wrapper = mountTabs(sheet);
		const tab = wrapper.get('[data-tab="combat"][role="tab"]');
		const keydown = new KeyboardEvent('keydown', { key: 'ArrowRight', [modifier]: true, bubbles: true, cancelable: true });

		tab.element.dispatchEvent(keydown);
		await wrapper.vm.$nextTick();

		expect(keydown.defaultPrevented).toBe(false);
		expect(wrapper.get('[aria-selected="true"]').attributes('data-tab')).toBe('combat');
		expect(sheet.tabGroups.primary).toBe('combat');
	});
});
