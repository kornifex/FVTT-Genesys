// @vitest-environment happy-dom
/** @file Tests for a row's ⋮ menu: its entries and their order, what a read-only sheet hides, and Delete asking first. */

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type App, h, nextTick } from 'vue';
import { provideSheetContext } from '@/vue/SheetContext';
import type { RowAction } from '@/vue/components/RowAction';

// The Dice Prompt and the crew member prompt are Foundry applications, which ItemActions opens: the menu never rolls.
vi.mock('@/app/DicePrompt', () => ({ DicePrompt: {}, RollType: {} }));
vi.mock('@/operations/CrewRoll', () => ({ rollForCrew: vi.fn() }));
// A card is a chat message: the test records the cards posted.
const { postChatCard } = vi.hoisted(() => ({ postChatCard: vi.fn() }));
vi.mock('@/item/ChatCards', async (importOriginal) => ({ ...(await importOriginal<object>()), postChatCard }));

const { default: RowActions } = await import('@/vue/components/RowActions.vue');

type Props = InstanceType<typeof RowActions>['$props'];

// Foundry's confirmation dialog, which answers what the test sets.
const confirm = vi.fn();

beforeEach(() => {
	confirm.mockReset();
	postChatCard.mockReset();
	vi.stubGlobal('game', {
		user: { name: 'Player' },
		i18n: {
			localize: (key: string) => key,
			format: (key: string, data: Record<string, string>) => `${key} ${Object.values(data).join(', ')}`,
		},
	});
	vi.stubGlobal('foundry', { applications: { api: { DialogV2: { confirm } } } });
});

// A menu left open keeps its listeners on the document, which would take the next test's first click.
enableAutoUnmount(afterEach);

const actor = { documentName: 'Actor', name: 'Hero', system: {} };

/** A document of a row, which records whether it is deleted and its sheet opened. */
function rowDocument(documentName: string, type: string, { canOpen = true } = {}) {
	const render = vi.fn();
	const deleted = vi.fn(async () => undefined);
	return {
		documentName,
		type,
		name: 'E2E Sword',
		uuid: `Actor.hero.${documentName}.sword`,
		sheet: { render },
		testUserPermission: () => canOpen,
		delete: deleted,
		render,
		deleted,
	};
}

/** Mounts a row's menu on an actor's sheet the user can edit, unless `editable` says otherwise. */
function mountActions(props: Props, { editable = true } = {}) {
	const context = { document: actor, editable };
	return mount(RowActions, {
		props,
		slots: { default: () => h('span', { class: 'row-name' }, 'E2E Sword') },
		global: { plugins: [{ install: (app: App) => void provideSheetContext(app, context) }] },
		attachTo: document.body,
	});
}

type Wrapper = ReturnType<typeof mountActions>;

/** Opens the menu from its ⋮, and reads its entries and separators in order. */
async function openEntries(wrapper: Wrapper) {
	await wrapper.get('button.menu-trigger').trigger('click');
	await nextTick();
	return [...wrapper.get('[role="menu"]').element.children].map((child) =>
		child.tagName === 'HR' ? '---' : child.querySelector('.menu-label')?.textContent?.trim(),
	);
}

async function clickEntry(wrapper: Wrapper, label: string) {
	const entry = wrapper.findAll('[role="menuitem"]').find((item) => item.text() === label);
	await entry?.trigger('click');
	await flushPromises();
}

const equip = (run = vi.fn()): RowAction => ({ icon: 'fas fa-hand-fist', label: 'Genesys.Equipment.Dropdown.Equip', run });
// An action that edits nothing, such as a roll.
const attack = (run = vi.fn()): RowAction => ({
	icon: 'fas fa-dice-d20',
	label: 'Genesys.Tooltips.RollAttack',
	labelData: { weapon: 'Sword' },
	edits: false,
	run,
});

describe('RowActions', () => {
	it("lists the row's own actions, a separator, then Send to chat, Edit and Delete", async () => {
		const wrapper = mountActions({ document: rowDocument('Item', 'weapon') as never, actions: [equip(), attack()] });

		expect(await openEntries(wrapper)).toEqual([
			'Genesys.Equipment.Dropdown.Equip',
			'Genesys.Tooltips.RollAttack Sword',
			'---',
			'Genesys.Labels.SendToChat',
			'Genesys.Labels.Edit',
			'Genesys.Labels.Delete',
		]);
	});

	it('formats an own action with its label data', async () => {
		const putIn: RowAction = {
			icon: 'fas fa-box',
			label: 'Genesys.Labels.PutInContainer',
			labelData: { container: 'Bag' },
			run: vi.fn(),
		};
		const wrapper = mountActions({ document: rowDocument('Item', 'gear') as never, actions: [putIn] });

		expect((await openEntries(wrapper))[0]).toBe('Genesys.Labels.PutInContainer Bag');
	});

	it('has no separator without own actions', async () => {
		const wrapper = mountActions({ document: rowDocument('Item', 'talent') as never });

		expect(await openEntries(wrapper)).toEqual(['Genesys.Labels.SendToChat', 'Genesys.Labels.Edit', 'Genesys.Labels.Delete']);
	});

	it('offers Send to chat only for an item with a card', async () => {
		const skill = mountActions({ document: rowDocument('Item', 'skill') as never });
		expect(await openEntries(skill)).toEqual(['Genesys.Labels.Edit', 'Genesys.Labels.Delete']);
		skill.unmount();

		const effect = mountActions({ document: rowDocument('ActiveEffect', 'base') as never });
		expect(await openEntries(effect)).toEqual(['Genesys.Labels.Edit', 'Genesys.Labels.Delete']);
	});

	it("posts the item's card, spoken by the sheet's actor", async () => {
		const sword = rowDocument('Item', 'weapon');
		const wrapper = mountActions({ document: sword as never });
		await openEntries(wrapper);

		await clickEntry(wrapper, 'Genesys.Labels.SendToChat');

		expect(postChatCard).toHaveBeenCalledExactlyOnceWith(sword, actor);
	});

	it("opens the row's sheet from Edit, and leaves Edit out when the user can't open it", async () => {
		const sword = rowDocument('Item', 'weapon');
		const wrapper = mountActions({ document: sword as never });
		await openEntries(wrapper);
		await clickEntry(wrapper, 'Genesys.Labels.Edit');
		expect(sword.render).toHaveBeenCalledExactlyOnceWith(true);
		wrapper.unmount();

		const hidden = mountActions({ document: rowDocument('Item', 'skill', { canOpen: false }) as never });
		expect(await openEntries(hidden)).toEqual(['Genesys.Labels.Delete']);
	});

	it("keeps only Send to chat, Edit and the actions that edit nothing on a sheet the user can't edit", async () => {
		const wrapper = mountActions(
			{ document: rowDocument('Item', 'weapon') as never, actions: [equip(), attack()] },
			{ editable: false },
		);

		expect(await openEntries(wrapper)).toEqual([
			'Genesys.Tooltips.RollAttack Sword',
			'---',
			'Genesys.Labels.SendToChat',
			'Genesys.Labels.Edit',
		]);
	});

	it('shows no ⋮ when it has no entry to show', () => {
		const wrapper = mountActions({ document: rowDocument('Item', 'skill', { canOpen: false }) as never }, { editable: false });

		expect(wrapper.find('button.menu-trigger').exists()).toBe(false);
	});

	it('leaves Delete out of a row that offers none', async () => {
		const wrapper = mountActions({ document: rowDocument('Item', 'talent') as never, deletable: false });

		expect(await openEntries(wrapper)).toEqual(['Genesys.Labels.SendToChat', 'Genesys.Labels.Edit']);
	});

	it('asks before it deletes, naming what it deletes, and No keeps the document', async () => {
		confirm.mockResolvedValue(false);
		const sword = rowDocument('Item', 'weapon');
		const wrapper = mountActions({ document: sword as never });
		await openEntries(wrapper);

		await clickEntry(wrapper, 'Genesys.Labels.Delete');

		expect(confirm).toHaveBeenCalledOnce();
		const [{ window, content }] = confirm.mock.calls[0] as [{ window: { title: string }; content: HTMLElement }];
		expect(window.title).toBe('Genesys.Dialogs.ConfirmDelete.Title');
		expect(content.textContent).toBe('Genesys.Dialogs.ConfirmDelete.Content E2E Sword');
		expect(sword.deleted).not.toHaveBeenCalled();
	});

	it('deletes the document once the user answers Yes', async () => {
		confirm.mockResolvedValue(true);
		const sword = rowDocument('Item', 'weapon');
		const wrapper = mountActions({ document: sword as never });
		await openEntries(wrapper);

		await clickEntry(wrapper, 'Genesys.Labels.Delete');

		expect(sword.deleted).toHaveBeenCalledOnce();
	});

	it("runs its removal in Delete's place, under its own label, without asking", async () => {
		const run = vi.fn();
		const wrapper = mountActions({
			document: rowDocument('Actor', 'character') as never,
			removal: { label: 'Genesys.Labels.RemoveFromCrew', run },
		});

		expect((await openEntries(wrapper)).at(-1)).toBe('Genesys.Labels.RemoveFromCrew');
		await clickEntry(wrapper, 'Genesys.Labels.RemoveFromCrew');

		expect(run).toHaveBeenCalledOnce();
		expect(confirm).not.toHaveBeenCalled();
	});

	it('offers a removal without a document, on a sheet the user can edit only', async () => {
		const removal = { label: 'Genesys.XPJournal.UndoEntry', run: vi.fn() };
		const wrapper = mountActions({ removal });
		expect(await openEntries(wrapper)).toEqual(['Genesys.XPJournal.UndoEntry']);
		wrapper.unmount();

		const readOnly = mountActions({ removal }, { editable: false });
		expect(readOnly.find('button.menu-trigger').exists()).toBe(false);
	});

	it('opens under the pointer on a right-click on its content', async () => {
		const wrapper = mountActions({ document: rowDocument('Item', 'weapon') as never });

		await wrapper.get('.row-name').trigger('contextmenu', { button: 2, clientX: 5, clientY: 5 });

		expect(wrapper.find('[role="menu"]').exists()).toBe(true);
	});
});
